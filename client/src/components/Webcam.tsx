import React, { useRef, useState, useEffect } from "react";
import { useWebcam } from "@/hooks/use-webcam";
import { processFrame } from "@/utils/image-processing";
import { Button } from "@/components/ui/button";
import { Camera, Maximize, Video, Image, RefreshCw, FlipHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const {
    stream,
    mediaRecorder,
    recordedChunks,
    switchCamera,
    startCamera: startCameraFn,
    toggleFacingMode,
    stopCamera,
    isCameraActive,
    availableCameras,
    currentFacingMode,
    isBackCamera,
  } = useWebcam(videoRef);
  
  // Wrap startCamera function to handle errors more gracefully in the UI
  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      await startCameraFn();
    } catch (error) {
      console.error("Failed to start camera:", error);
      setCameraError("Unable to access camera. Please check your browser permissions.");
    }
  };

  // Set up animation frame for canvas rendering
  useEffect(() => {
    let animationFrameId: number;
    
    const renderFrame = () => {
      if (videoRef.current && canvasRef.current && isCameraActive) {
        processFrame(
          videoRef.current,
          canvasRef.current,
          filterSettings,
          isBackCamera
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
  }, [isCameraActive, filterSettings, isBackCamera]);

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

  // Handle fullscreen with mobile compatibility
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        // Try standard Fullscreen API first
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          // Safari/iOS support
          (containerRef.current as any).webkitRequestFullscreen();
        } else {
          // If fullscreen isn't supported, we'll simulate it with CSS
          setIsFullscreen(!isFullscreen);
        }
      } else if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      } else {
        // Toggle our CSS-based fullscreen state
        setIsFullscreen(!isFullscreen);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      // Fallback to CSS-based fullscreen
      setIsFullscreen(!isFullscreen);
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
    
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg");
      onCaptureImage(dataUrl);
    } catch (error) {
      console.error("Error capturing image:", error);
      setCameraError("Error capturing image. Please try again.");
    }
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
        <h2 className="text-lg font-semibold text-white">Preview</h2>
        <div className="flex space-x-2">
          {isRecording && (
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-1"></div>
              <span className="text-red-500 text-sm font-bold">REC</span>
            </div>
          )}
          <button 
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className={`relative flex justify-center items-center bg-black min-h-[400px] ${
          isFullscreen && !document.fullscreenElement 
            ? 'fixed inset-0 z-50 min-h-screen w-screen' 
            : ''
        }`}
      >
        <div className="relative w-full h-full" style={{ minHeight: '400px', overflow: 'hidden' }}>
          {showPlaceholder ? (
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
              <Camera className="h-20 w-20 text-gray-600 mb-4" />
              
              {cameraError ? (
                <>
                  <div className="text-red-500 font-medium mb-4">{cameraError}</div>
                  <div className="text-white text-sm mb-4">
                    On mobile devices, you may need to use your device settings to allow camera access,
                    or try using a different browser.
                  </div>
                </>
              ) : null}
              
              <Button 
                className="bg-app-blue hover:bg-blue-600"
                onClick={handleStartCamera}
              >
                Start Camera
              </Button>
              
              {/* Fallback option for testing */}
              <div className="mt-5 text-gray-500 text-sm">
                No camera? You can also
                <Button 
                  variant="link" 
                  className="text-app-blue underline px-1"
                  onClick={() => {
                    // Handle file upload option
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files[0]) {
                        const file = target.files[0];
                        const url = URL.createObjectURL(file);
                        const img = document.createElement('img');
                        img.onload = () => {
                          // Create a canvas with the image
                          try {
                            if (canvasRef.current) {
                              const ctx = canvasRef.current.getContext('2d');
                              if (ctx) {
                                // Set reasonable dimensions
                                const MAX_WIDTH = 1280;
                                const MAX_HEIGHT = 720;
                                let width = img.width;
                                let height = img.height;
                                
                                // Calculate new dimensions while preserving aspect ratio
                                if (width > MAX_WIDTH) {
                                  const ratio = MAX_WIDTH / width;
                                  width = MAX_WIDTH;
                                  height = height * ratio;
                                }
                                if (height > MAX_HEIGHT) {
                                  const ratio = MAX_HEIGHT / height;
                                  height = MAX_HEIGHT;
                                  width = width * ratio;
                                }
                                
                                canvasRef.current.width = width;
                                canvasRef.current.height = height;
                                ctx.drawImage(img, 0, 0, width, height);
                                setShowPlaceholder(false);
                                onCameraReady();
                              }
                            }
                          } catch (error) {
                            console.error("Error processing uploaded image:", error);
                            setCameraError("Error processing image. Please try another image.");
                          }
                        };
                        img.src = url;
                      }
                    };
                    input.click();
                  }}
                >
                  upload an image
                </Button>
                to test filters
              </div>
            </div>
          ) : null}
          
          {/* Container for video (hidden but used as source) */}
          <div className="hidden">
            <video 
              ref={videoRef}
              className={showPlaceholder ? 'hidden' : ''}
              autoPlay
              playsInline
              muted
            />
          </div>
          
          {/* Canvas container with proper centering */}
          <div id="canvas-container" className="w-full h-full flex justify-center items-center">
            <canvas 
              ref={canvasRef}
              id="previewCanvas"
              className={`pixelate-canvas ${showPlaceholder ? 'hidden' : ''}`}
              style={{ 
                imageRendering: 'pixelated',
                backgroundColor: 'black',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-800 flex flex-wrap gap-2 justify-center sm:justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            className="flex items-center space-x-1 bg-app-blue hover:bg-blue-600"
            onClick={captureImage}
            disabled={showPlaceholder}
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
          {isMobile ? (
            // For mobile devices, show a toggle for front/back camera
            <Button
              className={`flex items-center space-x-1 ${isBackCamera ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
              onClick={async () => {
                try {
                  await toggleFacingMode();
                } catch (error) {
                  console.error("Error toggling camera:", error);
                }
              }}
              disabled={!isCameraActive}
            >
              <FlipHorizontal className="h-5 w-5" />
              <span>{isBackCamera ? 'Front Camera' : 'Back Camera'}</span>
            </Button>
          ) : (
            // For desktop devices, show device switching button
            <Button
              className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600"
              onClick={async () => {
                try {
                  await switchCamera();
                } catch (error) {
                  console.error("Error switching camera:", error);
                }
              }}
              disabled={!isCameraActive || availableCameras.length <= 1}
            >
              <RefreshCw className="h-5 w-5" />
              <span>Switch Source</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}