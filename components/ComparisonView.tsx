import React from "react"
import { Box, useStdout } from "ink"
import { ResponsePanel } from "./ResponsePanel.js"

interface PanelData {
  modelName: string
  content: string
  isStreaming: boolean
}

interface ComparisonViewProps {
  panels: PanelData[]
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ panels }) => {
  const { stdout } = useStdout()
  const terminalWidth = stdout?.columns || 80

  if (panels.length === 0) {
    return null
  }

  if (panels.length === 1) {
    return <ResponsePanel {...panels[0]} />
  }

  if (panels.length === 2) {
    // Side-by-side layout
    const panelWidth = Math.floor((terminalWidth - 1) / 2) // -1 for separator space

    return (
      <Box flexDirection="row">
        <Box width={panelWidth}>
          <ResponsePanel {...panels[0]} width={panelWidth} />
        </Box>
        <Box width={panelWidth}>
          <ResponsePanel {...panels[1]} width={panelWidth} />
        </Box>
      </Box>
    )
  }

  // More than 2 panels: stack vertically
  return (
    <Box flexDirection="column">
      {panels.map((panel, i) => (
        <Box key={i} marginBottom={1}>
          <ResponsePanel {...panel} />
        </Box>
      ))}
    </Box>
  )
}
