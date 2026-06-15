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

    expect(lastFrame()).toContain("run")
    expect(lastFrame()).toContain("back")
    expect(lastFrame()).toContain("quit")
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

  test("displays template body without frontmatter", () => {
    const dotpromptPrompt: Prompt = {
      id: "test-prompt",
      namespace: "test-ns",
      version: 1234567890,
      prompt: "---\nmodel: anthropic/claude-sonnet-4-20250514\n---\nHello {{name}}"
    }

    const { lastFrame } = render(
      <PromptTestRunner
        prompt={dotpromptPrompt}
        url="http://localhost"
        onBack={() => {}}
      />
    )

    const frame = lastFrame()
    // The template body should be visible
    expect(frame).toContain("Hello")
    // The frontmatter metadata should NOT appear in the template display
    expect(frame).not.toContain("model: anthropic")
  })
})
