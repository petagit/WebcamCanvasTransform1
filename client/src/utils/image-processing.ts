/**
 * Process a video frame with pixelation and other effects
 */
export function processFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  pixelSize: number,
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
  
  // Calculate pixel scaling factor
  const scaleFactor = 1 / pixelSize;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw at lower resolution (for pixelation)
  ctx.save();
  ctx.scale(scaleFactor, scaleFactor);
  ctx.drawImage(
    video, 
    0, 
    0, 
    canvas.width * scaleFactor, 
    canvas.height * scaleFactor
  );
  ctx.restore();
  
  // Apply filter effects (contrast, brightness, grayscale)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
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
  
  ctx.putImageData(imageData, 0, 0);
  
  // Scale it back up for the blocky pixel effect
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (tempCtx) {
    // Disable smoothing for pixelated look
    tempCtx.imageSmoothingEnabled = false;
    
    // Draw the pixelated image back to the temporary canvas
    tempCtx.drawImage(
      canvas, 
      0, 
      0, 
      canvas.width * scaleFactor, 
      canvas.height * scaleFactor, 
      0, 
      0, 
      canvas.width, 
      canvas.height
    );
    
    // Draw the final image back to the original canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
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
