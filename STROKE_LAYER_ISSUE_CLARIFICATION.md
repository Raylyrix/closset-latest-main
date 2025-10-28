# Stroke Layer Issue Clarification

## Current Behavior Analysis

### How It Currently Works:

**First Mouse Down:**
1. User presses mouse down
2. `onPointerDown` is called
3. Sets `paintingActiveRef.current = true`
4. First call to `paintAtEvent` happens
5. `strokeSessionRef.current` is null → Creates new layer
6. `strokeSessionRef.current` is set with layerId

**Mouse Move (multiple calls):**
1. `paintAtEvent` is called repeatedly during drag
2. Each time: `strokeSession` has layerId → Uses EXISTING layer
3. All drawing happens on the SAME layer

**Mouse Up:**
1. `onPointerUp` is called
2. `strokeSessionRef.current` is cleared (set to null)
3. `paintingActiveRef.current = false`

**Next Mouse Down:**
1. `strokeSessionRef.current` is null → Creates NEW layer
2. Process repeats

### Conclusion: ✅ CURRENT IMPLEMENTATION IS CORRECT

- One stroke (mouse down → drag → mouse up) = ONE layer ✅
- Multiple strokes = multiple layers ✅
- This is EXACTLY what the user wants

---

## Potential Issue: Layer Creation Timing

### The Problem

Looking at the code more carefully:

Line 1768 in ShirtRefactored.tsx:
```typescript
if (!strokeSession || !strokeSession.layerId) {
```

This checks if EITHER strokeSession is null OR it doesn't have a layerId.

But when does this get called?
- Called from `paintAtEvent` (line 1698)
- `paintAtEvent` is called during paintAtEvent
- But `paintAtEvent` is NOT directly called from `onPointerDown`

**The issue:** We're checking if we should create a layer INSIDE `paintAtEvent`, which is called during MOVE events. But we should be checking this BEFORE starting to paint.

### Real Issue

Looking at line 3803:
```typescript
if (!paintingActiveRef.current && ['brush', 'eraser', 'puffPrint', 'embroidery'].includes(activeTool)) {
```

This is inside `onPointerDown` and checks if NOT painting. But `paintingActiveRef.current` is set to TRUE right before this check (line 3791), so this condition will NEVER be true!

So the selection check never runs...

**Wait, let me re-read the code more carefully...**

Actually, looking at line 3791, `paintingActiveRef.current = true` is set INSIDE an `if` block that checks `if (activeTool !== 'vector')`.

And then line 3803 checks `if (!paintingActiveRef.current && ...)`. So the selection check IS in a different conditional, so it might run before `paintingActiveRef` is set.

Actually no, line 3791 sets it, so by the time we reach line 3803, it's already true.

**This is a timing issue in the code!**

---

## The Real Problem

Looking at the flow:
1. `onPointerDown` sets `paintingActiveRef.current = true` (line 3791)
2. Later in same function, checks `if (!paintingActiveRef.current && ...)` (line 3803)
3. This condition will NEVER be true because it was just set to true

**So selection/transform checks never run during drawing!**

---

## Fix Required

The selection and transform checks should happen BEFORE setting `paintingActiveRef.current = true`.

Move the selection check (lines 3801-3874) to BEFORE line 3791.


