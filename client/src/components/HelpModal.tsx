import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
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
      <div className="bg-app-dark-light rounded-xl max-w-3xl w-full mx-4 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">How to Use PixelCam</h3>
          <button 
            className="text-white hover:text-blue-400"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 text-white overflow-y-auto max-h-[70vh]">
          <div className="space-y-4">
            <div>
              <h4 className="text-white text-lg font-medium mb-2 text-shadow">Getting Started</h4>
              <p>PixelCam allows you to add a dot matrix effect to your webcam feed or uploaded video in real-time.</p>
            </div>
            <div>
              <h4 className="text-white text-lg font-medium mb-2 text-shadow">Camera Controls</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Click "Start Camera" to access your webcam</li>
                <li>Use "Capture" to take a snapshot</li>
                <li>Toggle "Start Stream" to begin recording</li>
                <li>"Switch Source" lets you change between available cameras</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-lg font-medium mb-2 text-shadow">Filter Settings</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Adjust "Dot Size" to change the dot matrix level</li>
                <li>"Contrast" enhances or reduces the difference between light and dark areas</li>
                <li>"Brightness" controls the overall lightness of the image</li>
                <li>Switch between "Grayscale" and "Color" modes</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-lg font-medium mb-2 text-shadow">Exporting</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>"Download as JPG" saves the current frame</li>
                <li>"Download as MP4" saves your recorded stream</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <Button 
            className="bg-app-blue hover:bg-blue-600 text-white font-medium"
            onClick={onClose}
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}
