# Critical Fix: Single-Line Row Rendering

## Problem Identified
The UI was rendering more lines than expected because prompt text contained newlines, causing rows to wrap to multiple lines and breaking the height calculation.

## Solution Applied

### 1. Fixed `padText()` Function (components/PromptsList.tsx:132-139)
```typescript
const padText = (text: string | undefined, width: number): string => {
  if (!text) return ' '.repeat(width)
  // Replace all newlines and multiple spaces with single space
  const singleLine = text.replace(/\s+/g, ' ').trim()
  const truncated = singleLine.length > width ? singleLine.substring(0, width - 3) + '...' : singleLine
  return truncated.padEnd(width, ' ')
}
```

**Changes:**
- Uses regex `/\s+/g` to replace ALL whitespace (including `\n`, `\r`, `\t`, multiple spaces) with a single space
- Ensures text is trimmed
- Guarantees each row is exactly 1 line tall

### 2. Restored Correct Height Calculation
- Changed from `terminalHeight - 20` back to `terminalHeight - 7`
- Now that each row is truly 1 line, the calculation is accurate:
  - Title + margin: 2 lines
  - Header row: 1 line
  - Header separator: 1 line
  - Footer separator: 1 line
  - Footer text: 1 line
  - **Total: 7 reserved lines**

## Result
- Every data row is guaranteed to be exactly 1 line
- UI fits perfectly within terminal height
- No overflow or scrolling beyond the visible area
- Accurate `visibleRows` calculation

## Testing
```bash
cd v2
bun run demo
```

The demo now shows exactly the right number of rows to fit on screen!
