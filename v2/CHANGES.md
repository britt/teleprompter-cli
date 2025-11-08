# Teleprompter CLI v2 - Changes Summary

## Recent Updates

### Column Alignment Fix
- All rows now use **fixed, consistent column widths**
- Implemented `padText()` helper to pad text to exact width
- **Critical fix**: Strips newlines and collapses whitespace to ensure single-line rows
- Column widths:
  - ID: 35 chars
  - Namespace: 25 chars
  - Version: 15 chars
  - Prompt: 60 chars
- No more misaligned columns between rows
- Every row renders as exactly 1 line (no word wrapping)

### Pinned Header
- Header row remains **fixed at top** while scrolling through content
- Header includes:
  - Title with total count
  - Column headers (ID, Namespace, Version, Prompt)
  - Horizontal separator line
- Header never scrolls off screen

### Dynamic Terminal Height
- Uses `useStdout()` hook to get terminal dimensions
- Calculates visible rows dynamically: `terminalHeight - 7`
- Reserves 7 lines for UI chrome (header, footer, separators)
- Renders only rows that fit on screen
- Minimum of 3 visible rows guaranteed
- **Critical fix**: Ensures each row is single-line only (no multi-line prompts)

### Pinned Footer
- Footer is **fixed at bottom** of screen
- Shows "Press q to quit" instruction
- Horizontal separator line on top only (no box border)
- Always visible regardless of scroll position
- Fits exactly within terminal height

### Scrolling Behavior
- Only renders visible rows (performance optimization)
- Smooth scrolling with arrow keys
- Selected row highlighted in blue
- Scroll offset adjusts automatically when navigating

## File Changes

### `/v2/components/PromptsList.tsx`
- Added `useStdout` import for terminal dimensions
- Added `TableRow` component for consistent rendering
- Changed from `truncateText()` to `padText()` for fixed widths
- Separated layout into three sections:
  1. Fixed header (pinned top)
  2. Scrollable content (fills available space)
  3. Fixed footer (pinned bottom)
- Dynamic `visibleRows` calculation based on terminal height

## Testing

Run the demo to see all features:
```bash
cd v2
bun run demo
```

Use arrow keys to scroll, press 'q' to quit.
