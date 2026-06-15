# Teleprompter CLI

A modern CLI for managing LLM prompts with Cloudflare Workers. Features an interactive terminal UI built with [Ink](https://github.com/vadimdemedes/ink), full scriptability with JSON output, and support for prompts that include metadata such as model information.

Teleprompter CLI is a command-line interface for interacting with [Teleprompter](https://github.com/britt/teleprompter/). Teleprompter manages prompts for Large Language Model (LLM) applications at runtime on Cloudflare and Cloudflare Workers. It provides versioning, metadata tracking, runtime editing and updating of prompts, and shows prompt metadata such as model selection when a prompt includes it.

## Installation

### Global Installation (Recommended)

```bash
npm install -g teleprompter-cli
tp --help
tp --version
tp list --json
```

After installation, the `tp` command will be available globally.

### From Source

```bash
git clone https://github.com/britt/teleprompter-cli.git
cd teleprompter-cli
npm install
npm run build
npm link
```

## Features

### Interactive Terminal UI

- **Beautiful Ink-based interface**: React-powered terminal UI
- **Browse prompts**: Scrollable list with keyboard navigation and a `Model` column when prompt metadata includes model information
- **View details**: Full prompt information with version history and a `Metadata` section for prompt metadata such as model, description, config, tools, and input or output schema details
- **Rollback versions**: Restore previous versions of prompts while reviewing per version model metadata in version history and rollback views
- **Create prompts**: Step by step form for creating new prompts
- **Test prompts**: Prompt and template views show the executable template body and keep YAML frontmatter metadata separate
- **Keyboard controls**:
  - `↑/↓` - Navigate lists
  - `Enter` - Select/view details
  - `n` - Create new prompt (from list view)
  - `v` - View versions (from detail view)
  - `r` - Rollback to version
  - `f` - Filter by ID prefix (from list view)
  - `ESC` / `Ctrl+B` / `b` - Back or cancel
  - `q` - Quit

![Screenshot of the CLI](./assets/tp-cli.png)

### CLI Commands (Scriptable)

All commands support `--json` flag for readable JSON output:

```bash
# List all active prompts
tp list [--json]

# Get a specific prompt
tp get <promptId> [--json]

# Create or update a prompt
tp put <name> <namespace> [text] [--json]
# Or pipe from stdin:
echo "prompt text" | tp put <name> <namespace> --json

# List versions of a prompt
tp versions <promptId> [--json]

# Rollback to a specific version
tp rollback <promptId> <version> [--json]

# Export prompts matching a pattern
tp export <pattern> [--out <directory>] [--json]
# Example: tp export "prod-*" --out ./backups

# Import prompts from JSON files
tp import <files...> [--json]
# Example: tp import prompt1.json prompt2.json
```

`tp put` accepts plain prompt text, full prompt source with YAML frontmatter passed as the text argument, or the same prompt source piped through standard input. When a prompt starts with YAML frontmatter, the CLI stores that block as metadata instead of treating it as prompt content or variables.

Use a prompt format like this when a prompt needs metadata:

```yaml
---
model: anthropic/claude-sonnet-4-20250514
description: Summarize a support conversation
config:
  temperature: 0.3
tools:
  - search
  - fetch
input:
  schema:
    type: object
    properties:
      transcript:
        type: string
    required:
      - transcript
output:
  schema:
    type: object
    properties:
      summary:
        type: string
---
Summarize this conversation:

{{transcript}}
```

Plain prompts without frontmatter still work. Prompts without model metadata simply leave the model value blank in places such as the prompt list.

`tp export` writes JSON files that include `id`, `namespace`, `prompt`, and `metadata`. `tp import` preserves that metadata when those files move out and back in.

If prompt metadata or YAML frontmatter is malformed, `tp put` and `tp import` return validation messages instead of only a generic HTTP 400 failure. `--json` returns the same details in JSON output.

### Configuration

Set the Teleprompter service URL:

```bash
# Via environment variable (recommended)
export TP_URL=https://your-teleprompter-service.com

# Or use --url flag
tp list --url https://your-teleprompter-service.com
```

### Authentication

The CLI uses Cloudflare Access for authentication:

- For localhost development: Uses a default token
- For remote URLs: Uses `cloudflared access login` to authenticate
- Tokens are cached in `~/.teleprompter/token`
- Automatic token handling:
  - All requests include `Authorization` and `cf-access-token` headers automatically
  - If the server returns `401 Unauthorized`, the CLI re-authenticates via Cloudflare Access
  - The original request retries automatically after re-authentication
  - The terminal shows: `Token expired or invalid. Re-authenticating...`

## Development

### Requirements

- Node.js >= 18.0.0
- [Bun](https://bun.sh) (for development/testing)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/installation/) (required for Cloudflare Access on remote URLs)

### Setup

```bash
npm install
npm run build
```

### Scripts

```bash
npm run build     # Compile TypeScript to JavaScript
npm run dev       # Watch mode for development
npm test          # Run test suite (59 tests)
npm start         # Run the CLI
```

### Testing

The project includes a comprehensive test suite with 59 tests covering:

- Authentication and token management
- All CLI commands and flags
- React components (PromptsList, PromptDetail, NewPromptForm)
- JSON output formatting
- Error handling

```bash
npm test          # Run all tests
npm test -- --coverage  # Run with coverage report
```

## Architecture

- **Runtime**: Node.js (TypeScript compiled to JavaScript)
- **UI Framework**: Ink (React for CLIs)
- **CLI Framework**: Commander.js
- **HTTP Client**: Axios with interceptors (adds auth headers and automatically re-authenticates/retries on 401)
- **Testing**: Bun test + ink-testing-library

## Project Structure

```
teleprompter-cli/
├── dist/                  # Compiled JavaScript (generated)
├── components/            # React components for UI
│   ├── PromptsList.tsx
│   ├── PromptDetail.tsx
│   └── NewPromptForm.tsx
├── index.ts              # Main CLI entry point
├── http-client.ts        # Centralized Axios client with auth interceptors
├── auth.ts               # Authentication module
├── *.test.ts(x)          # Test files
├── package.json          # NPM package configuration
└── tsconfig.json         # TypeScript configuration
```

## License

MIT — see [LICENSE](./LICENSE)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues and pull requests welcome at https://github.com/britt/teleprompter-cli

---

This documentation was written by [doc.holiday](https://doc.holiday/).