#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

program
  .name('tp')
  .description('Teleprompter: A tool for managing LLM prompts and updating them at runtime')
  .version('0.0.1')

program
  .command('list')
  .description('List all active prompts')
  .action(() => {
    console.log('Listing all active prompts...')
    // TODO: Implement listing of active prompts
  })

program
  .command('put <promptName>')
  .description('Create a new version of a prompt')
  .action((promptName: string) => {
    console.log(`Creating a new version of prompt: ${promptName}`)
    // TODO: Implement creation of a new prompt version
  })

program
  .command('versions <promptName>')
  .description('List all versions of a prompt')
  .action((promptName: string) => {
    console.log(`Listing all versions of prompt: ${promptName}`)
    // TODO: Implement listing of prompt versions
  })

program
  .command('rollback <promptName> <version>')
  .description('Restore a specific version of a prompt')
  .action((promptName: string, version: string) => {
    console.log(`Rolling back prompt ${promptName} to version ${version}`)
    // TODO: Implement rollback functionality
  })

program.parse(process.argv)
