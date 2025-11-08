#!/usr/bin/env bun

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { getAccessToken } from './auth.js'
import { PromptsList } from './components/PromptsList.js'

const program = new Command()

function checkUrl(url: string | undefined): string {
  if (!url) {
    console.error('Error: --url option or TP_URL environment variable must be set')
    process.exit(1)
  }
  return url
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

    // Render the Ink UI
    render(
      React.createElement(PromptsList, {
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