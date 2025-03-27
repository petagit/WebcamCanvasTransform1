import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Webcam from "@/components/Webcam";
import SimpleMobileCamera from "@/components/SimpleMobileCamera";
import SimpleWebcam from "@/components/SimpleWebcam"; // Import the simple webcam component
import FilteredWebcam from "@/components/FilteredWebcam"; // Import the filtered webcam component
import ImageUploader from "@/components/ImageUploader"; // Import the image uploader component
import ControlPanel from "@/components/ControlPanel";
import StatusBar from "@/components/StatusBar";
import PreviewModal from "@/components/PreviewModal";
import HelpModal from "@/components/HelpModal";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CapturedItem = {
  id: string;
  type: "image" | "video";
  url: string;
  timestamp: Date;
};

export type DotShape = 'circle' | 'square' | 'cross';

export type FilterSettings = {
  dotSize: number; // Size of primary halftone dots
  contrast: number;
  brightness: number;
  isGrayscale: boolean;
  dotShape: DotShape;  // Shape of the primary dots
  useSecondLayer: boolean; // Whether to use a second layer of halftones
  secondLayerOpacity: number; // Opacity of the second layer (0.0 to 1.0)
  secondLayerOffset: number; // Offset of second layer for a more dynamic look
};

export default function Home() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [previewItem, setPreviewItem] = useState<CapturedItem | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeTab, setActiveTab] = useState("camera");
  const isMobile = useIsMobile();
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    dotSize: 10,
    contrast: 1.5,
    brightness: 1.0,
    isGrayscale: true,
    dotShape: 'circle', // Default shape
    useSecondLayer: true, // Enable second layer by default
    secondLayerOpacity: 0.5, // 50% opacity for second layer
    secondLayerOffset: 5, // Offset for second layer
  });
  const { toast } = useToast();

  const handleCaptureImage = (imageUrl: string) => {
    const newItem: CapturedItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "image",
      url: imageUrl,
      timestamp: new Date(),
    };
    
    setCapturedItems((prev) => [newItem, ...prev]);
    setPreviewItem(newItem);
    setShowPreviewModal(true);
    
    toast({
      title: "Image Captured",
      description: "Your image has been successfully captured.",
    });
  };

  const handleRecordVideo = (videoUrl: string) => {
    const newItem: CapturedItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "video",
      url: videoUrl,
      timestamp: new Date(),
    };
    
    setCapturedItems((prev) => [newItem, ...prev]);
    
    toast({
      title: "Video Recorded",
      description: "Your video has been successfully recorded.",
    });
  };

  const handleViewItem = (item: CapturedItem) => {
    setPreviewItem(item);
    setShowPreviewModal(true);
  };
  
  const handleProcessVideo = (videoFile: File) => {
    // Create a temporary video element
    const videoEl = document.createElement('video');
    videoEl.muted = true;
    videoEl.playsInline = true;
    
    // Create a canvas element to render the processed frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast({
        title: "Processing Error",
        description: "Could not initialize canvas context for video processing.",
        variant: "destructive"
      });
      return;
    }
    
    // Create object URL for the file
    const videoUrl = URL.createObjectURL(videoFile);
    videoEl.src = videoUrl;
    
    // Once the video metadata is loaded, set up canvas dimensions
    videoEl.onloadedmetadata = () => {
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      
      // Temporary canvas for processing
      const processCanvas = document.createElement('canvas');
      processCanvas.width = videoEl.videoWidth;
      processCanvas.height = videoEl.videoHeight;
      
      const processCtx = processCanvas.getContext('2d');
      if (!processCtx) return;
      
      // Apply filter to the first frame
      videoEl.currentTime = 0;
      
      videoEl.onseeked = async () => {
        // Draw the current frame to the processing canvas
        processCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        
        // Get the image data
        const imageData = processCtx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process the frame with our filter
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Import processImageData dynamically to avoid circular dependencies
        const { processImageData } = await import('@/utils/image-processing');
        
        // Apply the filter to the frame
        processImageData(canvas, filterSettings, imageData);
        
        // Convert the processed frame to a data URL
        const processedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Create the captured item
        const newItem: CapturedItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: "image", // Store as image since we're just capturing a frame
          url: processedImageUrl,
          timestamp: new Date(),
        };
        
        // Add to captured items
        setCapturedItems((prev) => [newItem, ...prev]);
        
        // Show preview
        setPreviewItem(newItem);
        setShowPreviewModal(true);
        
        // Clean up
        URL.revokeObjectURL(videoUrl);
        
        toast({
          title: "Video Processed",
          description: `Video "${videoFile.name}" has been processed with the current filter settings.`,
        });
      };
      
      // Start the video to trigger the onseeked event
      videoEl.play().then(() => {
        videoEl.pause();
      }).catch(error => {
        console.error("Error playing video:", error);
        toast({
          title: "Processing Error",
          description: "Could not process video file. Please try another file.",
          variant: "destructive"
        });
      });
    };
    
    videoEl.onerror = () => {
      toast({
        title: "Video Error",
        description: "Could not load the video file. Please try another file.",
        variant: "destructive"
      });
      URL.revokeObjectURL(videoUrl);
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header onHelpClick={() => setShowHelpModal(true)} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <StatusBar isStreaming={isStreaming} cameraReady={cameraReady} activeTab={activeTab} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Tabs for switching between camera and image upload */}
            <div className="mb-4 p-3 border border-border/10 rounded-sm">
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => {
                  setActiveTab(value);
                  if (value === "image") {
                    // Turn off camera when switching to image upload tab
                    setCameraReady(false);
                    setIsStreaming(false);
                  }
                }}
                className="w-full"
              >
                <TabsList className="w-full mb-4 bg-background/40">
                  <TabsTrigger value="camera" className="flex-1 text-xs uppercase tracking-wider data-[state=active]:text-primary">Camera</TabsTrigger>
                  <TabsTrigger value="image" className="flex-1 text-xs uppercase tracking-wider data-[state=active]:text-primary">Upload Image</TabsTrigger>
                </TabsList>
                
                <TabsContent value="camera" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-serif text-primary mb-2">Filtered Camera</h3>
                    <p className="text-sm text-foreground/70 mb-3">This applies the dot matrix filter directly to the video.</p>
                    <div className="relative">
                      <FilteredWebcam
                        onCameraActive={(active) => {
                          setCameraReady(active);
                          setIsStreaming(active);
                        }}
                        onCaptureImage={handleCaptureImage}
                        filterSettings={filterSettings}
                      />
                      {!isStreaming && (
                        <div className="absolute bottom-4 left-0 right-0 text-center text-foreground/70 italic text-sm">
                          Camera inactive
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="image" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-serif text-primary mb-2">Upload Image</h3>
                    <p className="text-sm text-foreground/70 mb-3">Upload an image and apply the dot matrix filter to it.</p>
                    <ImageUploader
                      onImageFiltered={handleCaptureImage}
                      filterSettings={filterSettings}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Hidden diagnostic component that can be uncommented for debugging */}
            <div className="hidden">
              <h3 className="text-lg font-bold mb-2">Simple Camera Test</h3>
              <p className="text-sm mb-3">This is a diagnostic component to test basic camera functionality.</p>
              <SimpleWebcam 
                onCameraActive={(active) => {
                  setCameraReady(active);
                  setIsStreaming(active);
                }}
              />
            </div>
            
            {/* Original camera components hidden for now */}
            <div className="hidden">
              {isMobile ? (
                <SimpleMobileCamera
                  onCameraReady={() => setCameraReady(true)}
                  onCaptureImage={handleCaptureImage}
                  filterSettings={filterSettings}
                />
              ) : (
                <Webcam 
                  onCameraReady={() => setCameraReady(true)}
                  onCaptureImage={handleCaptureImage}
                  onRecordVideo={handleRecordVideo}
                  onStreamingChange={setIsStreaming}
                  filterSettings={filterSettings}
                />
              )}
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <ControlPanel
              filterSettings={filterSettings}
              setFilterSettings={setFilterSettings}
              cameraReady={cameraReady}
              capturedItems={capturedItems}
              onViewItem={handleViewItem}
              onProcessVideo={handleProcessVideo}
            />
          </div>
        </div>
      </main>
      
      <Footer />
      
      {showPreviewModal && previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
      
      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}
