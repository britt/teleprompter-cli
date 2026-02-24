# Verification Plan

## Prerequisites

- The Teleprompter backend with dotprompt support is deployed and reachable (the `britt/dotprompt-support` branch merged or running via `npx wrangler dev` locally)
- `TP_URL` environment variable is set to the backend URL (e.g., `http://localhost:8787` for local dev)
- Cloudflare Access token available (or backend running locally without auth)
- `bun install` completed in the CLI project
- `bun run build` succeeds with zero errors
- `bun test` passes (all unit tests green before verification)
- `jq` installed for inspecting JSON output
- At least one LLM provider API key configured (for Scenario 7)

## Scenarios

### Scenario 1: Unit Tests Pass

**Context**: All implementation tasks from the plan are complete. No backend required.

**Steps**:
1. Run `bun test` from the project root
2. Run `bunx tsc --noEmit` to verify TypeScript compiles cleanly

**Success Criteria**:
- [ ] All tests pass (zero failures)
- [ ] TypeScript compiles with zero errors
- [ ] No new warnings introduced

**If Blocked**: If tests fail, fix them before proceeding. Do not skip to later scenarios.

---

### Scenario 2: List Prompts Shows Metadata

**Context**: Backend running with at least one dotprompt-formatted prompt and one plain prompt already stored. If none exist, create them in Scenario 3 first, then come back.

**Steps**:
1. Run: `bun run index.ts list --json -u $TP_URL`
2. Pipe through jq: `bun run index.ts list --json -u $TP_URL | jq '.[0] | keys'`
3. Check a dotprompt prompt: `bun run index.ts list --json -u $TP_URL | jq '.[] | select(.metadata.model != null) | {id, model: .metadata.model}'`
4. Check a plain prompt: `bun run index.ts list --json -u $TP_URL | jq '.[] | select(.metadata == {}) | .id'`

**Success Criteria**:
- [ ] JSON output includes `metadata` field on every prompt
- [ ] Dotprompt prompts have populated metadata (e.g., `metadata.model` is a string)
- [ ] Plain prompts have `metadata: {}`
- [ ] No crash or error in output

**If Blocked**: If `metadata` is missing from the response, the backend may not have dotprompt support deployed. Verify the backend branch. Ask developer for help.

---

### Scenario 3: Create a Dotprompt Prompt via PUT

**Context**: Backend running.

**Steps**:
1. Create a dotprompt-formatted prompt via stdin:
   ```bash
   echo '---
   model: anthropic/claude-sonnet-4-20250514
   config:
     temperature: 0.3
   input:
     schema:
       name: string
       topic: string
   description: A greeting prompt
   ---
   Hello {{name}}, let me tell you about {{topic}}.' | bun run index.ts put verify-dotprompt test-ns --json -u $TP_URL
   ```
2. Verify the response: check the JSON output for success
3. Fetch it back:
   ```bash
   bun run index.ts get verify-dotprompt --json -u $TP_URL | jq '{id, model: .metadata.model, description: .metadata.description}'
   ```

**Success Criteria**:
- [ ] PUT returns success (no error in output)
- [ ] GET returns the prompt with `metadata.model` = `"anthropic/claude-sonnet-4-20250514"`
- [ ] GET returns `metadata.description` = `"A greeting prompt"`
- [ ] GET returns `metadata.config.temperature` = `0.3`
- [ ] The `prompt` field contains the full dotprompt source (frontmatter + body)

**If Blocked**: If PUT fails with a network error, check `TP_URL` and auth. If it returns 400, the frontmatter YAML may be malformed — check the error detail.

---

### Scenario 4: Create a Plain Prompt (Backward Compatibility)

**Context**: Backend running.

**Steps**:
1. Create a plain prompt (no frontmatter):
   ```bash
   bun run index.ts put verify-plain test-ns "Hello {{name}}, welcome to {{place}}." --json -u $TP_URL
   ```
2. Fetch it back:
   ```bash
   bun run index.ts get verify-plain --json -u $TP_URL | jq '{id, metadata, prompt}'
   ```

**Success Criteria**:
- [ ] PUT returns success
- [ ] GET returns `metadata: {}` (empty object, not null, not missing)
- [ ] `prompt` field is exactly `"Hello {{name}}, welcome to {{place}}."`
- [ ] No frontmatter injected into the prompt text

**If Blocked**: If metadata is null or absent, the backend's `toPrompt` may not be defaulting correctly.

---

### Scenario 5: Validation Error for Malformed Frontmatter

**Context**: Backend running with dotprompt validation enabled.

**Steps**:
1. Attempt to create a prompt with broken YAML:
   ```bash
   echo '---
   bad: [yaml: unclosed
     indent: wrong
   ---
   Hello {{name}}' | bun run index.ts put verify-bad-yaml test-ns --json -u $TP_URL
   ```
2. Inspect the error output

**Success Criteria**:
- [ ] Command exits with non-zero status or outputs an error JSON
- [ ] Error message contains the word "validation" or "invalid" or "error" (case-insensitive)
- [ ] Error message includes detail about the YAML issue (not just "Request failed with status code 400")
- [ ] The prompt was NOT created — `bun run index.ts get verify-bad-yaml --json -u $TP_URL` returns an error or 404

**If Blocked**: If the CLI shows a generic axios error instead of the validation detail, the error handling from Task 7 is not working. Check the 400 response body parsing.

---

### Scenario 6: Export Preserves Metadata

**Context**: Backend running. `verify-dotprompt` prompt exists from Scenario 3.

**Steps**:
1. Export the prompt:
   ```bash
   bun run index.ts export "verify-dotprompt" --out /tmp/tp-verify --json -u $TP_URL
   ```
2. Inspect the exported file:
   ```bash
   cat /tmp/tp-verify/verify-dotprompt.json | jq '{id, has_metadata: (.metadata | length > 0), model: .metadata.model}'
   ```
3. Verify the full dotprompt source is preserved:
   ```bash
   cat /tmp/tp-verify/verify-dotprompt.json | jq '.prompt' | head -3
   ```

**Success Criteria**:
- [ ] Exported JSON file exists at the expected path
- [ ] File contains `metadata` field with `model: "anthropic/claude-sonnet-4-20250514"`
- [ ] File contains `prompt` field with the full dotprompt source (starts with `---`)
- [ ] File contains `id` and `namespace` fields

**If Blocked**: If `metadata` is missing from the export, the export data construction was not updated (Task 6).

---

### Scenario 7: Import Round-Trip

**Context**: Backend running. Exported file from Scenario 6 available.

**Steps**:
1. Modify the exported file to change the ID (so we don't overwrite):
   ```bash
   cat /tmp/tp-verify/verify-dotprompt.json | jq '.id = "verify-reimport"' > /tmp/tp-verify/verify-reimport.json
   ```
2. Import it:
   ```bash
   bun run index.ts import /tmp/tp-verify/verify-reimport.json --json -u $TP_URL
   ```
3. Fetch the imported prompt:
   ```bash
   bun run index.ts get verify-reimport --json -u $TP_URL | jq '{id, model: .metadata.model, description: .metadata.description}'
   ```

**Success Criteria**:
- [ ] Import succeeds (JSON output shows `success: true`)
- [ ] Fetched prompt has the same metadata as the original (`model`, `description`, `config`)
- [ ] Prompt text is identical to the original dotprompt source

**If Blocked**: If import fails with a validation error, the prompt text may have been corrupted during export/reimport. Compare the prompt fields byte-for-byte.

---

### Scenario 8: Template Variable Extraction Ignores Frontmatter

**Context**: No backend required. This tests local template processing.

**Steps**:
1. Create a test file `/tmp/tp-verify/test-extract.ts`:
   ```typescript
   import { extractVariables, stripFrontmatter } from "./template-parser"

   const source = `---
   model: anthropic/claude-sonnet-4-20250514
   input:
     schema:
       name: string
   ---
   Hello {{name}}, welcome to {{place}}.
   {{#if showDetails}}
   Here are the details: {{details}}
   {{/if}}`

   const vars = extractVariables(source)
   console.log("Variables found:", vars.map(v => `${v.name}(${v.type})`).join(", "))

   const stripped = stripFrontmatter(source)
   console.log("Stripped starts with:", JSON.stringify(stripped.substring(0, 30)))
   console.log("Contains frontmatter:", stripped.includes("model:"))
   ```
2. Run it: `bun /tmp/tp-verify/test-extract.ts`

**Success Criteria**:
- [ ] Variables found include: `name(string)`, `place(string)`, `showDetails(boolean)`, `details(string)`
- [ ] Variables do NOT include: `model`, `schema`, `input`, `anthropic`
- [ ] Stripped text starts with `Hello` (no `---` prefix)
- [ ] `Contains frontmatter: false`

**If Blocked**: If frontmatter variables leak through, the `stripFrontmatter` function is not being called in `extractVariables`.

---

### Scenario 9: Version History Shows Metadata

**Context**: Backend running. `verify-dotprompt` prompt exists.

**Steps**:
1. Update the prompt with different metadata:
   ```bash
   echo '---
   model: openai/gpt-4o
   config:
     temperature: 0.9
   description: Updated greeting
   ---
   Hey {{name}}, new version about {{topic}}.' | bun run index.ts put verify-dotprompt test-ns --json -u $TP_URL
   ```
2. Fetch version history:
   ```bash
   bun run index.ts versions verify-dotprompt --json -u $TP_URL | jq '.[] | {version, model: .metadata.model}'
   ```

**Success Criteria**:
- [ ] Version history has at least 2 entries
- [ ] Oldest version shows `metadata.model` = `"anthropic/claude-sonnet-4-20250514"`
- [ ] Newest version shows `metadata.model` = `"openai/gpt-4o"`
- [ ] Each version has its own metadata (not shared)

**If Blocked**: If metadata is null on versions, the backend may not be including metadata in the versions endpoint response. Check the backend's `getVersions` SQL query.

---

### Scenario 10: Detail View Shows Metadata (Interactive)

**Context**: Backend running. `verify-dotprompt` prompt exists. Terminal supports interactive mode.

**Steps**:
1. Run: `bun run index.ts get verify-dotprompt -u $TP_URL` (without `--json`, so it renders the interactive detail view)
2. Observe the output

**Success Criteria**:
- [ ] The detail view shows a "Metadata" section
- [ ] Model is displayed: `anthropic/claude-sonnet-4-20250514` or `openai/gpt-4o` (whichever is current)
- [ ] Description is displayed
- [ ] The prompt text panel does NOT show YAML frontmatter (frontmatter is stripped for display)
- [ ] No crash or rendering glitch

**If Blocked**: If interactive mode crashes, check the Ink component rendering. Run with `--json` to verify data is correct, then debug the component.

---

### Scenario 11: Cleanup

**Context**: All previous scenarios complete.

**Steps**:
1. Remove test artifacts:
   ```bash
   rm -rf /tmp/tp-verify
   ```
2. Optionally delete test prompts from backend (if a delete command exists or via curl):
   ```bash
   curl -X DELETE $TP_URL/prompts/verify-dotprompt
   curl -X DELETE $TP_URL/prompts/verify-plain
   curl -X DELETE $TP_URL/prompts/verify-reimport
   ```

**Success Criteria**:
- [ ] Temp files cleaned up
- [ ] Test prompts removed from backend (optional — they're harmless)

**If Blocked**: Not critical. Skip if delete endpoint requires auth tokens not available in this context.

---

## Verification Rules

- Never use mocks or fakes — all scenarios except 1 and 8 run against the real backend
- Scenario 8 runs real code (no mocks), just doesn't need the backend
- Test environments must be fully running copies of real systems
- If any success criterion fails, verification fails
- Ask developer for help if blocked, don't guess
- Scenarios 1 and 8 can run independently (no backend needed)
- Scenarios 2-7 and 9-10 require the backend with dotprompt support
- Run Scenario 3 before Scenario 2 if no dotprompt prompts exist yet
- Scenario 7 depends on Scenario 6's output
- Scenario 9 depends on Scenario 3's prompt existing
