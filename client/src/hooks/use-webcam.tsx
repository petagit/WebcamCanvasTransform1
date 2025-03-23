import { useState, useEffect, useRef, RefObject } from "react";

interface WebcamDevice {
  deviceId: string;
  label: string;
}

interface UseWebcamReturn {
  stream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  switchCamera: () => Promise<void>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isCameraActive: boolean;
  availableCameras: WebcamDevice[];
}

export function useWebcam(videoRef?: RefObject<HTMLVideoElement>): UseWebcamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<WebcamDevice[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Get available cameras
  const getAvailableCameras = async (): Promise<WebcamDevice[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`
        }));
      
      setAvailableCameras(videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Error getting cameras:', error);
      return [];
    }
  };

  // Start camera with specified device or default
  const startCamera = async (): Promise<void> => {
    try {
      // First check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API for camera access not available');
      }
      
      const cameras = await getAvailableCameras();
      
      // Try with different constraints for better mobile compatibility
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user', // Default to front camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      // If we have a specific device ID, try to use it
      if (currentDeviceId || (cameras.length > 0)) {
        const deviceId = currentDeviceId || cameras[0].deviceId;
        constraints = {
          video: { 
            deviceId: { ideal: deviceId }, // Use 'ideal' instead of 'exact' for better compatibility
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      }
      
      // Try to get user media
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef && videoRef.current) {
        videoRef.current.srcObject = newStream;
        
        // Ensure video element is ready for playback
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => {
              console.error('Error playing video:', e);
            });
          }
        };
      }
      
      // Store the current device ID
      if (newStream.getVideoTracks().length > 0) {
        const settings = newStream.getVideoTracks()[0].getSettings();
        if (settings.deviceId) {
          setCurrentDeviceId(settings.deviceId);
        }
      }
      
      // Create media recorder with options that are widely supported
      let options = {};
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }
      
      const recorder = new MediaRecorder(newStream, options);
      setMediaRecorder(recorder);
      
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error starting camera:', error);
      // Add more detailed error information
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.error('Camera access denied. Please allow camera access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          console.error('No camera found on this device.');
        } else if (error.name === 'NotReadableError') {
          console.error('Camera is already in use by another application.');
        } else if (error.name === 'OverconstrainedError') {
          console.error('Cannot satisfy the requested camera constraints.');
        } else if (error.name === 'SecurityError') {
          console.error('Camera access blocked due to security restrictions.');
        } else if (error.name === 'AbortError') {
          console.error('Camera access aborted.');
        }
      }
    }
  };

  // Stop camera
  const stopCamera = (): void => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      
      if (videoRef && videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setMediaRecorder(null);
      setIsCameraActive(false);
    }
  };

  // Switch to next camera
  const switchCamera = async (): Promise<void> => {
    if (!isCameraActive) return;
    
    const cameras = await getAvailableCameras();
    if (cameras.length <= 1) return;
    
    // Find index of current camera
    const currentIndex = cameras.findIndex(cam => cam.deviceId === currentDeviceId);
    // Ensure we have a valid current index, default to 0 if not found (-1)
    const validCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (validCurrentIndex + 1) % cameras.length;
    
    // Stop current camera
    stopCamera();
    
    // Set next device ID and restart camera
    setCurrentDeviceId(cameras[nextIndex].deviceId);
    await startCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    mediaRecorder,
    recordedChunks,
    switchCamera,
    startCamera,
    stopCamera,
    isCameraActive,
    availableCameras
  };
}
