#!/usr/bin/env node

import { Command } from 'commander'
import axios from 'axios'
import asTable from 'as-table'
import * as fs from 'fs'
import { URL } from 'url'
import { promisify } from 'util'
import { exec } from 'child_process'
import * as path from 'path'
import * as os from 'os'
import { promises as fsPromises } from 'fs'

const DEFAULT_LOCAL_TOKEN = 'local-development-token'
let accessToken: string | null = null

const execAsync = promisify(exec)

async function cloudflareAccessLogin(url: string): Promise<string> {
  try {
    console.log('Logging in with Cloudflare Access...\n')
    console.log(`URL: ${url}`)
    const command = `cloudflared access login ${url}`
    console.log(`Executing command: ${command}`)
    const { stdout } = await execAsync(command)
    const lines = stdout.split('\n')
    let foundTokenLine = false
    for (const line of lines) {
      if (foundTokenLine && line.trim() !== '') {
        const token = line.trim()
        accessToken = token
        console.log('Token successfully retrieved')
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

async function storeToken(token: string): Promise<void> {
  const dirPath = path.join(os.homedir(), '.teleprompter')
  const filePath = path.join(dirPath, 'token')

  try {
    await fsPromises.mkdir(dirPath, { recursive: true })
    await fsPromises.writeFile(filePath, token, { mode: 0o600 })
    console.log(`Token stored at ${filePath} with permissions set to 0600`)
  } catch (error) {
    console.error('Error storing token:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
    throw new Error('Failed to store token')
  }
}

async function getAccessToken(url: string): Promise<string> {
  const parsedUrl = new URL(url)
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
    console.log('Using default token for localhost\n')
    return DEFAULT_LOCAL_TOKEN
  }

  const filePath = path.join(os.homedir(), '.teleprompter', 'token')
  try {
    const token = await fsPromises.readFile(filePath, 'utf-8')
    console.log('Token read from file')
    return token.trim()
  } catch (error) {
    console.log('Token file not found, fetching new token')
    return await cloudflareAccessLogin(url)
  }
}

const program = new Command()

function checkUrl(url: string | undefined): string {
  if (!url) {
    console.error('Error: --url option or TP_URL environment variable must be set')
    process.exit(1)
  }
  return url
}

program
  .name('tp')
  .description('Teleprompter: A tool for managing LLM prompts and updating them at runtime')
  .version('0.1.0')

program
  .command('list')
  .description('List all active prompts')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (options) => {
    try {
      const url = checkUrl(options.url || process.env.TP_URL)
      console.log('Listing all active prompts...')
      console.log(`Using service URL: ${url}`)
    
      accessToken = await getAccessToken(url)
      console.log('Access token retrieved successfully')
      
      const fullUrl = `${url}/prompts`
      console.log(`Making GET request to: ${fullUrl}`)
      
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
      
      console.log('Response received:', response.status, response.statusText)
      const prompts = response.data
      
      if (Array.isArray(prompts) && prompts.length > 0) {
        const truncatedPrompts = prompts.map(prompt => {
          const truncatedPrompt = Object.fromEntries(
            Object.entries(prompt).map(([key, value]) => [
              key,
              typeof value === 'string' && value.length > 50 ? value.substring(0, 47) + '...' : value
            ])
          );
          return truncatedPrompt;
        });
        const configuredAsTable = asTable.configure({ maxTotalWidth: 140 });
        console.log(configuredAsTable(truncatedPrompts));
      } else {
        console.log('No active prompts found.')
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching prompts:', error.message)
      } else {
        console.error('An unknown error occurred while fetching prompts')
      }
    }
  })

program
  .command('put <promptName> [promptText]')
  .description('Create a new version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (promptName: string, promptText: string | undefined, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Creating a new version of prompt: ${promptName}`)
    console.log(`Using service URL: ${url}`)

    let text: string;
    if (promptText) {
      text = promptText.trim();
    } else if (!process.stdin.isTTY) {
      text = fs.readFileSync(0, 'utf-8').trim(); // Read from stdin
    } else {
      console.error('Error: Prompt text must be provided as an argument or through stdin');
      process.exit(1);
    }

    try {
      accessToken = await getAccessToken(url)

      const response = await axios.post(`${url}/prompts`, JSON.stringify({
        id: promptName,
        prompt: text
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      });
      console.log('Prompt created successfully:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating prompt:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
      } else if (error instanceof Error) {
        console.error('Error creating prompt:', error.message);
      } else {
        console.error('An unknown error occurred while creating the prompt');
      }
    }
  })

program
  .command('versions <promptName>')
  .description('List all versions of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (promptName: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Listing all versions of prompt: ${promptName}`)
    console.log(`Using service URL: ${url}`)
    
    try {
      accessToken = await getAccessToken(url)
      
      const response = await axios.get(`${url}/prompts/${promptName}/versions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
      const versions = response.data
      
      if (Array.isArray(versions) && versions.length > 0) {
        console.log(asTable(versions))
      } else {
        console.log('No versions found for this prompt.')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching prompt versions:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
      } else if (error instanceof Error) {
        console.error('Error fetching prompt versions:', error.message)
      } else {
        console.error('An unknown error occurred while fetching prompt versions')
      }
    }
  })

program
  .command('rollback <promptName> <version>')
  .description('Restore a specific version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (promptName: string, version: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Rolling back prompt ${promptName} to version ${version}`)
    console.log(`Using service URL: ${url}`)
    
    try {
      accessToken = await getAccessToken(url)
      
      const response = await axios.post(`${url}/prompts/${promptName}/versions/${version}`, 
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-access-token': accessToken
          }
        }
      )
      
      console.log(`Successfully rolled back prompt ${promptName} to version ${version}`)
      console.log(response.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error rolling back prompt:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
      } else if (error instanceof Error) {
        console.error('Error rolling back prompt:', error.message)
      } else {
        console.error('An unknown error occurred while rolling back the prompt')
      }
    }
  })

program
  .command('get <promptId>')
  .description('Fetch a prompt by ID')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (promptId: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Fetching prompt with ID: ${promptId}`)
    console.log(`Using service URL: ${url}`)

    try {
      accessToken = await getAccessToken(url)

      const response = await axios.get(`${url}/prompts/${promptId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
      console.log('Prompt details:\n\n')
      console.log('id:', response.data.id)
      console.log('version:', response.data.version)
      console.log('\n', response.data.prompt.trim())
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching prompt:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
      } else if (error instanceof Error) {
        console.error('Error fetching prompt:', error.message)
      } else {
        console.error('An unknown error occurred while fetching the prompt')
      }
    }
  })

program.parse(process.argv)
