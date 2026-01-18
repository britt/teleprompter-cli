import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { saveRun, loadHistory, deleteRun, TestRun } from "./history"
import { promises as fs } from "fs"
import * as path from "path"
import * as os from "os"

describe("history", () => {
  const historyPath = path.join(os.homedir(), ".teleprompter", "history.json")
  let originalHistory: string | null = null

  beforeEach(async () => {
    try {
      originalHistory = await fs.readFile(historyPath, "utf-8")
    } catch {
      originalHistory = null
    }
    // Clear history for tests
    try {
      await fs.unlink(historyPath)
    } catch {}
  })

  afterEach(async () => {
    if (originalHistory) {
      await fs.writeFile(historyPath, originalHistory)
    } else {
      try {
        await fs.unlink(historyPath)
      } catch {}
    }
  })

  describe("saveRun", () => {
    test("creates history file if not exists", async () => {
      const run: Omit<TestRun, "id" | "timestamp"> = {
        promptId: "test-prompt",
        promptVersion: 123456,
        model: "anthropic/claude-sonnet-4",
        variables: { name: "Test" },
        output: "Hello Test"
      }

      const saved = await saveRun(run)
      expect(saved.id).toBeDefined()
      expect(saved.timestamp).toBeDefined()

      const content = await fs.readFile(historyPath, "utf-8")
      const history = JSON.parse(content)
      expect(history).toHaveLength(1)
    })

    test("appends run to existing history", async () => {
      const run1: Omit<TestRun, "id" | "timestamp"> = {
        promptId: "test-1",
        promptVersion: 1,
        model: "anthropic/claude-sonnet-4",
        variables: {},
        output: "Output 1"
      }
      const run2: Omit<TestRun, "id" | "timestamp"> = {
        promptId: "test-2",
        promptVersion: 2,
        model: "openai/gpt-4o",
        variables: {},
        output: "Output 2"
      }

      await saveRun(run1)
      await saveRun(run2)

      const history = await loadHistory()
      expect(history).toHaveLength(2)
    })

    test("generates unique id for each run", async () => {
      const run: Omit<TestRun, "id" | "timestamp"> = {
        promptId: "test",
        promptVersion: 1,
        model: "m",
        variables: {},
        output: "out"
      }

      const saved1 = await saveRun(run)
      const saved2 = await saveRun(run)

      expect(saved1.id).not.toBe(saved2.id)
    })

    test("newest runs appear first", async () => {
      await saveRun({ promptId: "a", promptVersion: 1, model: "m", variables: {}, output: "first" })
      await saveRun({ promptId: "b", promptVersion: 1, model: "m", variables: {}, output: "second" })

      const history = await loadHistory()
      expect(history[0].output).toBe("second")
      expect(history[1].output).toBe("first")
    })
  })

  describe("loadHistory", () => {
    test("returns empty array when no history", async () => {
      const history = await loadHistory()
      expect(history).toEqual([])
    })

    test("filters by promptId when specified", async () => {
      await saveRun({ promptId: "a", promptVersion: 1, model: "m", variables: {}, output: "1" })
      await saveRun({ promptId: "b", promptVersion: 1, model: "m", variables: {}, output: "2" })
      await saveRun({ promptId: "a", promptVersion: 2, model: "m", variables: {}, output: "3" })

      const history = await loadHistory("a")
      expect(history).toHaveLength(2)
      expect(history.every(r => r.promptId === "a")).toBe(true)
    })
  })

  describe("deleteRun", () => {
    test("removes run by id", async () => {
      const run = await saveRun({
        promptId: "test",
        promptVersion: 1,
        model: "m",
        variables: {},
        output: "out"
      })

      await deleteRun(run.id)

      const history = await loadHistory()
      expect(history).toHaveLength(0)
    })

    test("no-op when id not found", async () => {
      await saveRun({ promptId: "test", promptVersion: 1, model: "m", variables: {}, output: "out" })

      await deleteRun("nonexistent-id")

      const history = await loadHistory()
      expect(history).toHaveLength(1)
    })
  })
})
