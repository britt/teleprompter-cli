import React from 'react';
import {Command} from 'commander';
import {checkUrl, getAccessToken} from '../util.js';
import axios from 'axios';
import {Box, render, Text} from 'ink';

const StyledBox = React.forwardRef<any, any>((props, ref) => (
	<Box {...props} ref={ref} />
));

const Row = React.forwardRef<any, {id: string; prompt: string; version: string; namespace: string, textColor?: string} & React.ComponentProps<typeof StyledBox>>(({id, prompt, version, namespace, textColor, ...props}, ref) => (
	<StyledBox {...props} ref={ref} flexDirection="row" spacing={1}>
		<StyledBox width="30%">
			<Text color={textColor || 'blue'}>{id}</Text>
		</StyledBox>
		<StyledBox width="35%">
			<Text color={textColor || ''}>{prompt}</Text>
		</StyledBox>
		<StyledBox width="20%">
			<Text color={textColor || 'red'}>{version}</Text>
		</StyledBox>
		<StyledBox width="15%">
			<Text color={textColor || 'blue'}>{namespace}</Text>
		</StyledBox>
	</StyledBox>
));

const Header = (<Row 
    id="id" 
    prompt="prompt" 
    version="version" 
    namespace="namespace" 
    borderBottom
    borderTop={false}
    borderLeft={false}
    borderRight={false}
    borderStyle="single"
    borderColor="greenBright"
    key="header"
    textColor="greenBright"
    marginBottom={0}
    />);

function List({prompts}: {prompts: any[]}) {
	return (
		<StyledBox flexDirection="column" width="100%">
			{Header}
			{prompts.map(prompt => (
				<Row key={prompt.id} {...prompt} />
			))}
		</StyledBox>
	);
}

export default function AddListCommand(program: Command) {
	program
		.command('list')
		.description('List all active prompts')
		.option('-u, --url <url>', 'URL of the teleprompter service')
		.action(async options => {
			try {
				const url = checkUrl(options.url || process.env['TP_URL']);
				console.log('Listing all active prompts...');
				console.debug(`Using service URL: ${url}`);

				const accessToken = await getAccessToken(url);
				console.debug(
					`Using access token: ${accessToken?.substring(0, 10)}...`,
				);
				const fullUrl = `${url}/prompts`;
				console.debug(`Making request to: ${fullUrl}`);
				const response = await axios.get(fullUrl, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'cf-access-token': accessToken,
					},
				});

				console.debug(`Response status: ${response.status}`);
				const prompts = response.data;

				if (Array.isArray(prompts) && prompts.length > 0) {
					console.debug(`Found ${prompts.length} prompts`);
					const truncatedPrompts = prompts.map(prompt => {
						const truncatedPrompt = Object.fromEntries(
							Object.entries(prompt).map(([key, value]) => [
								key,
								typeof value === 'string' && value.length > 43
									? value.substring(0, 40).replace(/\n/g, ' ') + '...'
									: value,
							]),
						);
						return truncatedPrompt;
					});
					render(<List prompts={truncatedPrompts} />);
				} else {
					console.log('No active prompts found.');
				}
			} catch (error) {
				if (error instanceof Error) {
					console.error('Error fetching prompts:', error.message);
					console.debug(`Stack trace: ${error.stack}`);
				} else {
					console.error('An unknown error occurred while fetching prompts');
				}
			}
		});
}
