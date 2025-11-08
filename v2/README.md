# Teleprompter CLI v2

A modern rewrite of the Teleprompter CLI using Bun and Ink. This README covers the interactive UI, scriptable commands, authentication, and development workflow.

## Requirements

- Bun: https://bun.sh
- Teleprompter service URL

## Install

- cd v2
- bun install

## Run (interactive UI)

- bun run index.ts --url https://your-teleprompter.example.com
- Or set TP_URL and run: export TP_URL=https://your-teleprompter.example.com; bun run index.ts

### Keyboard
- ↑/↓: Navigate
- Enter: Details
- b: Back
- v: Versions
- r: Rollback
- e: Export
- n: New prompt
- q: Quit
- Ctrl+B: Cancel dialogs (export/new)

### Views
- List: Scroll through all active prompts; shows id, namespace, version, and a single-line preview
- Detail: Shows id, namespace, version, created date, and full prompt text; long prompts are scrollable with a position indicator
- Versions: Browse all versions with human-readable dates; press Enter to view or r to rollback; b to return

## Scriptable commands (all support --json)

Global options: --url <url> (or TP_URL), --verbose, --help

- list
  - bun run index.ts list --url $TP_URL
  - bun run index.ts list --url $TP_URL --json

- get <promptId>
  - bun run index.ts get my-prompt --url $TP_URL
  - bun run index.ts get my-prompt --url $TP_URL --json

- put <name> <namespace> [text]
  - bun run index.ts put my-prompt my-namespace "prompt text" --url $TP_URL
  - cat prompt.txt | bun run index.ts put my-prompt my-namespace --url $TP_URL

- versions <promptId>
  - bun run index.ts versions my-prompt --url $TP_URL

- rollback <promptId> <version>
  - bun run index.ts rollback my-prompt 1234567890 --url $TP_URL

- export <pattern> [-o|--out <dir>]
  - bun run index.ts export "*" -o ./exports --url $TP_URL
  - Pattern supports wildcards (e.g., "prefix:*", "*"); filenames are snake_case

- import <files...>
  - bun run index.ts import exports/*.json --url $TP_URL
  - bun run index.ts import file1.json file2.json --url $TP_URL --json

## Authentication

- Cloudflare Access token cached at $HOME/.teleprompter/token (0600)
- Localhost/127.0.0.1 uses a default development token

## Development

- Watch mode: bun run dev
- Demo (mock data): bun run demo

## Notes

- The interactive list view is the default action when no command is specified.
- Use --json (-j) to emit machine-readable output and suppress verbose logs.
