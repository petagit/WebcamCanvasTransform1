import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Webcam from "@/components/Webcam";
import SimpleMobileCamera from "@/components/SimpleMobileCamera";
import ControlPanel from "@/components/ControlPanel";
import StatusBar from "@/components/StatusBar";
import PreviewModal from "@/components/PreviewModal";
import HelpModal from "@/components/HelpModal";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
    // Create a URL for the video file
    const videoUrl = URL.createObjectURL(videoFile);
    
    // Process logic would go here in a real implementation
    // For now, we'll just create a CapturedItem with the video URL
    const newItem: CapturedItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "video",
      url: videoUrl,
      timestamp: new Date(),
    };
    
    // Add to captured items
    setCapturedItems((prev) => [newItem, ...prev]);
    
    // Show preview
    setPreviewItem(newItem);
    setShowPreviewModal(true);
    
    toast({
      title: "Video Processed",
      description: `Video "${videoFile.name}" has been processed with the current filter settings.`,
    });
    
    // In a full implementation, we would:
    // 1. Send the video to the backend
    // 2. Process the video with the current filter settings
    // 3. Return the processed video URL
    // 4. Update the UI with the processed video
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-dark text-white">
      <Header onHelpClick={() => setShowHelpModal(true)} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <StatusBar isStreaming={isStreaming} cameraReady={cameraReady} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
