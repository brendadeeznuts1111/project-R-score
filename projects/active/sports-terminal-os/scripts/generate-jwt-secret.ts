#!/usr/bin/env bun
/**
 * JWT Secret Generator
 *
 * Generates a cryptographically secure random JWT secret.
 * Outputs the secret in multiple formats for easy configuration.
 *
 * Usage:
 *   bun run scripts/generate-jwt-secret.ts
 *   bun run generate-jwt-secret  (via package.json script)
 *
 * The generated secret is suitable for HS256 signing and should be
 * stored in your .env file as JWT_SECRET.
 */

/**
 * Generate a secure random string using Bun's crypto API.
 */
function generateSecret(length: number = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  // Convert to base64url (URL-safe, no padding)
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return base64;
}

function main(): void {
  console.log("\n🔐 Sports Terminal OS — JWT Secret Generator\n");

  const secret = generateSecret(64);

  console.log("Generated JWT Secret (copy this to your .env file):\n");
  console.log("─".repeat(70));
  console.log(`JWT_SECRET=${secret}`);
  console.log("─".repeat(70));

  console.log("\n📋 Environment file update:\n");
  console.log(`   Add the following line to your .env file:`);
  console.log(`   JWT_SECRET=${secret}\n`);

  // Security notice
  console.log("⚠️  Security Notes:");
  console.log("   • Keep this secret secure — never commit it to version control");
  console.log("   • Use different secrets for development and production");
  console.log("   • Minimum recommended length: 32 characters");
  console.log(`   • Generated length: ${secret.length} characters (base64url encoded)\n`);
}

main();
