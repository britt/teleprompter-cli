import React, { useState } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import axios from 'axios'

interface NewPromptFormProps {
  url: string
  token: string
  onBack: () => void
  onSuccess: () => void
  verbose?: boolean
}

type FormField = 'id' | 'namespace' | 'prompt'

export const NewPromptForm: React.FC<NewPromptFormProps> = ({
  url,
  token,
  onBack,
  onSuccess,
  verbose = false
}) => {
  const [currentField, setCurrentField] = useState<FormField>('id')
  const [id, setId] = useState('')
  const [namespace, setNamespace] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { exit } = useApp()

  // Handle keyboard input
  useInput((input, key) => {
    if (isSubmitting) return

    if (key.ctrl && input === 'b') {
      onBack()
      return
    }

    if (input === 'q') {
      exit()
      return
    }
  }, { isActive: !isSubmitting })

  // Handle field submission
  const handleIdSubmit = () => {
    if (!id.trim()) {
      setErrorMessage('ID is required')
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }
    setCurrentField('namespace')
  }

  const handleNamespaceSubmit = () => {
    if (!namespace.trim()) {
      setErrorMessage('Namespace is required')
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }
    setCurrentField('prompt')
  }

  const handlePromptSubmit = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Prompt text is required')
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }

    setIsSubmitting(true)

    try {
      if (verbose) {
        console.log(`Creating prompt: ${id}`)
      }

      const payload = {
        id: id.trim(),
        namespace: namespace.trim(),
        prompt: prompt.trim()
      }

      if (verbose) {
        console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`)
      }

      const response = await axios.post(`${url}/prompts`, JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'cf-access-token': token
        }
      })

      if (verbose) {
        console.log(`Response status: ${response.status}`)
      }

      // Success - go back to list
      onSuccess()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(`Failed to create prompt: ${errorMsg}`)
      setIsSubmitting(false)

      if (verbose) {
        console.error('Error creating prompt:', errorMsg)
      }

      // Clear error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  if (isSubmitting) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Creating prompt...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="green" bold>Create New Prompt</Text>
      </Box>

      {/* ID Field */}
      <Box marginBottom={1}>
        <Text color={currentField === 'id' ? 'cyan' : 'gray'} bold={currentField === 'id'}>
          ID: {currentField !== 'id' && id}
        </Text>
      </Box>
      {currentField === 'id' && (
        <Box marginBottom={1}>
          <TextInput
            value={id}
            onChange={setId}
            onSubmit={handleIdSubmit}
            placeholder="e.g., my-prompt-id"
          />
        </Box>
      )}

      {/* Namespace Field */}
      {(currentField === 'namespace' || currentField === 'prompt') && (
        <>
          <Box marginBottom={1}>
            <Text color={currentField === 'namespace' ? 'cyan' : 'gray'} bold={currentField === 'namespace'}>
              Namespace: {currentField !== 'namespace' && namespace}
            </Text>
          </Box>
          {currentField === 'namespace' && (
            <Box marginBottom={1}>
              <TextInput
                value={namespace}
                onChange={setNamespace}
                onSubmit={handleNamespaceSubmit}
                placeholder="e.g., my-namespace"
              />
            </Box>
          )}
        </>
      )}

      {/* Prompt Field */}
      {currentField === 'prompt' && (
        <>
          <Box marginBottom={1}>
            <Text color="cyan" bold>Prompt Text:</Text>
          </Box>
          <Box marginBottom={1}>
            <TextInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handlePromptSubmit}
              placeholder="Enter your prompt text..."
            />
          </Box>
        </>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Box marginTop={1}>
          <Text color="red">{errorMessage}</Text>
        </Box>
      )}

      {/* Instructions */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>Press </Text>
        <Text color="yellow" bold>Enter</Text>
        <Text color="gray" dimColor> to continue, </Text>
        <Text color="yellow" bold>Ctrl+B</Text>
        <Text color="gray" dimColor> to cancel, </Text>
        <Text color="yellow" bold>q</Text>
        <Text color="gray" dimColor> to quit</Text>
      </Box>
    </Box>
  )
}
