/**
 * Apply blur filter to image data
 */
export function applyBlur(imageData: ImageData, radius: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  
  if (radius <= 0) return result;
  
  const kernelSize = Math.ceil(radius * 2);
  const kernel: number[] = [];
  let sum = 0;
  
  // Create Gaussian kernel
  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / (2 * radius * radius));
    kernel.push(value);
    sum += value;
  }
  
  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }
  
  // Apply horizontal blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const px = Math.max(0, Math.min(width - 1, x + k - radius));
        const idx = (y * width + px) * 4;
        const weight = kernel[k];
        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }
      
      const idx = (y * width + x) * 4;
      result.data[idx] = r;
      result.data[idx + 1] = g;
      result.data[idx + 2] = b;
      result.data[idx + 3] = a;
    }
  }
  
  // Apply vertical blur
  const temp = new Uint8ClampedArray(result.data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const py = Math.max(0, Math.min(height - 1, y + k - radius));
        const idx = (py * width + x) * 4;
        const weight = kernel[k];
        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
      }
      
      const idx = (y * width + x) * 4;
      result.data[idx] = r;
      result.data[idx + 1] = g;
      result.data[idx + 2] = b;
      result.data[idx + 3] = a;
    }
  }
  
  return result;
}

/**
 * Apply sharpen filter to image data
 */
export function applySharpen(imageData: ImageData, amount: number): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  
  if (amount <= 0) return result;
  
  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          if (ky === 0 && kx === 0) a = data[idx + 3];
        }
      }
      
      const idx = (y * width + x) * 4;
      result.data[idx] = Math.max(0, Math.min(255, r));
      result.data[idx + 1] = Math.max(0, Math.min(255, g));
      result.data[idx + 2] = Math.max(0, Math.min(255, b));
      result.data[idx + 3] = a;
    }
  }
  
  return result;
}

/**
 * Apply edge detection filter to image data
 */
export function applyEdgeDetection(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  
  // Sobel operator kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const kIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray * sobelX[kIdx];
          gy += gray * sobelY[kIdx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const edge = Math.min(255, magnitude);
      
      const idx = (y * width + x) * 4;
      result.data[idx] = edge;
      result.data[idx + 1] = edge;
      result.data[idx + 2] = edge;
      result.data[idx + 3] = data[idx + 3]; // Preserve alpha
    }
  }
  
  return result;
}

/**
 * Find the bounding box of non-transparent pixels in an image
 */
export function getImageBoundingBox(imageData: ImageData): { x: number; y: number; width: number; height: number } | null {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  
  // Find bounds of non-transparent pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  // If no opaque pixels found, return null
  if (minX > maxX || minY > maxY) {
    return null;
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Crop and center an image by removing transparent edges
 */
export function cropAndCenterImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas to process image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { alpha: true });
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Find bounding box
        const bounds = getImageBoundingBox(imageData);
        
        if (!bounds) {
          // No opaque pixels, return original
          resolve(imageUrl);
          return;
        }
        
        // Calculate padding to add (to center the image)
        const maxDimension = Math.max(bounds.width, bounds.height);
        const padding = Math.max(10, Math.floor(maxDimension * 0.1)); // 10% padding or minimum 10px
        
        // Create new canvas with padding
        const newCanvas = document.createElement('canvas');
        newCanvas.width = bounds.width + padding * 2;
        newCanvas.height = bounds.height + padding * 2;
        const newCtx = newCanvas.getContext('2d', { alpha: true });
        
        if (!newCtx) {
          reject(new Error('Failed to get new canvas context'));
          return;
        }
        
        // Extract cropped region from original
        const croppedData = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Draw cropped image centered in new canvas
        newCtx.putImageData(croppedData, padding, padding);
        
        // Convert to data URL
        const dataUrl = newCanvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Apply image filter to an image URL
 */
export function applyImageFilter(imageUrl: string, filter: 'blur' | 'sharpen' | 'edge', amount: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { alpha: true });
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        let processedData: ImageData;
        
        switch (filter) {
          case 'blur':
            processedData = applyBlur(imageData, amount);
            break;
          case 'sharpen':
            processedData = applySharpen(imageData, amount);
            break;
          case 'edge':
            processedData = applyEdgeDetection(imageData);
            break;
          default:
            processedData = imageData;
        }
        
        ctx.putImageData(processedData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

