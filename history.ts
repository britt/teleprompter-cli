import { promises as fs } from "fs"
import * as path from "path"
import * as os from "os"
import { randomUUID } from "crypto"

const HISTORY_DIR = path.join(os.homedir(), ".teleprompter")
const HISTORY_PATH = path.join(HISTORY_DIR, "history.json")
const MAX_RUNS_PER_PROMPT = 100

export interface TestRun {
  id: string
  timestamp: string
  promptId: string
  promptVersion: number
  model: string
  variables: Record<string, unknown>
  output: string
}

async function readHistory(): Promise<TestRun[]> {
  try {
    const content = await fs.readFile(HISTORY_PATH, "utf-8")
    return JSON.parse(content)
  } catch {
    return []
  }
}

async function writeHistory(history: TestRun[]): Promise<void> {
  await fs.mkdir(HISTORY_DIR, { recursive: true })
  await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2), { mode: 0o600 })
}

export async function saveRun(
  run: Omit<TestRun, "id" | "timestamp">
): Promise<TestRun> {
  const history = await readHistory()

  const newRun: TestRun = {
    ...run,
    id: randomUUID(),
    timestamp: new Date().toISOString()
  }

  // Add new run at the beginning (newest first)
  history.unshift(newRun)

  // Enforce max runs per prompt
  const promptCounts = new Map<string, number>()
  const filtered = history.filter(r => {
    const count = promptCounts.get(r.promptId) || 0
    if (count >= MAX_RUNS_PER_PROMPT) {
      return false
    }
    promptCounts.set(r.promptId, count + 1)
    return true
  })

  await writeHistory(filtered)
  return newRun
}

export async function loadHistory(promptId?: string): Promise<TestRun[]> {
  const history = await readHistory()

  if (promptId) {
    return history.filter(r => r.promptId === promptId)
  }

  return history
}

export async function deleteRun(id: string): Promise<void> {
  const history = await readHistory()
  const filtered = history.filter(r => r.id !== id)
  await writeHistory(filtered)
}
