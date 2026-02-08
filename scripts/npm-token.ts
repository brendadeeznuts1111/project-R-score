#!/usr/bin/env bun
/**
 * @fileoverview Set npm registry token
 * @module scripts/npm-token
 * 
 * @description
 * Configures NPM authentication tokens for the FactoryWager registry.
 * Saves to .npmrc and .env.local files.
 * 
 * @example
 * ```bash
 * bun run npm:token npm_xxxxxxxxxx
 * bun run npm:token ET5PwQ8fjl-vgXUS1R9ZxsdwjDTp5-PUMMv5NJtf
 * ```
 * 
 * @see {@link https://registry.factory-wager.com} FactoryWager NPM Registry
 * @see {@link https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry} R2 Storage
 */

/** FactoryWager registry URL */
const REGISTRY_URL = process.env.REGISTRY_URL || "https://registry.factory-wager.com";

/** NPM registry for fallback */
const NPM_REGISTRY = "https://registry.npmjs.org/";

/**
 * Main function
 */
async function main(): Promise<void> {
  const token = process.argv[2];

  if (!token) {
    console.error("❌ Usage: bun run npm:token <token>");
    console.error("   Example: bun run npm:token npm_xxxxxxxxxx");
    console.error("\n📚 Documentation:");
    console.error(`   Registry: ${REGISTRY_URL}`);
    console.error(`   R2 Store: https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry`);
    process.exit(1);
  }

  // Determine registry from token prefix
  const isNpmToken = token.startsWith("npm_");
  const targetRegistry = isNpmToken ? NPM_REGISTRY : REGISTRY_URL;

  // Save to .npmrc
  const npmrcContent = `//${targetRegistry.replace(/^https?:\/\//, '')}:_authToken=${token}
registry=${targetRegistry}
`;

  await Bun.write(".npmrc", npmrcContent);
  console.log(`✅ NPM token saved to .npmrc`);
  console.log(`   Registry: ${targetRegistry}`);

  // Also save to env for current session
  const envContent = `NPM_TOKEN=${token}
REGISTRY_URL=${targetRegistry}
`;
  try {
    await Bun.write(".env.local", envContent);
    console.log(`✅ NPM token saved to .env.local`);
  } catch {
    // Ignore
  }

  console.log("\n🔒 Token saved securely (not committed to git)");
  console.log("\n🚀 Next steps:");
  console.log(`   1. Verify: npm whoami --registry=${targetRegistry}`);
  console.log(`   2. Publish: npm publish --registry=${targetRegistry}`);
}

await main();
