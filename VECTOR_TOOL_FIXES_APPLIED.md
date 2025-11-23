# Vector Tool Fixes Applied

## Summary

Fixed critical issues preventing the vector tool from functioning correctly. The main problems were:
1. useEffect dependency mismatch causing stale state
2. Missing active tool check in rendering useEffect
3. ComposedCanvas not initialized before use
4. State updates not triggering immediate render

## Fixes Applied

### Fix 1: useEffect Dependencies and State Access
**Location**: `ShirtRefactored.tsx:1396-1598`

**Changes**:
- Added `activeTool` check at start of useEffect to only render when vector tool is active
- Added `vectorEditMode` and `selectedAnchor` subscriptions
- Changed from using `useApp.getState().vectorPaths` inside useEffect to using `vectorPaths` from dependency array directly
- Updated dependency array to include `activeTool`, `vectorEditMode`, and `selectedAnchor`
- Used vector settings (strokeColor, strokeWidth, etc.) from dependencies directly instead of reading from state

**Impact**: Fixes stale state issues and ensures rendering only happens when vector tool is active

### Fix 2: ComposedCanvas Initialization
**Location**: 
- `ShirtRefactored.tsx:1423-1432` (in rendering useEffect)
- `ShirtRefactored.tsx:1844-1858` (in paintAtEvent)
- `ShirtRefactored.tsx:3868-3887` (on tool activation)

**Changes**:
- Added check for composedCanvas availability before use
- If not available, trigger `composeLayers()` to create it
- Added error logging if initialization fails
- Initialize composedCanvas when vector tool is activated

**Impact**: Prevents silent failures when clicking on model - tool now properly initializes required resources

### Fix 3: Immediate State Update and Render Trigger
**Location**: `ShirtRefactored.tsx:2210-2217`

**Changes**:
- After updating vectorPaths state, immediately call `composeLayers()` to trigger render
- Added setTimeout with small delay (10ms) before texture update to allow state to propagate

**Impact**: Vector paths now appear immediately after clicking instead of waiting for useEffect debounce

### Fix 4: vectorEditMode Initialization
**Location**: `ShirtRefactored.tsx:3868-3887`

**Changes**:
- When vector tool is activated, check if vectorEditMode is set
- If not set or invalid, auto-set to 'pen' mode
- Added composedCanvas initialization check when tool is activated

**Impact**: Ensures tool is ready to use immediately when activated, no need to wait for first click

## Testing Checklist

After applying fixes, test the following:

1. **Tool Activation**:
   - [ ] Select vector tool from toolbar
   - [ ] Check console for initialization logs
   - [ ] Verify `vectorEditMode` is set to 'pen' by default
   - [ ] Verify `composedCanvas` is initialized

2. **Drawing**:
   - [ ] Click on model - first anchor point should appear immediately
   - [ ] Click again - second anchor point should appear and path should be drawn
   - [ ] Continue clicking - path should continue to grow with each click
   - [ ] Check console for any errors

3. **Rendering**:
   - [ ] Verify vector paths appear on model immediately after clicking
   - [ ] Verify paths persist when switching tools and switching back
   - [ ] Verify anchor points are visible when `showAnchorPoints` is enabled

4. **Mode Switching**:
   - [ ] Switch to 'select' mode - verify anchors are visible
   - [ ] Click on anchor - verify it becomes selected (highlighted)
   - [ ] Drag anchor - verify it moves the path
   - [ ] Switch to 'curve' mode - verify curve handles appear when anchor is selected

5. **Error Handling**:
   - [ ] If composedCanvas initialization fails, verify error is logged to console
   - [ ] Tool should gracefully handle missing composedCanvas

## Files Modified

1. `apps/web/src/components/ShirtRefactored.tsx`:
   - Line 1396-1402: Added vectorEditMode and selectedAnchor subscriptions
   - Line 1404-1420: Added active tool check and improved composedCanvas initialization
   - Line 1433-1439: Changed to use dependencies directly instead of getState()
   - Line 1537-1538: Changed to use vectorEditMode from dependency directly
   - Line 1598: Updated dependency array to include activeTool, vectorEditMode, selectedAnchor
   - Line 1844-1858: Added composedCanvas initialization check
   - Line 2210-2217: Added immediate composeLayers() call after state update
   - Line 3868-3887: Added composedCanvas initialization on tool activation

## Expected Behavior After Fixes

1. **On Tool Activation**:
   - Vector tool should initialize composedCanvas if not available
   - vectorEditMode should be set to 'pen' by default
   - Console should show initialization logs

2. **On First Click**:
   - First anchor point should appear immediately
   - Path should start being drawn
   - No delay or lag

3. **On Subsequent Clicks**:
   - Each click adds an anchor point
   - Path grows continuously
   - Render happens immediately without waiting for debounce

4. **On Mode Switch**:
   - Anchors should be visible in select/curve modes
   - Selecting anchors should work
   - Dragging anchors should move the path

## Known Limitations

1. **Debounce Delay**: There's still a 50ms debounce on the rendering useEffect, but immediate render is triggered via `composeLayers()` call after state update

2. **Texture Update Delay**: Texture update has a 10ms delay to allow state to propagate - this is intentional to prevent race conditions

3. **Error Handling**: Currently errors are logged to console - user-visible error notifications (toasts) can be added later

## Next Steps (Optional Improvements)

1. Add user-visible error notifications when composedCanvas initialization fails
2. Reduce or remove debounce delay if performance allows
3. Add visual feedback (loading indicator) during composedCanvas initialization
4. Add keyboard shortcuts for mode switching (e.g., 'P' for pen, 'S' for select, 'C' for curve)

