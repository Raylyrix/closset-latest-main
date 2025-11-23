import React from 'react';
import { useApp } from '../src/App';

/**
 * Simple test component for undo/redo functionality
 */
export const UndoRedoTest: React.FC = () => {
  const { undo, redo, canUndo, canRedo, saveState, history, historyIndex } = useApp();

  const handleTestSave = () => {
    saveState('Test Action');
    console.log('🧪 Test state saved');
  };

  const handleTestUndo = () => {
    console.log('🧪 Test undo clicked');
    undo();
  };

  const handleTestRedo = () => {
    console.log('🧪 Test redo clicked');
    redo();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Undo/Redo Test</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={handleTestSave}
          style={{ 
            background: '#2196F3', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px', 
            marginRight: '5px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Test Save
        </button>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={handleTestUndo}
          disabled={!canUndo()}
          style={{ 
            background: canUndo() ? '#4CAF50' : '#666', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px', 
            marginRight: '5px',
            borderRadius: '3px',
            cursor: canUndo() ? 'pointer' : 'not-allowed'
          }}
        >
          Test Undo
        </button>
        
        <button 
          onClick={handleTestRedo}
          disabled={!canRedo()}
          style={{ 
            background: canRedo() ? '#4CAF50' : '#666', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: canRedo() ? 'pointer' : 'not-allowed'
          }}
        >
          Test Redo
        </button>
      </div>
      
      <div style={{ fontSize: '10px', color: '#999' }}>
        History: {historyIndex + 1}/{history.length}
      </div>
      
      <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
        Can Undo: {canUndo() ? 'Yes' : 'No'} | Can Redo: {canRedo() ? 'Yes' : 'No'}
      </div>
    </div>
  );
};

