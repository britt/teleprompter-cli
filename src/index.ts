#!/usr/bin/env node

import { Command } from 'commander'
import axios from 'axios'
import asTable from 'as-table'
import * as fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let accessToken: string | null = null

async function cloudflareAccessLogin(url: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`cloudflared access login ${url}`)
    const tokenMatch = stdout.match(/Successfully fetched your token:\s*([\w.-]+)/)
    if (!tokenMatch) {
      throw new Error('Token not found in cloudflared output')
    }
    const token = tokenMatch[1].trim()
    accessToken = token
    return token
  } catch (error) {
    console.error('Error logging in with Cloudflare Access:', error)
    process.exit(1)
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
      await cloudflareAccessLogin(url)
      
      const response = await axios.get(`${url}/prompts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      })
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
  .command('put <promptName> [promptText]')
  .description('Create a new version of a prompt')
  .option('-u, --url <url>', 'URL of the teleprompter service')
  .action(async (promptName: string, promptText: string | undefined, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Creating a new version of prompt: ${promptName}`)
    console.log(`Using service URL: ${url}`)

    let text: string;
    if (promptText) {
      text = promptText;
    } else if (!process.stdin.isTTY) {
      text = fs.readFileSync(0, 'utf-8').trim(); // Read from stdin
    } else {
      console.error('Error: Prompt text must be provided as an argument or through stdin');
      process.exit(1);
    }

    try {
      await cloudflareAccessLogin(url)

      const response = await axios.post(`${url}/prompts`, JSON.stringify({
        name: promptName,
        text: text
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'cf-access-token': accessToken
        }
      });
      console.log('Prompt created successfully:', response.data);
    } catch (error) {
      if (error instanceof Error) {
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
