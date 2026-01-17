import React, { useState } from "react"
import { Box, Text, useInput, useStdout } from "ink"
import { TestRun } from "../history.js"

interface TestHistoryProps {
  runs: TestRun[]
  promptId: string
  onSelect: (run: TestRun) => void
  onRerun: (run: TestRun) => void
  onDelete: (run: TestRun) => void
  onBack: () => void
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
}

export const TestHistory: React.FC<TestHistoryProps> = ({
  runs,
  promptId,
  onSelect,
  onRerun,
  onDelete,
  onBack
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { stdout } = useStdout()
  const terminalWidth = stdout?.columns || 80

  useInput((input, key) => {
    if (key.escape) {
      onBack()
      return
    }

    if (runs.length === 0) return

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1))
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(runs.length - 1, selectedIndex + 1))
    } else if (key.return) {
      onSelect(runs[selectedIndex])
    } else if (input === "r" || input === "R") {
      onRerun(runs[selectedIndex])
    } else if (input === "d" || input === "D") {
      onDelete(runs[selectedIndex])
    }
  })

  const header = `── Test History (${promptId}) `
  const headerLine = header + "─".repeat(Math.max(0, terminalWidth - header.length))

  if (runs.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>{headerLine}</Text>
        <Box marginTop={1}>
          <Text dimColor>No test history for this prompt</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>[Esc] Back</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{headerLine}</Text>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width={2} />
          <Box width={25}>
            <Text bold>Model</Text>
          </Box>
          <Box width={20}>
            <Text bold>Date/Time</Text>
          </Box>
          <Box>
            <Text bold>Length</Text>
          </Box>
        </Box>
        {runs.map((run, i) => {
          const isSelected = i === selectedIndex
          const modelName = run.model.split("/")[1] || run.model

          return (
            <Box key={run.id}>
              <Text color={isSelected ? "cyan" : undefined}>
                {isSelected ? "> " : "  "}
              </Text>
              <Box width={25}>
                <Text color={isSelected ? "cyan" : undefined}>{modelName}</Text>
              </Box>
              <Box width={20}>
                <Text color={isSelected ? "cyan" : undefined}>
                  {formatDate(run.timestamp)}
                </Text>
              </Box>
              <Box>
                <Text color={isSelected ? "cyan" : undefined}>
                  {run.output.length} chars
                </Text>
              </Box>
            </Box>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Enter] View  [r] Re-run  [d] Delete  [Esc] Back</Text>
      </Box>
    </Box>
  )
}
