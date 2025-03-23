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
  startCamera: (preferredFacing?: 'user' | 'environment') => Promise<void>;
  toggleFacingMode: () => Promise<void>;
  stopCamera: () => void;
  isCameraActive: boolean;
  availableCameras: WebcamDevice[];
  currentFacingMode: 'user' | 'environment' | null;
  isBackCamera: boolean;
}

export function useWebcam(videoRef?: RefObject<HTMLVideoElement>): UseWebcamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<WebcamDevice[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment' | null>(null);
  const [isBackCamera, setIsBackCamera] = useState(false);

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

  // Check if device is a mobile device
  const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Start camera with specified device or preferred facing mode
  const startCamera = async (preferredFacing?: 'user' | 'environment'): Promise<void> => {
    try {
      // First check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API for camera access not available');
      }
      
      const cameras = await getAvailableCameras();
      const isMobile = isMobileDevice();
      
      // Set default facing mode (front camera on mobile)
      let facingMode = preferredFacing || currentFacingMode || 'user';
      
      // Try with different constraints based on device type and preferred facing mode
      let constraints: MediaStreamConstraints;
      
      // For mobile devices, we'll use facingMode constraints which work better
      if (isMobile) {
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        // For iOS Safari, we need to adjust the constraints for better compatibility
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          // iOS often works better with exact dimensions that match common camera resolutions
          (constraints.video as MediaTrackConstraints).width = { ideal: 1280, max: 1920 };
          (constraints.video as MediaTrackConstraints).height = { ideal: 720, max: 1080 };
        }
      } 
      // If we have a specific device ID (for desktop browsers primarily)
      else if (currentDeviceId || (cameras.length > 0)) {
        const deviceId = currentDeviceId || cameras[0].deviceId;
        constraints = {
          video: { 
            deviceId: { ideal: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      }
      // Fallback option for any other scenarios
      else {
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      }
      
      // Try to get user media with the defined constraints
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
      
      // Store the current device ID and facing mode information
      if (newStream.getVideoTracks().length > 0) {
        const track = newStream.getVideoTracks()[0];
        const settings = track.getSettings();
        
        // Store device ID if available
        if (settings.deviceId) {
          setCurrentDeviceId(settings.deviceId);
        }
        
        // Detect if we're using the back camera based on camera label or facingMode
        let detectedBackCamera = false;
        
        // Check facingMode in settings if available (not all browsers support this)
        if (settings.facingMode) {
          setCurrentFacingMode(settings.facingMode as 'user' | 'environment');
          detectedBackCamera = settings.facingMode === 'environment';
        } 
        // If facingMode isn't available in settings, use what we requested
        else if (isMobile) {
          setCurrentFacingMode(facingMode);
          detectedBackCamera = facingMode === 'environment';
        }
        // Or try to guess from camera label
        else if (track.label) {
          const label = track.label.toLowerCase();
          // Most devices have keywords in camera names to identify back cameras
          detectedBackCamera = 
            label.includes('back') || 
            label.includes('rear') || 
            label.includes('environment') || 
            label.includes('facing away');
          
          setCurrentFacingMode(detectedBackCamera ? 'environment' : 'user');
        }
        
        setIsBackCamera(detectedBackCamera);
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
  
  // Toggle between front and back camera (primarily for mobile)
  const toggleFacingMode = async (): Promise<void> => {
    // Only proceed if camera is active
    if (!isCameraActive) return;
    
    // Stop current camera
    stopCamera();
    
    // Switch facing mode
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Start with new facing mode
    await startCamera(newFacingMode);
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
    toggleFacingMode,
    stopCamera,
    isCameraActive,
    availableCameras,
    currentFacingMode,
    isBackCamera
  };
}
