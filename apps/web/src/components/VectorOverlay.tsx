import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useApp } from '../App';
import { vectorStore } from '../vector/vectorState';
// REMOVED: puffVectorEngine - old puff tool removed

export function VectorOverlay() {
  const { composedCanvas, activeTool, vectorMode } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // All hooks must be called before any early returns
  const [shapes, setShapes] = useState(vectorStore.getState().shapes);
  const [selected, setSelected] = useState(vectorStore.getState().selected);
  const [currentPath, setCurrentPath] = useState(vectorStore.getState().currentPath);
  // REMOVED: puffShapes - old puff tool removed
  const [tool, setTool] = useState(vectorStore.getState().tool);

  const [isDown, setIsDown] = useState(false);
  const draggingPointRef = useRef<{ shapeId: string; index: number } | null>(null);
  const draggingBoundsRef = useRef<{ shapeId: string; startX: number; startY: number; startBounds: {x:number;y:number;width:number;height:number} } | null>(null);

  // subscribe to store
  useEffect(() => {
    const unsub = vectorStore.subscribe(() => {
      const st = vectorStore.getState();
      setShapes(st.shapes);
      setSelected(st.selected);
      setCurrentPath(st.currentPath);
      setTool(st.tool);
    });
    // REMOVED: puffVectorEngine subscription - old puff tool removed
    return () => { unsub(); };
  }, []);

  // helpers
  const getCtx = () => canvasRef.current?.getContext('2d') || null;

  const canvasSize = useMemo(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { w: Math.max(1, Math.floor(rect.width)), h: Math.max(1, Math.floor(rect.height)) };
    }
    // Fallback: use viewport size so we at least receive pointer events
    if (typeof window !== 'undefined') {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    return { w: 1, h: 1 };
  }, [containerRef.current]);

  // draw all
  const draw = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const { width, height } = canvasRef.current;
    ctx.clearRect(0, 0, width, height);

    // grid (subtle)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let x=0; x<width; x+=20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
    for (let y=0; y<height; y+=20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }
    ctx.restore();

    const drawBezier = (pts: any[]) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i=1;i<pts.length;i++){
        const cur = pts[i];
        const prev = pts[i-1];
        if (cur.controlIn || prev.controlOut){
          const cp1x = prev.controlOut ? prev.x + prev.controlOut.x : prev.x;
          const cp1y = prev.controlOut ? prev.y + prev.controlOut.y : prev.y;
          const cp2x = cur.controlIn ? cur.x + cur.controlIn.x : cur.x;
          const cp2y = cur.controlIn ? cur.y + cur.controlIn.y : cur.y;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, cur.x, cur.y);
        } else {
          ctx.lineTo(cur.x, cur.y);
        }
      }
    };

    const baseWidth = composedCanvas?.width || width;
    const baseHeight = composedCanvas?.height || height;
    const scaleX = baseWidth ? width / baseWidth : 1;
    const scaleY = baseHeight ? height / baseHeight : 1;

    shapes.forEach((shape) => {
      // Normalize shape to support both schemas: { points, fill, stroke, ... } and { path: { points, ... }, bounds }
      const path = (shape as any).path ? (shape as any).path : shape as any;
      const points = path.points || [];
      // path
      drawBezier(points);
      
      // Set opacity for fill
      if (path.fill) { 
        ctx.save();
        ctx.globalAlpha = path.fillOpacity || 1.0;
        ctx.fillStyle = path.fillColor; 
        ctx.fill(); 
        ctx.restore();
      }
      
      // Set opacity for stroke
      if (path.stroke) { 
        ctx.save();
        ctx.globalAlpha = path.strokeOpacity || 1.0;
        ctx.strokeStyle = path.strokeColor; 
        ctx.lineWidth = path.strokeWidth;
        ctx.lineJoin = path.strokeJoin || 'round';
        ctx.lineCap = path.strokeCap || 'round';
        ctx.stroke(); 
        ctx.restore();
      }

      // selection box + anchors if selected
      if (selected.includes(shape.id)){
        const b = (shape as any).bounds || boundsFromPoints(points); ctx.save();
        ctx.setLineDash([5,5]); ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x-2, b.y-2, b.width+4, b.height+4);
        ctx.setLineDash([]);
        // anchors
        points.forEach((p: any, i: number)=>{
          ctx.fillStyle = i===0 ? '#10B981' : '#3B82F6';
          ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
          if (p.controlIn){
            ctx.strokeStyle = '#9CA3AF'; ctx.setLineDash([2,2]);
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+p.controlIn.x,p.y+p.controlIn.y); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(p.x+p.controlIn.x,p.y+p.controlIn.y,3,0,Math.PI*2); ctx.fillStyle = '#9CA3AF'; ctx.fill();
          }
          if (p.controlOut){
            ctx.strokeStyle = '#9CA3AF'; ctx.setLineDash([2,2]);
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+p.controlOut.x,p.y+p.controlOut.y); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(p.x+p.controlOut.x,p.y+p.controlOut.y,3,0,Math.PI*2); ctx.fillStyle = '#9CA3AF'; ctx.fill();
          }
        });
        ctx.restore();
      }
    });

    // REMOVED: Draw committed puff shapes - old puff tool removed
    // NEW PUFF TOOL: Puffs are drawn directly on the layer canvas

    if (currentPath && currentPath.points.length){
      drawBezier(currentPath.points);
      
      // Set opacity for fill
      if (currentPath.fill){ 
        ctx.save();
        ctx.globalAlpha = currentPath.fillOpacity || 1.0;
        ctx.fillStyle = currentPath.fillColor; 
        ctx.fill(); 
        ctx.restore();
      }
      
      // Set opacity for stroke
      if (currentPath.stroke){ 
        ctx.save();
        ctx.globalAlpha = currentPath.strokeOpacity || 1.0;
        ctx.strokeStyle = currentPath.strokeColor; 
        ctx.lineWidth = currentPath.strokeWidth;
        ctx.lineJoin = currentPath.strokeJoin || 'round';
        ctx.lineCap = currentPath.strokeCap || 'round';
        ctx.stroke(); 
        ctx.restore();
      }
      
      currentPath.points.forEach((p,i)=>{
        ctx.fillStyle = i===0 ? '#10B981' : '#3B82F6';
        ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
      });
    }
  }, [shapes, selected, currentPath, composedCanvas]); // REMOVED: puffShapes - old puff tool removed

  useEffect(() => { draw(); }, [draw]);

  // resize canvas to container
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      el.width = Math.floor(rect.width);
      el.height = Math.floor(rect.height);
      draw();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  // DEPRECATED: This old 2D vector overlay is no longer used
  // The new vector tools are integrated directly into ShirtRefactored.tsx
  // They work on the 3D model using UV coordinates
  // Always return null to disable this old system
  return null;
  
  // Old code kept for reference but disabled:
  // if (!vectorMode) {
  //   return null;
  // }

  // coordinate mapping (screen -> overlay)
  const toOverlay = (ev: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  const hitPoint = (pt:{x:number;y:number}, s:any): number | null => {
    const pts = s.points || s.path?.points || [];
    for(let i=0;i<pts.length;i++){
      const p = pts[i]; const dx=pt.x-p.x; const dy=pt.y-p.y; if (dx*dx+dy*dy<8*8) return i;
    }
    return null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    // Handle mouse events when vector mode is active
    // When brush/puff/embroidery is selected in vector mode, it acts as a pen tool
    if (!vectorMode) return;
    
    // Allow vector path creation even when brush/puff/embroidery is selected
    const isVectorPathCreation = activeTool === 'vector' || 
                                   activeTool === 'brush' || 
                                   // activeTool === 'puffPrint' || // Removed - will be rebuilt 
                                   activeTool === 'embroidery';
    
    if (!isVectorPathCreation) return;
    
    e.stopPropagation();
    e.preventDefault();
    setIsDown(true);
    const pos = toOverlay(e);
    // Debug pointer routing
    if (process.env.NODE_ENV === 'development') {
      console.log('VectorOverlay: onMouseDown at', pos, 'tool:', tool, 'activeTool:', activeTool);
    }
    
    // In vector mode, all drawing tools act as pen tool
    if (tool === 'pen' || activeTool === 'brush' || activeTool === 'embroidery') { // puffPrint removed - will be rebuilt
      const st = vectorStore.getState();
      if (!st.currentPath){
        const pts = [{ x: pos.x, y: pos.y, type:'corner' as const }];
        const bounds = boundsFromPoints(pts);
        const path = {
          id: `path_${Date.now()}`,
          points: pts,
          closed: false,
          type: 'bezier',
          style: { stroke: '#000000', strokeWidth: 2, fill: 'none', opacity: 1 },
          fill: true,
          stroke: true,
          fillColor: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 2,
          fillOpacity: 1,
          strokeOpacity: 1,
          strokeJoin: 'round' as CanvasLineJoin,
          strokeCap: 'round' as CanvasLineCap,
          bounds
        };
        vectorStore.setState({ currentPath: path });
      } else {
        const newPts = [...st.currentPath.points, { x: pos.x, y: pos.y, type:'corner' as const }];
        const cp = { ...st.currentPath, points: newPts, bounds: boundsFromPoints(newPts) };
        vectorStore.setState({ currentPath: cp });
      }
      return;
    }
    // selection
    const st = vectorStore.getState();
    const clicked = [...st.shapes].reverse().find(s => {
      const b = (s as any).bounds || boundsFromPoints((s as any).points || (s as any).path?.points || []);
      return pos.x>=b.x && pos.x<=b.x+b.width && pos.y>=b.y && pos.y<=b.y+b.height;
    });
    if (clicked){
      vectorStore.setState({ selected: [clicked.id] });
      const idx = hitPoint(pos, clicked);
      if (idx !== null) {
        draggingPointRef.current = { shapeId: clicked.id, index: idx };
      } else {
        const startB = (clicked as any).bounds || boundsFromPoints((clicked as any).points || (clicked as any).path?.points || []);
        draggingBoundsRef.current = { shapeId: clicked.id, startX: pos.x, startY: pos.y, startBounds: { ...startB } };
      }
    } else {
      vectorStore.setState({ selected: [] });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    // Handle mouse events when vector mode is active
    if (!vectorMode) return;
    
    // Allow vector path editing even when brush/puff/embroidery is selected
    const isVectorPathCreation = activeTool === 'vector' || 
                                   activeTool === 'brush' || 
                                   // activeTool === 'puffPrint' || // Removed - will be rebuilt 
                                   activeTool === 'embroidery';
    
    if (!isVectorPathCreation) return;
    
    e.stopPropagation();
    e.preventDefault();
    if (!isDown) return;
    const pos = toOverlay(e);
    const st = vectorStore.getState();
    if (tool === 'pen') return; // preview can be added later

    if (draggingPointRef.current){
      const { shapeId, index } = draggingPointRef.current;
      const shapesUpd = st.shapes.map(s => {
        if (s.id !== shapeId) return s;
        const pts = [...s.points];
        pts[index] = { ...pts[index], x: pos.x, y: pos.y };
        const b = boundsFromPoints(pts);
        return { ...s, points: pts, bounds: b };
      });
      vectorStore.setState({ shapes: shapesUpd });
    } else if (draggingBoundsRef.current){
      const { shapeId, startX, startY, startBounds } = draggingBoundsRef.current;
      const dx = pos.x - startX; const dy = pos.y - startY;
      const shapesUpd = st.shapes.map(s => {
        if (s.id !== shapeId) return s;
        const scaleX = (startBounds.width + dx) / Math.max(1, startBounds.width);
        const scaleY = (startBounds.height + dy) / Math.max(1, startBounds.height);
        const cx = startBounds.x; const cy = startBounds.y;
        const pts = s.points.map((p: any) => ({ ...p, x: cx + (p.x - cx)*scaleX, y: cy + (p.y - cy)*scaleY }));
        return { ...s, points: pts, bounds: boundsFromPoints(pts) };
      });
      vectorStore.setState({ shapes: shapesUpd });
    }
  };

  const onMouseUp = (e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setIsDown(false);
    draggingPointRef.current = null;
    draggingBoundsRef.current = null;
  };

  const onDoubleClick = () => {
    const st = vectorStore.getState();
    if (tool === 'pen' && st.currentPath && st.currentPath.points.length>=3){
      const path = { ...st.currentPath, closed: true };
      const b = boundsFromPoints(path.points);
      const shape = { ...path, id: `shape_${Date.now()}`, bounds: b };
      vectorStore.setState({ currentPath: null, shapes: [...st.shapes, shape], selected: [shape.id] } as any);
    }
  };

  return (
    <div ref={containerRef} style={{ 
      position: 'absolute', 
      inset: 0, 
      zIndex: 10000,
      // Only capture pointer events when vector mode is active and using drawing tools
      pointerEvents: vectorMode && (activeTool === 'vector' || activeTool === 'brush' || activeTool === 'embroidery') ? 'auto' : 'none' // puffPrint removed - will be rebuilt
    }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{ 
          position: 'absolute', 
          inset: 0, 
          // Capture pointer events when vector mode is active and using any drawing tool
          // This allows brush/puff/embroidery to create vector paths in vector mode
          pointerEvents: vectorMode && (activeTool === 'vector' || activeTool === 'brush' || activeTool === 'embroidery') ? 'auto' : 'none', // puffPrint removed - will be rebuilt
          zIndex: 10000 
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
}

function boundsFromPoints(pts: {x:number;y:number}[]){
  if (!pts.length) return { x:0,y:0,width:0,height:0 };
  let minX=pts[0].x, minY=pts[0].y, maxX=pts[0].x, maxY=pts[0].y;
  for (const p of pts){ minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y); }
  return { x:minX, y:minY, width:maxX-minX, height:maxY-minY };
}
