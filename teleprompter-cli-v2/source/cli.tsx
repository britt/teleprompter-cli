#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ tp <command> <args>

	Commands
	  $ tp list
	  $ tp get <prompt-id>
	  $ tp push <prompt-id>
	  $ tp rollback <prompt-id>
	  $ tp versions <prompt-id>
	  $ tp export <pattern>
	  $ tp import <pattern>

	Examples
	  $ tp list
	  $ tp get 123
`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
			},
		},
	},
);

render(<App name={cli.flags.name} />);
