#!/usr/bin/env node

import { Command } from 'commander'
import axios from 'axios'
import asTable from 'as-table'
import * as fs from 'fs'
import { URL } from 'url'
import { promisify } from 'util'
import { exec } from 'child_process'

const DEFAULT_LOCAL_TOKEN = 'local-development-token'
let accessToken: string | null = null

const execAsync = promisify(exec)

async function cloudflareAccessLogin(url: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`cloudflared access login ${url}`)
    const lines = stdout.split('\n')
    const tokenLine = lines.find(line => line.startsWith('Successfully fetched your token:'))
    if (!tokenLine) {
      throw new Error('Token not found in cloudflared output')
    }
    const token = tokenLine.split(':')[1].trim()
    accessToken = token
    return token
  } catch (error) {
    console.error('Error logging in with Cloudflare Access:', error)
    process.exit(1)
  }
}

async function getAccessToken(url: string): Promise<string> {
  const parsedUrl = new URL(url)
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
    console.log('Using default token for localhost')
    return DEFAULT_LOCAL_TOKEN
  }

  return accessToken || await cloudflareAccessLogin(url)
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
      accessToken = await getAccessToken(url)
      
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
  .action((promptName: string, version: string, options) => {
    const url = checkUrl(options.url || process.env.TP_URL)
    console.log(`Rolling back prompt ${promptName} to version ${version}`)
    console.log(`Using service URL: ${url}`)
    // TODO: Implement rollback functionality
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
      console.log('Prompt details:')
      console.log(JSON.stringify(response.data, null, 2))
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
