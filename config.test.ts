import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { loadConfig, getProviderApiKey, saveConfig } from "./config"
import { promises as fs } from "fs"
import * as os from "os"
import * as path from "path"

describe("config", () => {
  const configDir = path.join(os.homedir(), ".teleprompter")
  const configPath = path.join(configDir, "config.json")
  let originalConfig: string | null = null
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    // Save original config if exists
    try {
      originalConfig = await fs.readFile(configPath, "utf-8")
    } catch {
      originalConfig = null
    }
    // Clear provider env vars
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.CEREBRAS_API_KEY
    delete process.env.GROK_API_KEY
  })

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      await fs.writeFile(configPath, originalConfig)
    } else {
      try {
        await fs.unlink(configPath)
      } catch {}
    }
    // Restore env
    process.env = { ...originalEnv }
  })

  describe("loadConfig", () => {
    test("returns empty providers when config file missing", async () => {
      try {
        await fs.unlink(configPath)
      } catch {}

      const config = await loadConfig()
      expect(config.providers).toEqual({})
    })

    test("loads config from file", async () => {
      const testConfig = {
        providers: {
          anthropic: { apiKey: "test-key" }
        },
        defaultModel: "anthropic/claude-sonnet-4"
      }
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(testConfig))

      const config = await loadConfig()
      expect(config.providers.anthropic?.apiKey).toBe("test-key")
      expect(config.defaultModel).toBe("anthropic/claude-sonnet-4")
    })

    test("handles malformed JSON gracefully", async () => {
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, "{ invalid json }")

      const config = await loadConfig()
      expect(config.providers).toEqual({})
    })
  })

  describe("getProviderApiKey", () => {
    test("returns env var when set", async () => {
      process.env.ANTHROPIC_API_KEY = "env-key"
      const key = await getProviderApiKey("anthropic")
      expect(key).toBe("env-key")
    })

    test("returns config value when env var not set", async () => {
      const testConfig = {
        providers: { anthropic: { apiKey: "config-key" } }
      }
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(testConfig))

      const key = await getProviderApiKey("anthropic")
      expect(key).toBe("config-key")
    })

    test("returns undefined when neither set", async () => {
      try {
        await fs.unlink(configPath)
      } catch {}

      const key = await getProviderApiKey("anthropic")
      expect(key).toBeUndefined()
    })

    test("env var takes precedence over config", async () => {
      process.env.OPENAI_API_KEY = "env-key"
      const testConfig = {
        providers: { openai: { apiKey: "config-key" } }
      }
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(testConfig))

      const key = await getProviderApiKey("openai")
      expect(key).toBe("env-key")
    })
  })

  describe("saveConfig", () => {
    test("creates config file", async () => {
      try {
        await fs.unlink(configPath)
      } catch {}

      await saveConfig({
        providers: { anthropic: { apiKey: "new-key" } }
      })

      const content = await fs.readFile(configPath, "utf-8")
      const saved = JSON.parse(content)
      expect(saved.providers.anthropic.apiKey).toBe("new-key")
    })
  })
})
