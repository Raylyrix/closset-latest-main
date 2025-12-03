# Integration Guide: New Persistence System

## Quick Start

### 1. Install Dependencies

The system uses these dependencies (already in your project):
- `zustand` - State management
- `lz-string` - Compression
- `nanoid` - ID generation
- `localforage` - Browser storage (optional)

### 2. Import the System

```typescript
import { 
  projectFileManager, 
  initAutoSaveManager,
  getAutoSaveManager 
} from './core/persistence';
```

### 3. Basic Integration in App.tsx

Replace the old save/load methods with the new system:

```typescript
// In your App component or main store

// OLD CODE (remove this):
saveProjectState: async () => {
  const compressed = LZString.compress(JSON.stringify(projectState));
  await localforage.setItem('project-state', compressed);
}

loadProjectState: async () => {
  const compressed = await localforage.getItem<string>('project-state');
  // ... complex loading logic
}

// NEW CODE (add this):
import { projectFileManager } from './core/persistence';

saveProject: async () => {
  await projectFileManager.saveProjectToStorage();
  console.log('✅ Project saved');
}

loadProject: async () => {
  const projectId = 'default'; // or get from state
  await projectFileManager.loadProjectFromStorage(projectId);
  console.log('✅ Project loaded');
}
```

### 4. Add Auto-Save on App Mount

```typescript
// In App.tsx
import { initAutoSaveManager } from './core/persistence';

useEffect(() => {
  // Initialize and start auto-save
  const autoSave = initAutoSaveManager(projectFileManager);
  
  // Check for crash recovery
  autoSave.checkForCrashRecovery().then(recoveryPoint => {
    if (recoveryPoint) {
      const shouldRecover = window.confirm(
        `Found unsaved work from ${new Date(recoveryPoint.timestamp).toLocaleString()}. Restore it?`
      );
      if (shouldRecover) {
        autoSave.recoverFromPoint(recoveryPoint.id);
      }
    }
  });
  
  // Start auto-save
  autoSave.start();
  
  // Cleanup on unmount
  return () => {
    autoSave.markCleanExit();
    autoSave.stop();
  };
}, []);
```

### 5. Add Save/Load UI

Option A: Use the pre-built ProjectManager component:

```typescript
import { ProjectManager } from './components/ProjectManager';

function App() {
  const [showProjectManager, setShowProjectManager] = useState(false);
  
  return (
    <>
      {/* Your existing app */}
      
      {/* Add a button to open project manager */}
      <button onClick={() => setShowProjectManager(true)}>
        💾 Projects
      </button>
      
      {/* Show project manager modal */}
      {showProjectManager && (
        <ProjectManager onClose={() => setShowProjectManager(false)} />
      )}
    </>
  );
}
```

Option B: Create custom buttons:

```typescript
// Save button
<button onClick={async () => {
  await projectFileManager.saveProjectToFile('my-design.closset', {
    compress: true
  });
}}>
  💾 Save Project
</button>

// Load button
<input
  type="file"
  accept=".closset"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await projectFileManager.loadProjectFromFile(file);
    }
  }}
/>

// Export PNG button
<button onClick={async () => {
  await projectFileManager.exportProject('png');
}}>
  🖼️ Export PNG
</button>
```

## Complete Example

Here's a complete example showing how to integrate into your App.tsx:

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { 
  projectFileManager, 
  initAutoSaveManager,
  getAutoSaveManager 
} from './core/persistence';
import { ProjectManager } from './components/ProjectManager';

// Your existing store
export const useApp = create<AppState>((set, get) => ({
  // ... existing state ...
  
  // ADD: New persistence methods
  saveProjectNew: async () => {
    try {
      await projectFileManager.saveProjectToStorage();
      console.log('✅ Project saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Save failed:', error);
      return false;
    }
  },
  
  loadProjectNew: async (projectId?: string) => {
    try {
      const id = projectId || 'default';
      await projectFileManager.loadProjectFromStorage(id);
      console.log('✅ Project loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Load failed:', error);
      return false;
    }
  },
  
  exportProjectFile: async (filename?: string) => {
    try {
      await projectFileManager.saveProjectToFile(filename);
      console.log('✅ Project exported successfully');
      return true;
    } catch (error) {
      console.error('❌ Export failed:', error);
      return false;
    }
  }
}));

export function App() {
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<any>(null);
  
  // Initialize persistence system
  useEffect(() => {
    console.log('🚀 Initializing persistence system...');
    
    // Initialize auto-save
    const autoSave = initAutoSaveManager(projectFileManager);
    
    // Configure auto-save
    autoSave.updateConfig({
      enabled: true,
      interval: 60000, // 1 minute
      maxBackups: 10,
      compressionEnabled: true
    });
    
    // Check for crash recovery
    autoSave.checkForCrashRecovery().then(recoveryPoint => {
      if (recoveryPoint) {
        const shouldRecover = window.confirm(
          `⚠️ Found unsaved work from ${new Date(recoveryPoint.timestamp).toLocaleString()}.\n\nWould you like to restore it?`
        );
        
        if (shouldRecover) {
          autoSave.recoverFromPoint(recoveryPoint.id).then(success => {
            if (success) {
              alert('✅ Project recovered successfully!');
            } else {
              alert('❌ Recovery failed. Please try loading a backup manually.');
            }
          });
        }
      }
    });
    
    // Start auto-save
    autoSave.start();
    console.log('✅ Auto-save started');
    
    // Update status periodically
    const statusInterval = setInterval(() => {
      setAutoSaveStatus(autoSave.getStatus());
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up persistence system...');
      autoSave.markCleanExit();
      autoSave.stop();
      clearInterval(statusInterval);
    };
  }, []);
  
  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const autoSave = getAutoSaveManager();
      if (autoSave.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = async (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const autoSave = getAutoSaveManager();
        await autoSave.saveNow();
        alert('✅ Project saved!');
      }
      
      // Ctrl/Cmd + Shift + S: Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        setShowProjectManager(true);
      }
      
      // Ctrl/Cmd + O: Open
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setShowProjectManager(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Your existing app UI */}
      
      {/* Add project controls */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        display: 'flex',
        gap: '10px',
        zIndex: 1000
      }}>
        {/* Auto-save indicator */}
        {autoSaveStatus && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: autoSaveStatus.hasUnsavedChanges ? '#ffa500' : '#28a745',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            {autoSaveStatus.hasUnsavedChanges ? '⚠️ Unsaved' : '✅ Saved'}
            <span style={{ opacity: 0.7 }}>
              • {autoSaveStatus.running ? 'Auto-save ON' : 'Auto-save OFF'}
            </span>
          </div>
        )}
        
        {/* Project manager button */}
        <button
          onClick={() => setShowProjectManager(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          💾 Projects
        </button>
      </div>
      
      {/* Project manager modal */}
      {showProjectManager && (
        <ProjectManager onClose={() => setShowProjectManager(false)} />
      )}
    </div>
  );
}
```

## Migration Checklist

- [ ] Import new persistence system
- [ ] Initialize auto-save in App mount
- [ ] Add keyboard shortcuts (Ctrl+S, etc.)
- [ ] Add save/load UI (buttons or modal)
- [ ] Add auto-save status indicator
- [ ] Handle beforeunload (warn about unsaved changes)
- [ ] Test save functionality
- [ ] Test load functionality
- [ ] Test crash recovery
- [ ] Test export functionality
- [ ] Remove old save/load code
- [ ] Update any references to old system

## Testing

### Manual Testing

1. **Save Test:**
   - Make changes to project
   - Click save button
   - Check browser downloads
   - Verify file is valid

2. **Load Test:**
   - Create a project
   - Save it
   - Reload page
   - Load saved project
   - Verify all layers/data restored

3. **Auto-Save Test:**
   - Make changes
   - Wait for auto-save interval
   - Check console logs for auto-save
   - Verify recovery points created

4. **Crash Recovery Test:**
   - Make changes (don't save)
   - Force close browser (without closing cleanly)
   - Reopen browser
   - Should see recovery prompt
   - Verify recovery works

5. **Export Test:**
   - Export as PNG
   - Export as JPG
   - Export as JSON
   - Verify all formats work

### Automated Testing

```typescript
// Example test
import { projectFileManager } from './core/persistence';

describe('Persistence System', () => {
  it('should save and load project', async () => {
    // Create project
    const project = projectFileManager.createProject('Test Project');
    
    // Save
    const json = await projectFileManager.saveProjectToJSON();
    expect(json).toBeDefined();
    
    // Load
    const loaded = await projectFileManager.loadProjectFromJSON(json);
    expect(loaded.name).toBe('Test Project');
  });
});
```

## Troubleshooting

### Save Not Working
- Check browser console for errors
- Verify storage quota not exceeded
- Check file permissions

### Load Not Working
- Verify file format is correct
- Check file version compatibility
- Look for parse errors in console

### Auto-Save Not Running
- Check auto-save is enabled
- Verify interval is set correctly
- Look for initialization errors

### Recovery Not Available
- Check localStorage is enabled
- Verify recovery points exist
- Check session tracking

## Performance Tips

1. **Adjust Auto-Save Interval:**
   - Shorter interval = more protection, more overhead
   - Longer interval = less overhead, less protection
   - Recommended: 60 seconds

2. **Enable Compression:**
   - Reduces file size by 70-90%
   - Slightly slower save/load
   - Recommended for large projects

3. **Limit Recovery Points:**
   - Each point uses storage
   - Recommended: 5-10 points

4. **Clean Up Assets:**
   - Periodically run `assetManager.cleanupUnusedAssets()`
   - Reduces project size

## Next Steps

After integration:

1. Test thoroughly with real projects
2. Gather user feedback
3. Monitor error logs
4. Optimize based on usage patterns
5. Add advanced features (cloud sync, versioning, etc.)

---

**Need Help?** Check the console logs - all operations are logged with emoji prefixes:
- 💾 = Save/Load operations
- 📦 = Asset operations
- 🔄 = Recovery operations
- ✅ = Success
- ❌ = Error


