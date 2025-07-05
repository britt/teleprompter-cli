#!/usr/bin/env node

import { Command } from 'commander'
import * as path from 'path'
import axios from 'axios'
import asTable from 'as-table'
import * as fs from 'fs'
import { URL } from 'url'
import { promisify } from 'util'
import { exec } from 'child_process'
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
    const { stdout } = await execAsync(command)
    const lines = stdout.split('\n')
    let foundTokenLine = false
    for (const line of lines) {
      if (foundTokenLine && line.trim() !== '') {
        const token = line.trim()
        accessToken = token
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
    return token.trim()
  } catch (error) {
    return await cloudflareAccessLogin(url)
  }
}

export const program = new Command()

function checkUrl(url: string | undefined): string {
  if (!url) {
    console.error('Error: --url option or TP_URL environment variable must be set')
    process.exit(1)
  }
  return url
}

function setLogLevel(verbose: boolean): void {
  if (verbose) {
    // Enable debug logging
    console.debug = console.log
  } else {
    // Disable debug logging
    console.debug = () => {}
  }
}

program
  .name('tp')
  .description('Teleprompter: A tool for managing LLM prompts and updating them at runtime')
  .version('0.2.0')
  .option('-v, --verbose', 'enable verbose logging')
  .hook('preAction', (thisCommand) => {
    const verbose = thisCommand.opts().verbose || false
    setLogLevel(verbose)
  })

program
  .command('list')
  .description('List all active prompts')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (options) => {
    try {
      const url = checkUrl(options.url || process.env.TP_URL)
      console.log('Listing all active prompts...')
      console.debug(`Using service URL: ${url}`)
    
      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)
      const fullUrl = `${url}/prompts`
      console.debug(`Making request to: ${fullUrl}`)
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
      
      console.debug(`Response status: ${response.status}`)
      const prompts = response.data
      
      if (Array.isArray(prompts) && prompts.length > 0) {
        console.debug(`Found ${prompts.length} prompts`)
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
        console.debug(`Stack trace: ${error.stack}`)
      } else {
        console.error('An unknown error occurred while fetching prompts')
      }
    }
  })

program
  .command('put <promptName> <promptNamespace> [promptText]')
  .description('Create a new version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (promptName: string, promptNamespace: string, promptText: string | undefined, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Creating a new version of prompt: ${promptName}`)
    console.debug(`Using service URL: ${url}`)

    let text: string;
    if (promptText) {
      text = promptText.trim();
      console.debug(`Using provided prompt text (${text.length} characters)`)
    } else if (!process.stdin.isTTY) {
      text = fs.readFileSync(0, 'utf-8').trim(); // Read from stdin
      console.debug(`Read prompt text from stdin (${text.length} characters)`)
    } else {
      console.error('Error: Prompt text must be provided as an argument or through stdin');
      process.exit(1);
    }

    try {
      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)

      const payload = {
        id: promptName,
        namespace: promptNamespace,
        prompt: text
      }
      console.debug(`Request payload: ${JSON.stringify(payload, null, 2)}`)

      // FIXME: Detect when the token is invalid and re-login
      const response = await axios.post(`${url}/prompts`, JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      });
      
      console.debug(`Response status: ${response.status}`)
      console.debug(`Response data: ${JSON.stringify(response.data, null, 2)}`)
      console.log(`Successfully created prompt: ${promptName}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating prompt:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
          console.debug(`Full error response: ${JSON.stringify(error.response, null, 2)}`)
        }
      } else if (error instanceof Error) {
        console.error('Error creating prompt:', error.message);
        console.debug(`Stack trace: ${error.stack}`)
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
    console.debug(`Using service URL: ${url}`)
    
    try {
      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)
      
      const requestUrl = `${url}/prompts/${promptName}/versions`
      console.debug(`Making request to: ${requestUrl}`)
      const response = await axios.get(requestUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
      
      console.debug(`Response status: ${response.status}`)
      const versions = response.data
      
      if (Array.isArray(versions) && versions.length > 0) {
        console.debug(`Found ${versions.length} versions`)
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
          console.debug(`Full error response: ${JSON.stringify(error.response, null, 2)}`)
        }
      } else if (error instanceof Error) {
        console.error('Error fetching prompt versions:', error.message)
        console.debug(`Stack trace: ${error.stack}`)
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
    console.debug(`Using service URL: ${url}`)
    
    try {
      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)
      
      const requestUrl = `${url}/prompts/${promptName}/versions/${version}`
      console.debug(`Making request to: ${requestUrl}`)
      const response = await axios.post(requestUrl, 
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-access-token': accessToken
          }
        }
      )
      
      console.debug(`Response status: ${response.status}`)
      console.debug(`Response data: ${JSON.stringify(response.data, null, 2)}`)
      console.log(`Successfully rolled back prompt ${promptName} to version ${version}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error rolling back prompt:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
          console.debug(`Full error response: ${JSON.stringify(error.response, null, 2)}`)
        }
      } else if (error instanceof Error) {
        console.error('Error rolling back prompt:', error.message)
        console.debug(`Stack trace: ${error.stack}`)
      } else {
        console.error('An unknown error occurred while rolling back the prompt')
      }
    }
  })

program
  .command('get <promptId>')
  .description('Fetch a prompt by ID')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .option('-j, --json', 'return prompt as JSON')
  .action(async (promptId: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    if (!options.json) {
      console.log(`Fetching prompt with ID: ${promptId}`)
      console.debug(`Using service URL: ${url}`)
    }
    try {
      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)

      const requestUrl = `${url}/prompts/${promptId}`
      console.debug(`Making request to: ${requestUrl}`)
      const response = await axios.get(requestUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
      
      console.debug(`Response status: ${response.status}`)
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2))
        return
      }
      console.log('Prompt details:\n')
      console.log('id:', response.data.id)
      console.log('version:', response.data.version)
      console.log('namespace:', response.data.namespace, '\n')
      console.log(response.data.prompt.trim())
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching prompt:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
          console.debug(`Full error response: ${JSON.stringify(error.response, null, 2)}`)
        }
      } else if (error instanceof Error) {
        console.error('Error fetching prompt:', error.message)
        console.debug(`Stack trace: ${error.stack}`)
      } else {
        console.error('An unknown error occurred while fetching the prompt')
      }
    }
  })

program
  .command('import <files...>')
  .description('Import prompts from JSON files')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (files: string[], options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log('Importing prompts from files:', files.join(', '))
    console.debug(`Using service URL: ${url}`)

    try {
      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)

      for (const file of files) {
        try {
          console.debug(`Processing file: ${file}`)
          const content = await fsPromises.readFile(file, 'utf-8')
          console.debug(`File content length: ${content.length} characters`)
          const prompts = JSON.parse(content)
          
          // Handle both single prompt and array of prompts
          const promptsArray = Array.isArray(prompts) ? prompts : [prompts]
          console.debug(`Found ${promptsArray.length} prompts in file`)
          
          for (const prompt of promptsArray) {
            if (!prompt.id || !prompt.namespace || !prompt.prompt) {
              console.error(`Skipping invalid prompt in ${file}: Missing required fields`)
              console.debug(`Invalid prompt: ${JSON.stringify(prompt, null, 2)}`)
              continue
            }

            try {
              console.debug(`Importing prompt: ${prompt.id}`)
              const payload = {
                id: prompt.id,
                namespace: prompt.namespace,
                prompt: prompt.prompt
              }
              console.debug(`Request payload: ${JSON.stringify(payload, null, 2)}`)
              
              const response = await axios.post(`${url}/prompts`, JSON.stringify(payload), {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                  'cf-access-token': accessToken
                }
              })
              
              console.debug(`Response status: ${response.status}`)
              console.log(`Successfully imported prompt: ${prompt.id}`)
            } catch (error) {
              console.error(`Error importing prompt ${prompt.id}:`, error instanceof Error ? error.message : 'Unknown error')
              if (error instanceof Error) {
                console.debug(`Stack trace: ${error.stack}`)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error instanceof Error ? error.message : 'Unknown error')
          if (error instanceof Error) {
            console.debug(`Stack trace: ${error.stack}`)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during import:', error.message)
        console.debug(`Stack trace: ${error.stack}`)
      } else {
        console.error('An unknown error occurred during import')
      }
      process.exit(1)
    }
  })

program
  .command('export <pattern>')
  .description('Export prompts matching pattern to JSON files')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .option('-o, --out <directory>', 'Output directory for JSON files', '.')
  .action(async (pattern: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    const outputDir = options.out
    console.debug(`Using service URL: ${url}`)
    console.debug(`Output directory: ${outputDir}`)
    console.debug(`Pattern: ${pattern}`)

    try {
      // Ensure output directory exists
      await fsPromises.mkdir(outputDir, { recursive: true })
      console.debug(`Created/verified output directory: ${outputDir}`)

      accessToken = await getAccessToken(url)
      console.debug(`Using access token: ${accessToken?.substring(0, 10)}...`)
      
      // Get all prompts first
      const requestUrl = `${url}/prompts`
      console.debug(`Making request to: ${requestUrl}`)
      const response = await axios.get(requestUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })

      console.debug(`Response status: ${response.status}`)
      const prompts = response.data
      console.debug(`Found ${prompts.length} total prompts`)
      
      const regexPattern = pattern.replace(/\*/g, '.*')
      const matcher = new RegExp(`^${regexPattern}$`)
      console.debug(`Using regex pattern: ${regexPattern}`)
      
      const matchingPrompts = prompts.filter((p: any) => matcher.test(p.id))
      
      if (matchingPrompts.length === 0) {
        console.log(`No prompts found matching pattern: ${pattern}`)
        return
      }

      console.log(`Found ${matchingPrompts.length} matching prompts`)
      console.debug(`Matching prompt IDs: ${matchingPrompts.map((p: any) => p.id).join(', ')}`)

      for (const promptInfo of matchingPrompts) {
        try {
          console.debug(`Exporting prompt: ${promptInfo.id}`)
          // Get full prompt details
          const detailUrl = `${url}/prompts/${promptInfo.id}`
          console.debug(`Making detail request to: ${detailUrl}`)
          const detailResponse = await axios.get(detailUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'cf-access-token': accessToken
            }
          })
          
          console.debug(`Detail response status: ${detailResponse.status}`)
          const prompt = detailResponse.data
          // Convert prompt ID to snake case filename
          const filename = prompt.id.replace(/:/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase()
          const filepath = path.join(outputDir, `${filename}.json`)
          console.debug(`Writing to file: ${filepath}`)
          
          const exportData = {
            id: prompt.id,
            namespace: prompt.namespace,
            prompt: prompt.prompt
          }
          
          await fsPromises.writeFile(
            filepath,
            JSON.stringify(exportData, null, 2)
          )
          
          console.log(`Exported ${prompt.id} to ${filepath}`)
        } catch (error) {
          console.error(`Error exporting prompt ${promptInfo.id}:`, error instanceof Error ? error.message : 'Unknown error')
          if (error instanceof Error) {
            console.debug(`Stack trace: ${error.stack}`)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during export:', error.message)
        console.debug(`Stack trace: ${error.stack}`)
      } else {
        console.error('An unknown error occurred during export')
      }
      process.exit(1)
    }
  })

if (require.main === module) {
  program.parse(process.argv)
}

export default program
