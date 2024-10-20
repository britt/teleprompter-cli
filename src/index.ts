#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

const defaultUrl = process.env.TP_URL || 'http://localhost:3000'

program
  .name('tp')
  .description('Teleprompter: A tool for managing LLM prompts and updating them at runtime')
  .version('0.0.1')

program
  .command('list')
  .description('List all active prompts')
  .option('-u, --url <url>', 'URL of the teleprompter service', defaultUrl)
  .action((options) => {
    console.log('Listing all active prompts...')
    console.log(`Using service URL: ${options.url}`)
    // TODO: Implement listing of active prompts
  })

program
  .command('put <promptName>')
  .description('Create a new version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service', defaultUrl)
  .action((promptName: string, options) => {
    console.log(`Creating a new version of prompt: ${promptName}`)
    console.log(`Using service URL: ${options.url}`)
    // TODO: Implement creation of a new prompt version
  })

program
  .command('versions <promptName>')
  .description('List all versions of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service', defaultUrl)
  .action((promptName: string, options) => {
    console.log(`Listing all versions of prompt: ${promptName}`)
    console.log(`Using service URL: ${options.url}`)
    // TODO: Implement listing of prompt versions
  })

program
  .command('rollback <promptName> <version>')
  .description('Restore a specific version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service', defaultUrl)
  .action((promptName: string, version: string, options) => {
    console.log(`Rolling back prompt ${promptName} to version ${version}`)
    console.log(`Using service URL: ${options.url}`)
    // TODO: Implement rollback functionality
  })

program.parse(process.argv)
