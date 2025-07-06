declare module '../dist/index.js' {
  import { Command } from 'commander';
  export function getAccessToken(url: string): Promise<string>;
  const program: Command;
  export default program;
}
