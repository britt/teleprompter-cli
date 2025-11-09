import React from 'react';
export interface Prompt {
    id: string;
    namespace: string;
    version: number;
    prompt?: string;
    created_at?: string;
}
interface PromptsListProps {
    url: string;
    token: string;
    verbose?: boolean;
    onSelectPrompt?: (promptId: string) => void;
}
export declare const PromptsList: React.FC<PromptsListProps>;
export {};
//# sourceMappingURL=PromptsList.d.ts.map