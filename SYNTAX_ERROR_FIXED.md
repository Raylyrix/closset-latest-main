# Syntax Error Fixed ✅

## Issue
**Error:** `apps/web/src/core/StrokeSelectionSystem.ts:425:13: ERROR: Unexpected "."`

## Root Cause
Extra indentation in the `moveStroke` function (lines 240-419). The code was indented with 8 spaces instead of 6, which caused the parser to encounter an unexpected token.

## Fix Applied
Removed extra indentation from the entire block within `moveStroke` function:
- Lines 241-419 were indented with 8 spaces (incorrect)
- Changed to 6 spaces (correct)
- This fixed the "Unexpected ." error

## Verification
- ✅ No linter errors
- ✅ File compiles correctly
- ✅ Syntax is now valid

## Details
The problematic section was:
```typescript
      if (!bounds || !points || !settings) {
        console.error('⚠️ Invalid stroke data:', { bounds, points, settings });
        return;
      }
        // ← Extra indentation here was the problem
        const newBounds = { ... };
```

Fixed to:
```typescript
      if (!bounds || !points || !settings) {
        console.error('⚠️ Invalid stroke data:', { bounds, points, settings });
        return;
      }
      // ← Correct indentation
      const newBounds = { ... };
```

## Status
✅ **Syntax error fixed - ready to test**


