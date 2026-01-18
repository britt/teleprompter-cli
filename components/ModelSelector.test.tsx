import { test, expect, describe } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { ModelSelector } from "./ModelSelector"
import { ModelInfo, ProviderName } from "../providers"

describe("ModelSelector", () => {
  const mockModels: ModelInfo[] = [
    { id: "claude-sonnet-4", provider: "anthropic" as ProviderName, displayName: "anthropic/claude-sonnet-4" },
    { id: "gpt-4o", provider: "openai" as ProviderName, displayName: "openai/gpt-4o" }
  ]

  test("shows loading state", () => {
    const { lastFrame } = render(
      <ModelSelector
        models={[]}
        loading={true}
        selectedModel={null}
        onSelect={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("Loading")
  })

  test("displays models grouped by provider", () => {
    const { lastFrame } = render(
      <ModelSelector
        models={mockModels}
        loading={false}
        selectedModel={null}
        onSelect={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("anthropic")
    expect(lastFrame()).toContain("openai")
    expect(lastFrame()).toContain("claude-sonnet-4")
    expect(lastFrame()).toContain("gpt-4o")
  })

  test("highlights selected model", () => {
    const { lastFrame } = render(
      <ModelSelector
        models={mockModels}
        loading={false}
        selectedModel={mockModels[0]}
        onSelect={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("claude-sonnet-4")
    expect(lastFrame()).toContain("selected")
  })

  test("shows message when no models available", () => {
    const { lastFrame } = render(
      <ModelSelector
        models={[]}
        loading={false}
        selectedModel={null}
        onSelect={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("No models")
  })

  test("shows multiple providers", () => {
    const models: ModelInfo[] = [
      { id: "claude-sonnet-4", provider: "anthropic" as ProviderName, displayName: "anthropic/claude-sonnet-4" },
      { id: "claude-haiku-4", provider: "anthropic" as ProviderName, displayName: "anthropic/claude-haiku-4" },
      { id: "gpt-4o", provider: "openai" as ProviderName, displayName: "openai/gpt-4o" },
      { id: "gemini-2.5-pro", provider: "google" as ProviderName, displayName: "google/gemini-2.5-pro" }
    ]

    const { lastFrame } = render(
      <ModelSelector
        models={models}
        loading={false}
        selectedModel={null}
        onSelect={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("anthropic")
    expect(lastFrame()).toContain("openai")
    expect(lastFrame()).toContain("google")
  })
})
