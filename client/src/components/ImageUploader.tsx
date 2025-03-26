import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Upload, Image as ImageIcon, Download, X } from 'lucide-react';
import type { FilterSettings } from '@/pages/Home';

interface ImageUploaderProps {
  onImageFiltered: (imageUrl: string) => void;
  filterSettings: FilterSettings;
}

export default function ImageUploader({ 
  onImageFiltered,
  filterSettings 
}: ImageUploaderProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filteredImage, setFilteredImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    // Reset states
    setError(null);
    setFilteredImage(null);
    setIsProcessing(true);

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setIsProcessing(false);
      return;
    }

    // Create object URL for the image file
    const imageUrl = URL.createObjectURL(file);
    setOriginalImage(imageUrl);

    // Load the image to get dimensions and prepare for processing
    const img = new Image();
    img.onload = () => {
      setIsProcessing(false);
    };
    img.onerror = () => {
      setError('Failed to load image');
      setIsProcessing(false);
      URL.revokeObjectURL(imageUrl);
      setOriginalImage(null);
    };
    img.src = imageUrl;
  };

  // Apply filter to the loaded image
  const applyFilter = () => {
    if (!originalImage || !canvasRef.current) {
      setError('No image loaded or canvas not available');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setError('Canvas not available');
        setIsProcessing(false);
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Get canvas context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Could not get canvas context');
        setIsProcessing(false);
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Apply the dot matrix filter
      applyDotMatrixFilter(canvas, filterSettings);

      // Get the filtered image URL
      const filteredUrl = canvas.toDataURL('image/jpeg', 0.9);
      setFilteredImage(filteredUrl);
      onImageFiltered(filteredUrl);
      setIsProcessing(false);
    };

    img.onerror = () => {
      setError('Failed to process image');
      setIsProcessing(false);
    };

    img.src = originalImage;
  };

  // Clear the current image
  const clearImage = () => {
    setOriginalImage(null);
    setFilteredImage(null);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to apply the dot matrix filter
  const applyDotMatrixFilter = (canvas: HTMLCanvasElement, filterSettings: FilterSettings) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // First draw image onto a temporary canvas for sampling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!tempCtx) return;
    
    // Copy image data to temp canvas
    tempCtx.drawImage(canvas, 0, 0);
    
    // Extract settings
    const { dotSize, contrast, brightness, isGrayscale, dotShape } = filterSettings;
    const gridSize = Math.max(2, Math.min(20, Math.floor(dotSize)));
    
    // Clear the main canvas 
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply dot matrix effect
    ctx.fillStyle = 'white';
    
    // Calculate grid boundaries
    const maxGridX = Math.floor(canvas.width / gridSize);
    const maxGridY = Math.floor(canvas.height / gridSize);
    
    // Draw dots
    for (let yi = 0; yi < maxGridY; yi++) {
      for (let xi = 0; xi < maxGridX; xi++) {
        // Sample point
        const x = xi * gridSize;
        const y = yi * gridSize;
        
        // Get pixel data
        const data = tempCtx.getImageData(x, y, 1, 1).data;
        
        // Apply brightness and contrast
        let r = Math.min(255, Math.max(0, data[0] * brightness));
        let g = Math.min(255, Math.max(0, data[1] * brightness));
        let b = Math.min(255, Math.max(0, data[2] * brightness));
        
        // Apply grayscale if enabled
        let brightnessValue;
        if (isGrayscale) {
          const gray = Math.min(255, Math.max(0, (r + g + b) / 3));
          brightnessValue = gray;
        } else {
          brightnessValue = (r + g + b) / 3;
        }
        
        // Calculate dot size based on brightness
        const maxRadius = Math.max(1, (gridSize / 2) * 0.8);
        const radius = Math.max(0.5, (brightnessValue / 255) * maxRadius);
        
        // Draw dot if bright enough (skip really dark areas for better contrast)
        if (brightnessValue > 30) {
          const centerX = x + gridSize / 2;
          const centerY = y + gridSize / 2;
          
          ctx.beginPath();
          
          // Draw appropriate shape
          switch (dotShape) {
            case 'square':
              const size = radius * 1.8;
              ctx.rect(centerX - size/2, centerY - size/2, size, size);
              break;
              
            case 'cross':
              const thickness = radius * 0.6;
              const length = radius * 1.8;
              ctx.rect(centerX - length/2, centerY - thickness/2, length, thickness);
              ctx.rect(centerX - thickness/2, centerY - length/2, thickness, length);
              break;
              
            case 'circle':
            default:
              ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              break;
          }
          
          ctx.fill();
        }
      }
    }
  };

  // Function to download the filtered image
  const downloadImage = () => {
    if (!filteredImage) return;
    
    const link = document.createElement('a');
    link.href = filteredImage;
    link.download = 'filtered-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* File input (hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Preview area */}
      <div className="relative w-full">
        <div className="min-h-[300px] max-h-[600px] bg-black flex items-center justify-center p-2 overflow-hidden">
          {filteredImage ? (
            // Show filtered image if available
            <img 
              src={filteredImage} 
              alt="Filtered" 
              className="max-w-full max-h-full object-contain"
            />
          ) : originalImage ? (
            // Show original image if uploaded but not yet filtered
            <img 
              src={originalImage} 
              alt="Original" 
              className="max-w-full max-h-full object-contain opacity-70"
            />
          ) : (
            // Show placeholder when no image
            <div className="text-gray-400 flex flex-col items-center">
              <ImageIcon size={48} className="mb-2 opacity-50" />
              <p>Upload an image to apply the filter</p>
            </div>
          )}
          
          {/* Loading overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-900/80 text-white p-2 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-3 flex flex-wrap gap-2">
        {!originalImage ? (
          // Upload button when no image is loaded
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
            disabled={isProcessing}
          >
            <Upload size={16} />
            Upload Image
          </Button>
        ) : (
          // Buttons when image is loaded
          <>
            {!filteredImage && (
              <Button 
                onClick={applyFilter}
                className="flex items-center gap-2"
                disabled={isProcessing}
              >
                <ImageIcon size={16} />
                Apply Filter
              </Button>
            )}
            
            {filteredImage && (
              <Button 
                onClick={downloadImage}
                variant="secondary"
                className="flex items-center gap-2"
                disabled={isProcessing}
              >
                <Download size={16} />
                Download
              </Button>
            )}
            
            <Button 
              onClick={clearImage}
              variant="destructive"
              className="flex items-center gap-2 ml-auto"
              disabled={isProcessing}
            >
              <X size={16} />
              Clear
            </Button>
          </>
        )}
      </div>
    </div>
  );
}