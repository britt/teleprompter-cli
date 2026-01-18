import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useInput, useStdout, useApp } from "ink"
import { streamText } from "ai"
import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { Prompt } from "./PromptsList.js"
import { VariableForm } from "./VariableForm.js"
import { ModelSelector } from "./ModelSelector.js"
import { ResponsePanel } from "./ResponsePanel.js"
import { ComparisonView } from "./ComparisonView.js"
import { TestHistory } from "./TestHistory.js"
import { extractVariables, compileTemplate, VariableInfo } from "../template-parser.js"
import {
  createProvider,
  fetchAllModels,
  ModelInfo
} from "../providers.js"
import { saveRun, loadHistory, deleteRun, TestRun } from "../history.js"

type View = "form" | "modelSelect" | "running" | "result" | "history" | "historyDetail"

interface ResponseData {
  modelName: string
  content: string
  isStreaming: boolean
}

interface PromptTestRunnerProps {
  prompt: Prompt
  url: string
  onBack: () => void
}

// Cross-platform clipboard copy
function copyToClipboard(text: string): boolean {
  try {
    const platform = process.platform
    if (platform === "darwin") {
      execSync("pbcopy", { input: text })
    } else if (platform === "linux") {
      // Try xclip first, then xsel
      try {
        execSync("xclip -selection clipboard", { input: text })
      } catch {
        execSync("xsel --clipboard --input", { input: text })
      }
    } else if (platform === "win32") {
      execSync("clip", { input: text })
    } else {
      return false
    }
    return true
  } catch {
    return false
  }
}

export const PromptTestRunner: React.FC<PromptTestRunnerProps> = ({
  prompt,
  url,
  onBack
}) => {
  const { stdout } = useStdout()
  const { exit } = useApp()
  const terminalWidth = stdout?.columns || 80

  // State
  const [view, setView] = useState<View>("form")
  const [variables, setVariables] = useState<VariableInfo[]>([])
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({})
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<TestRun[]>([])
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<TestRun | null>(null)
  const [isEditingVariables, setIsEditingVariables] = useState(false)

  // Extract variables from template
  useEffect(() => {
    if (prompt.prompt) {
      const vars = extractVariables(prompt.prompt)
      setVariables(vars)
    }
  }, [prompt.prompt])

  // Load models from configured providers
  useEffect(() => {
    async function loadModels() {
      setModelsLoading(true)
      try {
        const allModels = await fetchAllModels()
        setModels(allModels)
        if (allModels.length > 0 && !selectedModel) {
          // Group by provider and reverse to match ModelSelector display order
          const groups = new Map<string, ModelInfo[]>()
          for (const model of allModels) {
            const existing = groups.get(model.provider) || []
            groups.set(model.provider, [...existing, model])
          }
          // Get first provider's models reversed (newest first)
          const firstProvider = groups.keys().next().value
          if (firstProvider) {
            const providerModels = groups.get(firstProvider) || []
            const reversed = [...providerModels].reverse()
            if (reversed.length > 0) {
              setSelectedModel(reversed[0])
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models")
      } finally {
        setModelsLoading(false)
      }
    }

    loadModels()
  }, [])

  // Load history
  useEffect(() => {
    loadHistory(prompt.id).then(setHistory)
  }, [prompt.id])

  const runTest = useCallback(async () => {
    if (!selectedModel || !prompt.prompt) return

    setView("running")
    setError(null)
    setStatusMessage(null)
    setResponses([{ modelName: selectedModel.id, content: "", isStreaming: true }])

    try {
      const compiledPrompt = compileTemplate(prompt.prompt, variableValues)
      const provider = await createProvider(selectedModel.provider)
      const model = provider(selectedModel.id)

      const result = streamText({
        model,
        prompt: compiledPrompt
      })

      let fullContent = ""

      for await (const chunk of result.textStream) {
        fullContent += chunk
        setResponses([{ modelName: selectedModel.id, content: fullContent, isStreaming: true }])
      }

      setResponses([{ modelName: selectedModel.id, content: fullContent, isStreaming: false }])
      setView("result")

      // Save to history
      await saveRun({
        promptId: prompt.id,
        promptVersion: prompt.version,
        model: selectedModel.displayName,
        variables: variableValues,
        output: fullContent
      })

      // Reload history
      const updatedHistory = await loadHistory(prompt.id)
      setHistory(updatedHistory)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run test")
      setView("form")
    }
  }, [selectedModel, prompt, variableValues])

  const handleCopyToClipboard = useCallback(() => {
    if (responses.length > 0) {
      const content = responses.map(r => r.content).join("\n\n---\n\n")
      const success = copyToClipboard(content)
      setStatusMessage(success ? "Copied to clipboard!" : "Failed to copy to clipboard")
      setTimeout(() => setStatusMessage(null), 2000)
    }
  }, [responses])

  const handleSaveToFile = useCallback(() => {
    if (responses.length > 0) {
      const content = responses.map(r => r.content).join("\n\n---\n\n")
      const filename = `test-${prompt.id}-${Date.now()}.txt`
      try {
        writeFileSync(filename, content)
        setStatusMessage(`Saved to ${filename}`)
      } catch {
        setStatusMessage("Failed to save file")
      }
      setTimeout(() => setStatusMessage(null), 2000)
    }
  }, [responses, prompt.id])

  useInput((input, key) => {
    if (view === "history") return // TestHistory handles its own input
    if (view === "historyDetail") {
      if (key.escape) {
        setSelectedHistoryRun(null)
        setView("history")
      }
      return
    }
    if (view === "modelSelect") {
      // Only handle escape here, ModelSelector handles arrow keys and enter
      if (key.escape) {
        setView("form")
      }
      return
    }

    // When editing variables, only Escape exits edit mode
    if (isEditingVariables) {
      if (key.escape) {
        setIsEditingVariables(false)
      }
      return
    }

    if (key.escape || input === "b" || input === "B") {
      if (view === "running" || view === "result") {
        setView("form")
        setResponses([])
      } else {
        onBack()
      }
      return
    }

    if (input === "q" || input === "Q") {
      exit()
      return
    }

    if (view === "form") {
      if (key.tab || key.return) {
        // Enter edit mode for variables
        if (variables.length > 0) {
          setIsEditingVariables(true)
        }
      } else if (input === "r" || input === "R") {
        runTest()
      } else if (input === "m" || input === "M") {
        setView("modelSelect")
      } else if (input === "h" || input === "H") {
        setView("history")
      }
    } else if (view === "result") {
      if (input === "c" || input === "C") {
        handleCopyToClipboard()
      } else if (input === "s" || input === "S") {
        handleSaveToFile()
      } else if (input === "r" || input === "R") {
        runTest()
      }
    }
  })

  // Render header
  const header = `── Test: ${prompt.id} `
  const headerLine = header + "─".repeat(Math.max(0, terminalWidth - header.length))

  // History view
  if (view === "history") {
    return (
      <TestHistory
        runs={history}
        promptId={prompt.id}
        onSelect={(run) => {
          setSelectedHistoryRun(run)
          setView("historyDetail")
        }}
        onRerun={(run) => {
          setVariableValues(run.variables as Record<string, unknown>)
          setView("form")
        }}
        onDelete={async (run) => {
          await deleteRun(run.id)
          const updated = await loadHistory(prompt.id)
          setHistory(updated)
        }}
        onBack={() => setView("form")}
      />
    )
  }

  // History detail view
  if (view === "historyDetail" && selectedHistoryRun) {
    return (
      <Box flexDirection="column">
        <Text dimColor>{headerLine}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text bold>Run Details</Text>
          <Text>Model: {selectedHistoryRun.model}</Text>
          <Text>Date: {new Date(selectedHistoryRun.timestamp).toLocaleString()}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Output:</Text>
            <Text>{selectedHistoryRun.output}</Text>
          </Box>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color="gray">{"─".repeat(terminalWidth)}</Text>
          </Box>
          <Box paddingX={1}>
            <Text color="cyan" dimColor>Press </Text>
            <Text color="yellow" bold>Esc</Text>
            <Text color="cyan" dimColor> back to history</Text>
          </Box>
        </Box>
      </Box>
    )
  }

  // Calculate column widths
  const leftColumnWidth = Math.floor(terminalWidth * 0.6)
  const rightColumnWidth = terminalWidth - leftColumnWidth - 3 // 3 for separator

  // Calculate available height for content
  // Reserve: header(1) + error(2) + status(2) + separator(1) + footer separator(1) + footer model(1) + footer controls(1)
  const terminalHeight = stdout?.rows || 24
  const contentHeight = Math.max(5, terminalHeight - 8)

  // Split template into lines for display (handle escaped characters)
  const templateText = (prompt.prompt || '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
  const templateLines = templateText.split('\n')

  return (
    <Box flexDirection="column">
      <Text dimColor>{headerLine}</Text>

      {error && (
        <Box marginY={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {statusMessage && (
        <Box marginY={1}>
          <Text color="green">{statusMessage}</Text>
        </Box>
      )}

      {/* Model selector overlay */}
      {view === "modelSelect" && (
        <Box marginTop={1} flexDirection="column">
          <ModelSelector
            models={models}
            loading={modelsLoading}
            selectedModel={selectedModel}
            onSelect={(model) => {
              setSelectedModel(model)
              setView("form")
            }}
            focused={true}
          />
        </Box>
      )}

      {/* Main content area - two column layout */}
      {view === "form" && (
        <Box marginTop={1} flexDirection="row" height={contentHeight}>
          {/* Left column: Template */}
          <Box flexDirection="column" width={leftColumnWidth}>
            <Text bold color="cyan">Template</Text>
            <Box marginTop={1} flexDirection="column">
              {templateLines.map((line, index) => (
                <Text key={index} wrap="wrap">{line || ' '}</Text>
              ))}
            </Box>
          </Box>

          {/* Separator - full height vertical line */}
          <Box flexDirection="column" paddingX={1}>
            {Array.from({ length: contentHeight }).map((_, i) => (
              <Text key={i} color="gray">│</Text>
            ))}
          </Box>

          {/* Right column: Variables */}
          <Box flexDirection="column" width={rightColumnWidth}>
            <VariableForm
              variables={variables}
              values={variableValues}
              onChange={setVariableValues}
              focused={isEditingVariables}
              width={rightColumnWidth}
            />
          </Box>
        </Box>
      )}

      {/* Response area */}
      {(view === "running" || view === "result") && (
        <Box marginTop={1}>
          {responses.length === 1 ? (
            <ResponsePanel {...responses[0]} />
          ) : (
            <ComparisonView panels={responses} />
          )}
        </Box>
      )}

      {/* Footer separator and controls */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color="gray">{"─".repeat(terminalWidth)}</Text>
        </Box>
        {/* Model info line */}
        {view !== "modelSelect" && (
          <Box paddingX={1}>
            <Text color="cyan" dimColor>Model: </Text>
            <Text bold color="yellow">{selectedModel?.displayName || (modelsLoading ? "Loading..." : "None")}</Text>
          </Box>
        )}
        <Box paddingX={1}>
          {view === "form" && !isEditingVariables && (
            <>
              <Text color="cyan" dimColor>Press </Text>
              <Text color="yellow" bold>Tab</Text>
              <Text color="cyan" dimColor> edit vars </Text>
              <Text color="yellow" bold>r</Text>
              <Text color="cyan" dimColor> run </Text>
              <Text color="yellow" bold>m</Text>
              <Text color="cyan" dimColor> model </Text>
              <Text color="yellow" bold>h</Text>
              <Text color="cyan" dimColor> history </Text>
              <Text color="yellow" bold>b</Text>
              <Text color="cyan" dimColor> back </Text>
              <Text color="yellow" bold>q</Text>
              <Text color="cyan" dimColor> quit</Text>
            </>
          )}
          {view === "form" && isEditingVariables && (
            <>
              <Text color="green" bold>Editing variables </Text>
              <Text color="cyan" dimColor>Press </Text>
              <Text color="yellow" bold>↑/↓</Text>
              <Text color="cyan" dimColor> navigate </Text>
              <Text color="yellow" bold>Esc</Text>
              <Text color="cyan" dimColor> done</Text>
            </>
          )}
          {view === "modelSelect" && (
            <>
              <Text color="cyan" dimColor>Press </Text>
              <Text color="yellow" bold>↑/↓</Text>
              <Text color="cyan" dimColor> navigate </Text>
              <Text color="yellow" bold>Enter</Text>
              <Text color="cyan" dimColor> select </Text>
              <Text color="yellow" bold>Esc</Text>
              <Text color="cyan" dimColor> cancel</Text>
            </>
          )}
          {view === "running" && (
            <>
              <Text color="cyan" dimColor>Running... </Text>
              <Text color="yellow" bold>Esc</Text>
              <Text color="cyan" dimColor> cancel</Text>
            </>
          )}
          {view === "result" && (
            <>
              <Text color="cyan" dimColor>Press </Text>
              <Text color="yellow" bold>r</Text>
              <Text color="cyan" dimColor> run again </Text>
              <Text color="yellow" bold>c</Text>
              <Text color="cyan" dimColor> copy </Text>
              <Text color="yellow" bold>s</Text>
              <Text color="cyan" dimColor> save </Text>
              <Text color="yellow" bold>b</Text>
              <Text color="cyan" dimColor> back </Text>
              <Text color="yellow" bold>q</Text>
              <Text color="cyan" dimColor> quit</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
