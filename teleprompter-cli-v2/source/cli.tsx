#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import App from './app.js';
import {program} from 'commander';
import {setLogLevel} from './util.js';

program
	.name('tp')
	.description(
		'Teleprompter: A tool for managing LLM prompts and updating them at runtime',
	)
	.version('0.2.0')
	.option('-v, --verbose', 'enable verbose logging')
	.option('-n, --name <name>', 'name of the user')
	.hook('preAction', thisCommand => {
		const verbose = thisCommand.opts()['verbose'] || false;
		setLogLevel(verbose);
	})
	.action(async (options) => {
		render(<App name={options.name} />);
	});

if (import.meta.url === `file://${process.argv[1]}`) {
	program.parse(process.argv);
}

export default program;
