/**
 * Flood Fill Web Worker
 * Performs flood fill algorithm in a separate thread to prevent UI blocking
 */

interface FloodFillMessage {
  type: 'floodFill';
  imageData: ImageData;
  startX: number;
  startY: number;
  targetColor: { r: number; g: number; b: number; a: number };
  fillColor: { r: number; g: number; b: number; a: number };
  tolerance: number;
  contiguous: boolean;
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
  pixelsFilled: number;
}

interface CompleteMessage {
  type: 'complete';
  imageData: ImageData;
  pixelsFilled: number;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage;

// Flood fill algorithm
function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  targetColor: { r: number; g: number; b: number; a: number },
  fillColor: { r: number; g: number; b: number; a: number },
  tolerance: number,
  contiguous: boolean,
  onProgress?: (progress: number, pixelsFilled: number) => void
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);
  const visited = new Set<string>();
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  const pixelsToFill: Array<{ x: number; y: number }> = [];
  
  let totalPixels = width * height;
  let processedPixels = 0;
  const progressInterval = Math.max(1, Math.floor(totalPixels / 100)); // Report progress every 1%
  
  const getPixelIndex = (x: number, y: number): number => {
    return (y * width + x) * 4;
  };
  
  const getPixelColor = (x: number, y: number): { r: number; g: number; b: number; a: number } => {
    const idx = getPixelIndex(x, y);
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  };
  
  const setPixelColor = (x: number, y: number, color: { r: number; g: number; b: number; a: number }): void => {
    const idx = getPixelIndex(x, y);
    data[idx] = color.r;
    data[idx + 1] = color.g;
    data[idx + 2] = color.b;
    data[idx + 3] = color.a;
  };
  
  const colorDistance = (
    c1: { r: number; g: number; b: number; a: number },
    c2: { r: number; g: number; b: number; a: number }
  ): number => {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2) +
      Math.pow(c1.a - c2.a, 2)
    );
  };
  
  const isValid = (x: number, y: number): boolean => {
    return x >= 0 && x < width && y >= 0 && y < height;
  };
  
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const key = `${x},${y}`;
    
    if (visited.has(key) || !isValid(x, y)) {
      continue;
    }
    
    visited.add(key);
    processedPixels++;
    
    // Report progress periodically
    if (processedPixels % progressInterval === 0 && onProgress) {
      const progress = Math.min(100, Math.floor((processedPixels / totalPixels) * 100));
      onProgress(progress, pixelsToFill.length);
    }
    
    const currentColor = getPixelColor(x, y);
    const distance = colorDistance(currentColor, targetColor);
    
    if (distance <= tolerance) {
      pixelsToFill.push({ x, y });
      setPixelColor(x, y, fillColor);
      
      // Add neighboring pixels to stack
      if (contiguous) {
        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
      }
    }
  }
  
  return new ImageData(data, width, height);
}

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent<FloodFillMessage>) => {
  const { type, imageData, startX, startY, targetColor, fillColor, tolerance, contiguous } = event.data;
  
  if (type !== 'floodFill') {
    self.postMessage({ type: 'error', error: 'Invalid message type' } as ErrorMessage);
    return;
  }
  
  try {
    const progressCallback = (progress: number, pixelsFilled: number) => {
      self.postMessage({ type: 'progress', progress, pixelsFilled } as ProgressMessage);
    };
    
    const result = floodFill(
      imageData,
      startX,
      startY,
      targetColor,
      fillColor,
      tolerance,
      contiguous,
      progressCallback
    );
    
    self.postMessage({
      type: 'complete',
      imageData: result,
      pixelsFilled: result.width * result.height // Approximate
    } as CompleteMessage);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ErrorMessage);
  }
});


