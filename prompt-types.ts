export interface PromptMetadata {
  model?: string
  config?: Record<string, unknown>
  input?: {
    default?: Record<string, unknown>
    schema?: Record<string, unknown>
  }
  output?: {
    format?: string
    schema?: Record<string, unknown>
  }
  tools?: string[]
  description?: string
  ext?: Record<string, Record<string, unknown>>
}

export interface Prompt {
  id: string
  namespace: string
  version: number
  prompt?: string
  created_at?: string
  metadata?: PromptMetadata
}
