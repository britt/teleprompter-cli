import { test, expect, describe, beforeEach, mock } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { PromptTestRunner } from "./PromptTestRunner"
import { Prompt } from "./PromptsList"

describe("PromptTestRunner", () => {
  const mockPrompt: Prompt = {
    id: "test-prompt",
    namespace: "test",
    version: 123456,
    prompt: "Hello {{name}}, welcome to {{place}}"
  }

  beforeEach(() => {
    // Mock providers to avoid API calls
    process.env.ANTHROPIC_API_KEY = "test-key"
  })

  test("displays prompt template", () => {
    const { lastFrame } = render(
      <PromptTestRunner
        prompt={mockPrompt}
        url="http://localhost"
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("Hello")
  })

  test("shows variable form with extracted variables", () => {
    const { lastFrame } = render(
      <PromptTestRunner
        prompt={mockPrompt}
        url="http://localhost"
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("name")
    expect(lastFrame()).toContain("place")
  })

  test("shows keyboard controls", () => {
    const { lastFrame } = render(
      <PromptTestRunner
        prompt={mockPrompt}
        url="http://localhost"
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("Run")
    expect(lastFrame()).toContain("Esc")
  })

  test("shows prompt id in header", () => {
    const { lastFrame } = render(
      <PromptTestRunner
        prompt={mockPrompt}
        url="http://localhost"
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("test-prompt")
  })

  test("handles prompt with no variables", () => {
    const simplePrompt: Prompt = {
      id: "simple",
      namespace: "test",
      version: 1,
      prompt: "Hello world, no variables here"
    }

    const { lastFrame } = render(
      <PromptTestRunner
        prompt={simplePrompt}
        url="http://localhost"
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("No variables")
  })

  test("calls onBack when escape is pressed", () => {
    const onBack = mock()
    const { stdin } = render(
      <PromptTestRunner
        prompt={mockPrompt}
        url="http://localhost"
        onBack={onBack}
      />
    )

    stdin.write("\x1B") // Escape key
    expect(onBack).toHaveBeenCalled()
  })
})
