import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, FlipHorizontal } from "lucide-react";
import type { FilterSettings } from "@/pages/Home";
import { processFrame } from "@/utils/image-processing";

interface SimpleMobileCameraProps {
  onCameraReady: () => void;
  onCaptureImage: (imageUrl: string) => void;
  filterSettings: FilterSettings;
}

/**
 * A simplified camera component optimized for mobile devices
 * This component provides a basic camera interface focused on reliability
 */
export default function SimpleMobileCamera({
  onCameraReady,
  onCaptureImage,
  filterSettings
}: SimpleMobileCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Start the camera
  const startCamera = async (useBackCamera = false) => {
    setCameraError(null);
    setIsProcessing(true);
    
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Use the simplest possible constraints for mobile devices
      let constraints: MediaStreamConstraints;
      
      // For iOS, use absolute minimal constraints
      if (isIOS) {
        constraints = {
          video: {
            facingMode: useBackCamera ? 'environment' : 'user'
          },
          audio: false
        };
      } 
      // For other mobile devices
      else if (isMobile) {
        constraints = {
          video: {
            facingMode: useBackCamera ? 'environment' : 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };
      }
      // For desktop
      else {
        constraints = {
          video: true,
          audio: false
        };
      }
      
      console.log('Starting camera with constraints:', JSON.stringify(constraints));
      
      // Try to get the media stream
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      // Configure the video element
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Reset the video element
        video.srcObject = null;
        video.removeAttribute('src');
        video.load();
        
        // Configure required properties
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Set attributes for iOS
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        
        // Basic styling
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        
        // Set the stream as source
        video.srcObject = newStream;
        
        // Setup play event
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Play failed:', error);
            setCameraError('Could not play video. You may need to tap the screen to allow video.');
          });
        }
        
        // Mark camera as active
        setIsCameraActive(true);
        setIsBackCamera(useBackCamera);
        onCameraReady();
      } else {
        throw new Error('Video element not available');
      }
    } catch (error) {
      console.error('Camera start failed:', error);
      setCameraError('Could not access camera. Please check permissions and try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Toggle between front and back camera
  const toggleCamera = () => {
    if (isProcessing) return;
    startCamera(!isBackCamera);
  };
  
  // Capture the current frame
  const captureImage = () => {
    if (!canvasRef.current || !isCameraActive) return;
    
    setIsProcessing(true);
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      onCaptureImage(dataUrl);
    } catch (error) {
      console.error('Capture failed:', error);
      setCameraError('Could not capture image');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Process camera frames
  useEffect(() => {
    let animationId: number;
    
    const renderFrame = () => {
      if (videoRef.current && canvasRef.current && isCameraActive) {
        // Check if the video has valid dimensions
        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          try {
            // Process the frame
            processFrame(
              videoRef.current,
              canvasRef.current,
              filterSettings,
              isBackCamera
            );
          } catch (error) {
            console.error('Frame processing error:', error);
          }
        } else {
          // Video not ready yet, show loading indicator
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Starting camera...', canvasRef.current.width/2, canvasRef.current.height/2);
          }
        }
      }
      
      // Continue animation loop
      animationId = requestAnimationFrame(renderFrame);
    };
    
    // Start the animation loop
    if (isCameraActive) {
      animationId = requestAnimationFrame(renderFrame);
    }
    
    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isCameraActive, filterSettings, isBackCamera]);
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  return (
    <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
      {/* Camera Controls Header */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-black bg-opacity-50 flex justify-between z-10">
        <h3 className="text-white font-medium">Camera</h3>
        {isCameraActive && (
          <Button
            variant="outline"
            size="sm"
            className="p-1 h-8 w-8 rounded-full"
            onClick={toggleCamera}
            disabled={isProcessing}
          >
            <FlipHorizontal className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      {/* Video and Canvas Container */}
      <div className="relative" style={{ minHeight: '300px' }}>
        {/* Hidden Video Element */}
        <video
          ref={videoRef}
          style={{ 
            position: 'absolute',
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            visibility: 'hidden' 
          }}
          muted
          playsInline
          autoPlay
        />
        
        {/* Canvas for Processing */}
        <canvas
          ref={canvasRef}
          style={{ 
            position: 'absolute',
            width: '100%', 
            height: '100%',
            objectFit: 'cover'
          }}
          width={640}
          height={480}
        />
        
        {/* Camera Placeholder when not active */}
        {!isCameraActive && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90">
            <Camera className="h-16 w-16 text-gray-400 mb-4" />
            <Button
              onClick={() => startCamera(false)}
              className="mb-2"
              disabled={isProcessing}
            >
              Start Camera
            </Button>
            {cameraError && (
              <p className="text-red-500 text-sm text-center mt-2 px-4">
                {cameraError}
              </p>
            )}
          </div>
        )}
        
        {/* Loading Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="h-8 w-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {/* Camera Controls */}
      <div className="p-3 bg-gray-900 flex justify-center">
        <Button
          className="rounded-full h-14 w-14 bg-white hover:bg-gray-200"
          onClick={captureImage}
          disabled={!isCameraActive || isProcessing}
        >
          <div className="rounded-full h-12 w-12 border-2 border-gray-800"></div>
        </Button>
      </div>
    </div>
  );
}