# Persistence System Architecture

## Overview

The new persistence system replaces the old unreliable browser-based caching with a robust, file-based storage mechanism. It provides reliable saving and loading of projects with all layers, masks, effects, and assets properly stored.

## 🏗️ Architecture

### Core Components

```
persistence/
├── ProjectMetadata.ts       # Type definitions and file structure
├── AssetManager.ts          # Asset storage and management
├── ProjectSerializer.ts     # Serialization/deserialization
├── ProjectFileManager.ts    # Main save/load interface
├── AutoSaveManager.ts       # Auto-save and recovery
└── index.ts                 # Public API exports
```

### File Format

Projects are saved as `.closset` files with the following structure:

```json
{
  "fileVersion": "1.0.0",
  "fileType": "closset-project",
  "createdAt": "2025-12-02T...",
  "modifiedAt": "2025-12-02T...",
  "project": {
    "id": "project_...",
    "name": "My Design",
    "canvas": { ... },
    "stats": { ... }
  },
  "layers": [ ... ],
  "groups": [ ... ],
  "layerOrder": [ ... ],
  "assets": {
    "version": "1.0.0",
    "assets": { ... }
  },
  "appState": { ... },
  "history": { ... }
}
```

## 📦 Key Features

### 1. **File-Based Storage**
- Projects saved as `.closset` files
- Proper serialization of all data
- No browser storage limitations
- Portable across devices

### 2. **Asset Management**
- Automatic asset extraction and storage
- Deduplication of identical assets
- Size-based storage optimization (inline vs file)
- Asset integrity checking with checksums

### 3. **Auto-Save System**
- Configurable auto-save intervals
- Smart change detection
- Recovery points for crash recovery
- Storage usage monitoring

### 4. **Export/Import**
- Export as: `.closset`, PNG, JPG, JSON
- Import from `.closset` or JSON files
- Drag-and-drop support
- Batch operations

### 5. **Performance**
- Compression support (LZ-String)
- Lazy loading of assets
- Efficient serialization
- Memory-conscious design

## 🚀 Usage

### Basic Usage

```typescript
import { projectFileManager, initAutoSaveManager } from '@/core/persistence';

// Create a new project
const project = projectFileManager.createProject('My Design', {
  width: 2048,
  height: 2048,
  description: 'My amazing design',
  author: 'John Doe'
});

// Save to file (triggers download)
await projectFileManager.saveProjectToFile('my-design.closset', {
  compress: true,
  includeHistory: false
});

// Save to browser storage
await projectFileManager.saveProjectToStorage();

// Load from file
const file = /* File from input */;
const loadedProject = await projectFileManager.loadProjectFromFile(file);

// Load from storage
const project = await projectFileManager.loadProjectFromStorage('project_123');
```

### Auto-Save Setup

```typescript
import { initAutoSaveManager } from '@/core/persistence';

// Initialize auto-save
const autoSave = initAutoSaveManager(projectFileManager);

// Configure
autoSave.updateConfig({
  enabled: true,
  interval: 60000, // 1 minute
  maxBackups: 10,
  compressionEnabled: true
});

// Start auto-save
autoSave.start();

// Get status
const status = autoSave.getStatus();
console.log('Auto-save status:', status);

// Check for crash recovery
const recoveryPoint = await autoSave.checkForCrashRecovery();
if (recoveryPoint) {
  await autoSave.recoverFromPoint(recoveryPoint.id);
}

// Mark clean exit (call on app unmount)
autoSave.markCleanExit();
```

### Export Operations

```typescript
// Export as PNG
const pngBlob = await projectFileManager.exportProject('png');

// Export as JPG
const jpgBlob = await projectFileManager.exportProject('jpg');

// Export as JSON
const jsonBlob = await projectFileManager.exportProject('json');
```

### Asset Management

```typescript
const assetManager = projectFileManager.getAssetManager();

// Add an asset
const assetId = await assetManager.addAsset(
  dataUrl,
  'my-image',
  'image',
  'image/png',
  { layerId: 'layer_123' }
);

// Get an asset
const data = await assetManager.getAsset(assetId);

// Link asset to layer
assetManager.linkAssetToLayer(assetId, 'layer_456');

// Clean up unused assets
const removed = assetManager.cleanupUnusedAssets();

// Get statistics
const stats = assetManager.getStatistics();
```

## 🎨 UI Component

### ProjectManager Component

```tsx
import { ProjectManager } from '@/components/ProjectManager';

function App() {
  const [showProjectManager, setShowProjectManager] = useState(false);

  return (
    <>
      <button onClick={() => setShowProjectManager(true)}>
        Open Project Manager
      </button>
      
      {showProjectManager && (
        <ProjectManager onClose={() => setShowProjectManager(false)} />
      )}
    </>
  );
}
```

## 📊 Data Flow

### Saving Process

```
1. User initiates save
2. ProjectFileManager.saveProject()
3. Serialize all layers (ProjectSerializer)
4. Extract and store assets (AssetManager)
5. Build ProjectFile structure
6. Compress if enabled (LZ-String)
7. Save to file/storage
8. Create recovery point (AutoSaveManager)
```

### Loading Process

```
1. User selects file
2. ProjectFileManager.loadProjectFromFile()
3. Read and parse file
4. Decompress if needed
5. Load asset registry (AssetManager)
6. Deserialize layers (ProjectSerializer)
7. Restore app state
8. Update layer store
9. Trigger recomposition
```

## 🔧 Technical Details

### Serialization Strategy

**Canvas Elements:**
- Converted to PNG blobs
- Base64 encoded
- Stored as assets (inline or file)
- Reconstructed on load

**Large Data:**
- Assets > 100KB stored as separate files
- Smaller assets inline in JSON
- Automatic optimization

**References:**
- Layer → Asset linkage maintained
- Asset usage tracking
- Cleanup of orphaned assets

### Storage Locations

**Browser Storage (localStorage/IndexedDB):**
- Quick access projects (< 5MB)
- Recovery points
- Auto-save backups
- Project manifests

**File Storage (.closset):**
- Full project exports
- Shareable projects
- Archival storage
- No size limits

### Performance Optimizations

1. **Lazy Loading:** Assets loaded on-demand
2. **Compression:** Optional LZ-String compression
3. **Chunking:** Large operations split into chunks
4. **Debouncing:** Auto-save debounced to prevent excessive writes
5. **Memory Management:** Cleanup of unused canvases and data

## 🛡️ Error Handling

### Integrity Checks

```typescript
// Verify file format
if (projectFile.fileType !== 'closset-project') {
  throw new Error('Invalid project file format');
}

// Verify checksums
const checksum = await generateChecksum(data);
if (checksum !== asset.checksum) {
  throw new Error('Asset integrity check failed');
}
```

### Recovery Mechanisms

1. **Auto-save Recovery:** Automatic recovery from crashes
2. **Recovery Points:** Multiple restore points
3. **Validation:** Data validation during load
4. **Fallbacks:** Graceful degradation on errors

## 📈 Statistics and Monitoring

```typescript
// Get project statistics
const stats = projectFileManager.getStatistics();
console.log('Project stats:', stats);
// {
//   project: { ... },
//   assets: {
//     totalAssets: 25,
//     totalSize: 1048576,
//     byType: { canvas: 10, image: 8, thumbnail: 7 },
//     inlineCount: 15,
//     fileCount: 10,
//     unusedCount: 0
//   },
//   layers: 12,
//   groups: 3
// }

// Get storage usage
const usage = autoSaveManager.getStorageUsage();
console.log('Storage usage:', usage);
// { used: 5242880, total: 10485760, percentage: 50 }
```

## 🔄 Migration from Old System

### Replacing Old Save/Load

**Before (App.tsx):**
```typescript
saveProjectState: async () => {
  const compressed = LZString.compress(JSON.stringify(state));
  await localforage.setItem('project-state', compressed);
}
```

**After (New System):**
```typescript
import { projectFileManager } from '@/core/persistence';

// Save
await projectFileManager.saveProjectToStorage();

// Load
await projectFileManager.loadProjectFromStorage(projectId);
```

### Benefits Over Old System

| Feature | Old System | New System |
|---------|-----------|------------|
| Storage | Browser only | Browser + File |
| Size limit | ~5-10MB | Unlimited |
| Reliability | Unreliable | Robust |
| Recovery | None | Multi-point |
| Export | Limited | Full featured |
| Performance | Slow | Fast |
| Portability | No | Yes |

## 🎯 Best Practices

### 1. **Initialize Early**
```typescript
// In App.tsx or main.tsx
useEffect(() => {
  const autoSave = initAutoSaveManager(projectFileManager);
  autoSave.start();
  
  return () => {
    autoSave.markCleanExit();
  };
}, []);
```

### 2. **Handle Errors**
```typescript
try {
  await projectFileManager.saveProjectToFile();
} catch (error) {
  console.error('Save failed:', error);
  // Show user-friendly error message
  // Attempt recovery
}
```

### 3. **Clean Up**
```typescript
// Periodically clean up unused assets
setInterval(() => {
  const removed = assetManager.cleanupUnusedAssets();
  console.log(`Cleaned up ${removed} unused assets`);
}, 5 * 60 * 1000); // Every 5 minutes
```

### 4. **Monitor Storage**
```typescript
// Check storage before saving
const usage = autoSaveManager.getStorageUsage();
if (usage.percentage > 90) {
  console.warn('Storage almost full!');
  // Warn user or clean up
}
```

## 🚦 Status & Roadmap

### ✅ Completed
- [x] File format design
- [x] Asset management system
- [x] Serialization/deserialization
- [x] Project file manager
- [x] Auto-save system
- [x] Recovery system
- [x] UI component
- [x] Export functionality

### 🔄 Future Enhancements
- [ ] ZIP export with assets folder
- [ ] Cloud storage integration
- [ ] Real-time collaboration
- [ ] Version control
- [ ] Project templates
- [ ] Batch operations
- [ ] PDF export
- [ ] Asset compression/optimization
- [ ] Incremental saves (deltas)
- [ ] Multi-file projects

## 📝 Notes

### Migration Strategy

1. **Phase 1:** Install new system alongside old system
2. **Phase 2:** Add UI to switch between systems
3. **Phase 3:** Migrate existing projects
4. **Phase 4:** Remove old system
5. **Phase 5:** Optimize and refine

### Compatibility

- Browser: Modern browsers with File API support
- Node.js: Compatible with Electron for desktop apps
- Storage: localStorage, IndexedDB, File System Access API
- Formats: JSON, Binary (future), ZIP (future)

## 🤝 Contributing

When adding new features to the persistence system:

1. Update type definitions in `ProjectMetadata.ts`
2. Add serialization logic in `ProjectSerializer.ts`
3. Update `ProjectFileManager` if needed
4. Add tests
5. Update this documentation

## 📞 Support

For issues or questions:
- Check console logs (prefixed with 💾, 📦, 🔄)
- Review error messages
- Check recovery points
- Verify file format version

---

**Version:** 1.0.0  
**Last Updated:** 2025-12-02  
**Status:** ✅ Production Ready


