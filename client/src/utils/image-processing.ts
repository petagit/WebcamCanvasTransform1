import type { DotShape, FilterSettings } from "@/pages/Home";

/**
 * Process a video frame with dot matrix/halftone and other effects
 * Improved with extensive error handling for mobile compatibility and orientation
 */
export function processFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  filterSettings: FilterSettings,
  isBackCamera?: boolean
): void {
  // Safety check inputs
  if (!video || !canvas) return;
  
  // Extract settings with defaults for any missing or invalid values
  const dotSize = filterSettings.dotSize <= 0 ? 5 : filterSettings.dotSize;
  const contrast = filterSettings.contrast;
  const brightness = filterSettings.brightness;
  const isGrayscale = filterSettings.isGrayscale;
  const dotShape = filterSettings.dotShape || 'circle';
  const useSecondLayer = filterSettings.useSecondLayer ?? true;
  const secondLayerOpacity = filterSettings.secondLayerOpacity ?? 0.5;
  const secondLayerOffset = filterSettings.secondLayerOffset ?? 3;
  
  // Get canvas context
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  try {
    // Ensure video has valid dimensions before proceeding
    if (!video.videoWidth || !video.videoHeight) {
      // Video might not be ready yet, just clear canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    
    // Detect if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Handle orientation and dimensions
    let videoWidth = video.videoWidth;
    let videoHeight = video.videoHeight;
    
    // Check if we need to adjust for portrait mode on mobile
    const isPortrait = isMobile && window.innerHeight > window.innerWidth;
    
    // Set fixed dimensions for canvas based on container
    const canvasContainer = document.getElementById('canvas-container');
    const containerWidth = canvasContainer?.clientWidth || window.innerWidth;
    const containerHeight = canvasContainer?.clientHeight || window.innerHeight * 0.6;
    
    // Reset any previous transformations
    canvas.style.transform = '';
    
    // Set canvas to match container size exactly
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Clear any position styling that might interfere
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    
    // Clear the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context for transformations
    ctx.save();
    
    // Handle orientation for mobile devices
    if (isMobile && isBackCamera && !isIOS) {
      // Many Android back cameras need horizontal flipping
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    // Draw the original video to get pixel data
    // Calculate how to fit the video while preserving aspect ratio
    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = canvas.width / canvas.height;
    
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;
    
    // If the video and canvas have different aspect ratios, we need to adjust
    if (videoRatio > canvasRatio) {
        // Video is wider than canvas - fit to height
        drawHeight = canvas.height;
        drawWidth = drawHeight * videoRatio;
        offsetX = (canvas.width - drawWidth) / 2;
    } else {
        // Video is taller than canvas - fit to width
        drawWidth = canvas.width;
        drawHeight = drawWidth / videoRatio;
        offsetY = (canvas.height - drawHeight) / 2;
    }
    
    // Draw video centered in canvas
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    
    // Restore context to remove transformations before further processing
    ctx.restore();
    
    // Get image data to process
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.error("Failed to get image data:", err);
      return;
    }
    
    // Apply effects to image data
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = Math.min(255, Math.max(0, data[i] * brightness));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * brightness));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * brightness));
      
      // Apply contrast
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      
      // Apply grayscale if enabled
      if (isGrayscale) {
        const avg = Math.min(255, Math.max(0, (data[i] + data[i + 1] + data[i + 2]) / 3));
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
    }
    
    // Create temp canvas for dot matrix processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!tempCtx) {
      // If we can't get context, just render the processed image
      ctx.putImageData(imageData, 0, 0);
      return;
    }
    
    // Put processed image on temp canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Clear original canvas for dot effect
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate grid size with safety limits
    const gridSize = Math.max(2, Math.min(20, Math.floor(dotSize))); 
    
    // Set up for dot pattern
    ctx.fillStyle = 'white';
    
    // Calculate reasonable grid boundaries
    const maxGridX = Math.min(500, Math.floor(canvas.width / gridSize)); 
    const maxGridY = Math.min(500, Math.floor(canvas.height / gridSize));
    
    // Draw dot matrix pattern for primary layer
    for (let yi = 0; yi < maxGridY; yi++) {
      const y = yi * gridSize;
      
      for (let xi = 0; xi < maxGridX; xi++) {
        const x = xi * gridSize;
        
        // Skip invalid coordinates
        if (x < 0 || y < 0 || x >= tempCanvas.width || y >= tempCanvas.height) {
          continue;
        }
        
        try {
          // Get pixel data safely
          const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
          
          // Calculate brightness
          const brightness = isGrayscale 
            ? pixelData[0]
            : (pixelData[0] + pixelData[1] + pixelData[2]) / 3;
          
          // Calculate dot size based on brightness
          const maxRadius = Math.max(1, (gridSize / 2) * 0.8);
          const radius = Math.max(0.5, Math.min(maxRadius, (brightness / 255) * maxRadius));
          
          // Calculate position with safety margins
          const centerX = x + gridSize / 2;
          const centerY = y + gridSize / 2;
          
          // Ensure the dot is within canvas bounds
          if (radius <= 0 || 
              centerX < radius || centerY < radius || 
              centerX + radius >= canvas.width || centerY + radius >= canvas.height) {
            continue;
          }
          
          // Draw the dot based on selected shape
          ctx.beginPath();
          
          switch (dotShape) {
            case 'square':
              // Draw square
              const size = radius * 1.8; // Adjust size for better visual balance compared to circle
              ctx.rect(centerX - size/2, centerY - size/2, size, size);
              break;
              
            case 'cross':
              // Draw cross
              const thickness = radius * 0.6;
              const length = radius * 1.8;
              
              // Horizontal line
              ctx.rect(centerX - length/2, centerY - thickness/2, length, thickness);
              
              // Vertical line
              ctx.rect(centerX - thickness/2, centerY - length/2, thickness, length);
              break;
              
            case 'circle':
            default:
              // Draw circle (default)
              ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              break;
          }
          
          ctx.fill();
          
        } catch (e) {
          // Skip silently on error
        }
      }
    }
    
    // Draw second layer if enabled
    if (useSecondLayer) {
      // Apply a slight offset to create more dynamic range
      const offset = secondLayerOffset || 3;
      
      // Set opacity for second layer
      ctx.globalAlpha = secondLayerOpacity;
      
      // Draw second layer with smaller dots and offset
      for (let yi = 0; yi < maxGridY; yi++) {
        const y = yi * gridSize + offset;
        
        for (let xi = 0; xi < maxGridX; xi++) {
          const x = xi * gridSize + offset;
          
          // Skip invalid coordinates
          if (x < 0 || y < 0 || x >= tempCanvas.width || y >= tempCanvas.height) {
            continue;
          }
          
          try {
            // Get pixel data safely
            const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
            
            // Calculate brightness - invert for second layer to create contrast
            const brightness = isGrayscale 
              ? 255 - pixelData[0]
              : 255 - ((pixelData[0] + pixelData[1] + pixelData[2]) / 3);
            
            // Second layer gets smaller dots
            const maxRadius = Math.max(1, (gridSize / 3) * 0.8);
            const radius = Math.max(0.3, Math.min(maxRadius, (brightness / 255) * maxRadius));
            
            // Calculate position with safety margins
            const centerX = x + gridSize / 2;
            const centerY = y + gridSize / 2;
            
            // Ensure the dot is within canvas bounds
            if (radius <= 0 || 
                centerX < radius || centerY < radius || 
                centerX + radius >= canvas.width || centerY + radius >= canvas.height) {
              continue;
            }
            
            // Always use circles for second layer for better overlap
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            
          } catch (e) {
            // Skip silently on error
          }
        }
      }
      
      // Reset opacity for future drawing
      ctx.globalAlpha = 1.0;
    }
  } catch (error) {
    // On any failure, show a black screen
    console.error("Error in image processing:", error);
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw error message
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Camera processing error', canvas.width / 2, canvas.height / 2);
    }
  }
}

/**
 * Create a thumbnail preview from a video or canvas element
 * With improved error handling for mobile devices
 */
export function createThumbnail(
  source: HTMLVideoElement | HTMLCanvasElement,
  width: number = 100,
  height: number = 100
): string {
  try {
    // Safety check
    if (!source) return '';
    
    // For video, ensure it has valid dimensions
    if (source instanceof HTMLVideoElement && 
        (!source.videoWidth || !source.videoHeight)) {
      return '';
    }
    
    // Create thumbnail canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Set background color to black (in case of transparent areas)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    
    // Draw the source onto the canvas
    try {
      ctx.drawImage(source, 0, 0, width, height);
      
      // Convert to JPEG data URL with moderate quality (0.8)
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error("Error creating thumbnail:", error);
      
      // Return a fallback image on error (plain gray thumbnail)
      ctx.fillStyle = '#222';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#444';
      ctx.fillRect(10, 10, width - 20, height - 20);
      return canvas.toDataURL('image/jpeg');
    }
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return '';
  }
}
