import {Command} from 'commander';
import {checkUrl, getAccessToken} from '../util.js';
import axios from 'axios';
import asTable from 'as-table';

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
								typeof value === 'string' && value.length > 50
									? value.substring(0, 47) + '...'
									: value,
							]),
						);
						return truncatedPrompt;
					});
					const configuredAsTable = asTable.configure({maxTotalWidth: 140});
					console.log(configuredAsTable(truncatedPrompts));
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
