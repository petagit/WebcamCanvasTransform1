import React, { useRef, useState, useEffect } from "react";
import { useWebcam } from "@/hooks/use-webcam";
import { processFrame } from "@/utils/image-processing";
import { Button } from "@/components/ui/button";
import { Camera, Maximize, Video, Image, RefreshCw } from "lucide-react";
import type { FilterSettings } from "@/pages/Home";

interface WebcamProps {
  onCameraReady: () => void;
  onCaptureImage: (imageUrl: string) => void;
  onRecordVideo: (videoUrl: string) => void;
  onStreamingChange: (isStreaming: boolean) => void;
  filterSettings: FilterSettings;
}

export default function Webcam({
  onCameraReady,
  onCaptureImage,
  onRecordVideo,
  onStreamingChange,
  filterSettings,
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  
  const {
    stream,
    mediaRecorder,
    recordedChunks,
    switchCamera,
    startCamera,
    stopCamera,
    isCameraActive,
    availableCameras,
  } = useWebcam(videoRef);

  // Set up animation frame for canvas rendering
  useEffect(() => {
    let animationFrameId: number;
    
    const renderFrame = () => {
      if (videoRef.current && canvasRef.current && isCameraActive) {
        processFrame(
          videoRef.current,
          canvasRef.current,
          filterSettings.pixelSize,
          filterSettings.contrast,
          filterSettings.brightness,
          filterSettings.isGrayscale
        );
      }
      animationFrameId = requestAnimationFrame(renderFrame);
    };
    
    if (isCameraActive) {
      animationFrameId = requestAnimationFrame(renderFrame);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isCameraActive, filterSettings]);

  // Set up recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Update parent components when camera is active
  useEffect(() => {
    if (isCameraActive) {
      onCameraReady();
      setShowPlaceholder(false);
    } else {
      setShowPlaceholder(true);
    }
  }, [isCameraActive, onCameraReady]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Capture image
  const captureImage = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL("image/jpeg");
    onCaptureImage(dataUrl);
  };

  // Toggle recording
  const toggleRecording = () => {
    if (!isRecording && mediaRecorder) {
      // Start recording
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        onRecordVideo(url);
      };
      
      mediaRecorder.start(100); // Record in 100ms chunks
      setIsRecording(true);
      onStreamingChange(true);
    } else if (isRecording && mediaRecorder) {
      // Stop recording
      mediaRecorder.stop();
      setIsRecording(false);
      onStreamingChange(false);
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  return (
    <div className="bg-app-dark-light rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Preview</h2>
        <div className="flex space-x-2">
          {isRecording && (
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-1"></div>
              <span className="text-red-500 text-sm">REC</span>
            </div>
          )}
          <button 
            onClick={toggleFullscreen}
            className="text-gray-400 hover:text-white"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div ref={containerRef} className="relative flex justify-center items-center bg-black min-h-[400px]">
        <div className="relative w-full h-full flex justify-center items-center">
          {showPlaceholder ? (
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <Camera className="h-20 w-20 text-gray-600 mb-4" />
              <Button 
                className="bg-app-blue hover:bg-blue-600"
                onClick={startCamera}
              >
                Start Camera
              </Button>
            </div>
          ) : null}
          
          <video 
            ref={videoRef}
            className={`max-w-full max-h-[500px] ${showPlaceholder ? 'hidden' : ''}`}
            autoPlay
            playsInline
            muted
          />
          
          <canvas 
            ref={canvasRef}
            className={`absolute inset-0 pixelate-canvas ${showPlaceholder ? 'hidden' : ''}`}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-800 flex flex-wrap gap-2 justify-center sm:justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            className="flex items-center space-x-1 bg-app-blue hover:bg-blue-600"
            onClick={captureImage}
            disabled={!isCameraActive}
          >
            <Image className="h-5 w-5" />
            <span>Capture</span>
          </Button>
          
          <Button
            className={`flex items-center space-x-1 ${isRecording ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'}`}
            onClick={toggleRecording}
            disabled={!isCameraActive}
          >
            <Video className="h-5 w-5" />
            <span>{isRecording ? 'Stop Stream' : 'Start Stream'}</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600"
            onClick={switchCamera}
            disabled={!isCameraActive || availableCameras.length <= 1}
          >
            <RefreshCw className="h-5 w-5" />
            <span>Switch Source</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
