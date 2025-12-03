import { useEffect, useRef, useState } from 'react';

interface BrushPreviewPanelProps {
  customBrushImage: string;
  customBrushRotation: number;
  customBrushScale: number;
  customBrushFlipHorizontal: boolean;
  customBrushFlipVertical: boolean;
  customBrushColorizationMode: 'tint' | 'multiply' | 'overlay' | 'colorize' | 'preserve';
  customBrushAlphaThreshold: number;
  brushColor: string;
  brushSize: number;
}

export function BrushPreviewPanel({
  customBrushImage,
  customBrushRotation,
  customBrushScale,
  customBrushFlipHorizontal,
  customBrushFlipVertical,
  customBrushColorizationMode,
  customBrushAlphaThreshold,
  brushColor,
  brushSize
}: BrushPreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !customBrushImage) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas size for preview (larger than cursor preview)
    const previewSize = 200;
    canvas.width = previewSize;
    canvas.height = previewSize;

    // Clear canvas
    ctx.clearRect(0, 0, previewSize, previewSize);

    // Load and draw brush image with all transformations
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();

      // Calculate scale
      const imageMaxDimension = Math.max(img.width, img.height);
      const baseScale = (previewSize * 0.8) / imageMaxDimension; // 80% of preview size
      const scale = baseScale * customBrushScale;
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // Center the image
      const centerX = previewSize / 2;
      const centerY = previewSize / 2;

      // Apply transformations
      ctx.translate(centerX, centerY);
      ctx.rotate((customBrushRotation * Math.PI) / 180);
      ctx.scale(customBrushFlipHorizontal ? -1 : 1, customBrushFlipVertical ? -1 : 1);
      ctx.translate(-centerX, -centerY);

      // Draw image
      ctx.drawImage(
        img,
        centerX - scaledWidth / 2,
        centerY - scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );

      // Apply alpha threshold
      if (customBrushAlphaThreshold > 0) {
        const imageData = ctx.getImageData(0, 0, previewSize, previewSize);
        const data = imageData.data;
        const threshold = (customBrushAlphaThreshold / 100) * 255;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < threshold) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Apply colorization
      if (customBrushColorizationMode !== 'preserve') {
        ctx.save();
        if (customBrushColorizationMode === 'tint') {
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = brushColor;
          ctx.fillRect(0, 0, previewSize, previewSize);
        } else if (customBrushColorizationMode === 'multiply') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = brushColor;
          ctx.fillRect(0, 0, previewSize, previewSize);
        } else if (customBrushColorizationMode === 'overlay') {
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = brushColor;
          ctx.fillRect(0, 0, previewSize, previewSize);
        } else if (customBrushColorizationMode === 'colorize') {
          ctx.globalCompositeOperation = 'color';
          ctx.fillStyle = brushColor;
          ctx.fillRect(0, 0, previewSize, previewSize);
        }
        ctx.restore();
      }

      ctx.restore();

      // Convert to data URL for display
      const dataUrl = canvas.toDataURL();
      setPreviewUrl(dataUrl);
    };

    img.src = customBrushImage;
  }, [
    customBrushImage,
    customBrushRotation,
    customBrushScale,
    customBrushFlipHorizontal,
    customBrushFlipVertical,
    customBrushColorizationMode,
    customBrushAlphaThreshold,
    brushColor
  ]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      paddingBottom: '100%',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '4px',
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden'
    }}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Brush preview"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated'
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '8px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          Loading preview...
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '4px',
        right: '4px',
        fontSize: '7px',
        color: 'rgba(255,255,255,0.6)',
        background: 'rgba(0,0,0,0.5)',
        padding: '2px 4px',
        borderRadius: '2px',
        textAlign: 'center'
      }}>
        Size: {brushSize}px | Scale: {customBrushScale.toFixed(1)}x | Rot: {Math.round(customBrushRotation)}°
      </div>
    </div>
  );
}







