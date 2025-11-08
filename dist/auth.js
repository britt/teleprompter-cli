import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const DEFAULT_LOCAL_TOKEN = 'local-development-token';
export async function cloudflareAccessLogin(url) {
    try {
        console.log('Logging in with Cloudflare Access...\n');
        console.log(`URL: ${url}`);
        const command = `cloudflared access login ${url}`;
        const { stdout } = await execAsync(command);
        const lines = stdout.split('\n');
        let foundTokenLine = false;
        for (const line of lines) {
            if (foundTokenLine && line.trim() !== '') {
                const token = line.trim();
                await storeToken(token);
                return token;
            }
            if (line.startsWith('Successfully fetched your token:')) {
                foundTokenLine = true;
            }
        }
        throw new Error('Failed to fetch token from Cloudflare Access');
    }
    catch (error) {
        console.error('Error logging in with Cloudflare Access:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}
export async function storeToken(token) {
    const dirPath = path.join(os.homedir(), '.teleprompter');
    const filePath = path.join(dirPath, 'token');
    try {
        await fsPromises.mkdir(dirPath, { recursive: true });
        await fsPromises.writeFile(filePath, token, { mode: 0o600 });
    }
    catch (error) {
        console.error('Error storing token:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
        }
        throw new Error('Failed to store token');
    }
}
export function isTokenValid(token) {
    try {
        const [, payload] = token.split('.');
        if (!payload) {
            return false;
        }
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const exp = typeof data.exp === 'number' ? data.exp : parseInt(data.exp, 10);
        return !isNaN(exp) && exp * 1000 > Date.now();
    }
    catch {
        return false;
    }
}
export async function getAccessToken(url) {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        console.log('Using default token for localhost\n');
        return DEFAULT_LOCAL_TOKEN;
    }
    const filePath = path.join(os.homedir(), '.teleprompter', 'token');
    try {
        const token = await fsPromises.readFile(filePath, 'utf-8');
        const trimmed = token.trim();
        if (isTokenValid(trimmed)) {
            return trimmed;
        }
    }
    catch { }
    const newToken = await cloudflareAccessLogin(url);
    return newToken;
}
//# sourceMappingURL=auth.js.map