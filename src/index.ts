#!/usr/bin/env node

import { Command } from 'commander'
import axios from 'axios'
import asTable from 'as-table'

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
  .version('0.0.1')

program
  .command('list')
  .description('List all active prompts')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log('Listing all active prompts...')
    console.log(`Using service URL: ${url}`)
    
    try {
      const response = await axios.get(`${url}/prompts`)
      const prompts = response.data
      
      if (Array.isArray(prompts) && prompts.length > 0) {
        console.log(asTable(prompts))
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
  .command('put <promptName>')
  .description('Create a new version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action((promptName: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Creating a new version of prompt: ${promptName}`)
    console.log(`Using service URL: ${url}`)
    // TODO: Implement creation of a new prompt version
  })

program
  .command('versions <promptName>')
  .description('List all versions of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action((promptName: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Listing all versions of prompt: ${promptName}`)
    console.log(`Using service URL: ${url}`)
    // TODO: Implement listing of prompt versions
  })

program
  .command('rollback <promptName> <version>')
  .description('Restore a specific version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action((promptName: string, version: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Rolling back prompt ${promptName} to version ${version}`)
    console.log(`Using service URL: ${url}`)
    // TODO: Implement rollback functionality
  })

program.parse(process.argv)
