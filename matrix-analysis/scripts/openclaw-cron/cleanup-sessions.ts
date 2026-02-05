#!/usr/bin/env bun
/**
 * Session Cleanup Script
 * Runs at 2:00 AM daily to clean stale sessions
 */

import { $ } from "bun";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";

const SESSIONS_DIR = `${process.env.HOME}/.openclaw/agents/main/sessions`;
const STALE_HOURS = 48;

async function cleanupSessions() {
  console.log("🧹 Cleaning up stale sessions...");
  
  try {
    const files = await readdir(SESSIONS_DIR);
    const now = Date.now();
    let cleaned = 0;
    
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      
      const filepath = join(SESSIONS_DIR, file);
      const stats = await stat(filepath);
      const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
      
      if (ageHours > STALE_HOURS) {
        await unlink(filepath);
        cleaned++;
        console.log(`  🗑️  ${file} (${ageHours.toFixed(1)}h old)`);
      }
    }
    
    console.log(`✅ Cleaned ${cleaned} stale sessions`);
    
  } catch (error) {
    console.error("❌ Session cleanup failed:", error);
    process.exit(1);
  }
}

cleanupSessions();
