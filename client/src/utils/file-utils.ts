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
 * Download a video blob as MP4/WebM
 * With improved error handling and mobile compatibility
 */
export function downloadAsVideo(blobUrl: string, filename?: string): void {
  try {
    // Check if we have a valid blob URL
    if (!blobUrl || !blobUrl.startsWith('blob:')) {
      console.error('Invalid blob URL provided');
      alert('Unable to download video: Invalid video data');
      return;
    }
    
    // Create safe filename with timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const defaultFilename = `pixelcam_video_${timestamp}.webm`;
    const safeFilename = filename || defaultFilename;
    
    // Check if browser is iOS (special handling needed)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // For iOS, open the video in a new window
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Save Video</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 10px; text-align: center; background: #111; color: white; font-family: sans-serif; }
                video { max-width: 100%; border: 1px solid #333; margin-bottom: 10px; }
                p { margin: 10px 0; }
              </style>
            </head>
            <body>
              <video src="${blobUrl}" controls autoplay loop style="max-width: 100%"></video>
              <p>Use screen recording to save this video</p>
              <p><small>Note: On iOS, you may need to use screen recording to save videos</small></p>
            </body>
          </html>
        `);
      } else {
        alert('Please use screen recording to capture this video on iOS');
      }
    } else {
      // Standard download approach for non-iOS
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeFilename;
      
      // Extra attributes for better browser compatibility
      link.target = '_blank';
      link.rel = 'noopener';
      
      // Append, click and remove
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
    console.error('Error downloading video:', error);
    alert('Unable to download video. You may need to try again or use screen recording.');
  }
}

/**
 * Create a File object from a Blob or data URL
 * With improved error handling
 */
export async function createFileFromUrl(
  url: string, 
  filename: string, 
  type: string
): Promise<File> {
  try {
    // Input validation
    if (!url) {
      throw new Error('Empty URL provided');
    }
    
    if (!filename) {
      // Create a safe default filename with timestamp
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      filename = `file_${timestamp}`;
    }
    
    // Use a safe default content type if not provided
    if (!type) {
      type = 'application/octet-stream';
    }
    
    // Handle blob URLs
    if (url.startsWith('blob:')) {
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        return new File([blob], filename, { type });
      } catch (error) {
        console.error('Error fetching blob URL:', error);
        throw new Error('Failed to access blob data');
      }
    }
    
    // Handle data URLs
    if (url.startsWith('data:')) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type });
      } catch (error) {
        console.error('Error converting data URL:', error);
        
        // Alternative method if fetch fails
        try {
          // Parse data URL manually
          const matches = url.match(/^data:([^;]+);base64,(.*)$/);
          if (matches && matches.length >= 3) {
            const dataType = matches[1] || type;
            const base64Data = matches[2];
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: dataType });
            return new File([blob], filename, { type: dataType });
          }
        } catch (manualError) {
          console.error('Manual data URL parsing failed:', manualError);
        }
        
        throw new Error('Failed to convert data URL to file');
      }
    }
    
    // Handle other URL formats as needed
    throw new Error('Unsupported URL format: URLs must start with blob: or data:');
  } catch (error) {
    console.error('Error in createFileFromUrl:', error);
    throw error; // Re-throw for handling by caller
  }
}
