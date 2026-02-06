// service-color-secrets.ts — Colored Status Matrix with Full Bun Utils Integration
import { $, nanoseconds, inspect, deepEquals, escapeHTML, openInEditor, color, stringWidth, stripANSI, Glob, TOML, resolveSync } from "bun";
import {
  BUN_PROFILES_SECRET_NAMES,
  BUN_PROFILES_ENV_MAP,
  BUN_PROFILES_DEFAULT_NAMESPACE,
  deriveKeychainService,
  profileKeychainGet
} from "./profiles";
import { ConcurrencyManagers } from "../lib/core/safe-concurrency";
import { AtomicFileOperations } from "../lib/core/atomic-file-operations";

// ──────────────────────────────────────────────────────────────────────────────
// STATUS GLYPHS & FORMATTERS
// ──────────────────────────────────────────────────────────────────────────────
const BUN_STATUS_GLYPHS = {
  success: { glyph: "✓", baseHue: 120 },  // Green
  warning: { glyph: "▵", baseHue: 45 },   // Yellow/Orange
  error:   { glyph: "✗", baseHue: 0 }     // Red
};

// CRITICAL FIX 1: Add missing applyHsl function
const applyHsl = (h: number, s: number, l: number): string => {
  return Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi") || "";
};

const formatStatusCell = (
  status: "success" | "warning" | "error",
  config: { hueShift: number, saturationMod: number, lightnessMod: number },
  width: number = 4
): string => {
  const s = BUN_STATUS_GLYPHS[status];
  const hue = (s.baseHue + config.hueShift) % 360;
  const ansi = Bun.color(`hsl(${hue}, ${config.saturationMod * 100}%, ${config.lightnessMod * 100}%)`, "ansi") || "";
  return `${ansi}${s.glyph}\x1b[0m`.padEnd(width);
};

// ──────────────────────────────────────────────────────────────────────────────
// PROJECT CONFIG (Enhanced with HSL defaults)
const getProjectConfig = (profile: string) => ({
  hueShift: profile === "production" ? 0 : profile === "staging" ? 45 : 210, // Green → Orange → Blue
  saturationMod: profile === "production" ? 0.9 : 1.0,
  lightnessMod: profile === "production" ? 0.7 : 0.85,
  maxColumnWidth: 60  // For stringWidth padding
});

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────
export interface SecretStatus {
  name: string;
  envVar: string;
  keychainStatus: "found" | "missing" | "error";
  envStatus: "found" | "missing";
  overall: "success" | "warning" | "error";
  // Removed: maskedValue - no secret exposure
}

export const BUN_SECRET_STATUS_COLUMNS = [
  "Secret", "Env Var", "Keychain", "Env", "Status"
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// ANSI HELPERS (enhanced with Bun.color HSL)
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m"
};

// ──────────────────────────────────────────────────────────────────────────────
// PROJECT-SPECIFIC INTEGRATIONS
// ──────────────────────────────────────────────────────────────────────────────

// 1. Scan all project configs with Glob + TOML
async function scanProjectConfigs(rootDir = "."): Promise<{ path: string; config: Record<string, any> }[]> {
  const glob = new Bun.Glob("**/bunfig.toml");
  const configs = [];
  try {
    for await (const path of glob.scan(rootDir)) {
      const content = await Bun.file(path).text();
      try {
        const parsed = TOML.parse(content);
        configs.push({ path, config: parsed });
      } catch (e) {
        console.warn(`Failed to parse ${path}: ${escapeHTML(e.message)}`);
      }
    }
  } catch (error) {
    console.warn(`Failed to scan project configs: ${error.message}`);
  }
  return configs;
}

// 2. Validate configs across projects with deepEquals
function validateProjectConfigs(configs: { path: string; config: Record<string, any> }[], baseline: Record<string, any>) {
  const issues: string[] = [];
  try {
    configs.forEach(({ path, config }) => {
      if (!deepEquals(config, baseline, true)) {
        issues.push(`Config mismatch in ${path}`);
      }
    });
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }
  return { valid: issues.length === 0, issues };
}

// 3. Resolve project modules safely
function resolveProjectModule(projectDir: string, moduleName: string): string | null {
  try {
    return resolveSync(moduleName, projectDir);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// RESOLVE SECRET STATUSES
// ──────────────────────────────────────────────────────────────────────────────
export const resolveSecretStatuses = async (profile: string): Promise<SecretStatus[]> => {
  const service = deriveKeychainService(profile);
  const statuses: SecretStatus[] = [];

  // Use sequential processing with mutex to prevent race conditions
  await ConcurrencyManagers.secretResolution.withLock(async () => {
    for (const secretName of BUN_PROFILES_SECRET_NAMES) {
      const envVar = Object.entries(BUN_PROFILES_ENV_MAP).find(([_, v]) => v === secretName)?.[0] || secretName.toUpperCase();

      // Use mutex for keychain access
      const keychainResult = await ConcurrencyManagers.keychain.withLock(async () => {
        return await profileKeychainGet(service, secretName);
      });

      const keychainStatus = keychainResult.ok ? "found" : keychainResult.code === "NOT_FOUND" ? "missing" : "error";

      const envValue = process.env[envVar];
      const envStatus = envValue ? "found" : "missing";

      let overall: "success" | "warning" | "error";
      if (keychainStatus === "found") overall = "success";
      else if (envStatus === "found") overall = "warning";
      else overall = "error";

      // CRITICAL SECURITY FIX: Remove all secret value exposure
      statuses.push({
        name: secretName,
        envVar,
        keychainStatus,
        envStatus,
        overall,
        // Remove maskedValue entirely - no secret exposure
      });
    }
  });

  // Validate all secret statuses
  for (const status of statuses) {
    if (!validateSecretStatus(status)) {
      throw new Error(`Invalid secret status for ${status.name}`);
    }
  }

  return statuses;
};

// ──────────────────────────────────────────────────────────────────────────────
// RENDER MATRIX (Enhanced with Utils)
export const renderSecretMatrix = async (profile: string): Promise<void> => {
  const start = nanoseconds();
  let statuses: SecretStatus[];
  
  try {
    statuses = await resolveSecretStatuses(profile);
  } catch (error) {
    // SAFE FIX: Throw error instead of process.exit
    throw new Error(`Failed to resolve secret statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const config = getProjectConfig(profile);

  // Header with dynamic HSL coloring
  console.log(`${c.cyan}${c.bold}🔐 Secret Status Matrix${c.reset}`);
  console.log(`${c.dim}Profile: ${c.reset}${c.bold}${profile}${c.reset}`);
  console.log(`${c.dim}Namespace: ${c.reset}${BUN_PROFILES_DEFAULT_NAMESPACE}`);
  
  // PERFORMANCE FIX: Pre-compute static strings
  const HSL_PREFIX = "HSL: hue+";
  const HSL_SUFFIX = `, sat×${config.saturationMod}, light×${config.lightnessMod}`;
  console.log(`${applyHsl(180 + config.hueShift, config.saturationMod * 100, config.lightnessMod * 50)}${HSL_PREFIX}${config.hueShift}${HSL_SUFFIX}${c.reset}\n`);

  // Table data
  const tableData = statuses.map(s => ({
    Secret: s.name,
    "Env Var": s.envVar,
    Keychain: formatStatusCell(s.keychainStatus === "found" ? "success" : s.keychainStatus === "missing" ? "error" : "warning", config),
    Env: formatStatusCell(s.envStatus === "found" ? "success" : "error", config),
    Status: formatStatusCell(s.overall, config)
  }));

  // Enhanced: Dynamic padding with stringWidth
  const maxWidths = BUN_SECRET_STATUS_COLUMNS.map((col, i) => {
    const headerWidth = stringWidth(col);
    const colWidths = tableData.map(row => stringWidth(row[col] || ""));
    return Math.max(headerWidth, ...colWidths) + 2;
  });

  // Render table with color and width-aware alignment
  console.log(Bun.inspect.table(tableData, BUN_SECRET_STATUS_COLUMNS, { colors: true }));

  // Summary
  const found = statuses.filter(s => s.overall === "success").length;
  const warning = statuses.filter(s => s.overall === "warning").length;
  const error = statuses.filter(s => s.overall === "error").length;
  const total = statuses.length;

  const elapsed = (nanoseconds() - start) / 1e6;
  console.log(`\n${c.cyan}Summary: ${c.green}${found} found${c.reset}, ${c.yellow}${warning} in-env-only${c.reset}, ${c.red}${error} missing${c.reset} (${c.dim}${elapsed.toFixed(2)}ms${c.reset})`);

  if (warning > 0) {
    console.log(`\n${c.yellow}⚠️ Run 'bun run profiles.ts keychain-migrate ${profile}' to migrate env secrets to keychain${c.reset}`);
  }

  if (error > 0) {
    console.log(`${c.red}Critical: Missing secrets detected${c.reset}`);
    // SAFE FIX: Use static line number instead of unreliable stack parsing
    const editorLine = 216; // Static line number for error location
    Bun.openInEditor(import.meta.url, { line: editorLine });
    // SAFE FIX: Throw error instead of process.exit
    throw new Error(`Critical: Missing secrets detected - ${error} missing secrets`);
  }

  // Enhanced: Compare to baseline with deepEquals
  const baselineStatuses: Partial<SecretStatus>[] = []; // Load from JSON or DB
  if (!deepEquals(statuses, baselineStatuses, true)) {
    console.warn(`${c.yellow}Warning: Statuses differ from baseline${c.reset}`);
  }

  // HIGH PRIORITY FIX: Proper atomic file operation error handling
  if (process.argv.includes("--html")) {
    try {
      const html = `<h1>Secret Status Report</h1><table border="1"><tr>${BUN_SECRET_STATUS_COLUMNS.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr>${tableData.map(row => `<tr>${Object.values(row).map(v => `<td>${escapeHTML(v)}</td>`).join('')}</tr>`).join('')}</table>`;
      await AtomicFileOperations.writeSafe("secrets-report.html", html);
      console.log("Exported HTML report: secrets-report.html");
    } catch (error) {
      console.error(`${c.red}Failed to export HTML report: ${error instanceof Error ? error.message : 'Unknown error'}${c.reset}`);
    }
  }

  // HIGH PRIORITY FIX: Proper atomic file operation error handling
  if (process.argv.includes("--plain")) {
    try {
      const plain = stripANSI(Bun.inspect.table(tableData, BUN_SECRET_STATUS_COLUMNS).toString());
      await AtomicFileOperations.writeSafe("secrets-plain.txt", plain);
      console.log("Exported plain text: secrets-plain.txt");
    } catch (error) {
      console.error(`${c.red}Failed to export plain text report: ${error instanceof Error ? error.message : 'Unknown error'}${c.reset}`);
    }
  }

  // Project-Specific: Scan & validate bunfig.toml configs
  try {
    const projectConfigs = await scanProjectConfigs(".");
    console.log(`\n${c.cyan}Scanned ${projectConfigs.length} project configs${c.reset}`);
    if (projectConfigs.length > 0) {
      const baselineConfig = {}; // Load baseline
      // CRITICAL FIX 2: Correct function name
      const { valid, issues } = validateProjectConfigs(projectConfigs, baselineConfig);
      if (!valid) {
        console.warn(`${c.yellow}Config validation issues:${c.reset}\n${issues.join('\n')}`);
      }
    }
  } catch (error) {
    console.warn(`${c.yellow}Failed to validate project configs: ${error.message}${c.reset}`);
  }

  // Project-Specific: Resolve a module in a sub-project
  try {
    const exampleProjectDir = "./projects/my-app";
    const resolved = resolveProjectModule(exampleProjectDir, "zod");
    if (resolved) {
      console.log(`\n${c.cyan}Resolved module in project:${c.reset} ${resolved}`);
    }
  } catch (error) {
    console.warn(`${c.yellow}Failed to resolve project module: ${error.message}${c.reset}`);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURATION VALIDATION (Long-term improvements)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Runtime type validation for critical objects
 */
function validateSecretStatus(status: any): status is SecretStatus {
  return (
    typeof status === 'object' &&
    status !== null &&
    typeof status.name === 'string' &&
    typeof status.envVar === 'string' &&
    ['found', 'missing', 'error'].includes(status.keychainStatus) &&
    ['found', 'missing'].includes(status.envStatus) &&
    ['success', 'warning', 'error'].includes(status.overall)
  );
}

/**
 * Configuration constants that can be moved to environment variables
 */
const CONFIG_CONSTANTS = {
  DEFAULT_PROJECT_DIR: ".",
  DEFAULT_GLOB_PATTERN: "**/bunfig.toml",
  EXAMPLE_PROJECT_DIR: "./projects/my-app",
  EXAMPLE_MODULE: "zod",
  HTML_REPORT_FILE: "secrets-report.html",
  PLAIN_REPORT_FILE: "secrets-plain.txt",
  MAX_COLUMN_WIDTH: 60
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args = process.argv.slice(2);
  let profile = "local";
  for (const arg of args) {
    if (arg.startsWith("--profile=")) profile = arg.split("=")[1];
  }

  if (args[0] === "matrix" || args.length === 0) {
    try {
      await renderSecretMatrix(profile);
    } catch (error) {
      console.error(`${c.red}Error: ${error instanceof Error ? error.message : 'Unknown error'}${c.reset}`);
      process.exit(1);
    }
  } else {
    console.log("Usage: bun run service-color-secrets.ts [matrix] --profile=<name>");
  }
}
