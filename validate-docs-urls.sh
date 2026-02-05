#!/usr/bin/env bash

# 🔗 Documentation URL Health Check
# Validates critical documentation URLs are accessible

echo "🔍 Checking Documentation URL Health..."
echo "========================================="

# Critical Bun documentation URLs
URLS=(
    "https://bun.sh/docs"
    "https://bun.sh/docs/cli"
    "https://bun.sh/docs/api"
    "https://bun.sh/docs/runtime"
    "https://bun.sh/docs/api/utils"
    "https://bun.sh/docs/api/bun"
    "https://bun.sh/docs/api/file-io"
    "https://bun.sh/docs/api/fetch"
    "https://bun.sh/docs/bundler"
    "https://bun.sh/docs/deployment"
    "https://bun.sh/feed.xml"
    "https://bun.sh/blog"
    "https://github.com/oven-sh/bun"
    "https://github.com/oven-sh/bun/tree/main/packages/bun-types"
    "https://github.com/oven-sh/bun-types"
)

echo "Testing ${#URLS[@]} documentation URLs..."
echo ""

# Use Bun to check all URLs concurrently
bun -e "
const urls = [
    'https://bun.sh/docs',
    'https://bun.sh/docs/cli',
    'https://bun.sh/docs/api',
    'https://bun.sh/docs/runtime',
    'https://bun.sh/docs/api/utils',
    'https://bun.sh/docs/api/bun',
    'https://bun.sh/docs/api/file-io',
    'https://bun.sh/docs/api/fetch',
    'https://bun.sh/docs/bundler',
    'https://bun.sh/docs/deployment',
    'https://bun.sh/rss.xml',
    'https://bun.sh/blog',
    'https://github.com/oven-sh/bun',
    'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
    'https://github.com/oven-sh/bun-types'
];

const results = await Promise.all(
  urls.map(async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return { url, status: response.status, ok: response.ok };
    } catch (error) {
      return { url, status: 'ERROR', ok: false, error: error.message };
    }
  })
);

let successCount = 0;
let errorCount = 0;

results.forEach(({ url, status, ok, error }) => {
  const statusEmoji = ok ? '✅' : '❌';
  const statusText = error ? \`ERROR: \${error}\` : status;
  console.log(\`\${statusEmoji} \${statusText} - \${url}\`);

  if (ok) successCount++;
  else errorCount++;
});

console.log(\`\n📊 Results: \${successCount} successful, \${errorCount} failed\`);
console.log(\`🎯 Success rate: \${((successCount / urls.length) * 100).toFixed(1)}%\`);
"