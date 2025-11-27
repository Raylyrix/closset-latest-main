import { memo } from 'react';
import { useApp } from '../App';

type Props = {
  x: number;
  y: number;
  visible: boolean;
  tool: 'brush' | 'eraser' | 'fill' | 'picker' | 'smudge' | 'blur' | 'select' | 'transform' | 'move' | 'undo' | 'redo' | 'puffPrint' | 'line' | 'rect' | 'ellipse' | 'gradient' | 'embroidery' | 'vectorTools' | 'pen' | 'curvature' | 'addAnchor' | 'removeAnchor' | 'convertAnchor' | 'pathSelection' | 'text' | 'shapes';
  size: number;
  shape?: 'round' | 'square' | 'diamond' | 'triangle' | 'airbrush' | 'calligraphy' | 'spray' | 'texture' | 'watercolor' | 'oil' | 'charcoal' | 'pencil' | 'marker' | 'highlighter' | 'chalk' | 'ink' | 'pastel' | 'acrylic' | 'gouache' | 'stencil' | 'stamp' | 'blur' | 'smudge';
  angle?: number;
};

export const CursorOverlay = memo(function CursorOverlay({ x, y, visible, tool, size, shape = 'round', angle = 0 }: Props) {
  const vectorMode = useApp(s => (s as any).vectorMode);
  const customBrushImage = useApp(s => s.customBrushImage);
  if (!visible) return null;
  // Treat vectorMode as an active drawing mode so overlay appears and uses plus cursor
  const drawing = vectorMode || ['brush','eraser','fill','picker','smudge','blur','select','transform','move','puffPrint','line','rect','ellipse','gradient','embroidery','vectorTools','pen','curvature','addAnchor','removeAnchor','convertAnchor','pathSelection','text','shapes'].includes(tool);
  if (!drawing) return null;

  const diameter = Math.max(6, Math.min(256, size));
  const isVectorTool = vectorMode || tool === 'vectorTools' || ['pen', 'curvature', 'addAnchor', 'removeAnchor', 'convertAnchor', 'pathSelection'].includes(tool);
  const isCircle = (tool === 'brush' || tool === 'eraser' || tool === 'smudge' || tool === 'blur' || tool === 'puffPrint' || tool === 'line' || tool === 'rect' || tool === 'ellipse' || tool === 'gradient' || tool === 'embroidery') && shape !== 'square' && !isVectorTool;
  const hasCustomBrush = tool === 'brush' && customBrushImage;
  const border = (
    tool === 'eraser' ? '1px dashed rgba(255,255,255,0.95)'
    : tool === 'smudge' ? '2px double rgba(147,197,253,0.9)'
    : tool === 'blur' ? '1px dotted rgba(250,204,21,0.9)'
    : tool === 'puffPrint' ? '2px solid rgba(255,182,193,0.95)'
    : tool === 'embroidery' ? '2px solid rgba(255,105,180,0.95)'
    : tool === 'text' ? '2px solid rgba(255,255,255,0.95)'
    : tool === 'shapes' ? '2px solid rgba(34,197,94,0.95)'
    : '1px solid rgba(103,232,249,0.95)'
  );

  const icon = (() => {
    const common = { position: 'absolute' as const, left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, pointerEvents: 'none' as const };
    const sizePx = 18;
    switch (tool) {
      case 'picker':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: 8, marginTop: -28 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M3 21l6-6 6-6 3 3-12 12H3v-3z" fill="none" stroke="#a78bfa" strokeWidth="1.5"/>
            <path d="M15 3l6 6" stroke="#a78bfa" strokeWidth="1.5"/>
          </svg>
        );
      case 'fill':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: 10, marginTop: -30 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M7 3l6 6-6 6L1 9 7 3z" fill="none" stroke="#34d399" strokeWidth="1.5"/>
            <path d="M13 9l5 5" stroke="#34d399" strokeWidth="1.5"/>
            <path d="M19 17c0 1.657-1.343 3-3 3s-3-1.343 3-3z" fill="#34d399"/>
          </svg>
        );
      case 'select':
        return (
          <div className="cursor-marquee" style={{ ...common, width: 20, height: 20, marginLeft: -10, marginTop: -10 }} />
        );
      case 'transform':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -10, marginTop: -10 }} width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 2v20M2 12h20" stroke="#67e8f9" strokeWidth="1.5"/>
            <path d="M12 2l3 3-3-3-3 3 3-3M12 22l3-3-3 3-3-3 3 3M2 12l3 3-3-3 3-3-3 3M22 12l-3 3 3-3-3-3 3 3" stroke="#67e8f9" strokeWidth="1.2"/>
          </svg>
        );
      case 'text':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: 8, marginTop: -28 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 2v4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'shapes':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: 8, marginTop: -28 }} width="20" height="20" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
            <circle cx="17" cy="7" r="3" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
            <polygon points="12,17 8,21 16,21" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
          </svg>
        );
      case 'move':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -10, marginTop: -10 }} width="22" height="22" viewBox="0 0 24 24">
            <path d="M12 2l3 3h-2v4h-2V5H9l3-3zm0 20l-3-3h2v-4h2v4h2l-3 3zM2 12l3-3v2h4v2H5v2l-3-3zm20 0l-3 3v-2h-4v-2h4V9l3 3z" fill="#e5e7eb"/>
          </svg>
        );
      case 'smudge':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -6, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M4 16c4-2 6 2 10 0" stroke="#93c5fd" strokeWidth="1.5" fill="none"/>
            <path d="M6 12c3-1 5 1 8 0" stroke="#93c5fd" strokeWidth="1.2" fill="none"/>
          </svg>
        );
      case 'blur':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <circle cx="8" cy="12" r="1" fill="#facc15"/>
            <circle cx="12" cy="12" r="1.4" fill="#facc15" opacity="0.8"/>
            <circle cx="16" cy="12" r="1.8" fill="#facc15" opacity="0.6"/>
          </svg>
        );
      case 'embroidery':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M3 12h18M12 3v18M8 8l8 8M16 8l-8 8" stroke="#ff69b4" strokeWidth="1.5" fill="none"/>
            <circle cx="12" cy="12" r="2" fill="#ff69b4" opacity="0.6"/>
          </svg>
        );
      case 'pen':
      case 'vectorTools':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" stroke="#8B5CF6" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="12" r="2" stroke="#8B5CF6" strokeWidth="1" fill="none"/>
          </svg>
        );
      case 'curvature':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M3 12c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z" stroke="#10B981" strokeWidth="1.5" fill="none"/>
            <path d="M15 8c2 0 4 2 4 4s-2 4-4 4" stroke="#10B981" strokeWidth="1.5" fill="none"/>
          </svg>
        );
      case 'addAnchor':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke="#F59E0B" strokeWidth="1.5" fill="none"/>
            <path d="M12 8v8M8 12h8" stroke="#F59E0B" strokeWidth="1.5"/>
          </svg>
        );
      case 'removeAnchor':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke="#EF4444" strokeWidth="1.5" fill="none"/>
            <path d="M9 9l6 6M15 9l-6 6" stroke="#EF4444" strokeWidth="1.5"/>
          </svg>
        );
      case 'convertAnchor':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke="#8B5CF6" strokeWidth="1.5" fill="none"/>
            <path d="M8 12h8M12 8v8" stroke="#8B5CF6" strokeWidth="1.5"/>
            <path d="M10 10l4 4M14 10l-4 4" stroke="#8B5CF6" strokeWidth="1"/>
          </svg>
        );
      case 'pathSelection':
        return (
          <svg className="cursor-svg" style={{ ...common, marginLeft: -8, marginTop: -26 }} width="20" height="20" viewBox="0 0 24 24">
            <path d="M3 3h18v18H3z" stroke="#3B82F6" strokeWidth="1.5" fill="none"/>
            <path d="M7 7h10v10H7z" stroke="#3B82F6" strokeWidth="1" fill="none"/>
          </svg>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="cursor-overlay" style={{ left: 0, top: 0 }}>
      {isVectorTool ? (
        <div className="cursor-plus" style={{ transform: `translate(${x}px, ${y}px)` }}>
          <div className="plus-h" />
          <div className="plus-v" />
        </div>
      ) : tool === 'text' ? (
        <div className="cursor-text" style={{ transform: `translate(${x}px, ${y}px)` }}>
          <div className="text-cursor-border" style={{ width: diameter, height: diameter }} />
          <div className="text-cursor-icon">
            <div className="text-t-icon" />
          </div>
        </div>
      ) : tool === 'shapes' ? (
        <div className="cursor-shapes" style={{ transform: `translate(${x}px, ${y}px)` }}>
          <div className="shapes-plus" />
        </div>
      ) : hasCustomBrush ? (
        <div
          style={{
            position: 'absolute',
            width: diameter,
            height: diameter,
            transform: `translate(${x - diameter / 2}px, ${y - diameter / 2}px)`,
            pointerEvents: 'none',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '2px',
            overflow: 'hidden',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)'
          }}
        >
          <img
            src={customBrushImage || ''}
            alt="Custom brush preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'pixelated'
            }}
          />
        </div>
      ) : isCircle ? (
        <div
          className="cursor-circle"
          style={{
            width: diameter,
            height: diameter,
            transform: `translate(${x - diameter / 2}px, ${y - diameter / 2}px)`,
            border
          }}
        />
      ) : (
        tool === 'select' || tool === 'transform' || shape === 'square' || shape === 'calligraphy' ? (
          <div
            className="cursor-circle"
            style={{
              width: diameter,
              height: diameter,
              transform: `translate(${x - diameter / 2}px, ${y - diameter / 2}px) rotate(${angle}rad)`,
              border
            }}
          />
        ) : (
          <div className="cursor-crosshair" style={{ transform: `translate(${x}px, ${y}px)` }}>
            <div className="ch h" />
            <div className="ch v" />
          </div>
        )
      )}
      {!isVectorTool && icon}
    </div>
  );
});


