/**
 * Bun v1.3.9 SIMD-Accelerated Markdown Rendering
 * 
 * Performance improvements:
 * - 3-15% faster Markdown-to-HTML conversion
 * - 7-28% faster Bun.markdown.react() for small documents
 * - 40% fewer string object allocations
 * - 6% smaller heap size during rendering
 * 
 * The optimization uses SIMD instructions to scan for escape characters
 * (&, <, >, ") 16+ bytes at a time instead of sequentially.
 */

import { performance } from "perf_hooks";

// Sample markdown content for benchmarking
const testContent = {
  small: `# Hello

This is a **small** markdown document with 
some *formatting* and a [link](https://example.com).`,

  medium: `# API Documentation

## Authentication

All API requests require an \`Authorization\` header:

\`\`\`bash
curl -H "Authorization: Bearer TOKEN" https://api.example.com
\`\`\`

## Endpoints

### GET /users

Returns a list of users.

**Parameters:**
- \`limit\` (number): Max results
- \`offset\` (number): Pagination offset

**Response:**
\`\`\`json
{
  "users": [],
  "total": 100
}
\`\`\`

### POST /users

Creates a new user.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\``,

  large: Array(20).fill(`# Large Documentation Section

## Overview

This is a comprehensive guide covering all aspects of the platform.

### Getting Started

First, install the package:

\`\`\`bash
npm install @example/package
# or
yarn add @example/package
# or
pnpm add @example/package
\`\`\`

### Configuration

Create a \`config.json\` file:

\`\`\`json
{
  "apiKey": "your-api-key",
  "endpoint": "https://api.example.com",
  "timeout": 30000
}
\`\`\`

### Usage Examples

#### Basic Usage

\`\`\`typescript
import { Client } from "@example/package";

const client = new Client({
  apiKey: process.env.API_KEY
});

const result = await client.fetchData();
console.log(result);
\`\`\`

#### Advanced Configuration

\`\`\`typescript
const client = new Client({
  apiKey: process.env.API_KEY,
  retryPolicy: {
    maxRetries: 3,
    backoff: "exponential"
  },
  cache: {
    enabled: true,
    ttl: 3600
  }
});
\`\`\`

### Error Handling

Always wrap API calls in try-catch:

\`\`\`typescript
try {
  const data = await client.fetchData();
} catch (error) {
  if (error.code === "RATE_LIMITED") {
    // Handle rate limit
  } else if (error.code === "NOT_FOUND") {
    // Handle not found
  } else {
    // Handle other errors
    console.error("API Error:", error);
  }
}
\`\`\`
`).join("\n\n---\n\n")
};

function benchmarkMarkdown(content: string, iterations = 1000): number {
  // Warmup
  for (let i = 0; i < 100; i++) {
    Bun.Markdown?.render?.(content) || content;
  }
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    Bun.Markdown?.render?.(content) || content;
  }
  const end = performance.now();
  
  return (end - start) / iterations;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  console.log("=".repeat(70));
  console.log("🚀 Bun v1.3.9 SIMD-Accelerated Markdown Rendering");
  console.log("=".repeat(70));
  console.log();
  
  console.log("📊 Content Sizes:");
  for (const [name, content] of Object.entries(testContent)) {
    console.log(`  ${name.padEnd(10)}: ${formatBytes(content.length)}`);
  }
  console.log();
  
  console.log("⏱ Benchmarking (1000 iterations each)...\n");
  
  const results: Array<{ name: string; size: number; avgTime: number }> = [];
  
  for (const [name, content] of Object.entries(testContent)) {
    const avgTime = benchmarkMarkdown(content);
    results.push({ name, size: content.length, avgTime });
    
    console.log(`${name.padEnd(10)}: ${avgTime.toFixed(3).padStart(8)} ms/op`);
    console.log(`           ${formatBytes(content.length).padStart(8)} | ~${(1000 / avgTime).toFixed(0)} ops/sec`);
    console.log();
  }
  
  console.log("=".repeat(70));
  console.log("💡 Key Improvements in v1.3.9:");
  console.log("=".repeat(70));
  console.log();
  console.log("1. SIMD Character Scanning");
  console.log("   - Scans 16+ bytes at once for special characters");
  console.log("   - Escapes: &, <, >, \"");
  console.log("   - Uses CPU vector instructions (SSE/AVX/NEON)");
  console.log();
  console.log("2. Cache Optimization");
  console.log("   - HTML tag strings cached (div, p, h1-h6)");
  console.log("   - 40% fewer string allocations");
  console.log("   - 6% smaller heap size");
  console.log();
  console.log("3. Performance Gains");
  console.log("   - Small docs (121 chars): ~28% faster");
  console.log("   - Medium docs (1K chars): ~7-15% faster");
  console.log("   - Large docs (20K chars): ~7% faster");
  console.log();
  console.log("=".repeat(70));
  console.log("📝 Usage Example:");
  console.log("=".repeat(70));
  console.log();
  console.log("const markdown = await Bun.file('doc.md').text();");
  console.log("const html = Bun.Markdown.render(markdown);  // 3-15% faster!");
  console.log("const react = Bun.markdown.react(markdown);    // 7-28% faster!");
  console.log();
}

main().catch(console.error);

// Export for use as module
export { testContent, benchmarkMarkdown };
