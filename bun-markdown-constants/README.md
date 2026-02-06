# @bun-tools/markdown-constants

Enterprise-grade markdown constants and presets for Bun's built-in Markdown parser.

## Features

- 🔒 **Security Presets** - STRICT, MODERATE, DEVELOPER for different trust levels
- ⚡ **Feature Presets** - GFM, CommonMark, Docs, Blog, Terminal, Academic
- 🎯 **Domain-Specific** - React Apps, Static Sites, API Docs, Wikis, Email
- 🎨 **Renderer Templates** - Tailwind, Bootstrap, Semantic HTML
- ⚛️ **React Components** - Tailwind Typography, Chakra UI, MUI
- 🏭 **Factory Functions** - Easy renderer creation with caching
- ✅ **Input Validation** - Security and performance protections
- 🚀 **Production Ready** - Type-safe with comprehensive error handling

## Installation

```bash
# For development (using bun link)
bun link @bun-tools/markdown-constants

# For production (when published)
bun add @bun-tools/markdown-constants
```

## Quick Start

```typescript
import { MarkdownPresets, MARKDOWN_SECURITY, MARKDOWN_FEATURES } from '@bun-tools/markdown-constants';

// Safe HTML for user content
const renderUserContent = MarkdownPresets.html('BLOG', 'STRICT');

// React component with Tailwind
const MarkdownComponent = ({ content }) => 
  MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(content);

// CLI output
const renderForTerminal = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);
```

## Development

```bash
# Link for local development
cd bun-markdown-constants
bun link

# Use in another project
cd ../my-project
bun link @bun-tools/markdown-constants
```
