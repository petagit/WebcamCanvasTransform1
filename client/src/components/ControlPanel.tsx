import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Upload, Download, Image, Video } from "lucide-react";
import ActivityFeed from "./ActivityFeed";
import { useWebcam } from "@/hooks/use-webcam";
import { downloadAsJpg } from "@/utils/file-utils";
import type { FilterSettings, CapturedItem } from "@/pages/Home";

interface ControlPanelProps {
  filterSettings: FilterSettings;
  setFilterSettings: React.Dispatch<React.SetStateAction<FilterSettings>>;
  cameraReady: boolean;
  capturedItems: CapturedItem[];
  onViewItem: (item: CapturedItem) => void;
}

export default function ControlPanel({
  filterSettings,
  setFilterSettings,
  cameraReady,
  capturedItems,
  onViewItem
}: ControlPanelProps) {
  const [isWebcamSource, setIsWebcamSource] = useState(true);
  const { stopCamera } = useWebcam();
  
  const handleDotSizeChange = (value: number[]) => {
    setFilterSettings(prev => ({ ...prev, dotSize: value[0] }));
  };
  
  const handleContrastChange = (value: number[]) => {
    setFilterSettings(prev => ({ ...prev, contrast: value[0] }));
  };
  
  const handleBrightnessChange = (value: number[]) => {
    setFilterSettings(prev => ({ ...prev, brightness: value[0] }));
  };
  
  const toggleSourceType = (isWebcam: boolean) => {
    if (!isWebcam && isWebcamSource) {
      stopCamera();
    }
    setIsWebcamSource(isWebcam);
  };
  
  const toggleFilterType = (isGrayscale: boolean) => {
    setFilterSettings(prev => ({ ...prev, isGrayscale }));
  };
  
  return (
    <>
      {/* Input Source Section */}
      <div className="bg-app-dark-light rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Input Source</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Button 
              className={isWebcamSource ? "flex-1 bg-app-blue" : "flex-1 bg-gray-700 hover:bg-gray-600"}
              onClick={() => toggleSourceType(true)}
            >
              Webcam
            </Button>
            <Button 
              className={!isWebcamSource ? "flex-1 bg-app-blue" : "flex-1 bg-gray-700 hover:bg-gray-600"}
              onClick={() => toggleSourceType(false)}
            >
              Upload Video
            </Button>
          </div>
          {!isWebcamSource && (
            <div className="mt-3">
              <Label className="block text-sm font-medium text-gray-400 mb-1">Select MP4 file</Label>
              <input 
                type="file" 
                id="videoUpload" 
                accept="video/mp4"
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-700 file:text-white
                  hover:file:bg-gray-600"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Filter Settings Section */}
      <div className="bg-app-dark-light rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Filter Settings</h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Dot Size */}
          <div>
            <div className="flex justify-between">
              <Label className="text-sm font-medium text-gray-400">Dot Size</Label>
              <span className="text-sm text-gray-400">{filterSettings.dotSize}</span>
            </div>
            <Slider 
              value={[filterSettings.dotSize]} 
              onValueChange={handleDotSizeChange}
              min={1}
              max={30}
              step={1}
              className="mt-2"
            />
          </div>
          
          {/* Contrast */}
          <div>
            <div className="flex justify-between">
              <Label className="text-sm font-medium text-gray-400">Contrast</Label>
              <span className="text-sm text-gray-400">{filterSettings.contrast.toFixed(1)}</span>
            </div>
            <Slider 
              value={[filterSettings.contrast]} 
              onValueChange={handleContrastChange}
              min={0}
              max={3}
              step={0.1}
              className="mt-2"
            />
          </div>
          
          {/* Brightness */}
          <div>
            <div className="flex justify-between">
              <Label className="text-sm font-medium text-gray-400">Brightness</Label>
              <span className="text-sm text-gray-400">{filterSettings.brightness.toFixed(1)}</span>
            </div>
            <Slider 
              value={[filterSettings.brightness]} 
              onValueChange={handleBrightnessChange}
              min={0}
              max={2}
              step={0.1}
              className="mt-2"
            />
          </div>
          
          {/* Filter Type */}
          <div className="mt-4">
            <Label className="block text-sm font-medium text-gray-400 mb-2">Filter Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className={filterSettings.isGrayscale ? "bg-app-blue" : "bg-gray-700 hover:bg-gray-600"}
                onClick={() => toggleFilterType(true)}
              >
                Grayscale
              </Button>
              <Button 
                className={!filterSettings.isGrayscale ? "bg-app-blue" : "bg-gray-700 hover:bg-gray-600"}
                onClick={() => toggleFilterType(false)}
              >
                Color
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Export Options Section */}
      <div className="bg-app-dark-light rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Export</h2>
        </div>
        <div className="p-4 space-y-4">
          <Button 
            className="w-full flex items-center justify-center space-x-2 bg-app-green hover:bg-green-600"
            disabled={!cameraReady}
            onClick={() => downloadAsJpg("previewCanvas")}
          >
            <Download className="h-5 w-5" />
            <span>Download as JPG</span>
          </Button>
          
          <Button 
            className="w-full flex items-center justify-center space-x-2 bg-app-green hover:bg-green-600"
            disabled={capturedItems.filter(item => item.type === "video").length === 0}
          >
            <Download className="h-5 w-5" />
            <span>Download as MP4</span>
          </Button>
        </div>
      </div>
      
      {/* Recent Activity Section */}
      <ActivityFeed 
        capturedItems={capturedItems} 
        onViewItem={onViewItem} 
      />
    </>
  );
}
