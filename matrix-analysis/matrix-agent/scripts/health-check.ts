#!/usr/bin/env bun
/**
 * Matrix Agent Health Monitor
 * Checks system health and reports to logs
 *
 * Integrated with nolarose-mcp-config project
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const MATRIX_DIR = join(homedir(), ".matrix");
const LOGS_DIR = join(MATRIX_DIR, "logs");
const STATE_FILE = join(MATRIX_DIR, "agent-health-state.json");
const LOG_FILE = join(LOGS_DIR, "agent-health.jsonl");

interface HealthState {
  lastCheck: string;
  checks: Record<string, boolean>;
  metrics: {
    bunVersion: string;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

interface LogEntry {
  ts: string;
  checksPassed: number;
  checksFailed: number;
  checks: Record<string, boolean>;
}

async function ensureDirs(): Promise<void> {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

async function loadState(): Promise<HealthState | null> {
  try {
    if (existsSync(STATE_FILE)) {
      const text = await Bun.file(STATE_FILE).text();
      return JSON.parse(text);
    }
  } catch {
    // First run or corrupted state
  }
  return null;
}

async function saveState(state: HealthState): Promise<void> {
  await Bun.write(STATE_FILE, JSON.stringify(state, null, 2));
}

async function appendLog(entry: LogEntry): Promise<void> {
  await ensureDirs();
  const line = JSON.stringify(entry) + "\n";
  const existing = existsSync(LOG_FILE) ? await Bun.file(LOG_FILE).text() : "";
  await Bun.write(LOG_FILE, existing + line);
}

async function runChecks(): Promise<Record<string, boolean>> {
  const checks: Record<string, boolean> = {};

  // Check 1: Config exists
  checks["config-exists"] = existsSync(join(MATRIX_DIR, "agent/config.json"));

  // Check 2: Project package.json exists
  checks["project-valid"] = existsSync(join(process.cwd(), "package.json"));

  // Check 3: Bun version (should be >= 1.3.6)
  try {
    const result = await $`bun --version`.quiet();
    const version = result.stdout.toString().trim();
    const major = parseInt(version.split(".")[0]);
    const minor = parseInt(version.split(".")[1]);
    checks["bun-version"] = major > 1 || (major === 1 && minor >= 3);
  } catch {
    checks["bun-version"] = false;
  }

  // Check 4: TypeScript compilation
  try {
    const result = await $`bun tsc --noEmit`.quiet().nothrow();
    checks["typescript"] = result.exitCode === 0;
  } catch {
    checks["typescript"] = false;
  }

  // Check 5: Profiles directory
  checks["profiles-dir"] = existsSync(join(MATRIX_DIR, "profiles"));

  // Check 6: MCP config exists
  checks["mcp-config"] = existsSync(join(process.cwd(), ".mcp.json"));

  return checks;
}

async function getMetrics(): Promise<HealthState["metrics"]> {
  return {
    bunVersion: Bun.version,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

function formatReport(checks: Record<string, boolean>): string {
  const entries = Object.entries(checks);
  const passed = entries.filter(([, ok]) => ok).length;
  const total = entries.length;

  let msg = `🏥 Matrix Agent Health Check\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Result: ${passed}/${total} checks passed\n\n`;

  for (const [name, ok] of entries) {
    const icon = ok ? "✅" : "❌";
    const displayName = name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    msg += `  ${icon} ${displayName}\n`;
  }

  return msg;
}

async function main() {
  try {
    await ensureDirs();

    const checks = await runChecks();
    const metrics = await getMetrics();
    const passed = Object.values(checks).filter(Boolean).length;
    const failed = Object.keys(checks).length - passed;

    const state: HealthState = {
      lastCheck: new Date().toISOString(),
      checks,
      metrics,
    };

    await saveState(state);

    const logEntry: LogEntry = {
      ts: new Date().toISOString(),
      checksPassed: passed,
      checksFailed: failed,
      checks,
    };
    await appendLog(logEntry);

    const report = formatReport(checks);
    console.log(report);
    console.log(`\nMetrics:`);
    console.log(`  Bun: ${metrics.bunVersion}`);
    console.log(`  Platform: ${metrics.platform} (${metrics.arch})`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Health check failed:", error);
    process.exit(2);
  }
}

main();
