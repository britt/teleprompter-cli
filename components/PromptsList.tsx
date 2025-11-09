import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import axios from 'axios'
import * as path from 'path'
import { promises as fsPromises } from 'fs'
import { NewPromptForm } from './NewPromptForm.js'

export interface Prompt {
  id: string
  namespace: string
  version: number
  prompt?: string
  created_at?: string
}

interface PromptVersion {
  id: string
  namespace: string
  version: number
  created_at?: string
  prompt?: string
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
  const [isFiltering, setIsFiltering] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportStep, setExportStep] = useState<'pattern' | 'path'>('pattern')
  const [exportPattern, setExportPattern] = useState('*')
  const [exportPath, setExportPath] = useState('./')
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'versions' | 'rollback' | 'new'>('list')
  const [versions, setVersions] = useState<PromptVersion[] | null>(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0)
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null)
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null)
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

  // Convert version timestamp to human-readable date
  const formatVersionDate = (version: number): string => {
    const date = new Date(version)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

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
    // Don't handle normal navigation when exporting, filtering, or in other views
    if (isExporting || isFiltering || view !== 'list') {
      return
    }

    if (input === 'q') {
      exit()
      return
    }

    if (key.escape && filterText) {
      // Clear filter with ESC
      setFilterText('')
      setSelectedIndex(0)
      setScrollOffset(0)
      return
    }

    if (input === 'f' || input === 'F') {
      setIsFiltering(true)
      return
    }

    if (input === 'e' || input === 'E') {
      setIsExporting(true)
      setExportStep('pattern')
      setExportPattern('*')
      return
    }

    if (input === 'n' || input === 'N') {
      setView('new')
      return
    }

    if (!prompts) return

    if (input === 'v' || input === 'V') {
      const selectedPrompt = prompts[selectedIndex]
      if (selectedPrompt) {
        setView('versions')
        fetchVersions(selectedPrompt.id)
      }
      return
    }

    if (input === 'r' || input === 'R') {
      const selectedPrompt = prompts[selectedIndex]
      if (selectedPrompt) {
        setView('rollback')
        fetchVersions(selectedPrompt.id)
      }
      return
    }

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
  }, { isActive: !isExporting && !isFiltering && view === 'list' })

  // Handle pattern submission
  const handlePatternSubmit = () => {
    setExportStep('path')
    setExportPath('./')
  }

  // Handle export cancellation
  const handleExportCancel = () => {
    setIsExporting(false)
    setExportStep('pattern')
    setExportPattern('*')
    setExportPath('./')
  }

  // Handle keyboard input during export
  useInput((input, key) => {
    if (isExporting && (key.escape || (key.ctrl && input === 'b'))) {
      handleExportCancel()
    }
  }, { isActive: isExporting })

  // Handle filter submit
  const handleFilterSubmit = () => {
    setIsFiltering(false)
    setSelectedIndex(0)
    setScrollOffset(0)
  }

  // Handle filter cancel
  const handleFilterCancel = () => {
    setIsFiltering(false)
    setFilterText('')
    setSelectedIndex(0)
    setScrollOffset(0)
  }

  // Handle keyboard input during filtering
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'b')) {
      handleFilterCancel()
    }
  }, { isActive: isFiltering })

  // Fetch versions for a prompt
  const fetchVersions = async (promptId: string) => {
    setVersionsLoading(true)
    setCurrentPromptId(promptId)
    try {
      if (verbose) {
        console.log(`Fetching versions for: ${promptId}`)
      }

      const response = await axios.get(`${url}/prompts/${promptId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'cf-access-token': token
        }
      })

      if (verbose) {
        console.log(`Found ${response.data.length} versions`)
      }

      setVersions(response.data)
      setSelectedVersionIndex(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (verbose) {
        console.error('Error fetching versions:', errorMessage)
      }
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  // Perform rollback to selected version
  const performRollback = async (promptId: string, version: number) => {
    try {
      if (verbose) {
        console.log(`Rolling back ${promptId} to version ${version}`)
      }

      const response = await axios.post(
        `${url}/prompts/${promptId}/versions/${version}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'cf-access-token': token
          }
        }
      )

      if (verbose) {
        console.log(`Rollback successful`)
      }

      setRollbackMessage(`Rolled back ${promptId} to version ${version}`)
      setView('list')

      // Refresh the prompts list
      const listResponse = await axios.get(`${url}/prompts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'cf-access-token': token
        }
      })
      setPrompts(listResponse.data)

      // Clear message after 3 seconds
      setTimeout(() => setRollbackMessage(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setRollbackMessage(`Rollback failed: ${errorMessage}`)

      if (verbose) {
        console.error('Error during rollback:', errorMessage)
      }

      // Clear message after 3 seconds
      setTimeout(() => setRollbackMessage(null), 3000)
    }
  }

  // Handle keyboard input for versions view
  useInput((input, key) => {
    if (input === 'q') {
      exit()
      return
    }

    if (input === 'b' || input === 'B') {
      setView('list')
      return
    }

    if (!versions || versions.length === 0) return

    if (key.upArrow) {
      setSelectedVersionIndex(prev => Math.max(0, prev - 1))
    }

    if (key.downArrow) {
      setSelectedVersionIndex(prev => Math.min(versions.length - 1, prev + 1))
    }

    if (key.return && onSelectPrompt && currentPromptId) {
      const selectedVersion = versions[selectedVersionIndex]
      if (selectedVersion) {
        // Navigate to detail view of the selected version
        onSelectPrompt(currentPromptId)
      }
    }

    if (input === 'r' || input === 'R') {
      setView('rollback')
    }
  }, { isActive: view === 'versions' })

  // Handle keyboard input for rollback view
  useInput((input, key) => {
    if (input === 'q') {
      exit()
      return
    }

    if (input === 'b' || input === 'B') {
      setView('list')
      return
    }

    if (!versions || versions.length === 0 || !currentPromptId) return

    if (key.upArrow) {
      setSelectedVersionIndex(prev => Math.max(0, prev - 1))
    }

    if (key.downArrow) {
      setSelectedVersionIndex(prev => Math.min(versions.length - 1, prev + 1))
    }

    if (key.return) {
      const selectedVersion = versions[selectedVersionIndex]
      if (selectedVersion) {
        performRollback(currentPromptId, selectedVersion.version)
      }
    }
  }, { isActive: view === 'rollback' })

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

  // Handle successful prompt creation
  const handleNewPromptSuccess = async () => {
    setView('list')
    // Refresh the prompts list
    try {
      const response = await axios.get(`${url}/prompts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'cf-access-token': token
        }
      })
      setPrompts(response.data)
    } catch (err) {
      if (verbose) {
        console.error('Error refreshing prompts:', err instanceof Error ? err.message : 'Unknown error')
      }
    }
  }

  // Show new prompt form
  if (view === 'new') {
    return (
      <NewPromptForm
        url={url}
        token={token}
        onBack={() => setView('list')}
        onSuccess={handleNewPromptSuccess}
        verbose={verbose}
      />
    )
  }

  // Show versions view
  if (view === 'versions') {
    if (versionsLoading) {
      return (
        <Box flexDirection="column">
          <Text color="cyan">Loading versions...</Text>
        </Box>
      )
    }

    if (!versions || versions.length === 0) {
      return (
        <Box flexDirection="column">
          <Text color="yellow">No versions found.</Text>
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

    const currentPrompt = prompts?.find(p => p.id === currentPromptId)

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>Versions for {currentPromptId}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="cyan">Found {versions.length} version{versions.length !== 1 ? 's' : ''} (current: v{currentPrompt?.version})</Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          {versions.map((v, index) => {
            const isSelected = index === selectedVersionIndex
            const isCurrent = v.version === currentPrompt?.version
            return (
              <Box key={v.version} backgroundColor={isSelected ? 'blue' : undefined}>
                <Text bold={isSelected} color={isCurrent ? 'green' : 'white'}>
                  {isCurrent ? '→ ' : '  '}v{v.version}
                </Text>
                <Text bold={isSelected} color={isSelected ? 'white' : 'gray'}> - </Text>
                <Text bold={isSelected} color={isSelected ? 'white' : 'gray'}>
                  {formatVersionDate(v.version)}
                </Text>
                {isCurrent && (
                  <Text bold color="green"> (current)</Text>
                )}
              </Box>
            )
          })}
        </Box>
        <Box>
          <Text color="gray" dimColor>Press </Text>
          <Text color="yellow" bold>↑/↓</Text>
          <Text color="gray" dimColor> to select, </Text>
          <Text color="yellow" bold>Enter</Text>
          <Text color="gray" dimColor> to view, </Text>
          <Text color="yellow" bold>r</Text>
          <Text color="gray" dimColor> to rollback, </Text>
          <Text color="yellow" bold>b</Text>
          <Text color="gray" dimColor> to go back, </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="gray" dimColor> to quit</Text>
        </Box>
      </Box>
    )
  }

  // Show rollback view with version selection
  if (view === 'rollback') {
    if (versionsLoading) {
      return (
        <Box flexDirection="column">
          <Text color="cyan">Loading versions...</Text>
        </Box>
      )
    }

    if (!versions || versions.length === 0) {
      return (
        <Box flexDirection="column">
          <Text color="yellow">No versions found.</Text>
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

    const currentPrompt = prompts?.find(p => p.id === currentPromptId)

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>Rollback {currentPromptId}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="cyan">Select version to rollback to (current: v{currentPrompt?.version})</Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          {versions.map((v, index) => {
            const isSelected = index === selectedVersionIndex
            const isCurrent = v.version === currentPrompt?.version
            return (
              <Box key={v.version} backgroundColor={isSelected ? 'blue' : undefined}>
                <Text bold={isSelected} color={isCurrent ? 'green' : 'white'}>
                  {isCurrent ? '→ ' : '  '}v{v.version}
                </Text>
                <Text bold={isSelected} color={isSelected ? 'white' : 'gray'}> - </Text>
                <Text bold={isSelected} color={isSelected ? 'white' : 'gray'}>
                  {formatVersionDate(v.version)}
                </Text>
                {isCurrent && (
                  <Text bold color="green"> (current)</Text>
                )}
              </Box>
            )
          })}
        </Box>
        <Box>
          <Text color="gray" dimColor>Press </Text>
          <Text color="yellow" bold>↑/↓</Text>
          <Text color="gray" dimColor> to select, </Text>
          <Text color="yellow" bold>Enter</Text>
          <Text color="gray" dimColor> to rollback, </Text>
          <Text color="yellow" bold>b</Text>
          <Text color="gray" dimColor> to cancel, </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="gray" dimColor> to quit</Text>
        </Box>
      </Box>
    )
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
            <Text color="yellow" bold>Ctrl+B</Text>
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
            <Text color="yellow" bold>Ctrl+B</Text>
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
        <Box marginTop={1}>
          <Text color="gray" dimColor>Press 'q' to quit</Text>
        </Box>
      </Box>
    )
  }

  if (!prompts || prompts.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No active prompts found.</Text>
        <Box marginTop={1}>
          <Text color="gray" dimColor>Press 'q' to quit</Text>
        </Box>
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

  // Filter prompts based on ID prefix if filtering is active
  const filteredPrompts = filterText
    ? prompts.filter(p => p.id.toLowerCase().startsWith(filterText.toLowerCase()))
    : prompts

  // Get visible prompts based on scroll offset
  const visiblePrompts = filteredPrompts.slice(scrollOffset, scrollOffset + visibleRows)

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

  // Show filter input if filtering
  if (isFiltering) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>Filter by ID prefix</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="cyan">Filter: </Text>
          <TextInput
            value={filterText}
            onChange={setFilterText}
            onSubmit={handleFilterSubmit}
            placeholder="e.g., my-c"
          />
        </Box>
        <Box>
          <Text color="gray" dimColor>Press </Text>
          <Text color="yellow" bold>Enter</Text>
          <Text color="gray" dimColor> to apply filter, </Text>
          <Text color="yellow" bold>ESC</Text>
          <Text color="gray" dimColor> or </Text>
          <Text color="yellow" bold>Ctrl+B</Text>
          <Text color="gray" dimColor> to cancel</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Fixed header section - pinned at top */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="green" bold>
            Active Prompts ({filteredPrompts.length}{filterText ? ` filtered from ${prompts.length}` : ''}) - Use ↑↓ to scroll
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
          <Text color="yellow" bold>f</Text>
          <Text color="cyan" dimColor> to filter, </Text>
          <Text color="yellow" bold>n</Text>
          <Text color="cyan" dimColor> for new, </Text>
          <Text color="yellow" bold>e</Text>
          <Text color="cyan" dimColor> to export, </Text>
          <Text color="yellow" bold>v</Text>
          <Text color="cyan" dimColor> for versions, </Text>
          <Text color="yellow" bold>r</Text>
          <Text color="cyan" dimColor> to rollback, </Text>
          <Text color="yellow" bold>Enter</Text>
          <Text color="cyan" dimColor> for details, </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="cyan" dimColor> to quit</Text>
        </Box>
        {filterText && (
          <Box paddingX={1}>
            <Text color="magenta">Filter active: "{filterText}" - Press </Text>
            <Text color="yellow" bold>f</Text>
            <Text color="magenta"> to change or </Text>
            <Text color="yellow" bold>ESC</Text>
            <Text color="magenta"> to clear</Text>
          </Box>
        )}
        {(exportMessage || rollbackMessage) && (
          <Box paddingX={1}>
            <Text color="green">{exportMessage || rollbackMessage}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
