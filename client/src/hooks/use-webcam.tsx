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
      const cameras = await getAvailableCameras();
      
      // If we already have a current device, try to use it
      // Otherwise use the first available camera
      const deviceId = currentDeviceId || (cameras.length > 0 ? cameras[0].deviceId : undefined);
      
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef && videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      // Store the current device ID
      if (newStream.getVideoTracks().length > 0) {
        const settings = newStream.getVideoTracks()[0].getSettings();
        if (settings.deviceId) {
          setCurrentDeviceId(settings.deviceId);
        }
      }
      
      // Create media recorder
      const recorder = new MediaRecorder(newStream, { mimeType: 'video/webm' });
      setMediaRecorder(recorder);
      
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error starting camera:', error);
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
    const nextIndex = (currentIndex + 1) % cameras.length;
    
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
