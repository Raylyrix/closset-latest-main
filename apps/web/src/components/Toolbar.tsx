import { useEffect, useState, useRef } from 'react';
import { useApp } from '../App';
import { CustomSelect } from './CustomSelect';
// import { PuffPrintManager } from './PuffPrintManager'; // File not found
import { PerformanceSettings } from './PerformanceSettings';

const tools = [
  { id: 'brush', label: 'Brush' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'smudge', label: 'Smudge' },
  { id: 'blur', label: 'Blur' },
  { id: 'fill', label: 'Fill' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'picker', label: 'Picker' },
  { id: 'line', label: 'Line' },
  { id: 'rect', label: 'Rect' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'text', label: 'Text' },
  { id: 'moveText', label: 'Move Text' },
  { id: 'transform', label: 'Transform' },
  { id: 'move', label: 'Move' },
  { id: 'puffPrint', label: 'Puff Print' },
  { id: 'patternMaker', label: 'Pattern Maker' },
  { id: 'embroidery', label: 'Embroidery' },
  { id: 'universalSelect', label: 'Universal Select' },
  { id: 'vectorTools', label: 'Vector' },
  { id: 'aiAssistant', label: 'AI Assistant' },
  { id: 'printExport', label: 'Export' },
  { id: 'cloudSync', label: 'Cloud' },
  { id: 'layerEffects', label: 'Effects' },
  { id: 'colorGrading', label: 'Color' },
  { id: 'animation', label: 'Animation' },
  { id: 'templates', label: 'Templates' },
  { id: 'batch', label: 'Batch' },
  { id: 'advancedBrush', label: 'Advanced Brush' },
  { id: 'meshDeformation', label: 'Mesh Deform' },
  { id: 'proceduralGenerator', label: 'Procedural' },
  { id: '3dPainting', label: '3D Paint' },
  { id: 'smartFill', label: 'Smart Fill' },
  { id: 'undo', label: 'Undo' },
  { id: 'redo', label: 'Redo' }
] as const;

type CheckpointMeta = { id: string; name: string; createdAt: number; sizeBytes: number };


export function Toolbar() {
  const activeTool = useApp(s => s.activeTool);
  const setTool = useApp(s => s.setTool);
  const undo = useApp(s => s.undo);
  const redo = useApp(s => s.redo);
  const saveCheckpoint = useApp(s => s.saveCheckpoint);
  const listCheckpoints = useApp(s => s.listCheckpoints);
  const loadCheckpoint = useApp(s => s.loadCheckpoint);
  const deleteCheckpoint = useApp(s => s.deleteCheckpoint);
  const openModelManager = useApp(s => s.openModelManager);
  const openBackgroundManager = useApp(s => s.openBackgroundManager);
  const [checkpoints, setCheckpoints] = useState<CheckpointMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const list = await listCheckpoints();
    setCheckpoints(list);
    if (list.length && !selectedId) setSelectedId(list[0].id);
  };

  useEffect(() => { refresh(); }, []);

  const handleToolClick = (toolId: string) => {
    setTool(toolId as any);
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar-scroll-container" ref={scrollContainerRef}>
        <div className="toolbar-content">
          {/* Drawing Tools Group */}
          <div className="toolbar-group">
            {tools.slice(0, 6).map(t => (
              <button 
                key={t.id} 
                className={`btn ${activeTool === t.id ? 'active' : ''}`} 
                onClick={() => handleToolClick(t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Shape Tools Group */}
          <div className="toolbar-group">
            {tools.slice(6, 12).map(t => (
              <button 
                key={t.id} 
                className={`btn ${activeTool === t.id ? 'active' : ''}`} 
                onClick={() => handleToolClick(t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action Tools Group */}
          <div className="toolbar-group">
            {tools.slice(12, 16).map(t => (
              <button 
                key={t.id} 
                className={`btn ${activeTool === t.id ? 'active' : ''}`} 
                onClick={() => handleToolClick(t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* History Tools Group */}
          <div className="toolbar-group">
            <button className="btn" onClick={() => undo()} type="button">Undo</button>
            <button className="btn" onClick={() => redo()} type="button">Redo</button>
          </div>

          {/* Asset Management Group */}
          <div className="toolbar-group">
            <button className="btn" onClick={openModelManager} type="button">Models</button>
            <button className="btn" onClick={openBackgroundManager} type="button">Backgrounds</button>
              <button
                className="btn"
                onClick={() => setShowPerformanceSettings(true)}
                type="button"
                style={{ backgroundColor: '#007acc', color: '#ffffff' }}
              >
                🚀 Performance
              </button>
            <PuffPrintManager />
          </div>

          {/* Save/Load Group */}
          <div className="toolbar-group">
            <button 
              className="btn" 
              onClick={async () => {
                try {
                  setSaving(true);
                  const name = window.prompt('Checkpoint name?', `Checkpoint ${new Date().toLocaleString()}`) || undefined;
                  await saveCheckpoint(name);
                  await refresh();
                } finally {
                  setSaving(false);
                }
              }} 
              disabled={saving}
              type="button"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <CustomSelect
              value={selectedId}
              placeholder={checkpoints.length ? 'Select checkpoint…' : 'No checkpoints yet'}
              onChange={(v)=> setSelectedId(v)}
              minWidth={220}
              options={checkpoints.map(cp => ({ value: cp.id, label: cp.name }))}
            />
            <button 
              className="btn" 
              onClick={async () => { 
                if (!selectedId) return; 
                await loadCheckpoint(selectedId); 
              }} 
              disabled={!selectedId}
              type="button"
            >
              Load
            </button>
            <button 
              className="btn" 
              onClick={async () => { 
                if (!selectedId) return; 
                await deleteCheckpoint(selectedId); 
                setSelectedId(''); 
                await refresh(); 
              }} 
              disabled={!selectedId}
              type="button"
            >
              Delete
            </button>
          </div>

        </div>
      </div>
      
      {/* Performance Settings Modal */}
          <PerformanceSettings
            isOpen={showPerformanceSettings}
            onClose={() => setShowPerformanceSettings(false)}
          />
        </div>
      );
    }


