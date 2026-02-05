#!/usr/bin/env bun
/**
 * @fileoverview Show Topic Mapping
 * @description Display the mapping between logical topic IDs and Telegram thread IDs
 */

import { getAllMappings, TOPIC_NAMES, getThreadId } from "./topic-mapping.js";

console.log("📋 Topic ID Mapping\n");
console.log("Logical Topic → Telegram Thread ID\n");

const mappings = getAllMappings();
for (const [name, threadId] of Object.entries(mappings)) {
	console.log(`  ${name.padEnd(25)} → Thread ID: ${threadId}`);
}

console.log("\n📌 Usage Examples:\n");
console.log("  # Use logical ID (6 = Changelog → Thread ID 99)");
console.log("  bun run telegram:changelog 5 6\n");
console.log("  # Use topic name");
console.log("  bun run telegram:changelog 5 changelog\n");
console.log("  # Use actual Telegram thread ID");
console.log("  bun run telegram:changelog 5 99\n");
console.log("  # All three above are equivalent!\n");

console.log("🔍 Reverse Lookup (Thread ID → Topic Name):\n");
for (const [threadId, name] of Object.entries(TOPIC_NAMES)) {
	console.log(`  Thread ID ${threadId.toString().padEnd(3)} → ${name}`);
}

console.log(
	"\n✅ Mapping is automatic - use logical IDs (1-7) or names in commands!",
);
