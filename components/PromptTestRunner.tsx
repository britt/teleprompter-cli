import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useInput, useStdout } from "ink"
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
type FocusArea = "variables" | "model"

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
  const terminalWidth = stdout?.columns || 80

  // State
  const [view, setView] = useState<View>("form")
  const [focusArea, setFocusArea] = useState<FocusArea>("variables")
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
          setSelectedModel(allModels[0])
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

    if (key.escape) {
      if (view === "running" || view === "result") {
        setView("form")
        setResponses([])
      } else if (view === "modelSelect") {
        setView("form")
      } else {
        onBack()
      }
      return
    }

    if (view === "form") {
      if (input === "r" || input === "R") {
        runTest()
      } else if (input === "m" || input === "M") {
        setView("modelSelect")
      } else if (input === "h" || input === "H") {
        setView("history")
      } else if (key.tab) {
        setFocusArea(focusArea === "variables" ? "model" : "variables")
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
        <Box marginTop={1}>
          <Text dimColor>[Esc] Back to history</Text>
        </Box>
      </Box>
    )
  }

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

      {/* Template preview */}
      <Box marginTop={1} flexDirection="column">
        <Text bold>Template</Text>
        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text>{prompt.prompt?.slice(0, 200)}{(prompt.prompt?.length || 0) > 200 ? "..." : ""}</Text>
        </Box>
      </Box>

      {/* Main content area */}
      {(view === "form" || view === "modelSelect") && (
        <Box marginTop={1} flexDirection="row">
          {/* Left side: Variables */}
          <Box flexDirection="column" width="50%">
            <VariableForm
              variables={variables}
              values={variableValues}
              onChange={setVariableValues}
              focused={view === "form" && focusArea === "variables"}
            />
          </Box>

          {/* Right side: Model selector */}
          <Box flexDirection="column" width="50%" paddingLeft={2}>
            <ModelSelector
              models={models}
              loading={modelsLoading}
              selectedModel={selectedModel}
              onSelect={(model) => {
                setSelectedModel(model)
                setView("form")
              }}
              focused={view === "modelSelect"}
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

      {/* Footer with controls */}
      <Box marginTop={1}>
        {view === "form" && (
          <Text dimColor>
            [r] Run  [m] Select model  [h] History  [Tab] Switch focus  [Esc] Back
          </Text>
        )}
        {view === "modelSelect" && (
          <Text dimColor>[Enter] Select  [Esc] Cancel</Text>
        )}
        {view === "running" && (
          <Text dimColor>Running... [Esc] Cancel</Text>
        )}
        {view === "result" && (
          <Text dimColor>[r] Run again  [c] Copy  [s] Save  [Esc] Back to form</Text>
        )}
      </Box>
    </Box>
  )
}
