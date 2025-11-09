#!/usr/bin/env bun
/**
 * Test script to demonstrate the Ink UI with mock data
 * This shows what the CLI looks like when connected to a real server
 *
 * Usage: bun run test-ui.ts
 *
 * Controls:
 * - ↑/↓ to scroll through prompts
 * - q to quit
 */
import React from 'react';
import { render } from 'ink';
import { PromptsList } from './components/PromptsList.js';
// Generate a comprehensive list of mock prompts to test scrolling
const mockPrompts = [
    {
        id: 'system-prompt',
        namespace: 'production',
        version: 3,
        prompt: 'You are a helpful AI assistant that provides clear and concise answers to user questions.'
    },
    {
        id: 'code-review-prompt',
        namespace: 'development',
        version: 2,
        prompt: 'Review the following code and provide suggestions for improvement, focusing on readability, performance, and best practices.'
    },
    {
        id: 'customer-support',
        namespace: 'production',
        version: 5,
        prompt: 'Assist customers with their questions in a friendly and professional manner. Always be empathetic and solution-oriented.'
    },
    {
        id: 'data-analysis',
        namespace: 'analytics',
        version: 1,
        prompt: 'Analyze the provided data and generate insights with visualizations when appropriate. Focus on actionable recommendations.'
    },
    {
        id: 'sql-generator',
        namespace: 'development',
        version: 4,
        prompt: 'Generate SQL queries based on natural language descriptions. Ensure queries are optimized and include proper error handling.'
    },
    {
        id: 'documentation-writer',
        namespace: 'development',
        version: 2,
        prompt: 'Write clear and comprehensive documentation for the given code. Include examples and edge cases.'
    },
    {
        id: 'bug-analyzer',
        namespace: 'production',
        version: 6,
        prompt: 'Analyze bug reports and provide root cause analysis with suggested fixes. Prioritize critical issues.'
    },
    {
        id: 'test-generator',
        namespace: 'development',
        version: 1,
        prompt: 'Generate comprehensive unit tests for the provided code. Cover edge cases and error scenarios.'
    },
    {
        id: 'api-designer',
        namespace: 'architecture',
        version: 3,
        prompt: 'Design RESTful APIs following best practices. Consider versioning, authentication, and rate limiting.'
    },
    {
        id: 'security-auditor',
        namespace: 'security',
        version: 7,
        prompt: 'Audit code for security vulnerabilities. Focus on common issues like injection attacks, XSS, and CSRF.'
    },
    {
        id: 'performance-optimizer',
        namespace: 'production',
        version: 2,
        prompt: 'Identify performance bottlenecks and suggest optimizations. Consider both frontend and backend improvements.'
    },
    {
        id: 'migration-planner',
        namespace: 'architecture',
        version: 1,
        prompt: 'Plan database migrations with minimal downtime. Include rollback strategies and data validation steps.'
    },
    {
        id: 'onboarding-assistant',
        namespace: 'hr',
        version: 4,
        prompt: 'Help new employees get up to speed with company processes, tools, and culture. Be welcoming and informative.'
    },
    {
        id: 'meeting-summarizer',
        namespace: 'productivity',
        version: 3,
        prompt: 'Summarize meeting transcripts into action items and key decisions. Highlight deadlines and owners.'
    },
    {
        id: 'email-composer',
        namespace: 'productivity',
        version: 2,
        prompt: 'Compose professional emails based on brief descriptions. Maintain appropriate tone and formality.'
    },
    {
        id: 'translation-assistant',
        namespace: 'localization',
        version: 5,
        prompt: 'Translate content while preserving context and cultural nuances. Flag idioms that need adaptation.'
    },
    {
        id: 'ui-designer',
        namespace: 'design',
        version: 1,
        prompt: 'Suggest UI improvements based on design principles and user experience best practices.'
    },
    {
        id: 'accessibility-checker',
        namespace: 'compliance',
        version: 3,
        prompt: 'Review interfaces for accessibility compliance. Provide WCAG-compliant recommendations.'
    },
    {
        id: 'changelog-generator',
        namespace: 'development',
        version: 2,
        prompt: 'Generate changelogs from commit messages. Categorize changes into features, fixes, and breaking changes.'
    },
    {
        id: 'incident-responder',
        namespace: 'operations',
        version: 8,
        prompt: 'Guide incident response procedures. Prioritize communication, mitigation, and post-mortem analysis.'
    },
    {
        id: 'capacity-planner',
        namespace: 'operations',
        version: 4,
        prompt: 'Analyze usage trends and recommend infrastructure scaling strategies. Consider cost optimization.'
    },
    {
        id: 'api-documentation',
        namespace: 'development',
        version: 3,
        prompt: 'Generate API documentation in OpenAPI format. Include request/response examples and error codes.'
    },
    {
        id: 'refactoring-guide',
        namespace: 'development',
        version: 2,
        prompt: 'Suggest refactoring strategies to improve code maintainability without changing behavior.'
    },
    {
        id: 'deployment-assistant',
        namespace: 'operations',
        version: 5,
        prompt: 'Guide deployment processes with pre-flight checks and rollback procedures. Emphasize safety.'
    },
    {
        id: 'monitoring-setup',
        namespace: 'operations',
        version: 1,
        prompt: 'Recommend monitoring and alerting strategies. Define SLIs, SLOs, and alert thresholds.'
    }
];
// Create a mock axios module
const axios = {
    get: async (url) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            status: 200,
            data: mockPrompts
        };
    }
};
globalThis.axios = axios;
console.log('Teleprompter CLI v2 - UI Demo');
console.log('=============================');
console.log('');
console.log('Controls:');
console.log('  ↑/↓  - Navigate through prompts');
console.log('  q    - Quit');
console.log('');
console.log('Loading...\n');
// Render the component with mock data
render(React.createElement(PromptsList, {
    url: 'http://localhost:3000',
    token: 'mock-token',
    verbose: false
}));
//# sourceMappingURL=test-ui.js.map