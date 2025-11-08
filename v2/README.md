# Teleprompter CLI v2

A modern rewrite of the Teleprompter CLI using [Bun](https://bun.com) and [Ink](https://github.com/vadimdemedes/ink) for a beautiful terminal UI experience.

## Features

- **Built with Bun**: Fast JavaScript runtime with native TypeScript support
- **Interactive Ink UI**: Beautiful, React-based terminal interface with:
  - Scrollable list navigation with arrow keys
  - Row highlighting for better visibility
  - Full-width display that adapts to terminal size
  - Loading states and error handling
  - Persistent display until you quit
- **Modern Architecture**: Clean separation of concerns with modular components
- **Type-safe**: Full TypeScript support
- **Keyboard Controls**:
  - `↑/↓` - Navigate through prompts
  - `q` - Quit the application

## Installation

Install dependencies:

```bash
bun install
```

## Usage

The CLI displays an interactive list of prompts by default:

```bash
# Using the executable directly
./index.ts --url <teleprompter-service-url>

# Or with bun
bun run index.ts --url <teleprompter-service-url>

# Or set TP_URL environment variable
export TP_URL=<teleprompter-service-url>
./index.ts
```

**The list view is the default!** Just run `./index.ts` and you'll see the interactive prompt list.

### Interactive List Features

- **Navigation**: Use `↑/↓` arrow keys to scroll through prompts
- **Quit**: Press `q` to exit
- **Display**: Shows ID, Namespace, Version, and Prompt text in aligned columns
- **Selection**: Currently selected row is highlighted in blue
- **Scroll indicator**: Shows position (e.g., "Showing 1-17 of 25")

### Commands

- `list` - Explicitly run the list command (same as default behavior)

### Options

- `-u, --url <url>` - URL of the teleprompter service (or set `TP_URL` environment variable)
- `-v, --verbose` - Enable verbose logging
- `-h, --help` - Display help

## Development

Start the CLI in watch mode:

```bash
bun run dev
```

### Demo Mode

Test the UI with mock data (no server required):

```bash
bun run demo
```

This will display a scrollable list of 25 sample prompts to demonstrate the UI features.

## Project Structure

```
v2/
├── index.ts              # Main CLI entry point
├── auth.ts               # Authentication utilities
├── test-ui.ts            # Demo mode with mock data
├── components/
│   └── PromptsList.tsx   # Ink component for displaying prompts
└── package.json
```

## Architecture

- **index.ts**: CLI setup using Commander.js, renders the Ink UI
- **auth.ts**: Handles Cloudflare Access authentication and token management
- **components/PromptsList.tsx**: Interactive Ink/React component featuring:
  - Keyboard navigation with arrow keys (↑/↓ to scroll)
  - Dynamic viewport that adapts to terminal height
  - **Pinned header** that stays at the top while scrolling
  - **Pinned footer** at the bottom with quit instructions
  - Selected row highlighting with blue background
  - Consistent column widths across all rows
  - Loading states and error handling
- **test-ui.ts**: Standalone demo mode with 25 mock prompts for testing

## UI Features

The list view includes:

### Fixed Header (Always Visible)
- Title showing total count
- Column headers: ID, Namespace, Version, Prompt
- Horizontal separator line

### Scrollable Content Area
- Displays only rows that fit in terminal height
- Selected row highlighted with blue background
- **Fixed Column Widths** (all rows aligned perfectly):
  - ID: 35 characters
  - Namespace: 25 characters
  - Version: 15 characters
  - Prompt: 60 characters

### Color Coding
- Selected row: Blue background with white text
- ID: Default/white
- Namespace: Magenta
- Version: Yellow
- Prompt: Gray

### Fixed Footer (Always Visible)
- Pinned at bottom of screen
- Shows "Press **q** to quit" instruction
- Horizontal separator line on top only (no box border)
- Fits exactly within terminal height

This project was created using `bun init` in bun v1.2.21.
