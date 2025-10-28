# Stroke Selection Border Debugging - README

## Issue
Border is not showing when clicking on a layer with stroke data.

## Debug Changes Applied

### 1. Added Console Logs
Added extensive logging to track the flow:
- `🎯 Border useEffect triggered` - When useEffect runs
- `🎯 Layer has strokeData, attempting to select stroke` - When layer has stroke data
- `🎯 Stroke selection module available?` - Module availability check
- `🎯 Calling selectStroke for:` - When calling selectStroke
- `🎯 Attempting to draw border...` - When attempting to draw
- `🎯 Selected stroke:` - What stroke was found
- `🎯 Drawing border at bounds:` - The bounds being drawn

### 2. Increased Timing Delays
- Changed timeout from 60ms to 100ms to ensure composition completes
- Added setTimeout(0) wrapper for selection to ensure module is loaded

### 3. Check Points
1. Is the layer clicked? → Check console for "🎨 Selected layer:"
2. Does the layer have strokeData? → Check console for "🎯 Layer has strokeData"
3. Is the module loaded? → Check console for "🎯 Stroke selection module:"
4. Is selectStroke called? → Check console for "🎯 Calling selectStroke for:"
5. Is useEffect triggered? → Check console for "🎯 Border useEffect triggered"
6. Does the stroke have bounds? → Check console for "🎯 Drawing border at bounds:"

## How to Test
1. Create a brush stroke
2. Click on the layer in the layer panel
3. Check the console for the debug messages
4. Look for which step fails

## Expected Console Output
```
🎨 Selected layer: Brush Stroke stroke_xxx
🎯 Layer has strokeData, attempting to select stroke: layer_xxx
🎯 Stroke selection module: true
🎯 Calling selectStroke for: layer_xxx
✅ Stroke selected successfully
🎯 Border useEffect triggered, selectedLayerId: layer_xxx
🎯 Composed layers, waiting to draw border...
🎯 Attempting to draw border...
🎯 Selected stroke: Brush Stroke stroke_xxx has strokeData: true
🎯 Drawing border at bounds: {minX: ..., minY: ..., ...}
✅ Border drawn, updating texture...
✅ PHASE 2: Stroke selection border rendered for: layer_xxx
```

## Next Steps
Once we see the console output, we'll know exactly where the issue is and can fix it.


