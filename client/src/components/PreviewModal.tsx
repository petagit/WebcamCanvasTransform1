import React from "react";
import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CapturedItem } from "@/pages/Home";

interface PreviewModalProps {
  item: CapturedItem;
  onClose: () => void;
}

export default function PreviewModal({ 
  item, 
  onClose 
}: PreviewModalProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = item.url;
    link.download = `pixelcam_${new Date().toISOString().replace(/:/g, "-")}.${item.type === "image" ? "jpg" : "webm"}`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const blob = await fetch(item.url).then(r => r.blob());
        const file = new File([blob], `pixelcam.${item.type === "image" ? "jpg" : "webm"}`, { type: item.type === "image" ? "image/jpeg" : "video/webm" });
        await navigator.share({
          title: 'PixelCam Capture',
          files: [file]
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      console.log("Web Share API not supported");
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={handleBackgroundClick}
    >
      <div className="bg-app-dark-light rounded-xl max-w-4xl w-full mx-4 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Preview</h3>
          <button 
            className="text-white hover:text-blue-400"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center">
          <div className="mb-6 max-h-[60vh] overflow-hidden">
            {item.type === "image" ? (
              <img src={item.url} alt="Preview" className="max-w-full" />
            ) : (
              <video src={item.url} controls className="max-w-full max-h-[60vh]" />
            )}
          </div>
          <div className="flex space-x-4">
            <Button 
              className="flex items-center space-x-2 bg-app-green hover:bg-green-600"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
              <span>Download</span>
            </Button>
            <Button 
              className="flex items-center space-x-2 bg-app-blue hover:bg-blue-600"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
