import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import axios from 'axios'
import * as path from 'path'
import { promises as fsPromises } from 'fs'

export interface Prompt {
  id: string
  namespace: string
  version: number
  prompt?: string
  created_at?: string
}

interface PromptsListProps {
  url: string
  token: string
  verbose?: boolean
  onSelectPrompt?: (promptId: string) => void
}

export const PromptsList: React.FC<PromptsListProps> = ({ url, token, verbose = false, onSelectPrompt }) => {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStep, setExportStep] = useState<'pattern' | 'path'>('pattern')
  const [exportPattern, setExportPattern] = useState('*')
  const [exportPath, setExportPath] = useState('./')
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const { exit } = useApp()
  const { stdout } = useStdout()

  // Calculate visible rows based on terminal height
  // Reserve space for:
  // - Title with marginBottom (2 lines)
  // - Header row (1 line)
  // - Header separator (1 line)
  // - Footer separator (1 line)
  // - Footer text (1 line)
  // Total reserved: 7 lines
  const terminalHeight = stdout?.rows || 24
  const visibleRows = Math.max(3, terminalHeight - 7)

  useEffect(() => {
    async function fetchPrompts() {
      try {
        if (verbose) {
          console.log(`Making request to: ${url}/prompts`)
        }

        const response = await axios.get(`${url}/prompts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'cf-access-token': token
          }
        })

        if (verbose) {
          console.log(`Response status: ${response.status}`)
          console.log(`Found ${response.data.length} prompts`)
        }

        setPrompts(response.data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        if (verbose) {
          console.error('Error fetching prompts:', errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPrompts()
  }, [url, token, verbose])

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

    if (input === 'e' || input === 'E') {
      setIsExporting(true)
      setExportStep('pattern')
      setExportPattern('*')
      return
    }

    if (!prompts) return

    // Handle Enter key to view prompt details
    if (key.return && onSelectPrompt) {
      const selectedPrompt = prompts[selectedIndex]
      if (selectedPrompt) {
        onSelectPrompt(selectedPrompt.id)
      }
      return
    }

    if (key.upArrow) {
      setSelectedIndex(prev => {
        const newIndex = Math.max(0, prev - 1)
        // Adjust scroll offset if needed
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex)
        }
        return newIndex
      })
    }

    if (key.downArrow) {
      setSelectedIndex(prev => {
        const newIndex = Math.min(prompts.length - 1, prev + 1)
        // Adjust scroll offset if needed
        if (newIndex >= scrollOffset + visibleRows) {
          setScrollOffset(newIndex - visibleRows + 1)
        }
        return newIndex
      })
    }
  }, { isActive: !isExporting })

  // Handle pattern submission
  const handlePatternSubmit = () => {
    setExportStep('path')
    setExportPath('./')
  }

  // Handle export path submission
  const handleExportSubmit = async () => {
    if (!prompts) return

    try {
      // Ensure output directory exists
      await fsPromises.mkdir(exportPath, { recursive: true })

      // Filter prompts by pattern
      const regexPattern = exportPattern.replace(/\*/g, '.*')
      const matcher = new RegExp(`^${regexPattern}$`)
      const matchingPrompts = prompts.filter((p: Prompt) => matcher.test(p.id))

      if (matchingPrompts.length === 0) {
        setExportMessage(`No prompts found matching pattern: ${exportPattern}`)
        setIsExporting(false)
        setTimeout(() => setExportMessage(null), 3000)
        return
      }

      // Export each matching prompt
      let exportedCount = 0
      for (const promptInfo of matchingPrompts) {
        try {
          // Get full prompt details
          const detailResponse = await axios.get(`${url}/prompts/${promptInfo.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'cf-access-token': token
            }
          })

          const prompt = detailResponse.data

          // Convert prompt ID to snake case filename
          const filename = prompt.id
            .replace(/:/g, '_')
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
          const filepath = path.join(exportPath, `${filename}.json`)

          const exportData = {
            id: prompt.id,
            namespace: prompt.namespace,
            prompt: prompt.prompt
          }

          await fsPromises.writeFile(
            filepath,
            JSON.stringify(exportData, null, 2)
          )

          exportedCount++

          if (verbose) {
            console.log(`Exported ${prompt.id} to ${filepath}`)
          }
        } catch (err) {
          if (verbose) {
            console.error(`Error exporting prompt ${promptInfo.id}:`, err instanceof Error ? err.message : 'Unknown error')
          }
        }
      }

      setExportMessage(`Exported ${exportedCount} prompt${exportedCount !== 1 ? 's' : ''} to ${exportPath}`)
      setIsExporting(false)
      setTimeout(() => setExportMessage(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setExportMessage(`Export failed: ${errorMessage}`)
      setIsExporting(false)

      if (verbose) {
        console.error('Error during export:', errorMessage)
      }

      setTimeout(() => setExportMessage(null), 3000)
    }
  }

  // Show export input interface
  if (isExporting) {
    if (exportStep === 'pattern') {
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="green" bold>Export Prompts</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="cyan">Enter pattern (e.g., * for all, prefix:* for matching): </Text>
          </Box>
          <Box marginBottom={1}>
            <TextInput
              value={exportPattern}
              onChange={setExportPattern}
              onSubmit={handlePatternSubmit}
            />
          </Box>
          <Box>
            <Text color="gray" dimColor>Press </Text>
            <Text color="yellow" bold>Enter</Text>
            <Text color="gray" dimColor> to continue or </Text>
            <Text color="yellow" bold>Ctrl+C</Text>
            <Text color="gray" dimColor> to cancel</Text>
          </Box>
        </Box>
      )
    } else {
      // Calculate matching prompts for display
      const regexPattern = exportPattern.replace(/\*/g, '.*')
      const matcher = new RegExp(`^${regexPattern}$`)
      const matchingPrompts = prompts?.filter((p: Prompt) => matcher.test(p.id)) || []

      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="green" bold>Export Prompts</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="cyan">Pattern: </Text>
            <Text color="white">{exportPattern}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="cyan">Matching prompts ({matchingPrompts.length}):</Text>
          </Box>
          <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
            {matchingPrompts.length === 0 ? (
              <Text color="yellow">No prompts match this pattern</Text>
            ) : (
              matchingPrompts.slice(0, 10).map((p) => (
                <Text key={p.id} color="gray">
                  • {p.id} ({p.namespace} v{p.version})
                </Text>
              ))
            )}
            {matchingPrompts.length > 10 && (
              <Text color="gray" dimColor>
                ... and {matchingPrompts.length - 10} more
              </Text>
            )}
          </Box>
          <Box marginBottom={1}>
            <Text color="cyan">Export directory: </Text>
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
  }

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Loading prompts...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>Error:</Text>
        <Text color="red">{error}</Text>
        <Text color="gray" dimColor marginTop={1}>Press 'q' to quit</Text>
      </Box>
    )
  }

  if (!prompts || prompts.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No active prompts found.</Text>
        <Text color="gray" dimColor marginTop={1}>Press 'q' to quit</Text>
      </Box>
    )
  }

  // Pad text to exact width and ensure single-line display
  const padText = (text: string | undefined, width: number): string => {
    if (!text) return ' '.repeat(width)
    // Replace all newlines and multiple spaces with single space
    const singleLine = text.replace(/\s+/g, ' ').trim()
    const truncated = singleLine.length > width ? singleLine.substring(0, width - 3) + '...' : singleLine
    return truncated.padEnd(width, ' ')
  }

  // Get visible prompts based on scroll offset
  const visiblePrompts = prompts.slice(scrollOffset, scrollOffset + visibleRows)

  // Fixed column widths - must be consistent for all rows
  const idWidth = 35
  const namespaceWidth = 25
  const versionWidth = 15
  const promptWidth = 60

  // Helper component for table row
  const TableRow: React.FC<{
    id: string
    namespace: string
    version: string | number
    prompt: string
    isSelected?: boolean
    isHeader?: boolean
  }> = ({ id, namespace, version, prompt, isSelected = false, isHeader = false }) => (
    <Box backgroundColor={isSelected && !isHeader ? 'blue' : undefined}>
      <Box width={idWidth}>
        <Text bold={isHeader || isSelected} color={isHeader ? 'cyan' : undefined}>
          {padText(String(id), idWidth)}
        </Text>
      </Box>
      <Box width={namespaceWidth}>
        <Text
          bold={isHeader || isSelected}
          color={isHeader ? 'cyan' : (isSelected ? 'white' : 'magenta')}
        >
          {padText(String(namespace), namespaceWidth)}
        </Text>
      </Box>
      <Box width={versionWidth}>
        <Text
          bold={isHeader || isSelected}
          color={isHeader ? 'cyan' : (isSelected ? 'white' : 'yellow')}
        >
          {padText(String(version), versionWidth)}
        </Text>
      </Box>
      <Box width={promptWidth}>
        <Text
          bold={isHeader || isSelected}
          color={isHeader ? 'cyan' : (isSelected ? 'white' : 'gray')}
        >
          {padText(String(prompt), promptWidth)}
        </Text>
      </Box>
    </Box>
  )

  return (
    <Box flexDirection="column" height="100%">
      {/* Fixed header section - pinned at top */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>
            Active Prompts ({prompts.length}) - Use ↑↓ to scroll
          </Text>
        </Box>

        {/* Header row */}
        <TableRow
          id="ID"
          namespace="Namespace"
          version="Version"
          prompt="Prompt"
          isHeader={true}
        />

        {/* Separator */}
        <Box>
          <Text color="gray">{'─'.repeat(idWidth + namespaceWidth + versionWidth + promptWidth)}</Text>
        </Box>
      </Box>

      {/* Scrollable content area - fills available space */}
      <Box flexDirection="column" flexGrow={1}>
        {visiblePrompts.map((prompt, index) => {
          const actualIndex = scrollOffset + index
          const isSelected = actualIndex === selectedIndex

          return (
            <TableRow
              key={`${prompt.id}-${actualIndex}`}
              id={prompt.id}
              namespace={prompt.namespace}
              version={prompt.version}
              prompt={prompt.prompt || ''}
              isSelected={isSelected}
            />
          )
        })}
      </Box>

      {/* Fixed footer - pinned at bottom */}
      <Box flexDirection="column">
        <Box>
          <Text color="gray">{'─'.repeat(idWidth + namespaceWidth + versionWidth + promptWidth)}</Text>
        </Box>
        <Box paddingX={1}>
          <Text color="cyan" dimColor>Press </Text>
          <Text color="yellow" bold>e</Text>
          <Text color="cyan" dimColor> to export, </Text>
          <Text color="yellow" bold>Enter</Text>
          <Text color="cyan" dimColor> to view details, </Text>
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
