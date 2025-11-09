import { test, expect, describe, beforeEach, mock } from "bun:test"
import React from 'react'
import { render } from 'ink-testing-library'
import { PromptsList } from './PromptsList'
import axios from 'axios'

// Mock axios
const mockAxios = mock()

describe("PromptsList", () => {
  const mockUrl = "http://localhost:3000"
  const mockToken = "test-token"
  const mockOnSelectPrompt = mock()

  beforeEach(() => {
    mockOnSelectPrompt.mockClear()
    mockAxios.mockClear()
  })

  test("renders loading state initially", () => {
    // Mock axios to return a pending promise
    const mockGet = mock(() => new Promise(() => {}))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptsList
        url={mockUrl}
        token={mockToken}
        verbose={false}
        onSelectPrompt={mockOnSelectPrompt}
      />
    )

    expect(lastFrame()).toContain("Loading")
  })

  test("renders error message when fetch fails", async () => {
    // Mock axios to reject
    const mockGet = mock(() => Promise.reject(new Error("Network error")))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptsList
        url={mockUrl}
        token={mockToken}
        verbose={false}
        onSelectPrompt={mockOnSelectPrompt}
      />
    )

    // Wait for error to appear
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(lastFrame()).toContain("Error")
  })

  test("renders empty state when no prompts returned", async () => {
    // Mock axios to return empty array
    const mockGet = mock(() => Promise.resolve({ data: [] }))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptsList
        url={mockUrl}
        token={mockToken}
        verbose={false}
        onSelectPrompt={mockOnSelectPrompt}
      />
    )

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(lastFrame()).toContain("No active prompts")
  })

  test("renders list of prompts", async () => {
    const mockPrompts = [
      { id: "prompt-1", namespace: "test", active: true },
      { id: "prompt-2", namespace: "prod", active: true }
    ]

    const mockGet = mock(() => Promise.resolve({ data: mockPrompts }))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptsList
        url={mockUrl}
        token={mockToken}
        verbose={false}
        onSelectPrompt={mockOnSelectPrompt}
      />
    )

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(lastFrame()).toContain("prompt-1")
    expect(lastFrame()).toContain("prompt-2")
  })

  test("makes API call with correct headers", async () => {
    const mockGet = mock(() => Promise.resolve({ data: [] }))
    axios.get = mockGet as any

    render(
      <PromptsList
        url={mockUrl}
        token={mockToken}
        verbose={false}
        onSelectPrompt={mockOnSelectPrompt}
      />
    )

    // Wait for API call
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockGet).toHaveBeenCalledWith(
      `${mockUrl}/prompts`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'cf-access-token': mockToken
        })
      })
    )
  })

  test("displays instructions for keyboard navigation", async () => {
    const mockGet = mock(() => Promise.resolve({ data: [] }))
    axios.get = mockGet as any

    const { lastFrame } = render(
      <PromptsList
        url={mockUrl}
        token={mockToken}
        verbose={false}
        onSelectPrompt={mockOnSelectPrompt}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    const frame = lastFrame()
    // Should show some keyboard instructions
    expect(frame).toMatch(/Enter|↑|↓|q/i)
  })
})
