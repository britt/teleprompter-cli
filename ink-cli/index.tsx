#!/usr/bin/env node
import React, {useState, useEffect} from 'react';
import axios from 'axios';
import asTable from 'as-table';
import {Command} from 'commander';
import path from 'path';
// import the compiled program; fall back to source when running in tests
let baseProgram: Command;
try {
  baseProgram = require(path.join(__dirname, '../../dist/index.js')).default as Command;
} catch {
  baseProgram = require(path.join(__dirname, '../src/index')).program as Command;
}

export const program = new Command();
program
  .name('tp-ink')
  .description('Teleprompter CLI (Ink version)');

// copy all commands from the default CLI so they behave the same
baseProgram.commands.forEach((cmd: Command) => program.addCommand(cmd));

const listCmd = program.commands.find((c: Command) => c.name() === 'list');
if (listCmd) {
  listCmd.action(async (options: any) => {
    const url = options.url || process.env.TP_URL;
    if (!url) {
      console.error('Error: --url option or TP_URL environment variable must be set');
      process.exit(1);
    }

    const ink = await import('ink');
    const {render, Text} = ink;

    interface ListProps {
      url: string;
    }

    const List: React.FC<ListProps> = ({url}) => {
      const [prompts, setPrompts] = useState<any[] | null>(null);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        async function fetchPrompts() {
          try {
            const res = await axios.get(`${url}/prompts`);
            setPrompts(res.data);
          } catch (err) {
            setError((err as Error).message);
          }
        }
        fetchPrompts();
      }, [url]);

      if (error) {
        return <Text color="red">Error: {error}</Text>;
      }

      if (!prompts) {
        return <Text>Loading...</Text>;
      }

      if (prompts.length === 0) {
        return <Text>No prompts found.</Text>;
      }

      const table = asTable(prompts.map(p => ({id: p.id, namespace: p.namespace})));
      return <Text>{"\n" + table}</Text>;
    };

    render(React.createElement(List, {url}));
  });
}

if (require.main === module) {
  program.parse(process.argv);
}

export default program;
