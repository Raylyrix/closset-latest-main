/**
 * SimpleTextToolPanel - UI component for the simplified text tool
 */

import React, { useState } from 'react';
import { useSimpleTextToolIntegration } from '../hooks/useSimpleTextToolIntegration';

interface SimpleTextToolPanelProps {
  activeTool: string;
}

export const SimpleTextToolPanel: React.FC<SimpleTextToolPanelProps> = ({ activeTool }) => {
  const {
    textElements,
    activeTextId,
    handleTextUpdate,
    handleTextDelete,
    getSelectedText,
    clearSelection
  } = useSimpleTextToolIntegration();
  
  const [newText, setNewText] = useState('');
  const selectedText = getSelectedText();
  
  if (activeTool !== 'text') return null;
  
  return (
    <div className="simple-text-tool-panel" style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', margin: '8px' }}>
      <h3>Simple Text Tool</h3>
      
      {/* Text Creation */}
      <div style={{ marginBottom: '16px' }}>
        <h4>Create New Text</h4>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Enter text..."
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <button
          onClick={() => {
            if (newText.trim()) {
              // This will be handled by the 3D model click handler
              console.log('🎨 SimpleTextTool: Ready to create text:', newText);
              setNewText('');
            }
          }}
          disabled={!newText.trim()}
          style={{ width: '100%', padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Click on model to place text
        </button>
      </div>
      
      {/* Text Selection */}
      <div style={{ marginBottom: '16px' }}>
        <h4>Select Text ({textElements.length} total)</h4>
        {textElements.length > 0 ? (
          <select
            value={activeTextId || ''}
            onChange={(e) => {
              if (e.target.value) {
                // This will be handled by the integration hook
                console.log('🎨 SimpleTextTool: Select text:', e.target.value);
              } else {
                clearSelection();
              }
            }}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Select Text --</option>
            {textElements.map(element => (
              <option key={element.id} value={element.id}>
                {element.text} (ID: {element.id.slice(-8)})
              </option>
            ))}
          </select>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No text elements created yet</p>
        )}
      </div>
      
      {/* Text Editing */}
      {selectedText && (
        <div style={{ marginBottom: '16px' }}>
          <h4>Edit Selected Text</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div>
              <label>Text:</label>
              <input
                type="text"
                value={selectedText.text}
                onChange={(e) => handleTextUpdate(selectedText.id, { text: e.target.value })}
                style={{ width: '100%', padding: '4px' }}
              />
            </div>
            
            <div>
              <label>Font Size:</label>
              <input
                type="number"
                value={selectedText.fontSize}
                onChange={(e) => handleTextUpdate(selectedText.id, { fontSize: parseInt(e.target.value) || 24 })}
                style={{ width: '100%', padding: '4px' }}
              />
            </div>
            
            <div>
              <label>Color:</label>
              <input
                type="color"
                value={selectedText.color}
                onChange={(e) => handleTextUpdate(selectedText.id, { color: e.target.value })}
                style={{ width: '100%', padding: '4px' }}
              />
            </div>
            
            <div>
              <label>Opacity:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedText.opacity}
                onChange={(e) => handleTextUpdate(selectedText.id, { opacity: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{Math.round(selectedText.opacity * 100)}%</span>
            </div>
            
            <div>
              <label>Rotation:</label>
              <input
                type="range"
                min="0"
                max="360"
                value={selectedText.rotation}
                onChange={(e) => handleTextUpdate(selectedText.id, { rotation: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{selectedText.rotation}°</span>
            </div>
            
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={selectedText.visible}
                  onChange={(e) => handleTextUpdate(selectedText.id, { visible: e.target.checked })}
                />
                Visible
              </label>
            </div>
            
            <button
              onClick={() => handleTextDelete(selectedText.id)}
              style={{ padding: '8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Delete Text
            </button>
          </div>
        </div>
      )}
      
      {/* Debug Info */}
      <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px' }}>
        <h5>Debug Info:</h5>
        <p>Total Elements: {textElements.length}</p>
        <p>Active ID: {activeTextId || 'None'}</p>
        <p>Selected Text: {selectedText ? `"${selectedText.text}"` : 'None'}</p>
      </div>
    </div>
  );
};
