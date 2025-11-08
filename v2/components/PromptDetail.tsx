import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import axios from 'axios'
import { Prompt } from './PromptsList.js'
import * as path from 'path'
import { promises as fsPromises } from 'fs'

interface PromptDetailProps {
  promptId: string
  url: string
  token: string
  onBack: () => void
  verbose?: boolean
}

export const PromptDetail: React.FC<PromptDetailProps> = ({
  promptId,
  url,
  token,
  onBack,
  verbose = false
}) => {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportPath, setExportPath] = useState('')
  const { exit } = useApp()
  const { stdout } = useStdout()

  // Fixed maximum size for prompt display area
  // This avoids issues with word wrapping and dynamic height calculations
  const maxVisibleLines = 28

  // Get terminal width for full-width separators
  const terminalWidth = stdout?.columns || 80

  useEffect(() => {
    async function fetchPromptDetail() {
      try {
        if (verbose) {
          console.log(`Fetching prompt details for: ${promptId}`)
        }

        const response = await axios.get(`${url}/prompts/${promptId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'cf-access-token': token
          }
        })

        if (verbose) {
          console.log(`Response status: ${response.status}`)
        }

        setPrompt(response.data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        if (verbose) {
          console.error('Error fetching prompt details:', errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPromptDetail()
  }, [promptId, url, token, verbose])

  // Generate default export filename
  const getDefaultExportPath = (promptToExport: Prompt): string => {
    const filename = promptToExport.id
      .replace(/:/g, '_')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
    return `./${filename}.json`
  }

  // Handle keyboard input
  useInput((input, key) => {
    // Don't handle normal navigation when exporting
    if (isExporting) {
      return
    }

    if (input === 'q') {
      exit()
      return
    }

    if (input === 'b' || input === 'B') {
      onBack()
      return
    }

    if (input === 'e' || input === 'E') {
      if (prompt) {
        const defaultPath = getDefaultExportPath(prompt)
        setExportPath(defaultPath)
        setIsExporting(true)
      }
      return
    }

    if (!prompt) return

    // Get total lines for scrolling calculation
    const promptText = prompt.prompt || ''
    const normalizedText = promptText.replace(/\\n/g, '\n')
    const totalLines = normalizedText.split('\n').length

    if (key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1))
    }

    if (key.downArrow) {
      setScrollOffset(prev => Math.min(Math.max(0, totalLines - maxVisibleLines), prev + 1))
    }
  }, { isActive: !isExporting })

  // Export prompt to JSON file
  const exportPrompt = async (filepath: string, promptToExport: Prompt) => {
    try {
      const exportData = {
        id: promptToExport.id,
        namespace: promptToExport.namespace,
        prompt: promptToExport.prompt
      }

      await fsPromises.writeFile(
        filepath,
        JSON.stringify(exportData, null, 2)
      )

      setExportMessage(`Exported to ${filepath}`)
      setIsExporting(false)

      if (verbose) {
        console.log(`Exported ${promptToExport.id} to ${filepath}`)
      }

      // Clear message after 3 seconds
      setTimeout(() => setExportMessage(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setExportMessage(`Export failed: ${errorMessage}`)
      setIsExporting(false)

      if (verbose) {
        console.error('Error exporting prompt:', errorMessage)
      }

      // Clear message after 3 seconds
      setTimeout(() => setExportMessage(null), 3000)
    }
  }

  // Handle export path submission
  const handleExportSubmit = () => {
    if (prompt && exportPath) {
      exportPrompt(exportPath, prompt)
    }
  }

  // Handle export cancellation
  const handleExportCancel = () => {
    setIsExporting(false)
    setExportPath('')
  }

  // Show export input interface
  if (isExporting && prompt) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>Export Prompt</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="cyan">Export path: </Text>
        </Box>
        <Box marginBottom={1}>
          <TextInput
            value={exportPath}
            onChange={setExportPath}
            onSubmit={handleExportSubmit}
          />
        </Box>
        <Box>
          <Text color="gray" dimColor>Press </Text>
          <Text color="yellow" bold>Enter</Text>
          <Text color="gray" dimColor> to export or </Text>
          <Text color="yellow" bold>Ctrl+C</Text>
          <Text color="gray" dimColor> to cancel</Text>
        </Box>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Loading prompt details...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>Error:</Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text color="gray" dimColor>Press </Text>
          <Text color="yellow" bold>b</Text>
          <Text color="gray" dimColor> to go back or </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="gray" dimColor> to quit</Text>
        </Box>
      </Box>
    )
  }

  if (!prompt) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Prompt not found.</Text>
        <Box marginTop={1}>
          <Text color="gray" dimColor>Press </Text>
          <Text color="yellow" bold>b</Text>
          <Text color="gray" dimColor> to go back or </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="gray" dimColor> to quit</Text>
        </Box>
      </Box>
    )
  }

  // Split prompt text into lines for better display
  // Handle both actual newlines and escaped \n sequences
  const promptText = prompt.prompt || ''
  const normalizedText = promptText.replace(/\\n/g, '\n') // Replace escaped \n with actual newlines
  const promptLines = normalizedText.split('\n')

  // Get visible lines based on scroll offset
  const visiblePromptLines = promptLines.slice(scrollOffset, scrollOffset + maxVisibleLines)
  const totalLines = promptLines.length
  const canScroll = totalLines > maxVisibleLines

  return (
    <Box flexDirection="column" height="100%">
      {/* Fixed header section - pinned at top */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>Prompt Details</Text>
        </Box>

        {/* Metadata section */}
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color="cyan">ID: </Text>
            <Text>{prompt.id}</Text>
          </Box>
          <Box>
            <Text bold color="cyan">Namespace: </Text>
            <Text color="magenta">{prompt.namespace}</Text>
          </Box>
          <Box>
            <Text bold color="cyan">Version: </Text>
            <Text color="yellow">{prompt.version}</Text>
          </Box>
          {prompt.created_at && (
            <Box>
              <Text bold color="cyan">Created: </Text>
              <Text color="gray">{prompt.created_at}</Text>
            </Box>
          )}
        </Box>

        {/* Separator */}
        <Box>
          <Text color="gray">{'─'.repeat(terminalWidth)}</Text>
        </Box>
      </Box>

      {/* Scrollable prompt text section - fixed height */}
      <Box flexDirection="column" height={maxVisibleLines}>
        {visiblePromptLines.map((line, index) => (
          <Text key={scrollOffset + index} color="white">
            {line || ' '}
          </Text>
        ))}
      </Box>

      {/* Fixed footer - pinned at bottom */}
      <Box flexDirection="column">
        <Box>
          <Text color="gray">{'─'.repeat(terminalWidth)}</Text>
        </Box>
        <Box paddingX={1}>
          {canScroll && (
            <>
              <Text color="gray" dimColor>
                Showing lines {scrollOffset + 1}-{Math.min(scrollOffset + maxVisibleLines, totalLines)} of {totalLines} •
              </Text>
              <Text color="gray" dimColor> </Text>
            </>
          )}
          <Text color="cyan" dimColor>Press </Text>
          <Text color="yellow" bold>e</Text>
          <Text color="cyan" dimColor> to export, </Text>
          <Text color="yellow" bold>b</Text>
          <Text color="cyan" dimColor> to go back, </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="cyan" dimColor> to quit</Text>
        </Box>
        {exportMessage && (
          <Box paddingX={1}>
            <Text color="green">{exportMessage}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
