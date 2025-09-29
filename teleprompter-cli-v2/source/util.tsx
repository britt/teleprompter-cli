import { promisify } from "util"
import { exec } from "child_process"
import * as os from "os"
import * as path from "path"
import { promises as fsPromises } from "fs"
import { Command } from "commander"

const DEFAULT_LOCAL_TOKEN = 'local-development-token'

const execAsync = promisify(exec)

export async function cloudflareAccessLogin(url: string): Promise<string> {
  try {
    console.log('Logging in with Cloudflare Access...\n')
    console.log(`URL: ${url}`)
    const command = `cloudflared access login ${url}`
    const { stdout } = await execAsync(command)
    const lines = stdout.split('\n')
    let foundTokenLine = false
    for (const line of lines) {
      if (foundTokenLine && line.trim() !== '') {
        const token = line.trim()
        await storeToken(token)
        return token
      }

      if (line.startsWith('Successfully fetched your token:')) {
        foundTokenLine = true
      }
    }
    throw new Error('Failed to fetch token from Cloudflare Access')
  } catch (error) {
    console.error('Error logging in with Cloudflare Access:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

export async function storeToken(token: string): Promise<void> {
  const dirPath = path.join(os.homedir(), '.teleprompter')
  const filePath = path.join(dirPath, 'token')

  try {
    await fsPromises.mkdir(dirPath, { recursive: true })
    await fsPromises.writeFile(filePath, token, { mode: 0o600 })
  } catch (error) {
    console.error('Error storing token:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
    throw new Error('Failed to store token')
  }
}

export async function getAccessToken(url: string): Promise<string> {
  const parsedUrl = new URL(url)
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
    console.log('Using default token for localhost\n')
    return DEFAULT_LOCAL_TOKEN
  }

  const filePath = path.join(os.homedir(), '.teleprompter', 'token')
  try {
    const token = await fsPromises.readFile(filePath, 'utf-8')
    return token.trim()
  } catch (error) {
    return await cloudflareAccessLogin(url)
  }
}

export const program = new Command()

export function checkUrl(url: string | undefined): string {
  if (!url) {
    console.error('Error: --url option or TP_URL environment variable must be set')
    process.exit(1)
  }
  return url
}

export function setLogLevel(verbose: boolean): void {
  if (verbose) {
    // Enable debug logging
    console.debug = console.log
  } else {
    // Disable debug logging
    console.debug = () => {}
  }
}