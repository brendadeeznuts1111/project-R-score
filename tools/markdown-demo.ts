#!/usr/bin/env bun

/**
 * 📝 Bun.markdown Demo
 * 
 * Demonstrates all three Bun.markdown APIs:
 * - Bun.markdown.html() - Render to HTML string
 * - Bun.markdown.render() - Custom rendering with callbacks
 * - Bun.markdown.react() - Render to React elements
 * 
 * @see https://bun.com/docs/runtime/markdown
 */

import { styled } from '../lib/theme/colors';

const sampleMarkdown = `
# Hello World

This is **bold** and *italic* text.

## Features

| Feature | Status |
|---------|--------|
| Tables | ✅ |
| Strikethrough | ~~done~~ |
| Task lists | [x] done |

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`

Visit https://bun.sh for more info!
`;

console.log(styled`{bold}{cyan}📝 Bun.markdown API Demo{/cyan}{/bold}\n`);

// ============================================================================
// 1. Bun.markdown.html() - Simple HTML output
// ============================================================================
console.log(styled`{bold}1. Bun.markdown.html(){/bold}`);
console.log("Simple HTML rendering with GFM support:\n");

const html = Bun.markdown.html(sampleMarkdown, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
});

console.log("Output:");
console.log(html);
console.log();

// ============================================================================
// 2. Bun.markdown.render() - Custom callbacks
// ============================================================================
console.log(styled`{bold}2. Bun.markdown.render(){/bold}`);
console.log("Custom rendering with callbacks:\n");

// ANSI terminal output
const ansi = Bun.markdown.render(sampleMarkdown, {
  heading: (children, { level }) => {
    const colors = ['\x1b[1;31m', '\x1b[1;32m', '\x1b[1;33m', '\x1b[1;34m', '\x1b[1;35m', '\x1b[1;36m'];
    const color = colors[level - 1] || '\x1b[1m';
    return `${color}${children}\x1b[0m\n${'─'.repeat(40)}\n`;
  },
  paragraph: children => `${children}\n`,
  strong: children => `\x1b[1m${children}\x1b[22m`,
  emphasis: children => `\x1b[3m${children}\x1b[23m`,
  code: (children, { language }) => `\x1b[90m[${language || 'code'}]\x1b[0m\n\x1b[7m${children}\x1b[27m\n`,
  link: (children, { href }) => `\x1b[34m\x1b[4m${children}\x1b[0m \x1b[90m(${href})\x1b[0m`,
  list: children => children,
  listItem: (children, { checked }) => {
    const checkbox = checked !== undefined ? `[${checked ? 'x' : ' '}] ` : '';
    return `  • ${checkbox}${children}\n`;
  },
  table: children => `\n${children}\n`,
  tr: children => `${children}\n`,
  th: (children, meta) => ` \x1b[1m${children}\x1b[0m |`,
  td: (children, meta) => ` ${children} |`,
  text: children => children,
});

console.log("ANSI Terminal Output:");
console.log(ansi);

// ============================================================================
// 3. Stripping all formatting (plaintext)
// ============================================================================
console.log(styled`{bold}3. Plaintext (stripping all formatting){/bold}\n`);

const plaintext = Bun.markdown.render(sampleMarkdown, {
  heading: children => `${children}\n`,
  paragraph: children => `${children}\n`,
  strong: children => children,
  emphasis: children => children,
  link: children => children,
  image: () => "",
  code: children => children,
  codespan: children => children,
  table: children => children,
  tr: children => `${children}\n`,
  th: (children, meta) => `${children} `,
  td: (children, meta) => `${children} `,
  text: children => children,
});

console.log("Plaintext Output:");
console.log(plaintext);

// ============================================================================
// 4. Advanced: Extract all URLs
// ============================================================================
console.log(styled`{bold}4. Extract all URLs from markdown{/bold}\n`);

const urls: string[] = [];
Bun.markdown.render(sampleMarkdown, {
  link: (children, { href }) => {
    urls.push(href);
    return null;
  },
  autolink: ({ href }) => {
    urls.push(href);
    return null;
  },
  paragraph: () => null,
  heading: () => null,
  text: () => null,
}, { autolinks: true });

console.log("URLs found:", urls);
console.log();

// ============================================================================
// 5. Parser Options Demo
// ============================================================================
console.log(styled`{bold}5. Parser Options{/bold}\n`);

const optionsDemo = `
## Heading with ID

Visit www.example.com for more info.

This ~~strikethrough~~ is removed without strikethrough option.

- [x] Task item
- [ ] Unchecked task
`;

console.log("With all GFM features enabled:");
const fullGfm = Bun.markdown.html(optionsDemo, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  headings: true,
});
console.log(fullGfm);

console.log("With minimal features:");
const minimal = Bun.markdown.html(optionsDemo, {
  tables: false,
  strikethrough: false,
  tasklists: false,
  autolinks: false,
  headings: false,
});
console.log(minimal);

// ============================================================================
// Summary
// ============================================================================
console.log(styled`{bold}{green}✅ Demo complete!{/green}{/bold}`);
console.log();
console.log("Key APIs:");
console.log("  • Bun.markdown.html(markdown, options) - Fast HTML output");
console.log("  • Bun.markdown.render(markdown, callbacks, options) - Custom rendering");
console.log("  • Bun.markdown.react(markdown) - React elements");
console.log();
console.log("Documentation: https://bun.com/docs/runtime/markdown");
