/**
 * Download the content of a canvas as a JPG file
 * With improved error handling and mobile compatibility
 */
export function downloadAsJpg(canvasId: string, filename?: string): void {
  try {
    // Get canvas safely
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.error(`Canvas with ID "${canvasId}" not found`);
      return;
    }
    
    // Verify it's a valid canvas element
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.error(`Element with ID "${canvasId}" is not a canvas element`);
      return;
    }
    
    // Check if canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.error('Canvas has zero width or height');
      return;
    }
    
    try {
      // Convert canvas to data URL with quality parameter (0.9 = 90% quality)
      let dataUrl;
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      } catch (canvasErr) {
        console.error('Failed to get data URL from canvas:', canvasErr);
        // Try again with PNG in case of tainted canvas
        try {
          dataUrl = canvas.toDataURL('image/png');
        } catch (pngErr) {
          console.error('Failed to get PNG data:', pngErr);
          throw new Error('Cannot access canvas data');
        }
      }
      
      // Create safe filename with timestamp
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const defaultFilename = `pixelcam_${timestamp}.jpg`;
      const safeFilename = filename || defaultFilename;
      
      // Check if browser is iOS (special handling needed)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // For iOS, open the image in a new window
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Save Image</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { margin: 0; padding: 10px; text-align: center; background: #111; color: white; font-family: sans-serif; }
                  img { max-width: 100%; border: 1px solid #333; margin-bottom: 10px; }
                  p { margin: 10px 0; }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="Captured Image">
                <p>Press and hold image to save</p>
              </body>
            </html>
          `);
        } else {
          alert('Please long-press on the processed image and select "Save Image"');
        }
      } else {
        // Standard download approach for non-iOS
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        
        // Remove link after a short delay
        setTimeout(() => {
          try {
            document.body.removeChild(link);
          } catch (e) {
            // Link might already be removed, ignore
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error processing canvas data:', error);
      alert('Unable to download image. You may need to try again or take a screenshot.');
    }
  } catch (error) {
    console.error('Unexpected error in downloadAsJpg:', error);
  }
}

/**
 * Download a video blob as MP4
 */
export function downloadAsVideo(blobUrl: string, filename?: string): void {
  try {
    // Create filename with timestamp if not provided
    const defaultFilename = `pixelcam_video_${new Date().toISOString().replace(/:/g, '-')}.webm`;
    
    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || defaultFilename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

/**
 * Create a File object from a Blob or data URL
 */
export async function createFileFromUrl(
  url: string, 
  filename: string, 
  type: string
): Promise<File> {
  // If it's a blob URL, fetch it first
  if (url.startsWith('blob:')) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type });
  }
  
  // If it's a data URL, convert it to blob first
  if (url.startsWith('data:')) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type });
  }
  
  throw new Error('Unsupported URL format');
}
