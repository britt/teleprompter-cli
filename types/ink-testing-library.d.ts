declare module 'ink-testing-library' {
  import type {ReactElement} from 'react';
  interface Instance {
    lastFrame(): string | undefined;
    frames: string[];
  }
  export function render(tree: ReactElement): Instance;
}
