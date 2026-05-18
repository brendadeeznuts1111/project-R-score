#!/usr/bin/env bun
/**
 * @fileoverview Show Topic Mapping
 * @description Display the mapping between logical topic IDs and Telegram thread IDs
 */

import { getAllMappings, TOPIC_NAMES, getThreadId } from "./topic-mapping.js";

console.info("📋 Topic ID Mapping\n");
console.info("Logical Topic → Telegram Thread ID\n");

const mappings = getAllMappings();
for (const [name, threadId] of Object.entries(mappings)) {
	console.info(`  ${name.padEnd(25)} → Thread ID: ${threadId}`);
}

console.info("\n📌 Usage Examples:\n");
console.info("  # Use logical ID (6 = Changelog → Thread ID 99)");
console.info("  bun run telegram:changelog 5 6\n");
console.info("  # Use topic name");
console.info("  bun run telegram:changelog 5 changelog\n");
console.info("  # Use actual Telegram thread ID");
console.info("  bun run telegram:changelog 5 99\n");
console.info("  # All three above are equivalent!\n");

console.info("🔍 Reverse Lookup (Thread ID → Topic Name):\n");
for (const [threadId, name] of Object.entries(TOPIC_NAMES)) {
	console.info(`  Thread ID ${threadId.toString().padEnd(3)} → ${name}`);
}

console.info(
	"\n✅ Mapping is automatic - use logical IDs (1-7) or names in commands!",
);
