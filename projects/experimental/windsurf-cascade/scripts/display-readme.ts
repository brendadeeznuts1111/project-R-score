#!/usr/bin/env bun

/**
 * Display README.md with formatting
 * Simulates markdansi output since the tool isn't displaying in this environment
 */

import { readFileSync } from 'fs';

const readme = readFileSync('README.md', 'utf8');

console.info('\n🎨 README.md Display (80 width, bright theme simulation)');
console.info('='.repeat(80));

// Add some basic formatting to simulate markdansi
const formatted = readme
    .replace(/^# (.+)$/gm, '\n\x1b[1;38;5;208m$1\x1b[0m')
    .replace(/^## (.+)$/gm, '\n\x1b[1;38;5;14m$1\x1b[0m')
    .replace(/^### (.+)$/gm, '\n\x1b[1;38;5;10m$1\x1b[0m')
    .replace(/^\*\*(.+)\*\*/gm, '\x1b[1;38;5;11m$1\x1b[0m')
    .replace(/^\- (.+)$/gm, '  \x1b[0;38;5;7m•\x1b[0m $1')
    .replace(/^```(\w+)$/gm, '\x1b[0;38;5;8m╭─ $1 ──────────────────────────────────────────╮\x1b[0m')
    .replace(/^```$/gm, '\x1b[0;38;5;8m╰───────────────────────────────────────────────╯\x1b[0m');

console.info(formatted);

console.info('\n' + '='.repeat(80));
console.info('📋 Original markdansi command would be:');
console.info('bunx markdansi --in README.md --width 80 --theme bright');
console.info('='.repeat(80));
