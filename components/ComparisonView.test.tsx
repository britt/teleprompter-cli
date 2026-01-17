import { test, expect, describe } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { ComparisonView } from "./ComparisonView"

describe("ComparisonView", () => {
  test("renders two panels side by side", () => {
    const { lastFrame } = render(
      <ComparisonView
        panels={[
          { modelName: "claude-sonnet-4", content: "Response A", isStreaming: false },
          { modelName: "gpt-4o", content: "Response B", isStreaming: false }
        ]}
      />
    )

    expect(lastFrame()).toContain("claude-sonnet-4")
    expect(lastFrame()).toContain("gpt-4o")
    expect(lastFrame()).toContain("Response A")
    expect(lastFrame()).toContain("Response B")
  })

  test("shows streaming indicator on active panels", () => {
    const { lastFrame } = render(
      <ComparisonView
        panels={[
          { modelName: "claude-sonnet-4", content: "Streaming", isStreaming: true },
          { modelName: "gpt-4o", content: "Done", isStreaming: false }
        ]}
      />
    )

    // Should have at least one cursor
    expect(lastFrame()).toContain("█")
  })

  test("renders single panel when only one provided", () => {
    const { lastFrame } = render(
      <ComparisonView
        panels={[
          { modelName: "claude-sonnet-4", content: "Only one", isStreaming: false }
        ]}
      />
    )

    expect(lastFrame()).toContain("claude-sonnet-4")
    expect(lastFrame()).toContain("Only one")
  })

  test("handles empty panels array", () => {
    const { lastFrame } = render(
      <ComparisonView panels={[]} />
    )

    // Should render without crashing
    expect(lastFrame()).toBeDefined()
  })

  test("renders more than two panels vertically stacked", () => {
    const { lastFrame } = render(
      <ComparisonView
        panels={[
          { modelName: "model-1", content: "Content 1", isStreaming: false },
          { modelName: "model-2", content: "Content 2", isStreaming: false },
          { modelName: "model-3", content: "Content 3", isStreaming: false }
        ]}
      />
    )

    expect(lastFrame()).toContain("model-1")
    expect(lastFrame()).toContain("model-2")
    expect(lastFrame()).toContain("model-3")
  })
})
