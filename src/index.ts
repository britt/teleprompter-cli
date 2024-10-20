#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('tp')
  .description('A CLI program that prints Hello World')
  .version('1.0.0');

program.action(() => {
  console.log('Hello World');
});

program.parse(process.argv);
