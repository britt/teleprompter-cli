import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import axios from 'axios'
import { Prompt } from './PromptsList.js'

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
  const { exit } = useApp()

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

  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'q') {
      exit()
      return
    }

    if (input === 'b' || input === 'B') {
      onBack()
      return
    }
  })

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
  const promptLines = prompt.prompt?.split('\n') || []

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
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
      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(80)}</Text>
      </Box>

      {/* Prompt text section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">Prompt:</Text>
        <Box flexDirection="column" marginTop={1} paddingLeft={2}>
          {promptLines.map((line, index) => (
            <Text key={index} color="white">
              {line || ' '}
            </Text>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color="gray">{'─'.repeat(80)}</Text>
        </Box>
        <Box paddingX={1}>
          <Text color="cyan" dimColor>Press </Text>
          <Text color="yellow" bold>b</Text>
          <Text color="cyan" dimColor> to go back or </Text>
          <Text color="yellow" bold>q</Text>
          <Text color="cyan" dimColor> to quit</Text>
        </Box>
      </Box>
    </Box>
  )
}
