import { test, expect, describe } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { TestHistory } from "./TestHistory"
import { TestRun } from "../history"

describe("TestHistory", () => {
  const mockRuns: TestRun[] = [
    {
      id: "1",
      timestamp: "2025-01-16T10:30:00Z",
      promptId: "test-prompt",
      promptVersion: 123,
      model: "anthropic/claude-sonnet-4",
      variables: { name: "Test" },
      output: "Hello Test response that is somewhat long"
    },
    {
      id: "2",
      timestamp: "2025-01-16T10:28:00Z",
      promptId: "test-prompt",
      promptVersion: 123,
      model: "openai/gpt-4o",
      variables: { name: "Test" },
      output: "Hi Test"
    }
  ]

  test("shows list of past runs", () => {
    const { lastFrame } = render(
      <TestHistory
        runs={mockRuns}
        promptId="test-prompt"
        onSelect={() => {}}
        onRerun={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("claude-sonnet-4")
    expect(lastFrame()).toContain("gpt-4o")
  })

  test("displays date/time and length", () => {
    const { lastFrame } = render(
      <TestHistory
        runs={mockRuns}
        promptId="test-prompt"
        onSelect={() => {}}
        onRerun={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("chars")
  })

  test("shows message when no history", () => {
    const { lastFrame } = render(
      <TestHistory
        runs={[]}
        promptId="test-prompt"
        onSelect={() => {}}
        onRerun={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("No test history")
  })

  test("shows keyboard controls", () => {
    const { lastFrame } = render(
      <TestHistory
        runs={mockRuns}
        promptId="test-prompt"
        onSelect={() => {}}
        onRerun={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("view")
    expect(lastFrame()).toContain("re-run")
    expect(lastFrame()).toContain("delete")
    expect(lastFrame()).toContain("back")
  })

  test("shows prompt id in header", () => {
    const { lastFrame } = render(
      <TestHistory
        runs={mockRuns}
        promptId="my-special-prompt"
        onSelect={() => {}}
        onRerun={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />
    )

    expect(lastFrame()).toContain("my-special-prompt")
  })
})
