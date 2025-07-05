#!/usr/bin/env node
import React, {useState, useEffect} from 'react';
import * as ink from 'ink';
const {render, Text} = ink;
import axios from 'axios';
import asTable from 'as-table';
import program from '../dist/index.js';
import type { Command } from 'commander';

interface ListProps {
  url: string;
}

export const List: React.FC<ListProps> = ({url}) => {
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

program
  .name('tp-ink')
  .description('Teleprompter CLI (Ink version)');

const listCmd = program.commands.find((c: Command) => c.name() === 'list');
if (listCmd) {
  listCmd.action((options: any) => {
    const url = options.url || process.env.TP_URL;
    if (!url) {
      console.error('Error: --url option or TP_URL environment variable must be set');
      process.exit(1);
    }
    render(<List url={url}/>);
  });
}

if (require.main === module) {
  program.parse(process.argv);
}

export default program;
