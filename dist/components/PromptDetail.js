import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import httpClient from '../http-client.js';
import { promises as fsPromises } from 'fs';
export const PromptDetail = ({ promptId, url, token, onBack, verbose = false }) => {
    const [prompt, setPrompt] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [exportMessage, setExportMessage] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportPath, setExportPath] = useState('');
    const [view, setView] = useState('detail');
    const [versions, setVersions] = useState(null);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
    const [rollbackMessage, setRollbackMessage] = useState(null);
    const { exit } = useApp();
    const { stdout } = useStdout();
    // Fixed maximum size for prompt display area
    // This avoids issues with word wrapping and dynamic height calculations
    const maxVisibleLines = 28;
    // Get terminal width for full-width separators
    const terminalWidth = stdout?.columns || 80;
    useEffect(() => {
        async function fetchPromptDetail() {
            try {
                if (verbose) {
                    console.log(`Fetching prompt details for: ${promptId}`);
                }
                const response = await httpClient.get(`${url}/prompts/${promptId}`);
                if (verbose) {
                    console.log(`Response status: ${response.status}`);
                }
                setPrompt(response.data);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                if (verbose) {
                    console.error('Error fetching prompt details:', errorMessage);
                }
            }
            finally {
                setLoading(false);
            }
        }
        fetchPromptDetail();
    }, [promptId, url, token, verbose]);
    // Generate default export filename
    const getDefaultExportPath = (promptToExport) => {
        const filename = promptToExport.id
            .replace(/:/g, '_')
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase();
        return `./${filename}.json`;
    };
    // Convert version timestamp to human-readable date
    const formatVersionDate = (version) => {
        const date = new Date(version);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    // Handle keyboard input
    useInput((input, key) => {
        // Don't handle normal navigation when exporting or in other views
        if (isExporting || view !== 'detail') {
            return;
        }
        if (input === 'q') {
            exit();
            return;
        }
        if (key.escape || input === 'b' || input === 'B') {
            onBack();
            return;
        }
        if (input === 'e' || input === 'E') {
            if (prompt) {
                const defaultPath = getDefaultExportPath(prompt);
                setExportPath(defaultPath);
                setIsExporting(true);
            }
            return;
        }
        if (input === 'v' || input === 'V') {
            setView('versions');
            fetchVersions();
            return;
        }
        if (input === 'r' || input === 'R') {
            setView('rollback');
            fetchVersions();
            return;
        }
        if (!prompt)
            return;
        // Get total lines for scrolling calculation
        const promptText = prompt.prompt || '';
        const normalizedText = promptText.replace(/\\n/g, '\n');
        const totalLines = normalizedText.split('\n').length;
        if (key.upArrow) {
            setScrollOffset(prev => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setScrollOffset(prev => Math.min(Math.max(0, totalLines - maxVisibleLines), prev + 1));
        }
    }, { isActive: !isExporting && view === 'detail' });
    // Export prompt to JSON file
    const exportPrompt = async (filepath, promptToExport) => {
        try {
            const exportData = {
                id: promptToExport.id,
                namespace: promptToExport.namespace,
                prompt: promptToExport.prompt
            };
            await fsPromises.writeFile(filepath, JSON.stringify(exportData, null, 2));
            setExportMessage(`Exported to ${filepath}`);
            setIsExporting(false);
            if (verbose) {
                console.log(`Exported ${promptToExport.id} to ${filepath}`);
            }
            // Clear message after 3 seconds
            setTimeout(() => setExportMessage(null), 3000);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setExportMessage(`Export failed: ${errorMessage}`);
            setIsExporting(false);
            if (verbose) {
                console.error('Error exporting prompt:', errorMessage);
            }
            // Clear message after 3 seconds
            setTimeout(() => setExportMessage(null), 3000);
        }
    };
    // Handle export path submission
    const handleExportSubmit = () => {
        if (prompt && exportPath) {
            exportPrompt(exportPath, prompt);
        }
    };
    // Handle export cancellation
    const handleExportCancel = () => {
        setIsExporting(false);
        setExportPath('');
    };
    // Handle keyboard input during export
    useInput((input, key) => {
        if (isExporting && (key.escape || (key.ctrl && input === 'b'))) {
            handleExportCancel();
        }
    }, { isActive: isExporting });
    // Fetch versions for the prompt
    const fetchVersions = async () => {
        if (!prompt)
            return;
        setVersionsLoading(true);
        try {
            if (verbose) {
                console.log(`Fetching versions for: ${prompt.id}`);
            }
            const response = await httpClient.get(`${url}/prompts/${prompt.id}/versions`);
            if (verbose) {
                console.log(`Found ${response.data.length} versions`);
            }
            setVersions(response.data);
            setSelectedVersionIndex(0);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (verbose) {
                console.error('Error fetching versions:', errorMessage);
            }
            setVersions([]);
        }
        finally {
            setVersionsLoading(false);
        }
    };
    // Perform rollback to selected version
    const performRollback = async (version) => {
        if (!prompt)
            return;
        try {
            if (verbose) {
                console.log(`Rolling back ${prompt.id} to version ${version}`);
            }
            const response = await httpClient.post(`${url}/prompts/${prompt.id}/versions/${version}`, {});
            if (verbose) {
                console.log(`Rollback successful`);
            }
            setRollbackMessage(`Rolled back to version ${version}`);
            setView('detail');
            // Refresh the prompt data
            const detailResponse = await httpClient.get(`${url}/prompts/${promptId}`);
            setPrompt(detailResponse.data);
            // Clear message after 3 seconds
            setTimeout(() => setRollbackMessage(null), 3000);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setRollbackMessage(`Rollback failed: ${errorMessage}`);
            if (verbose) {
                console.error('Error during rollback:', errorMessage);
            }
            // Clear message after 3 seconds
            setTimeout(() => setRollbackMessage(null), 3000);
        }
    };
    // Handle keyboard input for versions view
    useInput((input, key) => {
        if (input === 'q') {
            exit();
            return;
        }
        if (key.escape || input === 'b' || input === 'B') {
            setView('detail');
            return;
        }
        if (!versions || versions.length === 0)
            return;
        if (key.upArrow) {
            setSelectedVersionIndex(prev => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setSelectedVersionIndex(prev => Math.min(versions.length - 1, prev + 1));
        }
        if (key.return) {
            const selectedVersion = versions[selectedVersionIndex];
            if (selectedVersion && selectedVersion.prompt) {
                // Fetch and display the selected version
                setPrompt(selectedVersion);
                setView('detail');
            }
        }
        if (input === 'r' || input === 'R') {
            setView('rollback');
        }
    }, { isActive: view === 'versions' });
    // Handle keyboard input for rollback view
    useInput((input, key) => {
        if (input === 'q') {
            exit();
            return;
        }
        if (key.escape || input === 'b' || input === 'B') {
            setView('detail');
            return;
        }
        if (!versions || versions.length === 0)
            return;
        if (key.upArrow) {
            setSelectedVersionIndex(prev => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setSelectedVersionIndex(prev => Math.min(versions.length - 1, prev + 1));
        }
        if (key.return) {
            const selectedVersion = versions[selectedVersionIndex];
            if (selectedVersion) {
                performRollback(selectedVersion.version);
            }
        }
    }, { isActive: view === 'rollback' });
    // Show versions view
    if (view === 'versions') {
        if (versionsLoading) {
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "cyan" }, "Loading versions...")));
        }
        if (!versions || versions.length === 0) {
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "yellow" }, "No versions found."),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                    React.createElement(Text, { color: "yellow", bold: true }, "b"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to go back or "),
                    React.createElement(Text, { color: "yellow", bold: true }, "q"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
        }
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true },
                    "Versions for ",
                    prompt?.id)),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    "Found ",
                    versions.length,
                    " version",
                    versions.length !== 1 ? 's' : '',
                    " (current: v",
                    prompt?.version,
                    ")")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, versions.map((v, index) => {
                const isSelected = index === selectedVersionIndex;
                const isCurrent = v.version === prompt?.version;
                return (React.createElement(Box, { key: v.version, backgroundColor: isSelected ? 'blue' : undefined },
                    React.createElement(Text, { bold: isSelected, color: isCurrent ? 'green' : 'white' },
                        isCurrent ? '→ ' : '  ',
                        "v",
                        v.version),
                    React.createElement(Text, { bold: isSelected, color: isSelected ? 'white' : 'gray' }, " - "),
                    React.createElement(Text, { bold: isSelected, color: isSelected ? 'white' : 'gray' }, formatVersionDate(v.version)),
                    isCurrent && (React.createElement(Text, { bold: true, color: "green" }, " (current)"))));
            })),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "\u2191/\u2193"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to select, "),
                React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to view, "),
                React.createElement(Text, { color: "yellow", bold: true }, "r"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to rollback, "),
                React.createElement(Text, { color: "yellow", bold: true }, "b"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to go back, "),
                React.createElement(Text, { color: "yellow", bold: true }, "q"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
    }
    // Show rollback view with version selection
    if (view === 'rollback') {
        if (versionsLoading) {
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "cyan" }, "Loading versions...")));
        }
        if (!versions || versions.length === 0) {
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "yellow" }, "No versions found."),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                    React.createElement(Text, { color: "yellow", bold: true }, "b"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to go back or "),
                    React.createElement(Text, { color: "yellow", bold: true }, "q"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
        }
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true },
                    "Rollback ",
                    prompt?.id)),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    "Select version to rollback to (current: v",
                    prompt?.version,
                    ")")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, versions.map((v, index) => {
                const isSelected = index === selectedVersionIndex;
                const isCurrent = v.version === prompt?.version;
                return (React.createElement(Box, { key: v.version, backgroundColor: isSelected ? 'blue' : undefined },
                    React.createElement(Text, { bold: isSelected, color: isCurrent ? 'green' : 'white' },
                        isCurrent ? '→ ' : '  ',
                        "v",
                        v.version),
                    React.createElement(Text, { bold: isSelected, color: isSelected ? 'white' : 'gray' }, " - "),
                    React.createElement(Text, { bold: isSelected, color: isSelected ? 'white' : 'gray' }, formatVersionDate(v.version)),
                    isCurrent && (React.createElement(Text, { bold: true, color: "green" }, " (current)"))));
            })),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "\u2191/\u2193"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to select, "),
                React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to rollback, "),
                React.createElement(Text, { color: "yellow", bold: true }, "b"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to cancel, "),
                React.createElement(Text, { color: "yellow", bold: true }, "q"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
    }
    // Show export input interface
    if (isExporting && prompt) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true }, "Export Prompt")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" }, "Export path: ")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(TextInput, { value: exportPath, onChange: setExportPath, onSubmit: handleExportSubmit })),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to export or "),
                React.createElement(Text, { color: "yellow", bold: true }, "Ctrl+B"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to cancel"))));
    }
    if (loading) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "cyan" }, "Loading prompt details...")));
    }
    if (error) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "red", bold: true }, "Error:"),
            React.createElement(Text, { color: "red" }, error),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "b"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to go back or "),
                React.createElement(Text, { color: "yellow", bold: true }, "q"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
    }
    if (!prompt) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "yellow" }, "Prompt not found."),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "b"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to go back or "),
                React.createElement(Text, { color: "yellow", bold: true }, "q"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to quit"))));
    }
    // Split prompt text into lines for better display
    // Handle both actual newlines and escaped \n sequences
    const promptText = prompt.prompt || '';
    const normalizedText = promptText.replace(/\\n/g, '\n'); // Replace escaped \n with actual newlines
    const promptLines = normalizedText.split('\n');
    // Get visible lines based on scroll offset
    const visiblePromptLines = promptLines.slice(scrollOffset, scrollOffset + maxVisibleLines);
    const totalLines = promptLines.length;
    const canScroll = totalLines > maxVisibleLines;
    return (React.createElement(Box, { flexDirection: "column", height: "100%" },
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true }, "Prompt Details")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Box, null,
                    React.createElement(Text, { bold: true, color: "cyan" }, "ID: "),
                    React.createElement(Text, null, prompt.id)),
                React.createElement(Box, null,
                    React.createElement(Text, { bold: true, color: "cyan" }, "Namespace: "),
                    React.createElement(Text, { color: "magenta" }, prompt.namespace)),
                React.createElement(Box, null,
                    React.createElement(Text, { bold: true, color: "cyan" }, "Version: "),
                    React.createElement(Text, { color: "yellow" }, prompt.version)),
                prompt.created_at && (React.createElement(Box, null,
                    React.createElement(Text, { bold: true, color: "cyan" }, "Created: "),
                    React.createElement(Text, { color: "gray" }, prompt.created_at)))),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, '─'.repeat(terminalWidth)))),
        React.createElement(Box, { flexDirection: "column", height: maxVisibleLines }, visiblePromptLines.map((line, index) => (React.createElement(Text, { key: scrollOffset + index, color: "white" }, line || ' ')))),
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, '─'.repeat(terminalWidth))),
            React.createElement(Box, { paddingX: 1 },
                canScroll && (React.createElement(React.Fragment, null,
                    React.createElement(Text, { color: "gray", dimColor: true },
                        "Showing lines ",
                        scrollOffset + 1,
                        "-",
                        Math.min(scrollOffset + maxVisibleLines, totalLines),
                        " of ",
                        totalLines,
                        " \u2022"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " "))),
                React.createElement(Text, { color: "cyan", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "e"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to export, "),
                React.createElement(Text, { color: "yellow", bold: true }, "v"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " for versions, "),
                React.createElement(Text, { color: "yellow", bold: true }, "r"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to rollback, "),
                React.createElement(Text, { color: "yellow", bold: true }, "b"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to go back, "),
                React.createElement(Text, { color: "yellow", bold: true }, "q"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to quit")),
            (exportMessage || rollbackMessage) && (React.createElement(Box, { paddingX: 1 },
                React.createElement(Text, { color: "green" }, exportMessage || rollbackMessage))))));
};
//# sourceMappingURL=PromptDetail.js.map