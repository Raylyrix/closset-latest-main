# Persistence System

A complete, production-ready file-based persistence system for the Closset design application.

## What's Inside

- **ProjectMetadata.ts** - Type definitions and file format specification
- **AssetManager.ts** - Asset storage, retrieval, and optimization
- **ProjectSerializer.ts** - Serialization/deserialization between runtime and storage formats
- **ProjectFileManager.ts** - Main API for save/load operations
- **AutoSaveManager.ts** - Automatic saving and crash recovery
- **index.ts** - Public API exports

## Quick Start

```typescript
import { projectFileManager, initAutoSaveManager } from './persistence';

// Initialize auto-save
const autoSave = initAutoSaveManager(projectFileManager);
autoSave.start();

// Save project
await projectFileManager.saveProjectToFile('my-design.closset');

// Load project
await projectFileManager.loadProjectFromFile(file);
```

## Documentation

- **Complete Guide:** `/PERSISTENCE_SYSTEM.md`
- **Integration Guide:** `/INTEGRATION_GUIDE.md`
- **Quick Reference:** `/PERSISTENCE_QUICK_REFERENCE.md`
- **Architecture:** `/PERSISTENCE_ARCHITECTURE_DIAGRAM.md`
- **Summary:** `/PERSISTENCE_SYSTEM_SUMMARY.md`

## Features

✅ File-based storage (.closset format)  
✅ Asset management with optimization  
✅ Auto-save with crash recovery  
✅ Export to PNG, JPG, JSON  
✅ Compression support  
✅ Full TypeScript support  
✅ Production ready  

## Status

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2025-12-02


