import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface SimpleWebcamProps {
  onCameraActive: (active: boolean) => void;
}

export default function SimpleWebcam({ onCameraActive }: SimpleWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic camera start function using the simplest possible constraints
  const startCamera = async () => {
    try {
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser doesn't support camera access");
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
        
        // Play the video
        try {
          await videoRef.current.play();
          console.log("Video is now playing");
          setIsActive(true);
          onCameraActive(true);
        } catch (playError) {
          console.error("Error playing video:", playError);
          setError("Could not start video playback");
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Could not access camera. Please check permissions.");
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
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopCamera();
      }
    };
  }, [isActive]);
  
  return (
    <div className="flex flex-col items-center bg-gray-900 rounded-lg overflow-hidden">
      <div className="relative w-full">
        <video 
          ref={videoRef}
          className="w-full aspect-video bg-black" 
          playsInline 
          muted
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
            <p className="text-white text-center p-4">{error}</p>
          </div>
        )}
        
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-white text-center">Camera inactive</p>
          </div>
        )}
      </div>
      
      <div className="p-3 w-full flex justify-center">
        {!isActive ? (
          <Button 
            onClick={startCamera}
            className="flex items-center gap-2"
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
      </div>
    </div>
  );
}