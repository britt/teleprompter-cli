# Teleprompter CLI v2

A modern Teleprompter CLI built with the Bun runtime and Ink for an interactive terminal UI. Use it to browse, create, version, rollback, import, and export prompts. All commands support JSON output for scripting.

## Requirements

- Bun installed: https://bun.sh
- A running Teleprompter service URL

## Install

From this repository:

- cd v2
- bun install

## Quick start

Run the interactive UI (default action):

- cd v2
- bun run index.ts --url https://your-teleprompter.example.com

You can also set an environment variable instead of passing --url:

- export TP_URL=https://your-teleprompter.example.com
- bun run index.ts

## Interactive UI (Ink)

Keys:
- Up/Down: Move selection
- Enter: View details
- b: Back to list
- v: View versions
- r: Rollback to a selected version
- e: Export prompts
- n: New prompt form
- q: Quit
- Ctrl+B: Cancel an in-progress dialog (export/new prompt)

Views:
- List: Scroll through all active prompts; columns include id, namespace, version, and a single-line preview
- Detail: Shows id, namespace, version, created date, and full prompt text; long prompts are scrollable with a position indicator
- Versions: Browse all versions with human-readable dates; select a version to view or press r to rollback

## Scriptable CLI commands

All commands accept --json (-j) for machine-readable output. Global options include --url (or TP_URL) and --verbose.

- list
  List all active prompts.
  Examples:
  - bun run index.ts list --url $TP_URL
  - bun run index.ts list --url $TP_URL --json

- get <promptId>
  Fetch a specific prompt.
  Examples:
  - bun run index.ts get my-prompt --url $TP_URL
  - bun run index.ts get my-prompt --url $TP_URL --json

- put <name> <namespace> [text]
  Create a new version of a prompt. If [text] is omitted, the prompt body can be read from stdin.
  Examples:
  - bun run index.ts put my-prompt my-namespace "prompt text" --url $TP_URL
  - cat prompt.txt | bun run index.ts put my-prompt my-namespace --url $TP_URL

- versions <promptId>
  List all versions of a prompt with human-readable timestamps.

- rollback <promptId> <version>
  Restore a specific version (version is a Unix timestamp).

- export <pattern> [-o|--out <directory>]
  Export prompts matching a pattern ("*" for all, or prefix patterns like "prefix:*"). Filenames are snake_case.
  Example:
  - bun run index.ts export "*" -o ./exports --url $TP_URL

- import <files...>
  Import prompts from one or more JSON files. Each file may contain a single prompt object or an array of prompts with fields: id, namespace, prompt.

JSON mode:
- Add --json (-j) to print results as JSON and suppress verbose logs.

## Authentication

- Uses Cloudflare Access. The token is cached at $HOME/.teleprompter/token (permissions 0600).
- When the host is localhost or 127.0.0.1, a default development token is used.

## Environment and options

- TP_URL: Service base URL (alternative to --url)
- --url <url>: Service URL (global)
- --verbose: Enable verbose logging
- --json (-j): JSON output (per-command)

## Development

- Run in watch mode: bun run dev (from v2/)
- Demo with mock data: bun run demo

## Troubleshooting

- Ensure Bun is installed and on PATH.
- For Cloudflare Access, ensure you can obtain a token for the service URL.

## License

MIT. See LICENSE.

## Related

- Teleprompter service: https://github.com/britt/teleprompter