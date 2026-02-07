#!/usr/bin/env bun
// tools/setup-r2-credentials.ts — Guide for creating R2 API credentials

export {}; // Make this a module

console.log("🔑 To create R2 credentials, follow these steps:");
console.log("");
console.log("1. Go to: https://dash.cloudflare.com/profile/api-tokens");
console.log("2. Click 'Create Token'");
console.log("3. Use 'Custom token'");
console.log("4. Set these permissions:");
console.log("   - Account: Cloudflare R2:Edit");
console.log("   - Account Resources: Include All accounts");
console.log("5. Click 'Continue to summary' then 'Create Token'");
console.log("6. Copy the token and use it as your R2_SECRET_ACCESS_KEY");
console.log("");
console.log("Your R2_ACCESS_KEY_ID will be your account ID:");
console.log("7a470541a704caaf91e71efccc78fd36");
console.log("");
console.log("Then run:");
console.log("export R2_ACCESS_KEY_ID='7a470541a704caaf91e71efccc78fd36'");
console.log("export R2_SECRET_ACCESS_KEY='your_token_here'");
console.log("bun r2-benchmark.ts");
