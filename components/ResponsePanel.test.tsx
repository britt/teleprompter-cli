import { test, expect, describe } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { ResponsePanel } from "./ResponsePanel"

describe("ResponsePanel", () => {
  test("shows model name in header", () => {
    const { lastFrame } = render(
      <ResponsePanel
        modelName="claude-sonnet-4"
        content="Hello"
        isStreaming={false}
      />
    )

    expect(lastFrame()).toContain("claude-sonnet-4")
  })

  test("displays content", () => {
    const { lastFrame } = render(
      <ResponsePanel
        modelName="claude-sonnet-4"
        content="Hello World"
        isStreaming={false}
      />
    )

    expect(lastFrame()).toContain("Hello World")
  })

  test("shows cursor while streaming", () => {
    const { lastFrame } = render(
      <ResponsePanel
        modelName="claude-sonnet-4"
        content="Hello"
        isStreaming={true}
      />
    )

    expect(lastFrame()).toContain("█")
  })

  test("hides cursor when not streaming", () => {
    const { lastFrame } = render(
      <ResponsePanel
        modelName="claude-sonnet-4"
        content="Hello"
        isStreaming={false}
      />
    )

    expect(lastFrame()).not.toContain("█")
  })

  test("displays multiline content", () => {
    const content = "Line 1\nLine 2\nLine 3"
    const { lastFrame } = render(
      <ResponsePanel
        modelName="test"
        content={content}
        isStreaming={false}
      />
    )

    expect(lastFrame()).toContain("Line 1")
    expect(lastFrame()).toContain("Line 2")
    expect(lastFrame()).toContain("Line 3")
  })

  test("handles empty content", () => {
    const { lastFrame } = render(
      <ResponsePanel
        modelName="test"
        content=""
        isStreaming={false}
      />
    )

    expect(lastFrame()).toContain("test")
  })
})
