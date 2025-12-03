# 🚀 Persistence System - Quick Reference

## 📦 Import

```typescript
import { 
  projectFileManager,
  initAutoSaveManager,
  getAutoSaveManager
} from './core/persistence';
```

## 💾 Save Operations

```typescript
// Save to file (download)
await projectFileManager.saveProjectToFile('my-project.closset');

// Save to browser storage
await projectFileManager.saveProjectToStorage();

// Save with options
await projectFileManager.saveProjectToFile('my-project.closset', {
  compress: true,        // Enable compression
  includeHistory: false, // Exclude history
  format: 'json'        // Format (json or binary)
});

// Get JSON string
const json = await projectFileManager.saveProjectToJSON({ compress: true });
```

## 📂 Load Operations

```typescript
// Load from file
const project = await projectFileManager.loadProjectFromFile(file);

// Load from storage
const project = await projectFileManager.loadProjectFromStorage('project_123');

// Load from JSON string
const project = await projectFileManager.loadProjectFromJSON(jsonString);

// Load with options
await projectFileManager.loadProjectFromFile(file, {
  loadHistory: false,    // Skip history
  verifyIntegrity: true  // Verify checksums
});
```

## 🎨 Export Operations

```typescript
// Export as PNG
await projectFileManager.exportProject('png');

// Export as JPG
await projectFileManager.exportProject('jpg');

// Export as JSON
await projectFileManager.exportProject('json');

// Export as ZIP (future)
await projectFileManager.exportProject('zip');
```

## ⚙️ Auto-Save

```typescript
// Initialize (do once on app start)
const autoSave = initAutoSaveManager(projectFileManager);

// Configure
autoSave.updateConfig({
  enabled: true,
  interval: 60000,       // 1 minute
  maxBackups: 10,
  compressionEnabled: true
});

// Control
autoSave.start();
autoSave.stop();
autoSave.pause();
autoSave.resume();

// Manual save
await autoSave.saveNow();

// Get status
const status = autoSave.getStatus();
console.log(status);
// {
//   enabled: true,
//   running: true,
//   lastSaveTime: 1234567890,
//   hasUnsavedChanges: false,
//   saveInProgress: false
// }
```

## 🔄 Recovery

```typescript
// Check for crash on startup
const recoveryPoint = await autoSave.checkForCrashRecovery();
if (recoveryPoint) {
  // Show recovery UI or auto-recover
  await autoSave.recoverFromPoint(recoveryPoint.id);
}

// Get all recovery points
const points = autoSave.getRecoveryPoints();

// Recover from specific point
await autoSave.recoverFromPoint('recovery_123');

// Clear all recovery points
autoSave.clearAllRecoveryPoints();

// Mark clean exit (call on app unmount)
autoSave.markCleanExit();
```

## 📊 Statistics

```typescript
// Project statistics
const stats = projectFileManager.getStatistics();
console.log(stats);
// {
//   project: { ... },
//   assets: {
//     totalAssets: 25,
//     totalSize: 1048576,
//     byType: { canvas: 10, image: 8, ... },
//     unusedCount: 0
//   },
//   layers: 12,
//   groups: 3
// }

// Storage usage
const usage = autoSave.getStorageUsage();
console.log(usage);
// { used: 5242880, total: 10485760, percentage: 50 }

// Asset statistics
const assetStats = assetManager.getStatistics();
```

## 🎯 Project Management

```typescript
// Create new project
const project = projectFileManager.createProject('My Design', {
  width: 2048,
  height: 2048,
  description: 'My amazing design',
  author: 'John Doe'
});

// Get current project
const currentProject = projectFileManager.getCurrentProject();

// Get project manifest (lightweight metadata)
const manifest = await projectFileManager.getProjectManifest();
```

## 📦 Asset Management

```typescript
// Get asset manager
const assetManager = projectFileManager.getAssetManager();

// Add asset
const assetId = await assetManager.addAsset(
  dataUrl,              // Data URL or Blob
  'my-image',           // Name
  'image',              // Type
  'image/png',          // MIME type
  { layerId: 'layer_123' }  // Options
);

// Get asset
const data = await assetManager.getAsset(assetId);

// Remove asset
assetManager.removeAsset(assetId);

// Link/unlink
assetManager.linkAssetToLayer(assetId, layerId);
assetManager.unlinkAssetFromLayer(assetId, layerId);

// Get layer assets
const assets = assetManager.getLayerAssets(layerId);

// Cleanup
const removed = assetManager.cleanupUnusedAssets();

// Optimize
const saved = await assetManager.optimizeAssets();
```

## 🎨 UI Component

```typescript
import { ProjectManager } from './components/ProjectManager';

function App() {
  const [show, setShow] = useState(false);
  
  return (
    <>
      <button onClick={() => setShow(true)}>Open</button>
      {show && <ProjectManager onClose={() => setShow(false)} />}
    </>
  );
}
```

## ⌨️ Keyboard Shortcuts (Recommended)

```typescript
useEffect(() => {
  const handleKeyboard = async (e: KeyboardEvent) => {
    // Ctrl/Cmd + S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      await autoSave.saveNow();
    }
    
    // Ctrl/Cmd + Shift + S: Save As
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
      e.preventDefault();
      await projectFileManager.saveProjectToFile();
    }
    
    // Ctrl/Cmd + O: Open
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      // Show file picker
    }
  };
  
  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, []);
```

## ⚠️ Before Unload Warning

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (autoSave.hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes!';
      return e.returnValue;
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

## 🐛 Debugging

```typescript
// Enable debug mode
localStorage.setItem('closset_debug', 'true');

// Check logs (console)
// 💾 = Save/Load
// 📦 = Assets
// 🔄 = Recovery
// ✅ = Success
// ❌ = Error

// Get detailed status
console.log({
  autoSave: autoSave.getStatus(),
  project: projectFileManager.getStatistics(),
  storage: autoSave.getStorageUsage()
});
```

## 🎯 Common Patterns

### Pattern 1: Auto-save Setup
```typescript
useEffect(() => {
  const autoSave = initAutoSaveManager(projectFileManager);
  autoSave.start();
  return () => {
    autoSave.markCleanExit();
    autoSave.stop();
  };
}, []);
```

### Pattern 2: Save Button with Feedback
```typescript
const [saving, setSaving] = useState(false);

const handleSave = async () => {
  setSaving(true);
  try {
    await projectFileManager.saveProjectToFile();
    alert('Saved!');
  } catch (error) {
    alert('Save failed!');
  } finally {
    setSaving(false);
  }
};
```

### Pattern 3: Load with Validation
```typescript
const handleLoad = async (file: File) => {
  try {
    const project = await projectFileManager.loadProjectFromFile(file, {
      verifyIntegrity: true
    });
    console.log('Loaded:', project.name);
  } catch (error) {
    alert('Invalid file!');
  }
};
```

### Pattern 4: Recovery on Startup
```typescript
useEffect(() => {
  const checkRecovery = async () => {
    const point = await autoSave.checkForCrashRecovery();
    if (point && confirm('Recover unsaved work?')) {
      await autoSave.recoverFromPoint(point.id);
    }
  };
  checkRecovery();
}, []);
```

## 🔧 Troubleshooting

### Save not working?
```typescript
// Check storage quota
const usage = autoSave.getStorageUsage();
console.log('Storage:', usage);

// Check for errors
try {
  await projectFileManager.saveProjectToFile();
} catch (error) {
  console.error('Save error:', error);
}
```

### Load not working?
```typescript
// Verify file format
const text = await file.text();
const data = JSON.parse(text);
console.log('File type:', data.fileType);
console.log('Version:', data.fileVersion);
```

### Auto-save not running?
```typescript
const status = autoSave.getStatus();
console.log('Running:', status.running);
console.log('Enabled:', status.enabled);

// Restart if needed
autoSave.stop();
autoSave.start();
```

## 📚 More Information

- **Full Documentation:** See `PERSISTENCE_SYSTEM.md`
- **Integration Guide:** See `INTEGRATION_GUIDE.md`
- **Summary:** See `PERSISTENCE_SYSTEM_SUMMARY.md`

## 🎉 That's It!

You now have everything you need to integrate the persistence system. Happy coding!

---

**Version:** 1.0.0  
**Last Updated:** 2025-12-02


