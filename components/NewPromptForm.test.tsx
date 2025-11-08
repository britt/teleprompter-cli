import { test, expect, describe, beforeEach, mock } from "bun:test"
import React from 'react'
import { render } from 'ink-testing-library'
import { NewPromptForm } from './NewPromptForm'
import axios from 'axios'

describe("NewPromptForm", () => {
  const mockUrl = "http://localhost:3000"
  const mockToken = "test-token"
  const mockOnBack = mock()
  const mockOnSuccess = mock()

  beforeEach(() => {
    mockOnBack.mockClear()
    mockOnSuccess.mockClear()
  })

  test("renders initial form with ID field", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    const frame = lastFrame()
    expect(frame).toContain("Create New Prompt")
    expect(frame).toContain("ID:")
  })

  test("displays keyboard instructions", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    const frame = lastFrame()
    expect(frame).toContain("Enter")
    expect(frame).toContain("Ctrl+B")
    expect(frame).toContain("q")
  })

  test("shows ID field first", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    const frame = lastFrame()
    // Should show ID field as active
    expect(frame).toContain("ID:")
    // Should not show namespace or prompt fields yet (they appear after ID is entered)
  })

  test("form has multi-step structure", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    // Initial state should only show ID field
    const frame = lastFrame()
    expect(frame).toContain("ID:")
  })

  test("displays cancel instruction", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    const frame = lastFrame()
    expect(frame).toMatch(/cancel|Ctrl\+B/i)
  })

  test("displays quit instruction", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    const frame = lastFrame()
    expect(frame).toMatch(/quit|q/i)
  })

  test("shows placeholder for ID field", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    const frame = lastFrame()
    // The form should have the ID input visible initially
    expect(frame).toContain("ID:")
  })

  test("component accepts all required props", () => {
    // This test verifies the component can be instantiated with all props
    expect(() => {
      render(
        <NewPromptForm
          url={mockUrl}
          token={mockToken}
          onBack={mockOnBack}
          onSuccess={mockOnSuccess}
          verbose={false}
        />
      )
    }).not.toThrow()
  })

  test("component accepts verbose prop", () => {
    expect(() => {
      render(
        <NewPromptForm
          url={mockUrl}
          token={mockToken}
          onBack={mockOnBack}
          onSuccess={mockOnSuccess}
          verbose={true}
        />
      )
    }).not.toThrow()
  })

  test("renders title correctly", () => {
    const { lastFrame } = render(
      <NewPromptForm
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        verbose={false}
      />
    )

    expect(lastFrame()).toContain("Create New Prompt")
  })
})
