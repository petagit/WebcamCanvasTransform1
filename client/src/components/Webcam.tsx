import React, { useRef, useState, useEffect } from "react";
import { useWebcam } from "@/hooks/use-webcam";
import { processFrame } from "@/utils/image-processing";
import { Button } from "@/components/ui/button";
import { Camera, Maximize, Video, Image, RefreshCw, FlipHorizontal, Wand2, Upload } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FilterSettings } from "@/pages/Home";
import BeforeAfterSlider from "./BeforeAfterSlider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [uploadedImageMode, setUploadedImageMode] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [showBeforeAfterComparison, setShowBeforeAfterComparison] = useState(false);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoElement, setUploadedVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
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

  // This comment intentionally left blank (removing duplicate state declaration)

  // Process uploaded video with current filter settings
  const processUploadedVideo = () => {
    console.log("Processing uploaded video...");
    if (!canvasRef.current || !uploadedVideoElement || !uploadedVideoUrl) {
      console.error("Missing canvas, video element, or video URL");
      return;
    }
    
    try {
      // If webcam is active, stop it
      if (isCameraActive) {
        stopCamera();
      }

      // Set uploaded image mode to prevent webcam rendering
      setUploadedImageMode(true);
      
      // Store the original video for comparison
      setBeforeImage(createThumbnailFromVideo(uploadedVideoElement));
      
      // Set up video processing loop
      setIsProcessingVideo(true);
      
      // Set up event handlers for the video
      uploadedVideoElement.onplay = () => {
        // Start processing video frames
        processVideoFrame();
      };
      
      // Start playing the video
      uploadedVideoElement.play().catch(err => {
        console.error("Error playing video:", err);
        setCameraError("Failed to play the video. Please try again.");
      });
    } catch (error) {
      console.error("Error processing video:", error);
      setCameraError("Error applying filters to video. Please try again.");
      setIsProcessingVideo(false);
    }
  };
  
  // Process a single frame of the uploaded video
  const processVideoFrame = () => {
    if (!canvasRef.current || !uploadedVideoElement || !isProcessingVideo) return;
    
    try {
      // Draw the current video frame to canvas
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Set canvas dimensions to match video
        canvasRef.current.width = uploadedVideoElement.videoWidth;
        canvasRef.current.height = uploadedVideoElement.videoHeight;
        
        // Draw current video frame
        ctx.drawImage(uploadedVideoElement, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Apply filters
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        processFrame(
          uploadedVideoElement,
          canvasRef.current,
          filterSettings,
          false,
          imageData
        );
        
        // Continue processing if video is still playing
        if (!uploadedVideoElement.paused && !uploadedVideoElement.ended && isProcessingVideo) {
          requestAnimationFrame(processVideoFrame);
        } else {
          setIsProcessingVideo(false);
          // Capture the final processed frame for comparison
          const processedImageUrl = canvasRef.current.toDataURL('image/jpeg');
          setAfterImage(processedImageUrl);
          setShowBeforeAfterComparison(true);
        }
      }
    } catch (error) {
      console.error("Error processing video frame:", error);
      setIsProcessingVideo(false);
    }
  };
  
  // Create a thumbnail from the video element
  const createThumbnailFromVideo = (videoElement: HTMLVideoElement): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL('image/jpeg');
    }
    
    return '';
  };
  
  // Process the uploaded image with current filter settings
  const processUploadedImage = () => {
    console.log("Processing uploaded image...");
    if (!canvasRef.current || !originalImageUrl) {
      console.error("Missing canvas or original image URL");
      return;
    }
    
    try {
      console.log("Original image URL:", originalImageUrl.substring(0, 50) + "...");
      
      // Create temp image from original
      const img = document.createElement('img');
      
      img.onload = () => {
        console.log("Image loaded with dimensions:", img.width, "x", img.height);
        
        if (canvasRef.current) {
          // Store the original image for the slider
          setBeforeImage(originalImageUrl);
          
          // Process the image with filters
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          
          // First draw the original image
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            console.log("Drew original image on canvas");
            
            try {
              // Get the image data
              const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
              console.log("Got image data:", imageData.width, "x", imageData.height);
              
              // Create a fake video element for processFrame
              const fakeVideo = document.createElement('video') as HTMLVideoElement;
              fakeVideo.width = img.width;
              fakeVideo.height = img.height;
              
              // Process with current filter settings
              console.log("Applying filter settings:", JSON.stringify(filterSettings));
              
              // Create a backup of the original image for before/after
              const backupCanvas = document.createElement('canvas');
              backupCanvas.width = img.width;
              backupCanvas.height = img.height;
              const backupCtx = backupCanvas.getContext('2d');
              
              if (backupCtx) {
                // Copy the original image to the backup canvas
                backupCtx.drawImage(img, 0, 0);
                
                // Now apply the filter to the main canvas
                processFrame(
                  fakeVideo, // This won't be used for drawing, just for dimensions
                  canvasRef.current,
                  filterSettings,
                  false, // isBackCamera doesn't matter for still image
                  imageData // Pass the image data to avoid reading from the video
                );
                
                // Once processed, capture the result for comparison
                const processedImageUrl = canvasRef.current.toDataURL('image/jpeg');
                console.log("Generated processed image URL:", processedImageUrl.substring(0, 50) + "...");
                setAfterImage(processedImageUrl);
                
                // Show before/after comparison
                setShowBeforeAfterComparison(true);
              } else {
                console.error("Could not create backup canvas context");
                setCameraError("Failed to process image. Please try again.");
              }
            } catch (imgError) {
              console.error("Error during image processing:", imgError);
              setCameraError("Error processing image data. Please try a different image.");
            }
          } else {
            console.error("Could not get canvas context");
            setCameraError("Could not initialize canvas. Please try reloading the page.");
          }
        } else {
          console.error("Canvas ref lost during image loading");
          setCameraError("Internal error. Please try reloading the page.");
        }
      };
      
      img.onerror = (err: Event) => {
        console.error("Error loading image:", err);
        setCameraError("Failed to load the image. Please try again.");
      };
      
      img.src = originalImageUrl;
      console.log("Set image src, waiting for load...");
    } catch (error) {
      console.error("Error processing image:", error);
      setCameraError("Error applying filters. Please try again.");
    }
  };

  // Set up animation frame for canvas rendering
  useEffect(() => {
    let animationFrameId: number;
    
    const renderFrame = () => {
      if (videoRef.current && canvasRef.current && isCameraActive && !uploadedImageMode) {
        processFrame(
          videoRef.current,
          canvasRef.current,
          filterSettings,
          isBackCamera
        );
      }
      animationFrameId = requestAnimationFrame(renderFrame);
    };
    
    if (isCameraActive && !uploadedImageMode) {
      animationFrameId = requestAnimationFrame(renderFrame);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isCameraActive, filterSettings, isBackCamera, uploadedImageMode]);

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
  
  // Set up camera usage timer for paywall
  const cameraUsageTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (isCameraActive && !showPaywall) {
      // Reset timer when camera is first activated
      cameraUsageTimeRef.current = 0;
      
      // Start a new timer
      timerRef.current = setInterval(() => {
        cameraUsageTimeRef.current += 1;
        console.log(`Camera active for ${cameraUsageTimeRef.current} seconds`);
        
        // Show paywall after 10 seconds of camera usage
        if (cameraUsageTimeRef.current === 10) {
          setShowPaywall(true);
          
          // If recording, stop it when paywall shows
          if (isRecording && mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            onStreamingChange(false);
          }
        }
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCameraActive, showPaywall, isRecording, mediaRecorder, onStreamingChange]);

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
              <div className="mt-5">
                <h3 className="text-white font-medium mb-2">Input Source</h3>
                <Tabs defaultValue="webcam" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="webcam">Webcam</TabsTrigger>
                    <TabsTrigger value="image">Upload Image</TabsTrigger>
                    <TabsTrigger value="video">Upload Video</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="webcam" className="py-2">
                    <Button 
                      className="bg-app-blue hover:bg-blue-600 w-full"
                      onClick={handleStartCamera}
                    >
                      Start Camera
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="image" className="py-2">
                    <div className="space-y-2">
                      <div className="text-gray-300 text-sm">
                        Select JPG or PNG image
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center space-x-2"
                        onClick={() => {
                          // Handle image file upload
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/png,image/jpg';
                          input.click();
                          
                          input.onchange = (e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.files && target.files[0]) {
                              const file = target.files[0];
                              console.log("Uploading image file:", file.name);
                              
                              // Create a URL from the file
                              const imageUrl = URL.createObjectURL(file);
                              setOriginalImageUrl(imageUrl);
                              
                              // Process the image immediately
                              if (canvasRef.current) {
                                // Create an image element from the file
                                const img = document.createElement('img');
                                img.onload = () => {
                                  console.log("Image loaded with dimensions:", img.width, "x", img.height);
                                  
                                  if (canvasRef.current) {
                                    // Store the original image for the slider
                                    setBeforeImage(imageUrl);
                                    
                                    // Display the image on the canvas
                                    const ctx = canvasRef.current.getContext('2d');
                                    if (ctx) {
                                      // Set canvas dimensions to match image
                                      canvasRef.current.width = img.width;
                                      canvasRef.current.height = img.height;
                                      
                                      // Draw the image on the canvas
                                      ctx.drawImage(img, 0, 0);
                                      
                                      // Stop camera if it's active
                                      if (isCameraActive) {
                                        stopCamera();
                                      }
                                      
                                      // Set uploaded image mode
                                      setUploadedImageMode(true);
                                      setShowPlaceholder(false);
                                    }
                                  }
                                };
                                
                                img.onerror = (event: Event) => {
                                  console.error("Error loading image:", event);
                                  setCameraError("Failed to load the image. Please try a different file.");
                                };
                                
                                img.src = imageUrl;
                              }
                            }
                          };
                        }}
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload Image</span>
                      </Button>
                      
                      {originalImageUrl && (
                        <Button 
                          className="w-full bg-app-blue hover:bg-blue-600 mt-2"
                          onClick={processUploadedImage}
                        >
                          <Wand2 className="h-5 w-5 mr-2" />
                          Apply Filters
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="video" className="py-2">
                    <div className="space-y-2">
                      <div className="text-gray-300 text-sm">
                        Select MP4 file
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center space-x-2"
                        onClick={() => {
                          // Handle video file upload
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'video/mp4';
                          input.click();
                          
                          input.onchange = (e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.files && target.files[0]) {
                              const file = target.files[0];
                              console.log("Uploading video file:", file.name);
                              
                              // Create a video URL from the file
                              const videoUrl = URL.createObjectURL(file);
                              setUploadedVideoUrl(videoUrl);
                              
                              // Create a video element to work with
                              const videoElement = document.createElement('video');
                              videoElement.src = videoUrl;
                              videoElement.controls = true;
                              videoElement.muted = true;
                              videoElement.width = 640;
                              
                              videoElement.onloadedmetadata = () => {
                                console.log(`Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                                setUploadedVideoElement(videoElement);
                              };
                              
                              videoElement.onerror = (err) => {
                                console.error("Error loading video:", err);
                                setCameraError("This video format is not supported. Please try an MP4 file.");
                              };
                            }
                          };
                        }}
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload Video</span>
                      </Button>
                      
                      {uploadedVideoUrl && uploadedVideoElement && !isProcessingVideo && (
                        <Button 
                          className="w-full bg-app-blue hover:bg-blue-600 mt-2"
                          onClick={processUploadedVideo}
                        >
                          <Wand2 className="h-5 w-5 mr-2" />
                          Apply Filters
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <>
              {showBeforeAfterComparison && beforeImage && afterImage ? (
                <div className="w-full h-full flex justify-center items-center">
                  <BeforeAfterSlider 
                    beforeImage={beforeImage} 
                    afterImage={afterImage}
                    className="w-full max-h-full"
                  />
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    style={{ display: 'none' }}
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                  />
                </>
              )}
              
              {showPaywall && (
                <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
                  <div className="bg-app-dark rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Upgrade to Continue
                    </h3>
                    <p className="text-gray-300 mb-4">
                      You've reached the end of your free preview. Subscribe to unlock unlimited access.
                    </p>
                    <div className="bg-app-dark-light rounded-lg p-4 mb-6">
                      <h4 className="text-white font-medium mb-3">Premium Benefits:</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          Unlimited camera usage with no interruptions
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          Access to all premium filter styles
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          Save unlimited media to your gallery
                        </li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3"
                      onClick={() => {
                        window.location.href = "/subscription";
                      }}
                    >
                      Subscribe Now
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800 mt-2"
                      onClick={() => {
                        setShowPaywall(false);
                      }}
                    >
                      Continue with Limited Access
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
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
          
          {mediaRecorder && (
            <Button
              className={`flex items-center space-x-1 ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-app-blue hover:bg-blue-600'
              }`}
              onClick={toggleRecording}
              disabled={showPlaceholder}
            >
              <Video className="h-5 w-5" />
              <span>{isRecording ? `Stop (${formatTime(recordingTime)})` : 'Record'}</span>
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {originalImageUrl && (
            <Button
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
              onClick={processUploadedImage}
            >
              <Wand2 className="h-5 w-5" />
              <span>Apply Filters</span>
            </Button>
          )}
          
          {isCameraActive && (
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