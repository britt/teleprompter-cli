#!/usr/bin/env node
import program from './commands/index.js';

if (import.meta.url === `file://${process.argv[1]}`) {
	program.parse(process.argv);
}

export default program;
