#!/usr/bin/env bun
/**
 * Get Fire22 Token - Simple Interactive Guide
 * Helps users get a Bearer token from Fantasy402.com
 */

import { updateToken } from './fire22-token-updater';

console.log(`
🔑 Fire22 Token Fetcher
!==!==!==!====

This will guide you through getting a Bearer token from Fantasy402.com

📝 Steps:
1. Open your browser
2. Navigate to: https://fantasy402.com
3. Login with your credentials
4. Open Developer Tools (F12 or right-click → Inspect)
5. Go to the "Network" tab
6. Click on any request to the API (look for "cloud/api")
7. Find the "Authorization" header in the Request Headers
8. Copy the entire value (including "Bearer ")

Example token format:
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

`);

const prompt = 'Paste your token here (or press Enter to open browser): ';
process.stdout.write(prompt);

for await (const line of console) {
  const input = line.trim();

  if (input === '') {
    // Open browser to the login page
    console.log('\n🌐 Opening browser...\n');
    const { $ } = await import('bun');

    const opener =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

    await $`${opener} https://fantasy402.com`;

    console.log('Browser opened! Follow these steps:');
    console.log('1. Login to your account');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Network tab');
    console.log('4. Look for any "cloud/api" request');
    console.log('5. Copy the Authorization header value\n');

    process.stdout.write('Paste token when ready: ');
    continue;
  }

  // Clean up the token
  let token = input.replace(/^["']|["']$/g, '').trim();

  // Remove "Bearer " if present
  const bearerToken = token.replace(/^Bearer\s+/i, '');

  // Validate it looks like a JWT token
  if (!bearerToken.startsWith('eyJ')) {
    console.error('\n❌ Invalid token format. JWT tokens should start with "eyJ"');
    console.log('Please copy the entire Authorization header value\n');
    process.stdout.write(prompt);
    continue;
  }

  // Update the token
  console.log('\n');
  await updateToken(bearerToken);

  console.log('\n✅ Done! Your token has been saved.\n');
  console.log('You can now run any of these commands:');
  console.log('  bun run scripts/fire22-auto-refresh-client.ts');
  console.log('  bun run scripts/fire22-authenticated-client.ts');

  process.exit(0);
}
