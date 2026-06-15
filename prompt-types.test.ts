import { test, expect, describe } from "bun:test"
import type { PromptMetadata, Prompt } from "./prompt-types"

describe("PromptMetadata", () => {
  test("accepts a fully-populated object", () => {
    const meta: PromptMetadata = {
      model: "anthropic/claude-sonnet-4",
      config: { temperature: 0.7, maxTokens: 1024 },
      input: {
        default: { name: "world" },
        schema: { type: "object", properties: { name: { type: "string" } } },
      },
      output: {
        format: "json",
        schema: { type: "object", properties: { result: { type: "string" } } },
      },
      tools: ["web_search", "calculator"],
      description: "A helpful assistant prompt",
      ext: {
        custom: { foo: "bar", nested: { deep: true } },
      },
    }
    // If TypeScript compiles this, the type is correct
    expect(meta.model).toBe("anthropic/claude-sonnet-4")
    expect(meta.tools).toEqual(["web_search", "calculator"])
    expect(meta.description).toBe("A helpful assistant prompt")
    expect(meta.ext?.custom?.foo).toBe("bar")
  })

  test("accepts an empty object", () => {
    const meta: PromptMetadata = {}
    expect(meta).toEqual({})
  })
})

describe("Prompt", () => {
  test("includes metadata field", () => {
    const prompt: Prompt = {
      id: "test-prompt",
      namespace: "default",
      version: 1,
      prompt: "Hello {{name}}",
      created_at: "2024-01-01T00:00:00Z",
      metadata: {
        model: "openai/gpt-4o",
        description: "Test prompt with metadata",
      },
    }
    expect(prompt.metadata?.model).toBe("openai/gpt-4o")
    expect(prompt.metadata?.description).toBe("Test prompt with metadata")
  })

  test("metadata is optional for backward compatibility", () => {
    const prompt: Prompt = {
      id: "legacy-prompt",
      namespace: "default",
      version: 1,
    }
    // No metadata field at all - should compile fine
    expect(prompt.metadata).toBeUndefined()
  })
})
