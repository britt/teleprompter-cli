import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import httpClient from '../http-client.js';
export const NewPromptForm = ({ url, token, onBack, onSuccess, verbose = false }) => {
    const [currentField, setCurrentField] = useState('id');
    const [id, setId] = useState('');
    const [namespace, setNamespace] = useState('');
    const [prompt, setPrompt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const { exit } = useApp();
    // Handle keyboard input
    useInput((input, key) => {
        if (isSubmitting)
            return;
        if (key.escape || (key.ctrl && input === 'b')) {
            onBack();
            return;
        }
        if (input === 'q') {
            exit();
            return;
        }
    }, { isActive: !isSubmitting });
    // Handle field submission
    const handleIdSubmit = () => {
        if (!id.trim()) {
            setErrorMessage('ID is required');
            setTimeout(() => setErrorMessage(null), 3000);
            return;
        }
        setCurrentField('namespace');
    };
    const handleNamespaceSubmit = () => {
        if (!namespace.trim()) {
            setErrorMessage('Namespace is required');
            setTimeout(() => setErrorMessage(null), 3000);
            return;
        }
        setCurrentField('prompt');
    };
    const handlePromptSubmit = async () => {
        if (!prompt.trim()) {
            setErrorMessage('Prompt text is required');
            setTimeout(() => setErrorMessage(null), 3000);
            return;
        }
        setIsSubmitting(true);
        try {
            if (verbose) {
                console.log(`Creating prompt: ${id}`);
            }
            const payload = {
                id: id.trim(),
                namespace: namespace.trim(),
                prompt: prompt.trim()
            };
            if (verbose) {
                console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);
            }
            const response = await httpClient.post(`${url}/prompts`, JSON.stringify(payload), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (verbose) {
                console.log(`Response status: ${response.status}`);
            }
            // Success - go back to list
            onSuccess();
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setErrorMessage(`Failed to create prompt: ${errorMsg}`);
            setIsSubmitting(false);
            if (verbose) {
                console.error('Error creating prompt:', errorMsg);
            }
            // Clear error after 5 seconds
            setTimeout(() => setErrorMessage(null), 5000);
        }
    };
    if (isSubmitting) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "cyan" }, "Creating prompt...")));
    }
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "green", bold: true }, "Create New Prompt")),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: currentField === 'id' ? 'cyan' : 'gray', bold: currentField === 'id' },
                "ID: ",
                currentField !== 'id' && id)),
        currentField === 'id' && (React.createElement(Box, { marginBottom: 1 },
            React.createElement(TextInput, { value: id, onChange: setId, onSubmit: handleIdSubmit, placeholder: "e.g., my-prompt-id" }))),
        (currentField === 'namespace' || currentField === 'prompt') && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: currentField === 'namespace' ? 'cyan' : 'gray', bold: currentField === 'namespace' },
                    "Namespace: ",
                    currentField !== 'namespace' && namespace)),
            currentField === 'namespace' && (React.createElement(Box, { marginBottom: 1 },
                React.createElement(TextInput, { value: namespace, onChange: setNamespace, onSubmit: handleNamespaceSubmit, placeholder: "e.g., my-namespace" }))))),
        currentField === 'prompt' && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan", bold: true }, "Prompt Text:")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(TextInput, { value: prompt, onChange: setPrompt, onSubmit: handlePromptSubmit, placeholder: "Enter your prompt text..." })))),
        errorMessage && (React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "red" }, errorMessage))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
            React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
            React.createElement(Text, { color: "gray", dimColor: true }, " to continue, "),
            React.createElement(Text, { color: "yellow", bold: true }, "Ctrl+B"),
            React.createElement(Text, { color: "gray", dimColor: true }, " to cancel, "),
            React.createElement(Text, { color: "yellow", bold: true }, "q"),
            React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
};
//# sourceMappingURL=NewPromptForm.js.map