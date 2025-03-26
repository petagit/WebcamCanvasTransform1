import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Camera, CameraOff, Download } from 'lucide-react';
import type { FilterSettings } from '@/pages/Home';
import { processWebcamFrame } from '@/utils/image-processing';

interface FilteredWebcamProps {
  onCameraActive: (active: boolean) => void;
  onCaptureImage: (imageUrl: string) => void;
  filterSettings: FilterSettings;
}

export default function FilteredWebcam({ 
  onCameraActive, 
  onCaptureImage,
  filterSettings 
}: FilteredWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Basic camera start function using the simplest possible constraints
  const startCamera = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser doesn't support camera access");
        setIsProcessing(false);
        return;
      }
      
      // Use extremely basic constraints - no resolution specifications which can cause issues
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      if (videoRef.current) {
        // Set video source to the stream
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Play the video
        try {
          await videoRef.current.play();
          console.log("Video is now playing");
          setIsActive(true);
          onCameraActive(true);
          setIsProcessing(false);
        } catch (playError) {
          console.error("Error playing video:", playError);
          setError("Could not start video playback");
          setIsProcessing(false);
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsProcessing(false);
    }
  };
  
  // Stop the camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => {
        track.stop();
      });
      
      videoRef.current.srcObject = null;
      setIsActive(false);
      onCameraActive(false);
    }
  };

  // Capture current frame
  const captureFrame = () => {
    if (!canvasRef.current || !videoRef.current || !isActive) return;
    
    try {
      // Get canvas context
      const canvas = canvasRef.current;
      
      // Capture the current processed frame
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onCaptureImage(dataUrl);
    } catch (error) {
      console.error("Error capturing frame:", error);
      setError("Failed to capture image");
    }
  };
  
  // Handle animation frame updates to process video with filter
  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    let animationId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions once video dimensions are available
    const setCanvasDimensions = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };
    
    // Process frame function
    const processFrame = () => {
      // Only process if video has dimensions and is ready
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Make sure canvas dimensions match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          setCanvasDimensions();
        }
        
        // Apply filter
        processWebcamFrame(video, canvas, filterSettings, false);
      }
      
      // Continue animation loop
      animationId = requestAnimationFrame(processFrame);
    };
    
    // Start animation loop
    animationId = requestAnimationFrame(processFrame);
    
    // Watch for video resize
    if ('onresize' in video) {
      video.addEventListener('resize', setCanvasDimensions);
    }
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      if ('onresize' in video) {
        video.removeEventListener('resize', setCanvasDimensions);
      }
    };
  }, [isActive, filterSettings]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopCamera();
      }
    };
  }, [isActive]);
  
  return (
    <div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="relative w-full">
        {/* Hidden video element */}
        <video 
          ref={videoRef}
          className="hidden" 
          playsInline 
          muted
        />
        
        {/* Canvas where we render the processed video */}
        <canvas 
          ref={canvasRef}
          className="w-full max-h-[600px] bg-black aspect-video object-contain"
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
            <p className="text-white text-center p-4">{error}</p>
          </div>
        )}
        
        {!isActive && !error && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-white text-center">Camera inactive</p>
          </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      
      <div className="p-3 w-full flex justify-between">
        {!isActive ? (
          <Button 
            onClick={startCamera}
            className="flex items-center gap-2"
            disabled={isProcessing}
          >
            <Camera size={16} />
            Start Camera
          </Button>
        ) : (
          <Button 
            onClick={stopCamera}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <CameraOff size={16} />
            Stop Camera
          </Button>
        )}
        
        {isActive && (
          <Button 
            onClick={captureFrame}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Capture
          </Button>
        )}
      </div>
    </div>
  );
}