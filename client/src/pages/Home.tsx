import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Webcam from "@/components/Webcam";
import ControlPanel from "@/components/ControlPanel";
import StatusBar from "@/components/StatusBar";
import PreviewModal from "@/components/PreviewModal";
import HelpModal from "@/components/HelpModal";
import { useToast } from "@/hooks/use-toast";

export type CapturedItem = {
  id: string;
  type: "image" | "video";
  url: string;
  timestamp: Date;
};

export type FilterSettings = {
  dotSize: number; // Changed from pixelSize to dotSize
  contrast: number;
  brightness: number;
  isGrayscale: boolean;
};

export default function Home() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [previewItem, setPreviewItem] = useState<CapturedItem | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    dotSize: 10,
    contrast: 1.5,
    brightness: 1.0,
    isGrayscale: true,
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

  return (
    <div className="min-h-screen flex flex-col bg-app-dark text-white">
      <Header onHelpClick={() => setShowHelpModal(true)} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <StatusBar isStreaming={isStreaming} cameraReady={cameraReady} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Webcam 
              onCameraReady={() => setCameraReady(true)}
              onCaptureImage={handleCaptureImage}
              onRecordVideo={handleRecordVideo}
              onStreamingChange={setIsStreaming}
              filterSettings={filterSettings}
            />
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <ControlPanel
              filterSettings={filterSettings}
              setFilterSettings={setFilterSettings}
              cameraReady={cameraReady}
              capturedItems={capturedItems}
              onViewItem={handleViewItem}
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
