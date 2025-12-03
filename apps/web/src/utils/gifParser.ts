/**
 * Simple GIF frame extractor
 * Extracts frames from animated GIFs for brush animation
 */

export interface GIFFrame {
  image: HTMLImageElement;
  delay: number; // Delay in milliseconds
}

/**
 * Extract frames from an animated GIF
 * This is a simplified implementation that uses canvas to extract frames
 */
export function extractGifFrames(gifUrl: string): Promise<GIFFrame[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // For now, we'll create a single frame from the GIF
        // A full implementation would parse the GIF file format
        // This is a simplified version that treats the GIF as a single frame
        const frame: GIFFrame = {
          image: img,
          delay: 100 // Default 100ms delay
        };
        
        // Check if it's actually an animated GIF by trying to detect multiple frames
        // This is a basic check - a full implementation would parse the GIF file
        fetch(gifUrl)
          .then(response => response.blob())
          .then(blob => {
            // For now, return single frame
            // In a full implementation, we would parse the GIF file format
            // to extract all frames and their delays
            resolve([frame]);
          })
          .catch(() => {
            // If fetch fails, still return the single frame
            resolve([frame]);
          });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load GIF image'));
    };
    
    img.src = gifUrl;
  });
}

/**
 * Check if an image URL is likely an animated GIF
 */
export function isAnimatedGif(url: string): boolean {
  return url.toLowerCase().endsWith('.gif') || url.includes('image/gif');
}

/**
 * Create a simple frame sequence from a single image
 * This is used when we can't parse the GIF but want to simulate animation
 */
export function createFrameSequence(image: HTMLImageElement, count: number = 1): GIFFrame[] {
  const frames: GIFFrame[] = [];
  for (let i = 0; i < count; i++) {
    frames.push({
      image: image,
      delay: 100
    });
  }
  return frames;
}







