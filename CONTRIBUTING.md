# Contributing to teleprompter-cli

Thanks for your interest in contributing! This document explains how to set up your environment, make changes, run tests, and submit a pull request.

## Prerequisites
- Node.js >= 18
- npm
- Bun (for running tests locally)

## Getting started
```bash
# Fork and clone
git clone https://github.com/britt/teleprompter-cli.git
cd teleprompter-cli

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link the CLI locally (optional)
npm link
# Now `tp` is available in your shell
```

## Running the CLI locally
```bash
# From the repo root after build
npm start -- --help

# Or run the compiled entry directly
node dist/index.js --help
```

## Tests
The test suite uses Bun.
```bash
# Run all tests via npm script (uses Bun under the hood)
npm test

# Or run with coverage
npm test -- --coverage

# If you prefer Bun directly
bun test
```

## Branching and commits
- Create a feature branch from main: `feat/<short-desc>` or `fix/<short-desc>`
- Keep commits small and focused
- Write clear commit messages (conventional style preferred but not required)
  - examples: `feat(auth): detect token expiration`, `fix(ui): prevent crash on empty list`

## Coding guidelines
- TypeScript, ES2020 modules
- Keep public CLI behavior backwards-compatible when possible
- Update README.md when adding or changing user-facing commands/flags
- Add or update tests for new behavior

## Opening a pull request
Before you open a PR:
- Ensure `npm run build` succeeds
- Ensure `npm test` passes locally
- Update docs as needed (README, examples)
- Describe the change, rationale, and testing notes in the PR body

Open your PR against `main` at:
https://github.com/britt/teleprompter-cli/compare

## License
By contributing, you agree that your contributions are licensed under the repository’s MIT license. See [LICENSE](./LICENSE).
