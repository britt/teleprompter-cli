import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import axios from 'axios';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { NewPromptForm } from './NewPromptForm.js';
export const PromptsList = ({ url, token, verbose = false, onSelectPrompt }) => {
    const [prompts, setPrompts] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportStep, setExportStep] = useState('pattern');
    const [exportPattern, setExportPattern] = useState('*');
    const [exportPath, setExportPath] = useState('./');
    const [exportMessage, setExportMessage] = useState(null);
    const [view, setView] = useState('list');
    const [versions, setVersions] = useState(null);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
    const [rollbackMessage, setRollbackMessage] = useState(null);
    const [currentPromptId, setCurrentPromptId] = useState(null);
    const { exit } = useApp();
    const { stdout } = useStdout();
    // Calculate visible rows based on terminal height
    // Reserve space for:
    // - Title with marginBottom (2 lines)
    // - Header row (1 line)
    // - Header separator (1 line)
    // - Footer separator (1 line)
    // - Footer text (1 line)
    // Total reserved: 7 lines
    const terminalHeight = stdout?.rows || 24;
    const visibleRows = Math.max(3, terminalHeight - 7);
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
    useEffect(() => {
        async function fetchPrompts() {
            try {
                if (verbose) {
                    console.log(`Making request to: ${url}/prompts`);
                }
                const response = await axios.get(`${url}/prompts`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'cf-access-token': token
                    }
                });
                if (verbose) {
                    console.log(`Response status: ${response.status}`);
                    console.log(`Found ${response.data.length} prompts`);
                }
                setPrompts(response.data);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                if (verbose) {
                    console.error('Error fetching prompts:', errorMessage);
                }
            }
            finally {
                setLoading(false);
            }
        }
        fetchPrompts();
    }, [url, token, verbose]);
    // Handle keyboard input
    useInput((input, key) => {
        // Don't handle normal navigation when exporting, filtering, or in other views
        if (isExporting || isFiltering || view !== 'list') {
            return;
        }
        if (input === 'q') {
            exit();
            return;
        }
        if (key.escape && filterText) {
            // Clear filter with ESC
            setFilterText('');
            setSelectedIndex(0);
            setScrollOffset(0);
            return;
        }
        if (input === 'f' || input === 'F') {
            setIsFiltering(true);
            return;
        }
        if (input === 'e' || input === 'E') {
            setIsExporting(true);
            setExportStep('pattern');
            setExportPattern('*');
            return;
        }
        if (input === 'n' || input === 'N') {
            setView('new');
            return;
        }
        if (!prompts)
            return;
        if (input === 'v' || input === 'V') {
            const selectedPrompt = prompts[selectedIndex];
            if (selectedPrompt) {
                setView('versions');
                fetchVersions(selectedPrompt.id);
            }
            return;
        }
        if (input === 'r' || input === 'R') {
            const selectedPrompt = prompts[selectedIndex];
            if (selectedPrompt) {
                setView('rollback');
                fetchVersions(selectedPrompt.id);
            }
            return;
        }
        // Handle Enter key to view prompt details
        if (key.return && onSelectPrompt) {
            const selectedPrompt = prompts[selectedIndex];
            if (selectedPrompt) {
                onSelectPrompt(selectedPrompt.id);
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => {
                const newIndex = Math.max(0, prev - 1);
                // Adjust scroll offset if needed
                if (newIndex < scrollOffset) {
                    setScrollOffset(newIndex);
                }
                return newIndex;
            });
        }
        if (key.downArrow) {
            setSelectedIndex(prev => {
                const newIndex = Math.min(prompts.length - 1, prev + 1);
                // Adjust scroll offset if needed
                if (newIndex >= scrollOffset + visibleRows) {
                    setScrollOffset(newIndex - visibleRows + 1);
                }
                return newIndex;
            });
        }
    }, { isActive: !isExporting && !isFiltering && view === 'list' });
    // Handle pattern submission
    const handlePatternSubmit = () => {
        setExportStep('path');
        setExportPath('./');
    };
    // Handle export cancellation
    const handleExportCancel = () => {
        setIsExporting(false);
        setExportStep('pattern');
        setExportPattern('*');
        setExportPath('./');
    };
    // Handle keyboard input during export
    useInput((input, key) => {
        if (isExporting && (key.escape || (key.ctrl && input === 'b'))) {
            handleExportCancel();
        }
    }, { isActive: isExporting });
    // Handle filter submit
    const handleFilterSubmit = () => {
        setIsFiltering(false);
        setSelectedIndex(0);
        setScrollOffset(0);
    };
    // Handle filter cancel
    const handleFilterCancel = () => {
        setIsFiltering(false);
        setFilterText('');
        setSelectedIndex(0);
        setScrollOffset(0);
    };
    // Handle keyboard input during filtering
    useInput((input, key) => {
        if (key.escape || (key.ctrl && input === 'b')) {
            handleFilterCancel();
        }
    }, { isActive: isFiltering });
    // Fetch versions for a prompt
    const fetchVersions = async (promptId) => {
        setVersionsLoading(true);
        setCurrentPromptId(promptId);
        try {
            if (verbose) {
                console.log(`Fetching versions for: ${promptId}`);
            }
            const response = await axios.get(`${url}/prompts/${promptId}/versions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'cf-access-token': token
                }
            });
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
    const performRollback = async (promptId, version) => {
        try {
            if (verbose) {
                console.log(`Rolling back ${promptId} to version ${version}`);
            }
            const response = await axios.post(`${url}/prompts/${promptId}/versions/${version}`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'cf-access-token': token
                }
            });
            if (verbose) {
                console.log(`Rollback successful`);
            }
            setRollbackMessage(`Rolled back ${promptId} to version ${version}`);
            setView('list');
            // Refresh the prompts list
            const listResponse = await axios.get(`${url}/prompts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'cf-access-token': token
                }
            });
            setPrompts(listResponse.data);
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
        if (input === 'b' || input === 'B') {
            setView('list');
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
        if (key.return && onSelectPrompt && currentPromptId) {
            const selectedVersion = versions[selectedVersionIndex];
            if (selectedVersion) {
                // Navigate to detail view of the selected version
                onSelectPrompt(currentPromptId);
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
        if (input === 'b' || input === 'B') {
            setView('list');
            return;
        }
        if (!versions || versions.length === 0 || !currentPromptId)
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
                performRollback(currentPromptId, selectedVersion.version);
            }
        }
    }, { isActive: view === 'rollback' });
    // Handle export path submission
    const handleExportSubmit = async () => {
        if (!prompts)
            return;
        try {
            // Ensure output directory exists
            await fsPromises.mkdir(exportPath, { recursive: true });
            // Filter prompts by pattern
            const regexPattern = exportPattern.replace(/\*/g, '.*');
            const matcher = new RegExp(`^${regexPattern}$`);
            const matchingPrompts = prompts.filter((p) => matcher.test(p.id));
            if (matchingPrompts.length === 0) {
                setExportMessage(`No prompts found matching pattern: ${exportPattern}`);
                setIsExporting(false);
                setTimeout(() => setExportMessage(null), 3000);
                return;
            }
            // Export each matching prompt
            let exportedCount = 0;
            for (const promptInfo of matchingPrompts) {
                try {
                    // Get full prompt details
                    const detailResponse = await axios.get(`${url}/prompts/${promptInfo.id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'cf-access-token': token
                        }
                    });
                    const prompt = detailResponse.data;
                    // Convert prompt ID to snake case filename
                    const filename = prompt.id
                        .replace(/:/g, '_')
                        .replace(/([A-Z])/g, '_$1')
                        .toLowerCase();
                    const filepath = path.join(exportPath, `${filename}.json`);
                    const exportData = {
                        id: prompt.id,
                        namespace: prompt.namespace,
                        prompt: prompt.prompt
                    };
                    await fsPromises.writeFile(filepath, JSON.stringify(exportData, null, 2));
                    exportedCount++;
                    if (verbose) {
                        console.log(`Exported ${prompt.id} to ${filepath}`);
                    }
                }
                catch (err) {
                    if (verbose) {
                        console.error(`Error exporting prompt ${promptInfo.id}:`, err instanceof Error ? err.message : 'Unknown error');
                    }
                }
            }
            setExportMessage(`Exported ${exportedCount} prompt${exportedCount !== 1 ? 's' : ''} to ${exportPath}`);
            setIsExporting(false);
            setTimeout(() => setExportMessage(null), 3000);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setExportMessage(`Export failed: ${errorMessage}`);
            setIsExporting(false);
            if (verbose) {
                console.error('Error during export:', errorMessage);
            }
            setTimeout(() => setExportMessage(null), 3000);
        }
    };
    // Handle successful prompt creation
    const handleNewPromptSuccess = async () => {
        setView('list');
        // Refresh the prompts list
        try {
            const response = await axios.get(`${url}/prompts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'cf-access-token': token
                }
            });
            setPrompts(response.data);
        }
        catch (err) {
            if (verbose) {
                console.error('Error refreshing prompts:', err instanceof Error ? err.message : 'Unknown error');
            }
        }
    };
    // Show new prompt form
    if (view === 'new') {
        return (React.createElement(NewPromptForm, { url: url, token: token, onBack: () => setView('list'), onSuccess: handleNewPromptSuccess, verbose: verbose }));
    }
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
        const currentPrompt = prompts?.find(p => p.id === currentPromptId);
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true },
                    "Versions for ",
                    currentPromptId)),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    "Found ",
                    versions.length,
                    " version",
                    versions.length !== 1 ? 's' : '',
                    " (current: v",
                    currentPrompt?.version,
                    ")")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, versions.map((v, index) => {
                const isSelected = index === selectedVersionIndex;
                const isCurrent = v.version === currentPrompt?.version;
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
        const currentPrompt = prompts?.find(p => p.id === currentPromptId);
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true },
                    "Rollback ",
                    currentPromptId)),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    "Select version to rollback to (current: v",
                    currentPrompt?.version,
                    ")")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, versions.map((v, index) => {
                const isSelected = index === selectedVersionIndex;
                const isCurrent = v.version === currentPrompt?.version;
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
    if (isExporting) {
        if (exportStep === 'pattern') {
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "green", bold: true }, "Export Prompts")),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "cyan" }, "Enter pattern (e.g., * for all, prefix:* for matching): ")),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(TextInput, { value: exportPattern, onChange: setExportPattern, onSubmit: handlePatternSubmit })),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                    React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to continue or "),
                    React.createElement(Text, { color: "yellow", bold: true }, "Ctrl+B"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to cancel"))));
        }
        else {
            // Calculate matching prompts for display
            const regexPattern = exportPattern.replace(/\*/g, '.*');
            const matcher = new RegExp(`^${regexPattern}$`);
            const matchingPrompts = prompts?.filter((p) => matcher.test(p.id)) || [];
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "green", bold: true }, "Export Prompts")),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "cyan" }, "Pattern: "),
                    React.createElement(Text, { color: "white" }, exportPattern)),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "cyan" },
                        "Matching prompts (",
                        matchingPrompts.length,
                        "):")),
                React.createElement(Box, { flexDirection: "column", marginBottom: 1, paddingLeft: 2 },
                    matchingPrompts.length === 0 ? (React.createElement(Text, { color: "yellow" }, "No prompts match this pattern")) : (matchingPrompts.slice(0, 10).map((p) => (React.createElement(Text, { key: p.id, color: "gray" },
                        "\u2022 ",
                        p.id,
                        " (",
                        p.namespace,
                        " v",
                        p.version,
                        ")")))),
                    matchingPrompts.length > 10 && (React.createElement(Text, { color: "gray", dimColor: true },
                        "... and ",
                        matchingPrompts.length - 10,
                        " more"))),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "cyan" }, "Export directory: ")),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(TextInput, { value: exportPath, onChange: setExportPath, onSubmit: handleExportSubmit })),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                    React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to export or "),
                    React.createElement(Text, { color: "yellow", bold: true }, "Ctrl+B"),
                    React.createElement(Text, { color: "gray", dimColor: true }, " to cancel"))));
        }
    }
    if (loading) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "cyan" }, "Loading prompts...")));
    }
    if (error) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "red", bold: true }, "Error:"),
            React.createElement(Text, { color: "red" }, error),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press 'q' to quit"))));
    }
    if (!prompts || prompts.length === 0) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "yellow" }, "No active prompts found."),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press 'q' to quit"))));
    }
    // Pad text to exact width and ensure single-line display
    const padText = (text, width) => {
        if (!text)
            return ' '.repeat(width);
        // Replace all newlines and multiple spaces with single space
        const singleLine = text.replace(/\s+/g, ' ').trim();
        const truncated = singleLine.length > width ? singleLine.substring(0, width - 3) + '...' : singleLine;
        return truncated.padEnd(width, ' ');
    };
    // Filter prompts based on ID prefix if filtering is active
    const filteredPrompts = filterText
        ? prompts.filter(p => p.id.toLowerCase().startsWith(filterText.toLowerCase()))
        : prompts;
    // Get visible prompts based on scroll offset
    const visiblePrompts = filteredPrompts.slice(scrollOffset, scrollOffset + visibleRows);
    // Fixed column widths - must be consistent for all rows
    const idWidth = 35;
    const namespaceWidth = 25;
    const versionWidth = 15;
    const promptWidth = 60;
    // Helper component for table row
    const TableRow = ({ id, namespace, version, prompt, isSelected = false, isHeader = false }) => (React.createElement(Box, { backgroundColor: isSelected && !isHeader ? 'blue' : undefined },
        React.createElement(Box, { width: idWidth },
            React.createElement(Text, { bold: isHeader || isSelected, color: isHeader ? 'cyan' : undefined }, padText(String(id), idWidth))),
        React.createElement(Box, { width: namespaceWidth },
            React.createElement(Text, { bold: isHeader || isSelected, color: isHeader ? 'cyan' : (isSelected ? 'white' : 'magenta') }, padText(String(namespace), namespaceWidth))),
        React.createElement(Box, { width: versionWidth },
            React.createElement(Text, { bold: isHeader || isSelected, color: isHeader ? 'cyan' : (isSelected ? 'white' : 'yellow') }, padText(String(version), versionWidth))),
        React.createElement(Box, { width: promptWidth },
            React.createElement(Text, { bold: isHeader || isSelected, color: isHeader ? 'cyan' : (isSelected ? 'white' : 'gray') }, padText(String(prompt), promptWidth)))));
    // Show filter input if filtering
    if (isFiltering) {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true }, "Filter by ID prefix")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" }, "Filter: "),
                React.createElement(TextInput, { value: filterText, onChange: setFilterText, onSubmit: handleFilterSubmit, placeholder: "e.g., my-c" })),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to apply filter, "),
                React.createElement(Text, { color: "yellow", bold: true }, "ESC"),
                React.createElement(Text, { color: "gray", dimColor: true }, " or "),
                React.createElement(Text, { color: "yellow", bold: true }, "Ctrl+B"),
                React.createElement(Text, { color: "gray", dimColor: true }, " to cancel"))));
    }
    return (React.createElement(Box, { flexDirection: "column", height: "100%" },
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true },
                    "Active Prompts (",
                    filteredPrompts.length,
                    filterText ? ` filtered from ${prompts.length}` : '',
                    ") - Use \u2191\u2193 to scroll")),
            React.createElement(TableRow, { id: "ID", namespace: "Namespace", version: "Version", prompt: "Prompt", isHeader: true }),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, '─'.repeat(idWidth + namespaceWidth + versionWidth + promptWidth)))),
        React.createElement(Box, { flexDirection: "column", flexGrow: 1 }, visiblePrompts.map((prompt, index) => {
            const actualIndex = scrollOffset + index;
            const isSelected = actualIndex === selectedIndex;
            return (React.createElement(TableRow, { key: `${prompt.id}-${actualIndex}`, id: prompt.id, namespace: prompt.namespace, version: prompt.version, prompt: prompt.prompt || '', isSelected: isSelected }));
        })),
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, '─'.repeat(idWidth + namespaceWidth + versionWidth + promptWidth))),
            React.createElement(Box, { paddingX: 1 },
                React.createElement(Text, { color: "cyan", dimColor: true }, "Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "f"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to filter, "),
                React.createElement(Text, { color: "yellow", bold: true }, "n"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " for new, "),
                React.createElement(Text, { color: "yellow", bold: true }, "e"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to export, "),
                React.createElement(Text, { color: "yellow", bold: true }, "v"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " for versions, "),
                React.createElement(Text, { color: "yellow", bold: true }, "r"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to rollback, "),
                React.createElement(Text, { color: "yellow", bold: true }, "Enter"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " for details, "),
                React.createElement(Text, { color: "yellow", bold: true }, "q"),
                React.createElement(Text, { color: "cyan", dimColor: true }, " to quit")),
            filterText && (React.createElement(Box, { paddingX: 1 },
                React.createElement(Text, { color: "magenta" },
                    "Filter active: \"",
                    filterText,
                    "\" - Press "),
                React.createElement(Text, { color: "yellow", bold: true }, "f"),
                React.createElement(Text, { color: "magenta" }, " to change or "),
                React.createElement(Text, { color: "yellow", bold: true }, "ESC"),
                React.createElement(Text, { color: "magenta" }, " to clear"))),
            (exportMessage || rollbackMessage) && (React.createElement(Box, { paddingX: 1 },
                React.createElement(Text, { color: "green" }, exportMessage || rollbackMessage))))));
};
//# sourceMappingURL=PromptsList.js.map