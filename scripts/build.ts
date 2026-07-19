#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io — Bun.write
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../config/urls.ts';
import { mkdirSync } from 'fs';

// Build script that follows Bun's native patterns
async function build() {
  console.info('🚀 Building Bun TypedArray Documentation Portal...\n');

  // 1. Fetch all documentation URLs to verify they exist
  console.info('📋 Validating documentation URLs...');

  const urlsToCheck = [
    `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
    `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}`,
    `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
    RSS_URLS.BUN_BLOG,
  ];

  const results = await Promise.allSettled(
    urlsToCheck.map(async url => {
      const response = await fetch(url, { method: 'HEAD' });
      return { url, status: response.status, ok: response.ok };
    })
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.info(`  ${result.value.ok ? '✅' : '❌'} ${urlsToCheck[i]} - ${result.value.status}`);
    } else {
      console.info(`  ❌ ${urlsToCheck[i]} - Failed to fetch`);
    }
  });

  // 2. Generate URL manifest
  console.info('\n📄 Generating URL manifest...');

  const manifest = {
    generated: new Date().toISOString(),
    baseUrl: BUN_DOCS.BASE,
    typedArray: {
      base: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
      methods: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}`,
      conversion: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}`,
      examples: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.EXAMPLES}`,
    },
    api: {
      fetch: `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
      http: `${BUN_DOCS.BASE}${BUN_DOCS.API.HTTP}`,
      websocket: `${BUN_DOCS.BASE}${BUN_DOCS.API.WEBSOCKET}`,
    },
    runtime: {
      binary_data: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`,
      filesystem: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.FILESYSTEM}`,
      networking: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.NETWORKING}`,
    },
    feeds: {
      rss: RSS_URLS.BUN_BLOG,
      updates: RSS_URLS.BUN_UPDATES,
      our_feed: 'http://example.com/feed/rss',
    },
  };

  // Create public directory if it doesn't exist
  mkdirSync('public', { recursive: true });
  await Bun.write('public/manifest.json', JSON.stringify(manifest, null, 2));
  console.info('  ✅ Generated public/manifest.json');

  // 3. Create example script
  console.info('\n📝 Creating example script...');

  const exampleScript = `// Example: Fetching Bun TypedArray Documentation
// Generated: ${new Date().toISOString()}

// Base URL for all typed array documentation
const TYPED_ARRAY_BASE = "${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}";

// Fetch example following Bun's documentation pattern
async function fetchTypedArrayDocs() {
  const response = await fetch(TYPED_ARRAY_BASE);
  console.info(\`Status: \${response.status}\`);

  if (response.ok) {
    // Get the documentation content
    const text = await response.text();
    console.info(\`Fetched \${text.length} bytes\`);
    return text;
  }

  throw new Error(\`Failed to fetch: \${response.status}\`);
}

// Fetch multiple documentation sections
async function fetchAllDocs() {
  const urls = [
    "${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}",
    "${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}",
    "${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}",
  ];

  const responses = await Promise.all(
    urls.map(url => fetch(url).then(r => ({ url, status: r.status })))
  );

  return responses;
}

// Test the fetch
console.info("Testing Bun TypedArray documentation fetch...");
fetchTypedArrayDocs().catch(console.error);
`;

  // Create examples directory if it doesn't exist
  mkdirSync('examples', { recursive: true });
  await Bun.write('examples/fetch-example.js', exampleScript);
  console.info('  ✅ Generated examples/fetch-example.js');

  // 4. Create README with fetch examples
  console.info('\n📖 Creating README...');

  const readme = `# Bun TypedArray Documentation Portal

## Base URL Pattern
All typed array documentation follows this pattern:
\`\`\`
${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}
\`\`\`

## Quick Start
\`\`\`bash
# Clone and install
git clone <repo>
cd bun-typedarray-docs
bun install

# Start the server
bun run dev

# Access endpoints
curl http://example.com/api/typedarray/urls
\`\`\`

## Fetch Examples (Bun Native Pattern)
\`\`\`javascript
// Example 1: Basic fetch (from Bun docs)
const response = await fetch("${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}");
console.info(response.status); // => 200
const text = await response.text();

// Example 2: Fetch JSON data
const urlResponse = await fetch("http://example.com/api/typedarray/urls");
const data = await urlResponse.json();
console.info(data.base); // => "${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}"

// Example 3: Fetch RSS feed
const rssResponse = await fetch("http://example.com/feed/rss");
const rssXml = await rssResponse.text();
\`\`\`

## Available Endpoints
| Endpoint | Description | Example |
|----------|-------------|---------|
| \`/docs/typedarray\` | TypedArray documentation | \`GET /docs/typedarray#methods\` |
| \`/api/fetch\` | Fetch API examples | \`GET /api/fetch\` |
| \`/api/typedarray/urls\` | All typed array URLs | \`GET /api/typedarray/urls\` |
| \`/feed/rss\` | RSS feed (XML) | \`GET /feed/rss\` |
| \`/feed/json\` | JSON feed | \`GET /feed/json\` |

## Development
\`\`\`bash
# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build
\`\`\`
`;

  await Bun.write('README.md', readme);
  console.info('  ✅ Generated README.md');

  console.info('\n✨ Build complete!');
  console.info('\n🚀 Start the server:');
  console.info('   bun run dev');
  console.info('\n🌐 Then visit: http://example.com');
}

// Run the build
if (import.meta.main) {
  build().catch(console.error);
}
