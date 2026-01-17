import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import { VariableInfo } from "../template-parser.js"

interface VariableFormProps {
  variables: VariableInfo[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  focused: boolean
  maxHeight?: number
}

export const VariableForm: React.FC<VariableFormProps> = ({
  variables,
  values,
  onChange,
  focused,
  maxHeight = 15
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)

  useInput(
    (input, key) => {
      if (!focused) return

      if (key.upArrow) {
        const newIndex = Math.max(0, focusedIndex - 1)
        setFocusedIndex(newIndex)
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex)
        }
      } else if (key.downArrow) {
        const newIndex = Math.min(variables.length - 1, focusedIndex + 1)
        setFocusedIndex(newIndex)
        if (newIndex >= scrollOffset + maxHeight) {
          setScrollOffset(newIndex - maxHeight + 1)
        }
      } else if (input === " " && variables[focusedIndex]?.type === "boolean") {
        const varName = variables[focusedIndex].name
        const newValues = { ...values, [varName]: !values[varName] }
        onChange(newValues)
      }
    },
    { isActive: focused }
  )

  if (variables.length === 0) {
    return (
      <Box>
        <Text dimColor>No variables in this template</Text>
      </Box>
    )
  }

  const visibleVars = variables.slice(scrollOffset, scrollOffset + maxHeight)

  return (
    <Box flexDirection="column">
      <Text bold>Variables</Text>
      <Box marginTop={1} flexDirection="column">
        {visibleVars.map((variable, i) => {
          const actualIndex = scrollOffset + i
          const isFocused = focused && actualIndex === focusedIndex
          const value = values[variable.name]

          return (
            <Box key={variable.name} marginBottom={1}>
              <Box width={20}>
                <Text color={isFocused ? "cyan" : undefined}>
                  {isFocused ? "> " : "  "}
                  {variable.name}:
                </Text>
              </Box>
              <Box flexGrow={1}>
                {variable.type === "boolean" ? (
                  <Text>
                    [{value ? "x" : " "}] <Text dimColor>(space to toggle)</Text>
                  </Text>
                ) : variable.type === "array" ? (
                  <Box flexDirection="column">
                    <TextInput
                      value={Array.isArray(value) ? value.join(", ") : String(value || "")}
                      onChange={(newValue) => {
                        const items = newValue.split(",").map(s => s.trim()).filter(Boolean)
                        onChange({ ...values, [variable.name]: items })
                      }}
                      focus={isFocused}
                      placeholder="item1, item2, ..."
                    />
                    <Text dimColor>(comma-separated)</Text>
                  </Box>
                ) : (
                  <TextInput
                    value={String(value || "")}
                    onChange={(newValue) => {
                      onChange({ ...values, [variable.name]: newValue })
                    }}
                    focus={isFocused}
                    placeholder={`Enter ${variable.name}`}
                  />
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
      {variables.length > maxHeight && (
        <Text dimColor>
          Showing {scrollOffset + 1}-{Math.min(scrollOffset + maxHeight, variables.length)} of{" "}
          {variables.length}
        </Text>
      )}
    </Box>
  )
}
