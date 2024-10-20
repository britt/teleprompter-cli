#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('tp')
  .description('Teleprompter: A tool for managing LLM prompts and updating them at runtime')
  .version('0.0.1');

program.action(() => {
  console.log('Hello World');
});

program.parse(process.argv);
