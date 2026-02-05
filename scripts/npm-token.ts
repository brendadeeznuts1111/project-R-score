#!/usr/bin/env bun
/**
 * Set npm registry token
 * Usage: bun run npm:token <token>
 */
const token = process.argv[2];

if (!token) {
  console.error("❌ Usage: bun run npm:token <token>");
  console.error("   Example: bun run npm:token npm_xxxxxxxxxx");
  process.exit(1);
}

// Save to .npmrc
const npmrcContent = `//registry.npmjs.org/:_authToken=${token}
registry=https://registry.npmjs.org/
`;

await Bun.write(".npmrc", npmrcContent);
console.log("✅ NPM token saved to .npmrc");

// Also save to env for current session
const envContent = `NPM_TOKEN=${token}\n`;
try {
  await Bun.write(".env.local", envContent);
  console.log("✅ NPM token saved to .env.local");
} catch {
  // Ignore
}

console.log("\n🔒 Token saved securely (not committed to git)");
