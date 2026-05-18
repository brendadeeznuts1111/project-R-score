#!/usr/bin/env bun
// tools/setup-r2-credentials.ts — Guide for creating R2 API credentials

export {}; // Make this a module

console.info('🔑 To create R2 credentials, follow these steps:');
console.info('');
console.info('1. Go to: https://dash.cloudflare.com/profile/api-tokens');
console.info("2. Click 'Create Token'");
console.info("3. Use 'Custom token'");
console.info('4. Set these permissions:');
console.info('   - Account: Cloudflare R2:Edit');
console.info('   - Account Resources: Include All accounts');
console.info("5. Click 'Continue to summary' then 'Create Token'");
console.info('6. Copy the token and use it as your R2_SECRET_ACCESS_KEY');
console.info('');
console.info('Your R2_ACCESS_KEY_ID will be your account ID:');
console.info('7a470541a704caaf91e71efccc78fd36');
console.info('');
console.info('Then run:');
console.info("export R2_ACCESS_KEY_ID='7a470541a704caaf91e71efccc78fd36'");
console.info("export R2_SECRET_ACCESS_KEY='your_token_here'");
console.info('bun r2-benchmark.ts');
