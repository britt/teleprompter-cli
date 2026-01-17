import React, { useState, useMemo } from "react"
import { Box, Text, useInput } from "ink"
import { ModelInfo, ProviderName } from "../providers.js"

interface ModelSelectorProps {
  models: ModelInfo[]
  loading: boolean
  selectedModel: ModelInfo | null
  onSelect: (model: ModelInfo) => void
  focused: boolean
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  loading,
  selectedModel,
  onSelect,
  focused
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const groupedModels = useMemo(() => {
    const groups = new Map<ProviderName, ModelInfo[]>()
    for (const model of models) {
      const existing = groups.get(model.provider) || []
      groups.set(model.provider, [...existing, model])
    }
    return groups
  }, [models])

  const flatModels = useMemo(() => {
    const flat: ModelInfo[] = []
    for (const [, providerModels] of groupedModels) {
      flat.push(...providerModels)
    }
    return flat
  }, [groupedModels])

  useInput(
    (input, key) => {
      if (!focused || loading) return

      if (key.upArrow) {
        setFocusedIndex(Math.max(0, focusedIndex - 1))
      } else if (key.downArrow) {
        setFocusedIndex(Math.min(flatModels.length - 1, focusedIndex + 1))
      } else if (key.return) {
        if (flatModels[focusedIndex]) {
          onSelect(flatModels[focusedIndex])
        }
      }
    },
    { isActive: focused }
  )

  if (loading) {
    return (
      <Box>
        <Text>Loading models...</Text>
      </Box>
    )
  }

  if (models.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>Model</Text>
        <Box marginTop={1}>
          <Text color="yellow">No models available. Configure API keys in ~/.teleprompter/config.json</Text>
        </Box>
      </Box>
    )
  }

  let currentIndex = 0

  return (
    <Box flexDirection="column">
      <Text bold>Model</Text>
      <Box marginTop={1} flexDirection="column">
        {Array.from(groupedModels.entries()).map(([provider, providerModels]) => (
          <Box key={provider} flexDirection="column" marginBottom={1}>
            <Text dimColor>{provider}</Text>
            {providerModels.map((model) => {
              const thisIndex = currentIndex++
              const isFocused = focused && thisIndex === focusedIndex
              const isSelected = selectedModel?.displayName === model.displayName

              return (
                <Box key={model.id} paddingLeft={2}>
                  <Text
                    color={isFocused ? "cyan" : isSelected ? "green" : undefined}
                    bold={isSelected}
                  >
                    {isFocused ? "> " : "  "}
                    {model.id}
                    {isSelected ? " (selected)" : ""}
                  </Text>
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
      <Text dimColor>Press Enter to select</Text>
    </Box>
  )
}
