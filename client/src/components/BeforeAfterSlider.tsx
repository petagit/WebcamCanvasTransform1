import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BeforeAfterSliderProps {
  beforeImage: string; // Original image URL
  afterImage: string;  // Processed image URL
  className?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  className
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateSliderPosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    if (e.touches.length > 0) {
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      updateSliderPosition(e.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging.current && e.touches.length > 0) {
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / containerWidth) * 100));
    
    setSliderPosition(percentage);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove as any);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full min-h-[250px] overflow-hidden rounded-lg select-none cursor-col-resize", 
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Before image (shown fully) */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={beforeImage} 
          alt="Before" 
          className="w-full h-full object-contain bg-black"
        />
        <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
          Original
        </div>
      </div>
      
      {/* After image (shown based on slider position) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={afterImage} 
          alt="After" 
          className="w-full h-full object-contain bg-black"
        />
        <div className="absolute top-4 left-4 bg-blue-600/70 text-white px-2 py-1 rounded text-sm">
          Processed
        </div>
      </div>
      
      {/* Slider control */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10 cursor-col-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-4 h-0.5 bg-gray-800"></div>
            <div className="my-0.5"></div>
            <div className="w-4 h-0.5 bg-gray-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
}