#!/usr/bin/env bun
/**
 * Basic Usage Example
 *
 * Demonstrates the fundamental features of @bun-tools/markdown-constants
 */

import {
  MarkdownPresets,
  MARKDOWN_SECURITY,
  MARKDOWN_FEATURES,
  MARKDOWN_DOMAINS,
} from '../src/index';

console.info('=== Basic Usage Example ===\n');

// Example 1: Simple HTML rendering
console.info('1. Simple HTML Rendering');
console.info('-'.repeat(50));

const simpleRender = MarkdownPresets.html('GFM', 'MODERATE');
const markdown1 = `# Hello World

This is a **bold** paragraph with *italic* text.

- Item 1
- Item 2
- Item 3`;

const html1 = simpleRender(markdown1);
console.info('Input Markdown:');
console.info(markdown1);
console.info('\nOutput HTML:');
console.info(html1);

// Example 2: Rendering with tables
console.info('\n\n2. Rendering with Tables');
console.info('-'.repeat(50));

const tableMarkdown = `# Product Comparison

| Feature | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Price | Free | $10/mo | Custom |
| Support | Email | Priority | 24/7 |
| API | ❌ | ✅ | ✅ |`;

const html2 = simpleRender(tableMarkdown);
console.info(tableMarkdown);
console.info('\nRenders to HTML with tables support');

// Example 3: Different security levels
console.info('\n\n3. Security Levels');
console.info('-'.repeat(50));

const userContent = `# User Post

Check out <script>alert('xss')</script> this link!

<img src="http://evil.com/tracker.png" onload="stealData()">`;

// STRICT - blocks all HTML
const strictRender = MarkdownPresets.html('BLOG', 'STRICT');
console.info('STRICT mode (blocks dangerous HTML):');
console.info(strictRender(userContent).substring(0, 200) + '...');

// MODERATE - allows some HTML but filters dangerous content
const moderateRender = MarkdownPresets.html('BLOG', 'MODERATE');
console.info('\nMODERATE mode (filters dangerous content):');
console.info(moderateRender(userContent).substring(0, 200) + '...');

// Example 4: Domain-specific presets
console.info('\n\n4. Domain-Specific Presets');
console.info('-'.repeat(50));

console.info('Available presets:');
console.info('  - GFM: GitHub Flavored Markdown');
console.info('  - COMMONMARK: Standard CommonMark');
console.info('  - DOCS: Documentation sites');
console.info('  - BLOG: Blog/CMS content');
console.info('  - TERMINAL: CLI output');
console.info('  - ACADEMIC: Academic/technical writing');

console.info('\nSecurity presets:');
console.info('  - STRICT: Maximum security for untrusted content');
console.info('  - MODERATE: Balanced security');
console.info('  - DEVELOPER: Internal/trusted content');

// Example 5: Feature options
console.info('\n\n5. Individual Feature Options');
console.info('-'.repeat(50));

const customMarkdown = Bun.markdown.html(
  `# Test

~~Strikethrough~~ and **bold**`,
  {
    strikethrough: true,
    tables: true,
    autolinks: true,
  }
);

console.info('Custom options (strikethrough, tables, autolinks):');
console.info(customMarkdown);

console.info('\n=== Example Complete ===');
