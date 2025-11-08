#!/usr/bin/env bun

import { Command } from 'commander'
import React, { useState } from 'react'
import { render } from 'ink'
import { getAccessToken } from './auth.js'
import { PromptsList } from './components/PromptsList.js'
import { PromptDetail } from './components/PromptDetail.js'
import { promises as fsPromises } from 'fs'
import axios from 'axios'

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