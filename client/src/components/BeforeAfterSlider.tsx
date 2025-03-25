import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';

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
  const [imagesLoaded, setImagesLoaded] = useState<{before: boolean, after: boolean}>({
    before: false, 
    after: false
  });
  const [hasError, setHasError] = useState(false);
  const [imageSize, setImageSize] = useState<{width: number, height: number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeImgRef = useRef<HTMLImageElement>(null);
  const afterImgRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef(false);

  // Reset loaded state when image sources change
  useEffect(() => {
    setImagesLoaded({before: false, after: false});
    setHasError(false);
    setImageSize(null);
    console.log("Image sources changed, resetting loaded state.");
  }, [beforeImage, afterImage]);

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

  const handleImageLoad = (type: 'before' | 'after', e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.target as HTMLImageElement;
      console.log(`${type} image loaded:`, img.naturalWidth, "x", img.naturalHeight);
      
      // Store image dimensions for the first loaded image to maintain consistency
      if (!imageSize && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const size = {
          width: img.naturalWidth,
          height: img.naturalHeight
        };
        setImageSize(size);
        console.log("Setting reference image size:", size);
      }
      
      setImagesLoaded(prev => ({ ...prev, [type]: true }));
      
      // Log when both images are loaded
      if ((type === 'after' && imagesLoaded.before) || (type === 'before' && imagesLoaded.after)) {
        console.log("Both images are now loaded");
      }
    } catch (error) {
      console.error(`Error handling ${type} image load:`, error);
      setHasError(true);
    }
  };

  const handleImageError = (type: 'before' | 'after') => {
    console.error(`Failed to load ${type} image`);
    setHasError(true);
  };

  useEffect(() => {
    const handleWindowResize = () => {
      // Reset the slider position to 50% on window resize
      setSliderPosition(50);
    };

    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove as any);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  // Are both images fully loaded?
  const isFullyLoaded = imagesLoaded.before && imagesLoaded.after;

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
          ref={beforeImgRef}
          src={beforeImage} 
          alt="Before" 
          className="w-full h-full object-contain bg-black"
          onLoad={(e) => handleImageLoad('before', e)}
          onError={() => handleImageError('before')}
          crossOrigin="anonymous"
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
        <div className="relative w-full h-full">
          <img 
            ref={afterImgRef}
            src={afterImage} 
            alt="After" 
            className="w-full h-full object-contain bg-black"
            onLoad={(e) => handleImageLoad('after', e)}
            onError={() => handleImageError('after')}
            crossOrigin="anonymous"
          />
          <div className="absolute top-4 left-4 bg-blue-600/70 text-white px-2 py-1 rounded text-sm">
            Processed
          </div>
        </div>
      </div>
      
      {/* Loading indicator */}
      {(!isFullyLoaded && !hasError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-white mt-2">Loading comparison...</p>
          </div>
        </div>
      )}
      
      {/* Error indicator */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-white font-semibold mt-2">Error loading images</p>
            <p className="text-gray-300 text-sm mt-1">
              There was a problem loading the comparison images.
              <br />Please try again or use a different image.
            </p>
          </div>
        </div>
      )}
      
      {/* Slider control - only show when images are loaded */}
      {isFullyLoaded && !hasError && (
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
      )}
    </div>
  );
}