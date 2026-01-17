import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { getConfiguredProviders, createProvider, ProviderName } from "./providers"

describe("providers", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear all provider env vars
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.CEREBRAS_API_KEY
    delete process.env.GROK_API_KEY
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe("getConfiguredProviders", () => {
    test("returns only providers with API keys", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key"
      process.env.OPENAI_API_KEY = "test-key-2"

      const providers = await getConfiguredProviders()
      expect(providers).toContain("anthropic")
      expect(providers).toContain("openai")
      expect(providers).not.toContain("google")
    })

    test("returns empty when no keys configured", async () => {
      const providers = await getConfiguredProviders()
      expect(providers).toEqual([])
    })
  })

  describe("createProvider", () => {
    test("creates Anthropic provider", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key"
      const provider = await createProvider("anthropic")
      expect(provider).toBeDefined()
    })

    test("creates OpenAI provider", async () => {
      process.env.OPENAI_API_KEY = "test-key"
      const provider = await createProvider("openai")
      expect(provider).toBeDefined()
    })

    test("creates Google provider", async () => {
      process.env.GOOGLE_API_KEY = "test-key"
      const provider = await createProvider("google")
      expect(provider).toBeDefined()
    })

    test("creates Cerebras provider", async () => {
      process.env.CEREBRAS_API_KEY = "test-key"
      const provider = await createProvider("cerebras")
      expect(provider).toBeDefined()
    })

    test("creates Grok provider", async () => {
      process.env.GROK_API_KEY = "test-key"
      const provider = await createProvider("grok")
      expect(provider).toBeDefined()
    })

    test("throws when API key missing", async () => {
      await expect(createProvider("anthropic")).rejects.toThrow()
    })
  })
})
