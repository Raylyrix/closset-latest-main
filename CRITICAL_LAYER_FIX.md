# Critical Layer Creation Fix

## Issue Identified

**Problem:** A new layer was created on EVERY `paintAtEvent` call instead of once per stroke.

## Root Cause

Line 1765 in ShirtRefactored.tsx:
```typescript
let strokeSession = strokeSessionRef.current;  // ❌ Frozen copy
```

This created a **frozen snapshot** of the ref at that moment. By the time line 1772 checked `if (!strokeSession || !strokeSession.layerId)`, the snapshot was stale.

## The Fix

Changed to always read fresh value:
```typescript
// CRITICAL FIX: Always read fresh value from ref
const currentStrokeSession = strokeSessionRef.current;

// CRITICAL FIX: Check if we're starting a new stroke session (only on first paintAtEvent call)
if (!currentStrokeSession || !currentStrokeSession.layerId) {
  // Create new layer (only happens once per stroke)
  ...
} else {
  // Reuse existing layer (for subsequent paintAtEvent calls during same stroke)
  ...
}
```

## How It Works Now

**First paintAtEvent call (mouse down):**
- `strokeSessionRef.current` is `null`
- Creates ONE new layer
- Sets `strokeSessionRef.current = { layerId, ... }`

**Subsequent paintAtEvent calls (during drag):**
- `strokeSessionRef.current` has `layerId`
- Reuses EXISTING layer
- No new layer created ✅

**Mouse up:**
- Clears `strokeSessionRef.current = null`
- Ready for next stroke

## Result

✅ One stroke = ONE layer
✅ No more "10s of layers" issue
✅ Proper reuse of layer during drag


