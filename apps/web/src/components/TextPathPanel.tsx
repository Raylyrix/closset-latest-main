import React, { useState, useEffect } from 'react';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { TextPath } from '../utils/TextPathManager';

interface TextPathPanelProps {
  onPathSelect?: (pathId: string) => void;
  selectedPathId?: string;
}

export function TextPathPanel({ onPathSelect, selectedPathId }: TextPathPanelProps) {
  const { getAllTextPaths, createLinePath, createCirclePath, createCurvePath, createArcPath, deleteTextPath } = useAdvancedLayerStoreV2();
  const [paths, setPaths] = useState<TextPath[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pathType, setPathType] = useState<'line' | 'circle' | 'curve' | 'arc'>('line');
  const [pathName, setPathName] = useState('');

  // Form state for different path types
  const [lineForm, setLineForm] = useState({ startX: 100, startY: 100, endX: 300, endY: 100 });
  const [circleForm, setCircleForm] = useState({ centerX: 200, centerY: 200, radius: 50 });
  const [curveForm, setCurveForm] = useState({ startX: 100, startY: 200, controlX: 200, controlY: 100, endX: 300, endY: 200 });
  const [arcForm, setArcForm] = useState({ centerX: 200, centerY: 200, radius: 80, startAngle: 0, endAngle: Math.PI });

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      const allPaths = await getAllTextPaths();
      setPaths(allPaths);
    } catch (error) {
      console.error('Failed to load text paths:', error);
    }
  };

  const handleCreatePath = async () => {
    if (!pathName.trim()) {
      alert('Please enter a path name');
      return;
    }

    const pathId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      switch (pathType) {
        case 'line':
          await createLinePath(pathId, lineForm.startX, lineForm.startY, lineForm.endX, lineForm.endY, pathName);
          break;
        case 'circle':
          await createCirclePath(pathId, circleForm.centerX, circleForm.centerY, circleForm.radius, pathName);
          break;
        case 'curve':
          await createCurvePath(pathId, curveForm.startX, curveForm.startY, curveForm.controlX, curveForm.controlY, curveForm.endX, curveForm.endY, pathName);
          break;
        case 'arc':
          await createArcPath(pathId, arcForm.centerX, arcForm.centerY, arcForm.radius, arcForm.startAngle, arcForm.endAngle, pathName);
          break;
      }

      setPathName('');
      setShowCreateForm(false);
      await loadPaths();
    } catch (error) {
      console.error('Failed to create text path:', error);
      alert('Failed to create text path');
    }
  };

  const handleDeletePath = async (pathId: string) => {
    if (window.confirm('Are you sure you want to delete this text path?')) {
      try {
        await deleteTextPath(pathId);
        await loadPaths();
      } catch (error) {
        console.error('Failed to delete text path:', error);
        alert('Failed to delete text path');
      }
    }
  };

  const handlePathSelect = (pathId: string) => {
    if (onPathSelect) {
      onPathSelect(pathId);
    }
  };

  const renderPathForm = () => {
    switch (pathType) {
      case 'line':
        return (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Start X</label>
                <input
                  type="number"
                  value={lineForm.startX}
                  onChange={(e) => setLineForm(prev => ({ ...prev, startX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Start Y</label>
                <input
                  type="number"
                  value={lineForm.startY}
                  onChange={(e) => setLineForm(prev => ({ ...prev, startY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>End X</label>
                <input
                  type="number"
                  value={lineForm.endX}
                  onChange={(e) => setLineForm(prev => ({ ...prev, endX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>End Y</label>
                <input
                  type="number"
                  value={lineForm.endY}
                  onChange={(e) => setLineForm(prev => ({ ...prev, endY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
            </div>
          </div>
        );

      case 'circle':
        return (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Center X</label>
                <input
                  type="number"
                  value={circleForm.centerX}
                  onChange={(e) => setCircleForm(prev => ({ ...prev, centerX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Center Y</label>
                <input
                  type="number"
                  value={circleForm.centerY}
                  onChange={(e) => setCircleForm(prev => ({ ...prev, centerY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Radius</label>
              <input
                type="number"
                value={circleForm.radius}
                onChange={(e) => setCircleForm(prev => ({ ...prev, radius: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
              />
            </div>
          </div>
        );

      case 'curve':
        return (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Start X</label>
                <input
                  type="number"
                  value={curveForm.startX}
                  onChange={(e) => setCurveForm(prev => ({ ...prev, startX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Start Y</label>
                <input
                  type="number"
                  value={curveForm.startY}
                  onChange={(e) => setCurveForm(prev => ({ ...prev, startY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Control X</label>
                <input
                  type="number"
                  value={curveForm.controlX}
                  onChange={(e) => setCurveForm(prev => ({ ...prev, controlX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Control Y</label>
                <input
                  type="number"
                  value={curveForm.controlY}
                  onChange={(e) => setCurveForm(prev => ({ ...prev, controlY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>End X</label>
                <input
                  type="number"
                  value={curveForm.endX}
                  onChange={(e) => setCurveForm(prev => ({ ...prev, endX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>End Y</label>
                <input
                  type="number"
                  value={curveForm.endY}
                  onChange={(e) => setCurveForm(prev => ({ ...prev, endY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
            </div>
          </div>
        );

      case 'arc':
        return (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Center X</label>
                <input
                  type="number"
                  value={arcForm.centerX}
                  onChange={(e) => setArcForm(prev => ({ ...prev, centerX: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Center Y</label>
                <input
                  type="number"
                  value={arcForm.centerY}
                  onChange={(e) => setArcForm(prev => ({ ...prev, centerY: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Radius</label>
                <input
                  type="number"
                  value={arcForm.radius}
                  onChange={(e) => setArcForm(prev => ({ ...prev, radius: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>Start Angle (rad)</label>
                <input
                  type="number"
                  step="0.1"
                  value={arcForm.startAngle}
                  onChange={(e) => setArcForm(prev => ({ ...prev, startAngle: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '2px' }}>End Angle (rad)</label>
                <input
                  type="number"
                  step="0.1"
                  value={arcForm.endAngle}
                  onChange={(e) => setArcForm(prev => ({ ...prev, endAngle: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '4px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '9px' }}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '12px', color: '#FFF', margin: 0 }}>📐 Text Paths</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: showCreateForm ? '#dc3545' : '#007bff',
            color: '#FFF',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '9px',
            cursor: 'pointer'
          }}
        >
          {showCreateForm ? 'Cancel' : 'Create Path'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#2a2a2a', borderRadius: '4px', border: '1px solid #444' }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '4px' }}>Path Name</label>
            <input
              type="text"
              value={pathName}
              onChange={(e) => setPathName(e.target.value)}
              placeholder="Enter path name"
              style={{ width: '100%', padding: '6px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '10px' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '9px', color: '#CCC', display: 'block', marginBottom: '4px' }}>Path Type</label>
            <select
              value={pathType}
              onChange={(e) => setPathType(e.target.value as any)}
              style={{ width: '100%', padding: '6px', background: '#000', color: '#FFF', border: '1px solid #333', borderRadius: '3px', fontSize: '10px' }}
            >
              <option value="line">Line</option>
              <option value="circle">Circle</option>
              <option value="curve">Curve</option>
              <option value="arc">Arc</option>
            </select>
          </div>

          {renderPathForm()}

          <button
            onClick={handleCreatePath}
            style={{
              background: '#28a745',
              color: '#FFF',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Create Path
          </button>
        </div>
      )}

      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {paths.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '10px', padding: '20px' }}>
            No text paths created yet
          </div>
        ) : (
          paths.map((path) => (
            <div
              key={path.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: selectedPathId === path.id ? '#007bff' : '#333',
                borderRadius: '3px',
                marginBottom: '4px',
                cursor: 'pointer',
                border: selectedPathId === path.id ? '1px solid #0056b3' : '1px solid #555'
              }}
              onClick={() => handlePathSelect(path.id)}
            >
              <div>
                <div style={{ fontSize: '10px', color: '#FFF', fontWeight: '600' }}>{path.name}</div>
                <div style={{ fontSize: '8px', color: '#CCC' }}>{path.type}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePath(path.id);
                }}
                style={{
                  background: '#dc3545',
                  color: '#FFF',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  fontSize: '8px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
