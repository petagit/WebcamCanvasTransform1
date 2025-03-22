/**
 * Download the content of a canvas as a JPG file
 */
export function downloadAsJpg(canvasId: string, filename?: string): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.error(`Canvas with ID "${canvasId}" not found`);
    return;
  }
  
  try {
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    // Create filename with timestamp if not provided
    const defaultFilename = `pixelcam_${new Date().toISOString().replace(/:/g, '-')}.jpg`;
    
    // Create download link
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || defaultFilename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading image:', error);
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
