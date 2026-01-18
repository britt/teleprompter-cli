import { promises as fs } from "fs"
import * as path from "path"
import * as os from "os"

export interface ProviderConfig {
  apiKey: string
}

export interface Config {
  providers: {
    anthropic?: ProviderConfig
    openai?: ProviderConfig
    google?: ProviderConfig
    cerebras?: ProviderConfig
    grok?: ProviderConfig
  }
  defaultModel?: string
}

const CONFIG_DIR = path.join(os.homedir(), ".teleprompter")
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json")

const ENV_VARS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  grok: "GROK_API_KEY"
}

export async function loadConfig(): Promise<Config> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8")
    return JSON.parse(content)
  } catch {
    return { providers: {} }
  }
}

export async function getProviderApiKey(
  provider: keyof Config["providers"]
): Promise<string | undefined> {
  const envVar = ENV_VARS[provider]
  if (envVar && process.env[envVar]) {
    return process.env[envVar]
  }

  const config = await loadConfig()
  return config.providers[provider]?.apiKey
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
}
