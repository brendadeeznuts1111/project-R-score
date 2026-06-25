#!/usr/bin/env bun
/**
 * Store Telegram Bot Token using Bun.secrets
 * Per section 9.1.1.1.1.1.0: TELEGRAM_BOT_TOKEN naming convention
 * 
 * Based on official Bun.secrets API: https://bun.com/docs/runtime/secrets
 */

import { secrets } from "bun";

const SERVICE = "nexus";
const TOKEN = "8345728153:AAHzpWyeNl42-es-VNWlyHc_ReYlppDE5Lk";

console.info("Storing TELEGRAM_BOT_TOKEN...");
console.info(`Bot: @goldexamplesonly_bot`);

// Store using TELEGRAM_BOT_TOKEN as the name (per 9.1.1.1.1.1.0)
// According to Bun docs: value goes INSIDE the options object
try {
	await secrets.set({
		service: SERVICE,
		name: "TELEGRAM_BOT_TOKEN",
		value: TOKEN,
	});
	console.info("✅ Stored nexus.TELEGRAM_BOT_TOKEN");
} catch (error: any) {
	console.error("❌ Failed to store TELEGRAM_BOT_TOKEN");
	console.error("Error:", error?.message || String(error));
	process.exit(1);
}

// Also store as telegram.botToken for backward compatibility with existing code
console.info("\nStoring telegram.botToken (backward compatibility)...");
try {
	await secrets.set({
		service: SERVICE,
		name: "telegram.botToken",
		value: TOKEN,
	});
	console.info("✅ Stored nexus.telegram.botToken (backward compatibility)");
} catch (error: any) {
	console.warn("⚠️  Could not store telegram.botToken:", error?.message || error);
}

console.info("\n✅ Token storage complete!");
console.info("   Token stored as:");
console.info("   - nexus.TELEGRAM_BOT_TOKEN (per 9.1.1.1.1.1.0)");
console.info("   - nexus.telegram.botToken (backward compatibility)");
console.info("\n   Verify with:");
console.info('   bun -e "const s = await import(\'bun\'); console.info(await s.secrets.get({service:\'nexus\',name:\'TELEGRAM_BOT_TOKEN\'}))"');
