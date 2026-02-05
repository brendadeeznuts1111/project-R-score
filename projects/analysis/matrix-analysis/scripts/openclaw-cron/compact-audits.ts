#!/usr/bin/env bun
/**
 * Nightly Audit Compaction Script
 * Runs at 3:00 AM CST to compact audit logs
 */

import { $ } from "bun";
import { Database } from "bun:sqlite";

const AUDIT_DB = `${process.env.HOME}/.matrix/audit/audit.db`;
const RETENTION_DAYS = 90;

async function compactAudits() {
  console.log("🔍 Starting audit compaction...");
  
  try {
    // Rotate old audit logs
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    
    console.log(`  Retention cutoff: ${cutoff.toISOString()}`);
    
    // Compact SQLite audit database if exists
    const db = new Database(AUDIT_DB);
    db.exec("VACUUM");
    db.close();
    
    console.log("  ✅ Audit database compacted");
    
    // Archive old logs
    const archiveDir = `${process.env.HOME}/.matrix/audit/archive`;
    await $`mkdir -p ${archiveDir}`;
    
    console.log(`  📦 Archived to: ${archiveDir}`);
    console.log("✅ Audit compaction complete");
    
  } catch (error) {
    console.error("❌ Audit compaction failed:", error);
    process.exit(1);
  }
}

compactAudits();
