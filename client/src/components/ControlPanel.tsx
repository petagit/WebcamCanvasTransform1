import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Upload, Download, Image, Video, Circle, Square, X, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import ActivityFeed from "./ActivityFeed";
import { useWebcam } from "@/hooks/use-webcam";
import { downloadAsJpg } from "@/utils/file-utils";
import type { FilterSettings, CapturedItem, DotShape } from "@/pages/Home";

interface ControlPanelProps {
  filterSettings: FilterSettings;
  setFilterSettings: React.Dispatch<React.SetStateAction<FilterSettings>>;
  cameraReady: boolean;
  capturedItems: CapturedItem[];
  onViewItem: (item: CapturedItem) => void;
  onProcessVideo?: (videoFile: File) => void;
}

export default function ControlPanel({
  filterSettings,
  setFilterSettings,
  cameraReady,
  capturedItems,
  onViewItem,
  onProcessVideo
}: ControlPanelProps) {
  const [isWebcamSource, setIsWebcamSource] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { stopCamera } = useWebcam();
  
  const handleApplyFilter = () => {
    const fileInput = document.getElementById('videoUpload') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const videoFile = fileInput.files[0];
      setIsProcessing(true);
      
      if (onProcessVideo) {
        onProcessVideo(videoFile);
      } else {
        console.warn('onProcessVideo callback not provided');
      }
      
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    } else {
      console.warn('No video file selected');
    }
  };
  
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
  
  const handleDotShapeChange = (value: DotShape) => {
    setFilterSettings(prev => ({ ...prev, dotShape: value }));
  };
  
  const toggleSecondLayer = (enabled: boolean) => {
    setFilterSettings(prev => ({ ...prev, useSecondLayer: enabled }));
  };
  
  const handleSecondLayerOpacityChange = (value: number[]) => {
    setFilterSettings(prev => ({ ...prev, secondLayerOpacity: value[0] }));
  };
  
  const handleSecondLayerOffsetChange = (value: number[]) => {
    setFilterSettings(prev => ({ ...prev, secondLayerOffset: value[0] }));
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
              className={isWebcamSource ? "flex-1 bg-zinc-100/20" : "flex-1 bg-gray-700 hover:bg-gray-600"}
              onClick={() => toggleSourceType(true)}
            >
              Webcam
            </Button>
            <Button 
              className={!isWebcamSource ? "flex-1 bg-zinc-100/20" : "flex-1 bg-gray-700 hover:bg-gray-600"}
              onClick={() => toggleSourceType(false)}
            >
              Upload Video
            </Button>
          </div>
          {!isWebcamSource && (
            <div className="mt-3 space-y-3">
              <Label className="block text-label mb-1">Select MP4 file</Label>
              <input 
                type="file" 
                id="videoUpload" 
                accept="video/mp4"
                className="block w-full text-sm text-white
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-700 file:text-white
                  hover:file:bg-gray-600"
              />
              <Button 
                className="w-full bg-zinc-100/20 hover:bg-zinc-100/30 mt-2 flex items-center justify-center space-x-2"
                onClick={handleApplyFilter}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-zinc-100 border-t-transparent rounded-full" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    <span>Confirm & Apply Filter</span>
                  </>
                )}
              </Button>
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
              <Label className="text-label">Dot Size</Label>
              <span className="text-value">{filterSettings.dotSize}</span>
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
              <Label className="text-label">Contrast</Label>
              <span className="text-value">{filterSettings.contrast.toFixed(1)}</span>
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
              <Label className="text-label">Brightness</Label>
              <span className="text-value">{filterSettings.brightness.toFixed(1)}</span>
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
          
          {/* Dot Shape Selection */}
          <div className="mt-4">
            <Label className="block text-label mb-2">Dot Shape</Label>
            <RadioGroup
              value={filterSettings.dotShape}
              onValueChange={(value) => handleDotShapeChange(value as DotShape)}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2 bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-700">
                <RadioGroupItem id="option-circle" value="circle" className="sr-only" />
                <Label htmlFor="option-circle" className="flex flex-col items-center cursor-pointer w-full">
                  <Circle className={`h-6 w-6 ${filterSettings.dotShape === 'circle' ? 'text-zinc-100' : 'text-gray-400'}`} />
                  <span className="text-xs mt-1">Circle</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-700">
                <RadioGroupItem id="option-square" value="square" className="sr-only" />
                <Label htmlFor="option-square" className="flex flex-col items-center cursor-pointer w-full">
                  <Square className={`h-6 w-6 ${filterSettings.dotShape === 'square' ? 'text-zinc-100' : 'text-gray-400'}`} />
                  <span className="text-xs mt-1">Square</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-700">
                <RadioGroupItem id="option-cross" value="cross" className="sr-only" />
                <Label htmlFor="option-cross" className="flex flex-col items-center cursor-pointer w-full">
                  <X className={`h-6 w-6 ${filterSettings.dotShape === 'cross' ? 'text-zinc-100' : 'text-gray-400'}`} />
                  <span className="text-xs mt-1">Cross</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Second Layer Controls */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-gray-400" />
                <Label className="text-label">Second Layer</Label>
              </div>
              <Switch 
                checked={filterSettings.useSecondLayer} 
                onCheckedChange={toggleSecondLayer}
              />
            </div>
            
            {filterSettings.useSecondLayer && (
              <div className="mt-3 space-y-3 pl-1 border-l-2 border-gray-700 ml-1">
                {/* Second Layer Opacity */}
                <div>
                  <div className="flex justify-between">
                    <Label className="text-label text-sm">Opacity</Label>
                    <span className="text-value text-sm">{(filterSettings.secondLayerOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <Slider 
                    value={[filterSettings.secondLayerOpacity]} 
                    onValueChange={handleSecondLayerOpacityChange}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="mt-1"
                  />
                </div>
                
                {/* Second Layer Offset */}
                <div>
                  <div className="flex justify-between">
                    <Label className="text-label text-sm">Offset</Label>
                    <span className="text-value text-sm">{filterSettings.secondLayerOffset}</span>
                  </div>
                  <Slider 
                    value={[filterSettings.secondLayerOffset]} 
                    onValueChange={handleSecondLayerOffsetChange}
                    min={1}
                    max={15}
                    step={1}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Filter Type */}
          <div className="mt-4">
            <Label className="block text-label mb-2">Filter Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className={filterSettings.isGrayscale ? "bg-zinc-100/20 text-white font-medium" : "bg-gray-700 hover:bg-gray-600 text-white font-medium"}
                onClick={() => toggleFilterType(true)}
              >
                Grayscale
              </Button>
              <Button 
                className={!filterSettings.isGrayscale ? "bg-zinc-100/20 text-white font-medium" : "bg-gray-700 hover:bg-gray-600 text-white font-medium"}
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
            className="w-full flex items-center justify-center space-x-2 bg-zinc-100/20 hover:bg-zinc-100/30"
            disabled={!cameraReady}
            onClick={() => downloadAsJpg("previewCanvas")}
          >
            <Download className="h-5 w-5" />
            <span>Download as JPG</span>
          </Button>
          
          <Button 
            className="w-full flex items-center justify-center space-x-2 bg-zinc-100/20 hover:bg-zinc-100/30"
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
