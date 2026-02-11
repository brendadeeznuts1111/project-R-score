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
  MARKDOWN_DOMAINS 
} from '../src/index';

console.log('=== Basic Usage Example ===\n');

// Example 1: Simple HTML rendering
console.log('1. Simple HTML Rendering');
console.log('-'.repeat(50));

const simpleRender = MarkdownPresets.html('GFM', 'MODERATE');
const markdown1 = `# Hello World

This is a **bold** paragraph with *italic* text.

- Item 1
- Item 2
- Item 3`;

const html1 = simpleRender(markdown1);
console.log('Input Markdown:');
console.log(markdown1);
console.log('\nOutput HTML:');
console.log(html1);

// Example 2: Rendering with tables
console.log('\n\n2. Rendering with Tables');
console.log('-'.repeat(50));

const tableMarkdown = `# Product Comparison

| Feature | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Price | Free | $10/mo | Custom |
| Support | Email | Priority | 24/7 |
| API | ❌ | ✅ | ✅ |`;

const html2 = simpleRender(tableMarkdown);
console.log(tableMarkdown);
console.log('\nRenders to HTML with tables support');

// Example 3: Different security levels
console.log('\n\n3. Security Levels');
console.log('-'.repeat(50));

const userContent = `# User Post

Check out <script>alert('xss')</script> this link!

<img src="http://evil.com/tracker.png" onload="stealData()">`;

// STRICT - blocks all HTML
const strictRender = MarkdownPresets.html('BLOG', 'STRICT');
console.log('STRICT mode (blocks dangerous HTML):');
console.log(strictRender(userContent).substring(0, 200) + '...');

// MODERATE - allows some HTML but filters dangerous content
const moderateRender = MarkdownPresets.html('BLOG', 'MODERATE');
console.log('\nMODERATE mode (filters dangerous content):');
console.log(moderateRender(userContent).substring(0, 200) + '...');

// Example 4: Domain-specific presets
console.log('\n\n4. Domain-Specific Presets');
console.log('-'.repeat(50));

console.log('Available presets:');
console.log('  - GFM: GitHub Flavored Markdown');
console.log('  - COMMONMARK: Standard CommonMark');
console.log('  - DOCS: Documentation sites');
console.log('  - BLOG: Blog/CMS content');
console.log('  - TERMINAL: CLI output');
console.log('  - ACADEMIC: Academic/technical writing');

console.log('\nSecurity presets:');
console.log('  - STRICT: Maximum security for untrusted content');
console.log('  - MODERATE: Balanced security');
console.log('  - DEVELOPER: Internal/trusted content');

// Example 5: Feature options
console.log('\n\n5. Individual Feature Options');
console.log('-'.repeat(50));

const customMarkdown = Bun.markdown.html(`# Test

~~Strikethrough~~ and **bold**`, {
  strikethrough: true,
  tables: true,
  autolinks: true
});

console.log('Custom options (strikethrough, tables, autolinks):');
console.log(customMarkdown);

console.log('\n=== Example Complete ===');
