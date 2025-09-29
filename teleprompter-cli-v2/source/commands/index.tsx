import { program } from 'commander'
import { render } from 'ink';
import { setLogLevel } from '../util.js';
import React from 'react';
import {Text} from 'ink';
import AddListCommand from './list.js';

type Props = {
	name: string | undefined;
};

function App({name = 'Stranger'}: Props) {
	return (
		<Text>
			Hello, <Text color="green">{name}</Text>
		</Text>
	);
}

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

AddListCommand(program);

export default program;