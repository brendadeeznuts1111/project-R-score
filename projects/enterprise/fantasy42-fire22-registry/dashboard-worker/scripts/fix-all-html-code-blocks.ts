#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';

const htmlFilesWithCodeBlocks = [
  '/Users/nolarose/ff/dashboard-worker/onboarding-security.html',
  '/Users/nolarose/ff/dashboard-worker/login.html',
  '/Users/nolarose/ff/dashboard-worker/docs/stripe-payment-integration.html',
  '/Users/nolarose/ff/dashboard-worker/docs/terminal-ui-template.html',
  '/Users/nolarose/ff/dashboard-worker/docs/bun-features-explorer.html',
  '/Users/nolarose/ff/dashboard-worker/docs/api-packages.html',
  '/Users/nolarose/ff/dashboard-worker/docs/fire22-api-integration.html',
  '/Users/nolarose/ff/dashboard-worker/docs/build-automation-dashboard.html',
  '/Users/nolarose/ff/dashboard-worker/docs/bun-features-explorer-v2.html',
  '/Users/nolarose/ff/dashboard-worker/docs/@packages.html',
  '/Users/nolarose/ff/dashboard-worker/docs/environment-variables.html',
  '/Users/nolarose/ff/dashboard-worker/docs/packages.html',
  '/Users/nolarose/ff/dashboard-worker/docs/telegram-bot-integration.html',
  '/Users/nolarose/ff/dashboard-worker/docs/api-integrations-index.html',
  '/Users/nolarose/ff/dashboard-worker/docs/build-documentation.html',
  '/Users/nolarose/ff/dashboard-worker/docs/environment-management.html',
  '/Users/nolarose/ff/dashboard-worker/docs/cloudflare-workers-integration.html',
  '/Users/nolarose/ff/dashboard-worker/docs/fire22-dashboard-config.html',
  '/Users/nolarose/ff/dashboard-worker/docs/sendgrid-email-integration.html',
];

function fixHtmlCodeBlocks(filePath: string) {
  if (!existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  let modified = false;

  lines.forEach((line, index) => {
    // Check for code blocks (HTML code blocks, pre tags, or code-block divs) at odd line numbers
    const isCodeBlockStart =
      line.trim().includes('code-block') ||
      line.trim().startsWith('<code>') ||
      line.trim().startsWith('<pre>');

    if (isCodeBlockStart && (newLines.length + 1) % 2 !== 0) {
      // Add a blank line to make the code block start at an even line
      newLines.push('');
      modified = true;
    }

    newLines.push(line);
  });

  if (modified) {
    writeFileSync(filePath, newLines.join('\n'));
    console.log(`✅ Fixed ${filePath.split('/').pop()}`);
  } else {
    console.log(`⏭️ No changes needed for ${filePath.split('/').pop()}`);
  }
}

console.log('🔧 Fixing code block line numbering in HTML files...\n');

// Fix all HTML files with code blocks
htmlFilesWithCodeBlocks.forEach(fixHtmlCodeBlocks);

console.log('\n✅ HTML code block formatting complete!');
