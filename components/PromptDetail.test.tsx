import { test, expect, describe, beforeEach, mock } from "bun:test"
import React from 'react'
import { render } from 'ink-testing-library'
import { PromptDetail } from './PromptDetail'
import axios from 'axios'

describe("PromptDetail", () => {
  const mockUrl = "http://localhost:3000"
  const mockToken = "test-token"
  const mockPromptId = "test-prompt"
  const mockOnBack = mock()

  beforeEach(() => {
    mockOnBack.mockClear()
  })

  test("renders loading state initially", () => {
    const mockGet = mock(() => new Promise(() => {}))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptDetail
        promptId={mockPromptId}
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        verbose={false}
      />
    )

    expect(lastFrame()).toContain("Loading")
  })

  test("renders error message when fetch fails", async () => {
    const mockGet = mock(() => Promise.reject(new Error("Not found")))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptDetail
        promptId={mockPromptId}
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        verbose={false}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(lastFrame()).toContain("Error")
  })

  test("renders prompt details when loaded", async () => {
    const mockPrompt = {
      id: "test-prompt",
      namespace: "test-namespace",
      version: 1234567890,
      prompt: "This is the prompt text",
      active: true
    }

    const mockGet = mock(() => Promise.resolve({ data: mockPrompt }))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptDetail
        promptId={mockPromptId}
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        verbose={false}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    const frame = lastFrame()
    expect(frame).toContain("test-prompt")
    expect(frame).toContain("test-namespace")
    expect(frame).toContain("This is the prompt text")
  })

  test("makes API call with correct URL", async () => {
    const mockGet = mock(() => Promise.resolve({
      data: { id: mockPromptId, namespace: "test", version: 123, prompt: "test", active: true }
    }))
    axios.get = mockGet as any

    render(
      <PromptDetail
        promptId={mockPromptId}
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        verbose={false}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockGet).toHaveBeenCalledWith(
      `${mockUrl}/prompts/${mockPromptId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'cf-access-token': mockToken
        })
      })
    )
  })

  test("displays keyboard navigation instructions", async () => {
    const mockGet = mock(() => Promise.resolve({
      data: { id: mockPromptId, namespace: "test", version: 123, prompt: "test", active: true }
    }))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptDetail
        promptId={mockPromptId}
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        verbose={false}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    const frame = lastFrame()
    // Should show back or quit instructions
    expect(frame).toMatch(/back|quit|ESC|q/i)
  })

  test("displays version information", async () => {
    const mockPrompt = {
      id: "test-prompt",
      namespace: "test",
      version: 1699564800000,
      prompt: "test",
      active: true
    }

    const mockGet = mock(() => Promise.resolve({ data: mockPrompt }))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptDetail
        promptId={mockPromptId}
        url={mockUrl}
        token={mockToken}
        onBack={mockOnBack}
        verbose={false}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    const frame = lastFrame()
    expect(frame).toContain("version")
  })
})
