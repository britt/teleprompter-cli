import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { getProviderApiKey } from "./config.js"

export type ProviderName = "anthropic" | "openai" | "google" | "cerebras" | "grok"

export const PROVIDER_NAMES: ProviderName[] = [
  "anthropic",
  "openai",
  "google",
  "cerebras",
  "grok"
]

const PROVIDER_BASE_URLS: Partial<Record<ProviderName, string>> = {
  cerebras: "https://api.cerebras.ai/v1",
  grok: "https://api.x.ai/v1"
}

export async function getConfiguredProviders(): Promise<ProviderName[]> {
  const configured: ProviderName[] = []

  for (const name of PROVIDER_NAMES) {
    const key = await getProviderApiKey(name)
    if (key) {
      configured.push(name)
    }
  }

  return configured
}

export async function createProvider(name: ProviderName) {
  const apiKey = await getProviderApiKey(name)
  if (!apiKey) {
    throw new Error(`No API key configured for ${name}`)
  }

  switch (name) {
    case "anthropic":
      return createAnthropic({ apiKey })

    case "openai":
      return createOpenAI({ apiKey })

    case "google":
      return createGoogleGenerativeAI({ apiKey })

    case "cerebras":
      return createOpenAICompatible({
        name: "cerebras",
        baseURL: PROVIDER_BASE_URLS.cerebras!,
        headers: { Authorization: `Bearer ${apiKey}` }
      })

    case "grok":
      return createOpenAICompatible({
        name: "grok",
        baseURL: PROVIDER_BASE_URLS.grok!,
        headers: { Authorization: `Bearer ${apiKey}` }
      })

    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

export interface ModelInfo {
  id: string
  provider: ProviderName
  displayName: string
}

interface OpenAIModel {
  id: string
  object: string
  owned_by?: string
}

interface AnthropicModel {
  id: string
  type: string
  display_name?: string
}

interface GoogleModel {
  name: string
  displayName?: string
  supportedGenerationMethods?: string[]
}

// Filter for chat/text generation models only
function isTextGenerationModel(modelId: string, provider: ProviderName): boolean {
  const id = modelId.toLowerCase()

  // Exclude embedding, whisper, tts, dall-e, moderation models
  const excludePatterns = [
    "embedding", "whisper", "tts", "dall-e", "moderation",
    "davinci", "babbage", "ada", "curie", // old completion models
    "instruct" // prefer chat models
  ]

  if (excludePatterns.some(p => id.includes(p))) {
    return false
  }

  switch (provider) {
    case "openai":
      // Include gpt, o1, o3 models
      return id.includes("gpt") || id.startsWith("o1") || id.startsWith("o3")

    case "anthropic":
      // Include claude models
      return id.includes("claude")

    case "google":
      // Include gemini models
      return id.includes("gemini")

    case "cerebras":
    case "grok":
      // Include most models from these providers
      return true

    default:
      return true
  }
}

export async function fetchModels(provider: ProviderName): Promise<ModelInfo[]> {
  const apiKey = await getProviderApiKey(provider)
  if (!apiKey) {
    return []
  }

  try {
    switch (provider) {
      case "openai": {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)
        const data = await response.json() as { data: OpenAIModel[] }
        return data.data
          .filter(m => isTextGenerationModel(m.id, "openai"))
          .map(m => ({
            id: m.id,
            provider: "openai" as ProviderName,
            displayName: `openai/${m.id}`
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      }

      case "anthropic": {
        const response = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          }
        })
        if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)
        const data = await response.json() as { data: AnthropicModel[] }
        return data.data
          .filter(m => isTextGenerationModel(m.id, "anthropic"))
          .map(m => ({
            id: m.id,
            provider: "anthropic" as ProviderName,
            displayName: `anthropic/${m.id}`
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      }

      case "google": {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        )
        if (!response.ok) throw new Error(`Google API error: ${response.status}`)
        const data = await response.json() as { models: GoogleModel[] }
        return data.models
          .filter(m => {
            const id = m.name.replace("models/", "")
            return isTextGenerationModel(id, "google") &&
              m.supportedGenerationMethods?.includes("generateContent")
          })
          .map(m => {
            const id = m.name.replace("models/", "")
            return {
              id,
              provider: "google" as ProviderName,
              displayName: `google/${id}`
            }
          })
          .sort((a, b) => a.id.localeCompare(b.id))
      }

      case "cerebras": {
        const response = await fetch(`${PROVIDER_BASE_URLS.cerebras}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        if (!response.ok) throw new Error(`Cerebras API error: ${response.status}`)
        const data = await response.json() as { data: OpenAIModel[] }
        return data.data
          .filter(m => isTextGenerationModel(m.id, "cerebras"))
          .map(m => ({
            id: m.id,
            provider: "cerebras" as ProviderName,
            displayName: `cerebras/${m.id}`
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      }

      case "grok": {
        const response = await fetch(`${PROVIDER_BASE_URLS.grok}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        if (!response.ok) throw new Error(`Grok API error: ${response.status}`)
        const data = await response.json() as { data: OpenAIModel[] }
        return data.data
          .filter(m => isTextGenerationModel(m.id, "grok"))
          .map(m => ({
            id: m.id,
            provider: "grok" as ProviderName,
            displayName: `grok/${m.id}`
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      }

      default:
        return []
    }
  } catch (error) {
    console.error(`Failed to fetch models from ${provider}:`, error)
    return []
  }
}

export async function fetchAllModels(): Promise<ModelInfo[]> {
  const providers = await getConfiguredProviders()
  const modelPromises = providers.map(p => fetchModels(p))
  const results = await Promise.all(modelPromises)
  return results.flat()
}
