import React, { useState, useEffect } from "react"
import { Box, Text, useStdout } from "ink"

interface ResponsePanelProps {
  modelName: string
  content: string
  isStreaming: boolean
  width?: number
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  modelName,
  content,
  isStreaming,
  width
}) => {
  const { stdout } = useStdout()
  const terminalWidth = width || stdout?.columns || 80
  const [scrollOffset, setScrollOffset] = useState(0)

  const lines = content.split("\n")
  const maxVisibleLines = 20

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && lines.length > maxVisibleLines) {
      setScrollOffset(lines.length - maxVisibleLines)
    }
  }, [lines.length, isStreaming, maxVisibleLines])

  const visibleLines = lines.slice(scrollOffset, scrollOffset + maxVisibleLines)
  const header = `── Response (${modelName}) `
  const headerLine = header + "─".repeat(Math.max(0, terminalWidth - header.length))

  return (
    <Box flexDirection="column" width={width}>
      <Text dimColor>{headerLine}</Text>
      <Box flexDirection="column" marginTop={1}>
        {visibleLines.map((line, i) => (
          <Text key={i} wrap="wrap">
            {line}
          </Text>
        ))}
        {isStreaming && <Text color="cyan">█</Text>}
      </Box>
      {lines.length > maxVisibleLines && (
        <Text dimColor>
          Lines {scrollOffset + 1}-{Math.min(scrollOffset + maxVisibleLines, lines.length)} of{" "}
          {lines.length}
        </Text>
      )}
    </Box>
  )
}
