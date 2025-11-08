#!/usr/bin/env bun

import { Command } from 'commander'
import React, { useState } from 'react'
import { render } from 'ink'
import { getAccessToken } from './auth.js'
import { PromptsList } from './components/PromptsList.js'
import { PromptDetail } from './components/PromptDetail.js'
import { promises as fsPromises } from 'fs'
import * as fs from 'fs'
import axios from 'axios'
import * as path from 'path'

const program = new Command()

function checkUrl(url: string | undefined): string {
  if (!url) {
    console.error('Error: --url option or TP_URL environment variable must be set')
    process.exit(1)
  }
  return url
}

// Main App component that manages view state
const App: React.FC<{ url: string; token: string; verbose: boolean }> = ({ url, token, verbose }) => {
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)

  const handleSelectPrompt = (promptId: string) => {
    setSelectedPromptId(promptId)
    setView('detail')
  }

  const handleBack = () => {
    setView('list')
    setSelectedPromptId(null)
  }

  if (view === 'detail' && selectedPromptId) {
    return React.createElement(PromptDetail, {
      promptId: selectedPromptId,
      url,
      token,
      onBack: handleBack,
      verbose
    })
  }

  return React.createElement(PromptsList, {
    url,
    token,
    verbose,
    onSelectPrompt: handleSelectPrompt
  })
}

async function runListCommand(url: string, verbose: boolean) {
  try {
    if (verbose) {
      console.log('Listing all active prompts...')
      console.log(`Using service URL: ${url}`)
    }

    const accessToken = await getAccessToken(url)

    if (verbose) {
      console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
    }

    // Render the App component
    render(
      React.createElement(App, {
        url,
        token: accessToken,
        verbose
      })
    )
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching prompts:', error.message)
      if (verbose) {
        console.error(`Stack trace: ${error.stack}`)
      }
    } else {
      console.error('An unknown error occurred while fetching prompts')
    }
    process.exit(1)
  }
}

program
  .name('tp')
  .description('Teleprompter CLI v2: A tool for managing LLM prompts and updating them at runtime')
  .version('0.2.1')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .option('-v, --verbose', 'enable verbose logging')

program
  .command('list')
  .description('List all active prompts')
  .action(async () => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false
    await runListCommand(url, verbose)
  })

program
  .command('import <files...>')
  .description('Import prompts from JSON files')
  .action(async (files: string[]) => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false

    console.log('Importing prompts from files:', files.join(', '))
    if (verbose) {
      console.log(`Using service URL: ${url}`)
    }

    try {
      const accessToken = await getAccessToken(url)
      if (verbose) {
        console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
      }

      for (const file of files) {
        try {
          if (verbose) {
            console.log(`Processing file: ${file}`)
          }
          const content = await fsPromises.readFile(file, 'utf-8')
          if (verbose) {
            console.log(`File content length: ${content.length} characters`)
          }
          const prompts = JSON.parse(content)

          // Handle both single prompt and array of prompts
          const promptsArray = Array.isArray(prompts) ? prompts : [prompts]
          if (verbose) {
            console.log(`Found ${promptsArray.length} prompts in file`)
          }

          for (const prompt of promptsArray) {
            if (!prompt.id || !prompt.namespace || !prompt.prompt) {
              console.error(`Skipping invalid prompt in ${file}: Missing required fields`)
              if (verbose) {
                console.log(`Invalid prompt: ${JSON.stringify(prompt, null, 2)}`)
              }
              continue
            }

            try {
              if (verbose) {
                console.log(`Importing prompt: ${prompt.id}`)
              }
              const payload = {
                id: prompt.id,
                namespace: prompt.namespace,
                prompt: prompt.prompt
              }
              if (verbose) {
                console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`)
              }

              const response = await axios.post(`${url}/prompts`, JSON.stringify(payload), {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                  'cf-access-token': accessToken
                }
              })

              if (verbose) {
                console.log(`Response status: ${response.status}`)
              }
              console.log(`Successfully imported prompt: ${prompt.id}`)
            } catch (error) {
              console.error(`Error importing prompt ${prompt.id}:`, error instanceof Error ? error.message : 'Unknown error')
              if (verbose && error instanceof Error) {
                console.error(`Stack trace: ${error.stack}`)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error instanceof Error ? error.message : 'Unknown error')
          if (verbose && error instanceof Error) {
            console.error(`Stack trace: ${error.stack}`)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during import:', error.message)
        if (verbose) {
          console.error(`Stack trace: ${error.stack}`)
        }
      } else {
        console.error('An unknown error occurred during import')
      }
      process.exit(1)
    }
  })

program
  .command('get <promptId>')
  .description('Fetch a prompt by ID')
  .option('-j, --json', 'return prompt as JSON')
  .action(async (promptId: string, cmdOptions) => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false

    if (!cmdOptions.json) {
      console.log(`Fetching prompt with ID: ${promptId}`)
      if (verbose) {
        console.log(`Using service URL: ${url}`)
      }
    }

    try {
      const accessToken = await getAccessToken(url)
      if (verbose) {
        console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
      }

      const response = await axios.get(`${url}/prompts/${promptId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })

      if (verbose) {
        console.log(`Response status: ${response.status}`)
      }

      if (cmdOptions.json) {
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
        }
      } else if (error instanceof Error) {
        console.error('Error fetching prompt:', error.message)
        if (verbose) {
          console.error(`Stack trace: ${error.stack}`)
        }
      } else {
        console.error('An unknown error occurred while fetching the prompt')
      }
      process.exit(1)
    }
  })

program
  .command('put <promptName> <promptNamespace> [promptText]')
  .description('Create a new version of a prompt')
  .action(async (promptName: string, promptNamespace: string, promptText: string | undefined) => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false

    console.log(`Creating a new version of prompt: ${promptName}`)
    if (verbose) {
      console.log(`Using service URL: ${url}`)
    }

    let text: string
    if (promptText) {
      text = promptText.trim()
      if (verbose) {
        console.log(`Using provided prompt text (${text.length} characters)`)
      }
    } else if (!process.stdin.isTTY) {
      text = fs.readFileSync(0, 'utf-8').trim()
      if (verbose) {
        console.log(`Read prompt text from stdin (${text.length} characters)`)
      }
    } else {
      console.error('Error: Prompt text must be provided as an argument or through stdin')
      process.exit(1)
    }

    try {
      const accessToken = await getAccessToken(url)
      if (verbose) {
        console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
      }

      const payload = {
        id: promptName,
        namespace: promptNamespace,
        prompt: text
      }

      if (verbose) {
        console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`)
      }

      const response = await axios.post(`${url}/prompts`, JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })

      if (verbose) {
        console.log(`Response status: ${response.status}`)
        console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`)
      }

      console.log(`Successfully created prompt: ${promptName}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating prompt:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
      } else if (error instanceof Error) {
        console.error('Error creating prompt:', error.message)
        if (verbose) {
          console.error(`Stack trace: ${error.stack}`)
        }
      } else {
        console.error('An unknown error occurred while creating the prompt')
      }
      process.exit(1)
    }
  })

program
  .command('versions <promptId>')
  .description('List all versions of a prompt')
  .action(async (promptId: string) => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false

    console.log(`Listing all versions of prompt: ${promptId}`)
    if (verbose) {
      console.log(`Using service URL: ${url}`)
    }

    try {
      const accessToken = await getAccessToken(url)
      if (verbose) {
        console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
      }

      const response = await axios.get(`${url}/prompts/${promptId}/versions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })

      if (verbose) {
        console.log(`Response status: ${response.status}`)
      }

      const versions = response.data

      if (Array.isArray(versions) && versions.length > 0) {
        if (verbose) {
          console.log(`Found ${versions.length} versions`)
        }

        // Format versions with human-readable dates
        versions.forEach((v: any) => {
          const date = new Date(v.version)
          const formattedDate = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
          console.log(`v${v.version} - ${formattedDate}`)
        })
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
        if (verbose) {
          console.error(`Stack trace: ${error.stack}`)
        }
      } else {
        console.error('An unknown error occurred while fetching prompt versions')
      }
      process.exit(1)
    }
  })

program
  .command('rollback <promptId> <version>')
  .description('Restore a specific version of a prompt')
  .action(async (promptId: string, version: string) => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false

    console.log(`Rolling back prompt ${promptId} to version ${version}`)
    if (verbose) {
      console.log(`Using service URL: ${url}`)
    }

    try {
      const accessToken = await getAccessToken(url)
      if (verbose) {
        console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
      }

      const response = await axios.post(
        `${url}/prompts/${promptId}/versions/${version}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cf-access-token': accessToken
          }
        }
      )

      if (verbose) {
        console.log(`Response status: ${response.status}`)
        console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`)
      }

      console.log(`Successfully rolled back prompt ${promptId} to version ${version}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error rolling back prompt:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
      } else if (error instanceof Error) {
        console.error('Error rolling back prompt:', error.message)
        if (verbose) {
          console.error(`Stack trace: ${error.stack}`)
        }
      } else {
        console.error('An unknown error occurred while rolling back the prompt')
      }
      process.exit(1)
    }
  })

program
  .command('export <pattern>')
  .description('Export prompts matching pattern to JSON files')
  .option('-o, --out <directory>', 'Output directory for JSON files', '.')
  .action(async (pattern: string, cmdOptions) => {
    const options = program.opts()
    const url = checkUrl(options.url || process.env.TP_URL)
    const verbose = options.verbose || false
    const outputDir = cmdOptions.out

    if (verbose) {
      console.log(`Using service URL: ${url}`)
      console.log(`Output directory: ${outputDir}`)
      console.log(`Pattern: ${pattern}`)
    }

    try {
      // Ensure output directory exists
      await fsPromises.mkdir(outputDir, { recursive: true })
      if (verbose) {
        console.log(`Created/verified output directory: ${outputDir}`)
      }

      const accessToken = await getAccessToken(url)
      if (verbose) {
        console.log(`Using access token: ${accessToken?.substring(0, 10)}...`)
      }

      // Get all prompts first
      const response = await axios.get(`${url}/prompts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })

      if (verbose) {
        console.log(`Response status: ${response.status}`)
        console.log(`Found ${response.data.length} total prompts`)
      }

      const prompts = response.data
      const regexPattern = pattern.replace(/\*/g, '.*')
      const matcher = new RegExp(`^${regexPattern}$`)

      if (verbose) {
        console.log(`Using regex pattern: ${regexPattern}`)
      }

      const matchingPrompts = prompts.filter((p: any) => matcher.test(p.id))

      if (matchingPrompts.length === 0) {
        console.log(`No prompts found matching pattern: ${pattern}`)
        return
      }

      console.log(`Found ${matchingPrompts.length} matching prompts`)
      if (verbose) {
        console.log(`Matching prompt IDs: ${matchingPrompts.map((p: any) => p.id).join(', ')}`)
      }

      for (const promptInfo of matchingPrompts) {
        try {
          if (verbose) {
            console.log(`Exporting prompt: ${promptInfo.id}`)
          }

          // Get full prompt details
          const detailResponse = await axios.get(`${url}/prompts/${promptInfo.id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'cf-access-token': accessToken
            }
          })

          if (verbose) {
            console.log(`Detail response status: ${detailResponse.status}`)
          }

          const prompt = detailResponse.data

          // Convert prompt ID to snake case filename
          const filename = prompt.id.replace(/:/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase()
          const filepath = path.join(outputDir, `${filename}.json`)

          if (verbose) {
            console.log(`Writing to file: ${filepath}`)
          }

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
          if (verbose && error instanceof Error) {
            console.error(`Stack trace: ${error.stack}`)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during export:', error.message)
        if (verbose) {
          console.error(`Stack trace: ${error.stack}`)
        }
      } else {
        console.error('An unknown error occurred during export')
      }
      process.exit(1)
    }
  })

// Default action when no command is specified
program.action(async () => {
  const options = program.opts()
  const url = checkUrl(options.url || process.env.TP_URL)
  const verbose = options.verbose || false
  await runListCommand(url, verbose)
})

// Only parse if this is the main module
if (import.meta.main) {
  program.parse(process.argv)
}

export default program