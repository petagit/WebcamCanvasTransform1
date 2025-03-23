/**
 * Process a video frame with dot matrix/halftone and other effects
 * Improved with extensive error handling for mobile compatibility
 */
export function processFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  dotSize: number,
  contrast: number,
  brightness: number,
  isGrayscale: boolean
): void {
  // Safety check inputs
  if (!video || !canvas) return;
  if (dotSize <= 0) dotSize = 5; // Default to 5 if invalid
  
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
    
    // Ensure canvas dimensions match video (with reasonable limits)
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      
      canvas.width = Math.min(video.videoWidth, MAX_WIDTH);
      canvas.height = Math.min(video.videoHeight, MAX_HEIGHT);
    }
    
    // Clear the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the original video to get pixel data
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
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
    
    // Draw dot matrix pattern
    for (let yi = 0; yi < maxGridY; yi++) {
      const y = yi * gridSize;
      
      for (let xi = 0; xi < maxGridX; xi++) {
        const x = xi * gridSize;
        
        // Skip invalid coordinates
        if (x < 0 || y < 0 || x >= tempCanvas.width || y >= tempCanvas.height) {
          continue;
        }
        
        let pixelData;
        try {
          // Get pixel data safely
          pixelData = tempCtx.getImageData(x, y, 1, 1).data;
          
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
          
          // Draw the dot
          if (radius > 0 && 
              centerX >= radius && centerY >= radius && 
              centerX + radius < canvas.width && centerY + radius < canvas.height) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        } catch (e) {
          // Skip silently on error
        }
      }
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
