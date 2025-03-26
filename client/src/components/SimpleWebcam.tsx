import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface SimpleWebcamProps {
  onCameraActive: (active: boolean) => void;
}

export default function SimpleWebcam({ onCameraActive }: SimpleWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser doesn't support camera access");
        setIsLoading(false);
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        console.log("Video is now playing");
        setIsActive(true);
        onCameraActive(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsLoading(false);
    }
  };
  
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
  
  return (
    <div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="relative w-full">
        <video 
          ref={videoRef}
          className="w-full max-h-[300px] bg-black aspect-video object-contain"
          playsInline 
          muted
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
            <p className="text-white text-center p-4">{error}</p>
          </div>
        )}
        
        {!isActive && !error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-white text-center">Camera inactive</p>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      
      <div className="p-3 w-full">
        {!isActive ? (
          <Button 
            onClick={startCamera}
            className="flex items-center gap-2"
            disabled={isLoading}
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