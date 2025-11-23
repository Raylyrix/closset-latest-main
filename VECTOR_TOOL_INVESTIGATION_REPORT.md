# Vector Tool Investigation Report

## Executive Summary

The vector tool has several critical issues preventing it from functioning correctly:

1. **useEffect Dependency Mismatch**: The useEffect that renders vector paths has `vectorPaths` in dependencies but uses `useApp.getState().vectorPaths` inside, causing stale state issues
2. **Missing Active Tool Check**: The rendering useEffect doesn't check if vector tool is active before rendering
3. **ComposedCanvas Availability**: Vector tool checks for `composedCanvas` but might fail silently if it's not initialized
4. **State Update Timing**: Vector paths are updated in `paintAtEvent` but rendering might not trigger properly

## Issues Identified

### Issue 1: useEffect Dependency Array Problem
**Location**: `ShirtRefactored.tsx:1404-1583`

**Problem**:
- Line 409: `const vectorPaths = useApp(state => state.vectorPaths || []);` subscribes to state
- Line 1583: `useEffect` has `vectorPaths` in dependency array
- Line 1411: Inside useEffect, uses `useApp.getState().vectorPaths` instead of `vectorPaths` from dependencies

**Impact**: The effect may not trigger correctly because:
1. The subscribed `vectorPaths` changes trigger the effect
2. But inside, it reads fresh state with `getState()`
3. This creates a race condition where the effect might not see the latest changes

**Fix**: Use the `vectorPaths` dependency directly or ensure consistent state access

### Issue 2: Missing Active Tool Check in Render useEffect
**Location**: `ShirtRefactored.tsx:1404-1583`

**Problem**: The rendering useEffect doesn't check if `activeTool === 'vector'` before rendering paths

**Impact**: Vector paths might render even when vector tool is not active, or fail to render when it should

**Fix**: Add active tool check at the start of the useEffect

### Issue 3: ComposedCanvas Not Available Warning
**Location**: `ShirtRefactored.tsx:1833-1837`

**Problem**: Vector tool checks for `composedCanvas` and returns early with just a console.warn if not available

**Impact**: User sees no visual feedback when clicking - tool appears broken

**Fix**: Ensure composedCanvas is initialized before vector tool can be used, or provide better error feedback

### Issue 4: State Update in paintAtEvent May Not Trigger Render
**Location**: `ShirtRefactored.tsx:1824-2214`

**Problem**: When vector paths are updated in `paintAtEvent`, the state update happens but:
- The useEffect might not trigger if the dependency array doesn't detect the change
- The debounce delay (50ms) might cause perceived lag
- `composeLayers()` is called inside the useEffect, not immediately after state update

**Impact**: User clicks but doesn't see paths appearing immediately

**Fix**: Ensure state updates trigger re-render immediately, or call composeLayers right after state update

### Issue 5: Missing vectorEditMode Initialization
**Location**: `ShirtRefactored.tsx:1846-1850`

**Problem**: Code auto-sets `vectorEditMode` to 'pen' if not set, but this might happen after first click

**Impact**: First click might not work if mode isn't initialized

**Fix**: Initialize `vectorEditMode` when vector tool is activated

## Suggested Fixes

### Fix 1: Correct useEffect Dependencies and State Access

```typescript
// At line 409, ensure vectorPaths is properly subscribed
const vectorPaths = useApp(state => state.vectorPaths || []);
const activeTool = useApp(state => state.activeTool);
const vectorEditMode = useApp(state => state.vectorEditMode || 'pen');

// In useEffect (line 1404), use the dependencies directly:
useEffect(() => {
  // Only render if vector tool is active
  if (activeTool !== 'vector') {
    return;
  }
  
  const debounceTime = 50;
  const timeoutId = setTimeout(() => {
    // Use vectorPaths from dependency, not getState()
    const freshVectorPaths = vectorPaths || [];
    
    // Rest of the rendering logic...
  }, debounceTime);
  
  return () => clearTimeout(timeoutId);
}, [vectorPaths, activeTool, vectorEditMode, vectorStrokeColor, vectorStrokeWidth, vectorFillColor, vectorFill, showAnchorPoints]);
```

### Fix 2: Ensure ComposedCanvas is Available

```typescript
// In paintAtEvent, before vector tool handling:
if (currentActiveTool === 'vector') {
  // CRITICAL FIX: Ensure composedCanvas exists or create it
  let composedCanvas = useApp.getState().composedCanvas;
  
  if (!composedCanvas) {
    console.warn('🎯 Vector tool: No composedCanvas - initializing...');
    // Trigger layer composition to create composedCanvas
    useApp.getState().composeLayers();
    composedCanvas = useApp.getState().composedCanvas;
    
    if (!composedCanvas) {
      console.error('🎯 Vector tool: Failed to initialize composedCanvas');
      return;
    }
  }
  
  // Rest of vector tool logic...
}
```

### Fix 3: Initialize vectorEditMode on Tool Activation

```typescript
// In the tool selection handler (wherever activeTool is set):
if (tool === 'vector') {
  // Initialize vector edit mode if not set
  const currentMode = useApp.getState().vectorEditMode;
  if (!currentMode || currentMode === 'move') {
    useApp.setState({ vectorEditMode: 'pen' });
  }
}
```

### Fix 4: Immediate State Update and Render Trigger

```typescript
// In paintAtEvent vector tool section, after updating vectorPaths:
// CRITICAL: Force immediate render trigger
useApp.setState({ 
  vectorPaths: updatedPaths,
  // ... other state
});

// Immediately trigger layer composition and render
useApp.getState().composeLayers();

// Force texture update after a short delay to allow state to propagate
setTimeout(() => {
  updateModelTexture(false, false);
}, 10);
```

### Fix 5: Add Better Error Handling and User Feedback

```typescript
// Add visual feedback when vector tool is clicked but nothing happens
if (currentActiveTool === 'vector') {
  const vectorState = useApp.getState();
  const composedCanvas = vectorState.composedCanvas;
  
  if (!composedCanvas) {
    // Show user-visible error instead of just console.warn
    console.error('🎯 Vector tool: Cannot work without composed canvas');
    // TODO: Show toast/notification to user
    return;
  }
  
  // Log debug info for troubleshooting
  console.log('🎯 Vector tool active:', {
    editMode: vectorState.vectorEditMode,
    pathCount: (vectorState.vectorPaths || []).length,
    activePathId: vectorState.activePathId,
    canvasSize: { width: composedCanvas.width, height: composedCanvas.height }
  });
}
```

## Testing Checklist

After applying fixes:

1. **Tool Activation**:
   - [ ] Select vector tool - check console for initialization logs
   - [ ] Verify `vectorEditMode` is set to 'pen' by default
   - [ ] Verify `composedCanvas` is available

2. **Drawing**:
   - [ ] Click on model - verify first anchor point appears
   - [ ] Click again - verify second anchor point appears and path is drawn
   - [ ] Continue clicking - verify path continues to grow
   - [ ] Check console for any errors

3. **Rendering**:
   - [ ] Verify vector paths appear on model immediately after clicking
   - [ ] Verify paths persist when switching tools and switching back
   - [ ] Verify anchor points are visible when `showAnchorPoints` is enabled

4. **Mode Switching**:
   - [ ] Switch to 'select' mode - verify anchors are visible
   - [ ] Click on anchor - verify it becomes selected
   - [ ] Drag anchor - verify it moves
   - [ ] Switch to 'curve' mode - verify curve handles appear

5. **Error Handling**:
   - [ ] Test with no composedCanvas - verify error message appears
   - [ ] Test with invalid UV coordinates - verify tool doesn't crash

## Priority

**High Priority**:
- Fix 1: useEffect dependency issue (blocks rendering)
- Fix 4: Immediate state update (blocks user feedback)

**Medium Priority**:
- Fix 2: ComposedCanvas availability (affects reliability)
- Fix 3: vectorEditMode initialization (affects first use)

**Low Priority**:
- Fix 5: Better error handling (improves UX)

## Files to Modify

1. `apps/web/src/components/ShirtRefactored.tsx`:
   - Line 409: Ensure proper state subscription
   - Line 1404-1583: Fix useEffect dependencies and logic
   - Line 1824-2214: Fix vector tool handling in paintAtEvent

2. Tool activation handler (likely in `LeftPanelCompact.tsx` or similar):
   - Add vectorEditMode initialization when vector tool is selected

