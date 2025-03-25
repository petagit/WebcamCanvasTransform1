import React, { useRef, useState, useEffect } from "react";
import { useWebcam } from "@/hooks/use-webcam";
import { processFrame } from "@/utils/image-processing";
import { Button } from "@/components/ui/button";
import { Camera, Maximize, Video, Image, RefreshCw, FlipHorizontal, Wand2, Upload, Play, SplitSquareVertical } from "lucide-react";
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
  const [isProcessing, setIsProcessing] = useState(false); // For loading indicator during image/video processing
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
    setIsProcessing(true); // Show loading indicator
    
    try {
      await startCameraFn();
      setIsProcessing(false); // Hide loading indicator on success
    } catch (error) {
      console.error("Failed to start camera:", error);
      setCameraError("Unable to access camera. Please check your browser permissions.");
      setIsProcessing(false); // Clear loading indicator on error
    }
  };

  // This comment intentionally left blank (removing duplicate state declaration)

  // Process uploaded video with current filter settings
  const processUploadedVideo = () => {
    console.log("Processing uploaded video...");
    setIsProcessing(true); // Show loading indicator
    
    if (!canvasRef.current || !uploadedVideoElement || !uploadedVideoUrl) {
      console.error("Missing canvas, video element, or video URL");
      setCameraError("Error processing video. Missing required elements.");
      setIsProcessing(false); // Clear loading indicator on error
      return;
    }
    
    try {
      // If webcam is active, stop it
      if (isCameraActive) {
        stopCamera();
      }

      // Set uploaded image mode to prevent webcam rendering
      setUploadedImageMode(true);
      
      // Create a proper-sized thumbnail from the first frame of the video
      const thumbnail = createThumbnailFromVideo(uploadedVideoElement);
      console.log("Created thumbnail with dimensions:", 
        uploadedVideoElement.videoWidth, "x", uploadedVideoElement.videoHeight);
      setBeforeImage(thumbnail);
      
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
        setIsProcessingVideo(false);
        setIsProcessing(false); // Clear loading indicator on error
      });
    } catch (error) {
      console.error("Error processing video:", error);
      setCameraError("Error applying filters to video. Please try again.");
      setIsProcessingVideo(false);
      setIsProcessing(false); // Clear loading indicator on error
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
          setIsProcessing(false); // Hide loading indicator
          // Capture the final processed frame for comparison
          const processedImageUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
          console.log("Created processed frame with dimensions:", 
            canvasRef.current.width, "x", canvasRef.current.height);
          setAfterImage(processedImageUrl);
          setShowBeforeAfterComparison(true);
        }
      }
    } catch (error) {
      console.error("Error processing video frame:", error);
      setIsProcessingVideo(false);
      setIsProcessing(false); // Clear loading indicator on error
    }
  };
  
  // Create a thumbnail from the video element
  const createThumbnailFromVideo = (videoElement: HTMLVideoElement): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // Make sure we're drawing at the correct size and position
      tempCtx.drawImage(
        videoElement, 
        0, 0, videoElement.videoWidth, videoElement.videoHeight,
        0, 0, tempCanvas.width, tempCanvas.height
      );
      
      console.log("Creating thumbnail with dimensions:", tempCanvas.width, "x", tempCanvas.height);
      return tempCanvas.toDataURL('image/jpeg', 0.95);
    }
    
    return '';
  };
  
  // Process the uploaded image with current filter settings
  const processUploadedImage = () => {
    console.log("Processing uploaded image...");
    
    // Show loading indicator
    setIsProcessing(true);
    
    if (!canvasRef.current || !originalImageUrl) {
      console.error("Missing canvas or original image URL");
      setCameraError("Error processing image. Missing required elements.");
      setIsProcessing(false); // Clear loading indicator on error
      return;
    }
    
    try {
      console.log("Original image URL:", originalImageUrl.substring(0, 50) + "...");
      
      // Create temp image from original
      const img = document.createElement('img');
      
      img.onload = () => {
        console.log("Image loaded with dimensions:", img.width, "x", img.height);
        
        if (canvasRef.current) {
          // Store the original image for the slider - use crossOrigin to avoid CORS issues
          // Create a clean copy of the image to ensure consistent dimensions
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.drawImage(img, 0, 0, img.width, img.height);
            const cleanOriginalUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
            setBeforeImage(cleanOriginalUrl);
            console.log("Created clean original image for slider");
          } else {
            // Fallback if we can't create a clean copy
            setBeforeImage(originalImageUrl);
          }
          
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
                const processedImageUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
                console.log("Generated processed image URL:", processedImageUrl.substring(0, 50) + "...");
                console.log("Processed image dimensions:", canvasRef.current.width, "x", canvasRef.current.height);
                setAfterImage(processedImageUrl);
                
                // Show before/after comparison
                setShowBeforeAfterComparison(true);
                
                // Stop camera if it's active to ensure we stay in image mode
                if (isCameraActive) {
                  stopCamera();
                }
                
                // Set uploaded image mode to true to keep showing the processed image
                setUploadedImageMode(true);
                setShowPlaceholder(false);
                
                // Hide loading indicator
                setIsProcessing(false);
              } else {
                console.error("Could not create backup canvas context");
                setCameraError("Failed to process image. Please try again.");
                setIsProcessing(false); // Clear loading indicator on error
              }
            } catch (imgError) {
              console.error("Error during image processing:", imgError);
              setCameraError("Error processing image data. Please try a different image.");
              setIsProcessing(false); // Clear loading indicator on error
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
      
      img.onerror = () => {
        console.error("Error loading image");
        setCameraError("Failed to load the image. Please try again.");
        setIsProcessing(false); // Clear loading indicator on error
      };
      
      img.src = originalImageUrl;
      console.log("Set image src, waiting for load...");
    } catch (error) {
      console.error("Error processing image:", error);
      setCameraError("Error applying filters. Please try again.");
      setIsProcessing(false); // Clear loading indicator on error
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
    } else if (!uploadedImageMode) {
      // Only show placeholder if we're not in uploaded image mode
      setShowPlaceholder(true);
    }
  }, [isCameraActive, onCameraReady, uploadedImageMode]);

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
    setIsProcessing(true); // Show loading indicator during capture
    
    if (!canvasRef.current) {
      console.error("Cannot capture image: canvas not available");
      setCameraError("Error capturing image. Canvas not available.");
      setIsProcessing(false);
      return;
    }
    
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);
      console.log("Captured image dimensions:", canvasRef.current.width, "x", canvasRef.current.height);
      onCaptureImage(dataUrl);
      setIsProcessing(false); // Hide loading indicator on success
    } catch (error) {
      console.error("Error capturing image:", error);
      setCameraError("Error capturing image. Please try again.");
      setIsProcessing(false); // Clear loading indicator on error
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (!isRecording && mediaRecorder) {
      // Show processing indicator when starting recording
      setIsProcessing(true);
      
      try {
        // Start recording
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          try {
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            onRecordVideo(url);
            setIsProcessing(false); // Hide loading indicator after successful processing
          } catch (error) {
            console.error("Error processing recorded video:", error);
            setCameraError("Failed to process recorded video. Please try again.");
            setIsProcessing(false); // Clear loading indicator on error
          }
        };
        
        mediaRecorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          setCameraError("Recording error. Please try again.");
          setIsProcessing(false); // Clear loading indicator on error
          setIsRecording(false);
        };
        
        // Start recording
        mediaRecorder.start(100); // Record in 100ms chunks
        setIsRecording(true);
        onStreamingChange(true);
        setIsProcessing(false); // Hide loading indicator once recording starts
      } catch (error) {
        console.error("Error starting recording:", error);
        setCameraError("Failed to start recording. Please try again.");
        setIsProcessing(false); // Clear loading indicator on error
      }
    } else if (isRecording && mediaRecorder) {
      // Show processing indicator when stopping recording
      setIsProcessing(true);
      
      try {
        // Stop recording
        mediaRecorder.stop();
        setIsRecording(false);
        onStreamingChange(false);
        // Note: setIsProcessing(false) will be called in the onstop handler
      } catch (error) {
        console.error("Error stopping recording:", error);
        setCameraError("Failed to stop recording. Please try again.");
        setIsProcessing(false); // Clear loading indicator on error
        setIsRecording(false);
        onStreamingChange(false);
      }
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
                          // Show loading indicator when starting upload
                          setIsProcessing(true);
                          
                          // Handle image file upload
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/png,image/jpg';
                          
                          // Set a timeout to clear the loading indicator if nothing is selected
                          const uploadTimeout = setTimeout(() => {
                            setIsProcessing(false);
                          }, 30000); // 30 second timeout
                          
                          input.onchange = (e) => {
                            clearTimeout(uploadTimeout);
                            
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
                                  
                                  // Clear the loading indicator if the user doesn't want to apply filters immediately
                                  setIsProcessing(false);
                                  
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
                                      
                                      // Process the image immediately with filters
                                      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                                      processFrame(
                                        document.createElement('video'), // Dummy video element
                                        canvasRef.current,
                                        filterSettings,
                                        false,
                                        imageData
                                      );
                                      
                                      // Store the processed image for the slider
                                      const processedImageUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
                                      console.log("Processed image dimensions:", canvasRef.current.width, "x", canvasRef.current.height);
                                      setAfterImage(processedImageUrl);
                                      setShowBeforeAfterComparison(true);
                                    }
                                  }
                                };
                                
                                img.onerror = () => {
                                  console.error("Error loading image");
                                  setCameraError("Failed to load the image. Please try a different file.");
                                  setIsProcessing(false); // Clear loading indicator on error
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
                      
                      {/* Apply Filters button is in the footer */}
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
                          // Show loading indicator when starting upload
                          setIsProcessing(true);
                          
                          // Handle video file upload
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'video/mp4';
                          
                          // Set a timeout to clear the loading indicator if nothing is selected
                          const uploadTimeout = setTimeout(() => {
                            setIsProcessing(false);
                          }, 30000); // 30 second timeout
                          
                          input.click();
                          
                          input.onchange = (e) => {
                            clearTimeout(uploadTimeout);
                            
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
                                setIsProcessing(false); // Clear loading indicator once video is loaded
                              };
                              
                              videoElement.onerror = () => {
                                console.error("Error loading video");
                                setCameraError("This video format is not supported. Please try an MP4 file.");
                                setIsProcessing(false); // Clear loading indicator on error
                              };
                            }
                          };
                        }}
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload Video</span>
                      </Button>
                      
                      {/* Apply Filters button is in the footer */}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <>
              {showBeforeAfterComparison && beforeImage && afterImage ? (
                <div className="w-full h-full flex flex-col justify-center items-center">
                  <BeforeAfterSlider 
                    beforeImage={beforeImage} 
                    afterImage={afterImage}
                    className="w-full max-h-full"
                  />
                  
                  {/* Toggle button for video comparison */}
                  {uploadedVideoUrl && (
                    <Button
                      className="mt-2 bg-app-blue hover:bg-blue-600"
                      onClick={() => {
                        setShowBeforeAfterComparison(false);
                        setIsProcessingVideo(true);
                        // Resume video processing
                        if (uploadedVideoElement) {
                          uploadedVideoElement.currentTime = 0;
                          uploadedVideoElement.play().catch(err => {
                            console.error("Error playing video:", err);
                          });
                        }
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play Processed Video
                    </Button>
                  )}
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
                  
                  {/* Show button to compare before/after for videos during playback */}
                  {isProcessingVideo && uploadedVideoUrl && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <Button
                        className="bg-app-blue hover:bg-blue-600"
                        onClick={() => {
                          setIsProcessingVideo(false);
                          setShowBeforeAfterComparison(true);
                        }}
                      >
                        <SplitSquareVertical className="h-4 w-4 mr-2" />
                        Show Before/After
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {/* Loading Indicator */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                  <div className="bg-app-dark rounded-lg p-6 flex flex-col items-center">
                    <div className="animate-spin h-10 w-10 border-4 border-app-blue border-t-transparent rounded-full mb-4"></div>
                    <div className="text-white font-medium">Processing...</div>
                  </div>
                </div>
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
          
          {uploadedVideoUrl && uploadedVideoElement && !isProcessingVideo && (
            <Button
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
              onClick={processUploadedVideo}
            >
              <Wand2 className="h-5 w-5" />
              <span>Apply Filters</span>
            </Button>
          )}
          
          {isCameraActive && (
            <Button
              className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600"
              onClick={async () => {
                setIsProcessing(true); // Show loading indicator
                try {
                  await switchCamera();
                  setIsProcessing(false); // Hide loading indicator on success
                } catch (error) {
                  console.error("Error switching camera:", error);
                  setIsProcessing(false); // Clear loading indicator on error
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