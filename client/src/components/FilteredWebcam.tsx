import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Camera, CameraOff, Download } from 'lucide-react';
import type { FilterSettings } from '@/pages/Home';

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
    
    // Create a manual drawing function that applies a simplified dot matrix effect
    // This approach bypasses the complex _processFrameCore function that might have issues
    const drawDotMatrix = () => {
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        // Video not ready, draw loading message
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'white';
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Initializing camera...', canvas.width/2, canvas.height/2);
        }
        animationId = requestAnimationFrame(drawDotMatrix);
        return;
      }
      
      // Ensure canvas has correct dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(drawDotMatrix);
        return;
      }
      
      // Clear canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // First draw video onto a temporary canvas for sampling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      
      if (!tempCtx) {
        animationId = requestAnimationFrame(drawDotMatrix);
        return;
      }
      
      // Draw video to temp canvas
      tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      // Extract settings
      const { dotSize, contrast, brightness, isGrayscale, dotShape } = filterSettings;
      const gridSize = Math.max(2, Math.min(20, Math.floor(dotSize)));
      
      // Apply dot matrix effect
      ctx.fillStyle = 'white';
      
      // Calculate grid boundaries
      const maxGridX = Math.floor(canvas.width / gridSize);
      const maxGridY = Math.floor(canvas.height / gridSize);
      
      // Draw dots
      for (let yi = 0; yi < maxGridY; yi++) {
        for (let xi = 0; xi < maxGridX; xi++) {
          // Sample point
          const x = xi * gridSize;
          const y = yi * gridSize;
          
          // Get pixel data
          const data = tempCtx.getImageData(x, y, 1, 1).data;
          
          // Apply brightness and contrast
          let r = Math.min(255, Math.max(0, data[0] * brightness));
          let g = Math.min(255, Math.max(0, data[1] * brightness));
          let b = Math.min(255, Math.max(0, data[2] * brightness));
          
          // Apply grayscale if enabled
          let brightnessValue;
          if (isGrayscale) {
            const gray = Math.min(255, Math.max(0, (r + g + b) / 3));
            brightnessValue = gray;
          } else {
            brightnessValue = (r + g + b) / 3;
          }
          
          // Calculate dot size based on brightness
          const maxRadius = Math.max(1, (gridSize / 2) * 0.8);
          const radius = Math.max(0.5, (brightnessValue / 255) * maxRadius);
          
          // Draw dot if bright enough (skip really dark areas for better contrast)
          if (brightnessValue > 30) {
            const centerX = x + gridSize / 2;
            const centerY = y + gridSize / 2;
            
            ctx.beginPath();
            
            // Draw appropriate shape
            switch (dotShape) {
              case 'square':
                const size = radius * 1.8;
                ctx.rect(centerX - size/2, centerY - size/2, size, size);
                break;
                
              case 'cross':
                const thickness = radius * 0.6;
                const length = radius * 1.8;
                ctx.rect(centerX - length/2, centerY - thickness/2, length, thickness);
                ctx.rect(centerX - thickness/2, centerY - length/2, thickness, length);
                break;
                
              case 'circle':
              default:
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                break;
            }
            
            ctx.fill();
          }
        }
      }
      
      // Continue animation loop
      animationId = requestAnimationFrame(drawDotMatrix);
    };
    
    // Start the animation loop
    animationId = requestAnimationFrame(drawDotMatrix);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
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