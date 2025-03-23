/**
 * Process a video frame with dot matrix/halftone and other effects
 */
export function processFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  dotSize: number,
  contrast: number,
  brightness: number,
  isGrayscale: boolean
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Ensure canvas dimensions match video
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  
  // Clear the canvas and set background to black
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw the original video to get pixel data
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Get image data to process
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Apply contrast and brightness adjustments
  for (let i = 0; i < data.length; i += 4) {
    // Apply brightness
    data[i] *= brightness;     // R
    data[i + 1] *= brightness; // G
    data[i + 2] *= brightness; // B
    
    // Apply contrast
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    data[i] = factor * (data[i] - 128) + 128;         // R
    data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
    data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
    
    // Apply grayscale if enabled
    if (isGrayscale) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;     // R
      data[i + 1] = avg; // G
      data[i + 2] = avg; // B
    }
  }
  
  // Create a blank canvas for dot matrix effect
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  
  if (!tempCtx) return;
  
  // Set background to black
  tempCtx.fillStyle = 'black';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
  // Put the processed image data on the temp canvas
  tempCtx.putImageData(imageData, 0, 0);
  
  // Clear the original canvas for the dot matrix effect
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Set dot properties
  ctx.fillStyle = 'white';
  
  // Calculate grid based on dot size
  const gridSize = Math.max(2, Math.floor(dotSize));
  
  // Draw the dot matrix pattern
  for (let y = 0; y < canvas.height; y += gridSize) {
    for (let x = 0; x < canvas.width; x += gridSize) {
      try {
        // Sample the pixel at this grid point
        const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
        
        // Calculate brightness (0-255)
        let brightness = isGrayscale 
          ? pixelData[0] // For grayscale, just use one channel
          : (pixelData[0] + pixelData[1] + pixelData[2]) / 3;
          
        // Calculate dot radius based on brightness (brighter = larger dot)
        const maxRadius = gridSize / 2 * 0.95; // Maximum radius slightly less than half grid size
        const radius = (brightness / 255) * maxRadius;
        
        // Only draw dots above a certain brightness threshold
        if (radius > 0.5) {
          ctx.beginPath();
          ctx.arc(
            x + gridSize / 2, // center x
            y + gridSize / 2, // center y
            radius, // radius
            0, // start angle
            Math.PI * 2 // end angle (full circle)
          );
          ctx.fill();
        }
      } catch (e) {
        // Skip this dot if there's an error sampling the pixel
        console.error('Error sampling pixel:', e);
      }
    }
  }
}

/**
 * Create a thumbnail preview from a video or canvas element
 */
export function createThumbnail(
  source: HTMLVideoElement | HTMLCanvasElement,
  width: number = 100,
  height: number = 100
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.drawImage(source, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg');
  }
  
  return '';
}
