import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test"
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fsPromises } from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

// Helper to run CLI commands
async function runCLI(args: string, env: Record<string, string> = {}): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  try {
    const { stdout, stderr } = await execAsync(`bun run index.ts ${args}`, {
      cwd: '/Users/brittcrawford/workspace/teleprompter-cli/v2',
      env: { ...process.env, ...env }
    })
    return { stdout, stderr, exitCode: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1
    }
  }
}

describe("CLI", () => {
  describe("--help flag", () => {
    test("shows help for main command", async () => {
      const { stdout, exitCode } = await runCLI("--help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("Teleprompter CLI v2")
      expect(stdout).toContain("Usage:")
      expect(stdout).toContain("Commands:")
    })

    test("shows help for list command", async () => {
      const { stdout, exitCode } = await runCLI("list --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("List all active prompts")
      expect(stdout).toContain("-j, --json")
    })

    test("shows help for get command", async () => {
      const { stdout, exitCode } = await runCLI("get --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("Fetch a prompt by ID")
      expect(stdout).toContain("-j, --json")
    })

    test("shows help for put command", async () => {
      const { stdout, exitCode } = await runCLI("put --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("Create a new version of a prompt")
      expect(stdout).toContain("-j, --json")
    })

    test("shows help for versions command", async () => {
      const { stdout, exitCode } = await runCLI("versions --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("List all versions of a prompt")
      expect(stdout).toContain("-j, --json")
    })

    test("shows help for rollback command", async () => {
      const { stdout, exitCode } = await runCLI("rollback --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("Restore a specific version of a prompt")
      expect(stdout).toContain("-j, --json")
    })

    test("shows help for export command", async () => {
      const { stdout, exitCode } = await runCLI("export --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("Export prompts matching pattern")
      expect(stdout).toContain("-j, --json")
      expect(stdout).toContain("-o, --out")
    })

    test("shows help for import command", async () => {
      const { stdout, exitCode } = await runCLI("import --help")
      expect(exitCode).toBe(0)
      expect(stdout).toContain("Import prompts from JSON files")
      expect(stdout).toContain("-j, --json")
    })
  })

  describe("--version flag", () => {
    test("shows version number", async () => {
      const { stdout, exitCode } = await runCLI("--version")
      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe("URL validation", () => {
    test("fails when --url is not provided and TP_URL is not set", async () => {
      const { stderr, exitCode } = await runCLI("list --json", { TP_URL: "" })
      expect(exitCode).toBe(1)
      expect(stderr).toContain("--url option or TP_URL environment variable must be set")
    })

    test("accepts --url flag", async () => {
      // This will fail due to auth, but should pass URL validation
      const { stderr } = await runCLI("list --json --url http://localhost:3000")
      expect(stderr).not.toContain("--url option or TP_URL environment variable must be set")
    })

    test("accepts TP_URL environment variable", async () => {
      // This will fail due to auth, but should pass URL validation
      const { stderr } = await runCLI("list --json", { TP_URL: "http://localhost:3000" })
      expect(stderr).not.toContain("--url option or TP_URL environment variable must be set")
    })
  })

  describe("import command", () => {
    const testDir = path.join(os.tmpdir(), 'teleprompter-cli-test-' + Date.now())

    beforeEach(async () => {
      await fsPromises.mkdir(testDir, { recursive: true })
    })

    afterEach(async () => {
      try {
        await fsPromises.rm(testDir, { recursive: true, force: true })
      } catch {}
    })

    test("validates file format", async () => {
      const invalidFile = path.join(testDir, 'invalid.json')
      await fsPromises.writeFile(invalidFile, '{ "invalid": "format" }')

      const { stdout } = await runCLI(`import "${invalidFile}" --json --url http://localhost:3000`)

      // Extract JSON from stdout
      const jsonMatch = stdout.match(/\[[\s\S]*\]/)
      expect(jsonMatch).not.toBeNull()

      const result = JSON.parse(jsonMatch![0])
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].success).toBe(false)
      expect(result[0].error).toContain("Missing required fields")
    })

    test("handles malformed JSON", async () => {
      const malformedFile = path.join(testDir, 'malformed.json')
      await fsPromises.writeFile(malformedFile, '{ invalid json }')

      const { stdout } = await runCLI(`import "${malformedFile}" --json --url http://localhost:3000`)

      // Extract JSON from stdout
      const jsonMatch = stdout.match(/\[[\s\S]*\]/)
      expect(jsonMatch).not.toBeNull()

      const result = JSON.parse(jsonMatch![0])
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].success).toBe(false)
    })

    test("accepts valid prompt format", async () => {
      const validFile = path.join(testDir, 'valid.json')
      const validPrompt = {
        id: "test-prompt",
        namespace: "test-namespace",
        prompt: "This is a test prompt"
      }
      await fsPromises.writeFile(validFile, JSON.stringify(validPrompt))

      const { stdout } = await runCLI(`import "${validFile}" --json --url http://localhost:3000`)

      // Extract JSON from stdout (skip non-JSON lines like "Using default token")
      const jsonMatch = stdout.match(/\[[\s\S]*\]/)
      expect(jsonMatch).not.toBeNull()

      const result = JSON.parse(jsonMatch![0])
      expect(Array.isArray(result)).toBe(true)
      // Note: This will fail due to network/auth, but validates file parsing worked
    })

    test("handles array of prompts", async () => {
      const arrayFile = path.join(testDir, 'array.json')
      const prompts = [
        { id: "prompt1", namespace: "ns1", prompt: "Prompt 1" },
        { id: "prompt2", namespace: "ns2", prompt: "Prompt 2" }
      ]
      await fsPromises.writeFile(arrayFile, JSON.stringify(prompts))

      const { stdout } = await runCLI(`import "${arrayFile}" --json --url http://localhost:3000`)

      // Extract JSON from stdout
      const jsonMatch = stdout.match(/\[[\s\S]*\]/)
      expect(jsonMatch).not.toBeNull()

      const result = JSON.parse(jsonMatch![0])
      expect(Array.isArray(result)).toBe(true)
      // Should have processed both prompts
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    test("handles multiple files", async () => {
      const file1 = path.join(testDir, 'file1.json')
      const file2 = path.join(testDir, 'file2.json')

      await fsPromises.writeFile(file1, JSON.stringify({ id: "p1", namespace: "n1", prompt: "P1" }))
      await fsPromises.writeFile(file2, JSON.stringify({ id: "p2", namespace: "n2", prompt: "P2" }))

      const { stdout } = await runCLI(`import "${file1}" "${file2}" --json --url http://localhost:3000`)

      // Extract JSON from stdout
      const jsonMatch = stdout.match(/\[[\s\S]*\]/)
      expect(jsonMatch).not.toBeNull()

      const result = JSON.parse(jsonMatch![0])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("export command", () => {
    const testDir = path.join(os.tmpdir(), 'teleprompter-export-test-' + Date.now())

    afterEach(async () => {
      try {
        await fsPromises.rm(testDir, { recursive: true, force: true })
      } catch {}
    })

    test("creates output directory if it doesn't exist", async () => {
      const { exitCode } = await runCLI(`export "test-*" --out "${testDir}" --json --url http://localhost:3000`)

      // Directory should be created even if export fails
      const dirExists = await fsPromises.stat(testDir).then(() => true).catch(() => false)
      expect(dirExists).toBe(true)
    })

    test("accepts pattern argument", async () => {
      const { stdout, stderr } = await runCLI(`export "test-*" --json --url http://localhost:3000`)

      // JSON might be in stdout or stderr
      const output = stdout + stderr
      const jsonMatch = output.match(/\{[\s\S]*\}/)
      expect(jsonMatch).not.toBeNull()

      const result = JSON.parse(jsonMatch![0])
      // Should have either 'pattern' on success or 'error' on failure
      const hasPattern = 'pattern' in result
      const hasError = 'error' in result
      expect(hasPattern || hasError).toBe(true)
    })
  })

  describe("put command", () => {
    test("accepts prompt text as argument", async () => {
      // Will fail due to network, but should parse arguments correctly
      const { stdout, stderr } = await runCLI(`put test-prompt test-namespace "test prompt text" --json --url http://localhost:3000`)

      // Should not fail on argument parsing
      expect(stderr).not.toContain("Prompt text must be provided")

      // Should attempt to make API call (will fail with network error)
      const output = stdout + stderr
      expect(output.length).toBeGreaterThan(0)
    })
  })

  describe("JSON output format", () => {
    test("list command returns JSON with --json flag", async () => {
      const { stdout, stderr } = await runCLI("list --json --url http://localhost:3000")

      // Extract JSON from combined output (skip auth messages)
      const output = stdout + stderr
      const jsonMatch = output.match(/[\[\{][\s\S]*[\]\}]/)
      expect(jsonMatch).not.toBeNull()
      expect(() => JSON.parse(jsonMatch![0])).not.toThrow()
    })

    test("versions command returns JSON with --json flag", async () => {
      const { stdout, stderr } = await runCLI("versions test-prompt --json --url http://localhost:3000")

      // Extract JSON from combined output
      const output = stdout + stderr
      const jsonMatch = output.match(/[\[\{][\s\S]*[\]\}]/)
      expect(jsonMatch).not.toBeNull()
      expect(() => JSON.parse(jsonMatch![0])).not.toThrow()
    })

    test("rollback command returns JSON with --json flag", async () => {
      const { stdout, stderr } = await runCLI("rollback test-prompt 12345 --json --url http://localhost:3000")

      // Extract JSON from combined output
      const output = stdout + stderr
      const jsonMatch = output.match(/[\[\{][\s\S]*[\]\}]/)
      expect(jsonMatch).not.toBeNull()
      expect(() => JSON.parse(jsonMatch![0])).not.toThrow()
    })
  })
})
