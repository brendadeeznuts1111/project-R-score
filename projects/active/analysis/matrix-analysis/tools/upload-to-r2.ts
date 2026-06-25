#!/usr/bin/env bun

/**
 * Upload FactoryWager binary to R2 storage
 */

const args = process.argv.slice(2);
const file = args.find((arg) => arg.startsWith("--file="))?.split("=")[1];
const version = args.find((arg) => arg.startsWith("--version="))?.split("=")[1];

if (!file || !version) {
	console.error("Usage: bun run upload-to-r2.ts --file=<path> --version=<version>");
	process.exit(1);
}

console.info(`📤 Uploading ${file} to R2 as factory-wager-${version}-darwin-arm64`);
console.info(
	`🔗 Binary URL: https://factory-wager-downloads.r2.cloudflarestorage.com/factory-wager-${version}-darwin-arm64`,
);
console.info(`✅ Upload simulated (R2 integration would go here)`);
