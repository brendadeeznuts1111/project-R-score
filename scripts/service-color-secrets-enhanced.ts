// service-color-secrets.ts — Colored Status Matrix with Deep Project Integrations & Security
import {
  $, nanoseconds, inspect, deepEquals, escapeHTML, openInEditor, color,
  stringWidth, stripANSI, Glob, TOML, resolveSync, file, write, spawn
} from "bun";
import {
  BUN_PROFILES_SECRET_NAMES,
  BUN_PROFILES_ENV_MAP,
  BUN_PROFILES_DEFAULT_NAMESPACE,
  deriveKeychainService,
  profileKeychainGet
} from "./profiles";
import { validateHost, validatePort, sanitizeEnvVar } from "../lib/utils/env-validator";

// ──────────────────────────────────────────────────────────────────────────────
// STATUS GLYPHS & FORMATTERS (Advanced HSL-powered with perceptual adjustment)
// ──────────────────────────────────────────────────────────────────────────────
import {
  getStatusAnsi,
  getStatusColor,
  generateStatusConfig,
  STATUS_HUES,
  HSL_SWEET_SPOTS,
} from "../lib/utils/advanced-hsl-colors.js";

const BUN_STATUS_GLYPHS = {
  success: { glyph: "✓", baseHue: STATUS_HUES.success },
  warning: { glyph: "▵", baseHue: STATUS_HUES.warning },
  error:   { glyph: "✗", baseHue: STATUS_HUES.error }
};

// Advanced HSL formatter with perceptual brightness compensation
const applyHsl = (h: number, s: number, l: number): string => {
  return Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi") || "";
};

const formatStatusCell = (
  status: "success" | "warning" | "error",
  config: { hueShift: number, saturationMod: number, lightnessMod: number },
  width: number = 6,
  severity?: "low" | "medium" | "high"
): string => {
  const s = BUN_STATUS_GLYPHS[status];
  const baseHue = (s.baseHue + config.hueShift) % 360;
  
  // Use advanced status color with perceptual adjustment
  const hsl = getStatusColor(
    status,
    config.lightnessMod * 100,
    severity || "medium"
  );
  
  // Apply config modifiers while respecting sweet spots
  const adjustedHsl = {
    h: baseHue,
    s: Math.min(100, hsl.s * config.saturationMod),
    l: Math.min(100, hsl.l * config.lightnessMod),
  };
  
  const ansi = Bun.color(
    `hsl(${adjustedHsl.h}, ${adjustedHsl.s}%, ${adjustedHsl.l}%)`,
    "ansi"
  ) || "";
  
  return `${ansi}${s.glyph.padEnd(width - 2)}\x1b[0m`;
};

// ──────────────────────────────────────────────────────────────────────────────
// PROJECT CONFIG (per-profile HSL + project-specific tuning with sweet spots)
// ──────────────────────────────────────────────────────────────────────────────
const getProjectConfig = (profile: string, projectName?: string) => {
  // Use HSL sweet spots for better visual impact
  const profileHues: Record<string, number> = {
    production: HSL_SWEET_SPOTS.success.h[0] + 10, // ~130° (green)
    staging: HSL_SWEET_SPOTS.warning.h[0] + 5,     // ~35° (amber)
    default: HSL_SWEET_SPOTS.info.h[0] + 10,        // ~210° (blue)
  };
  
  const isCritical = projectName?.includes("critical") || projectName?.includes("security");
  const isLegacy = projectName?.includes("legacy");
  
  return {
    hueShift: profileHues[profile] || profileHues.default,
    saturationMod: isCritical ? 1.1 : 1.0,  // Boost sat for high-risk (within sweet spot)
    lightnessMod: isLegacy ? 0.7 : 0.85,    // Slightly darker for legacy (still visible)
    maxColumnWidth: 60,
    projectName: projectName || profile,
    // Generate status config for this profile
    statusConfig: generateStatusConfig(isLegacy ? 55 : 65),
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────
export interface SecretStatus {
  name: string;
  envVar: string;
  keychainStatus: "found" | "missing" | "error";
  envStatus: "found" | "missing";
  overall: "success" | "warning" | "error";
  maskedValue?: string;
}

export const BUN_SECRET_STATUS_COLUMNS = [
  "Secret", "Env Var", "Keychain", "Env", "Status"
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// ANSI HELPERS
// ──────────────────────────────────────────────────────────────────────────────
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

// 1. Scan all project directories with Glob (with security)
async function discoverProjects(root = "./projects"): Promise<string[]> {
  try {
    const glob = new Bun.Glob("*");
    const projects = [];
    for await (const name of glob.scan(root)) {
      const path = `${root}/${name}`;
      const file = Bun.file(path);
      if ((await file).exists() && (await file).isDirectory()) {
        // SECURITY: Validate path to prevent directory traversal
        if (!path.includes("..") && !path.includes("~")) {
          projects.push(path);
        }
      }
    }
    return projects;
  } catch (error) {
    console.warn(`${c.yellow}Failed to discover projects: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    return [];
  }
}

// 2. Load project package.json safely (with error handling)
async function loadProjectPackage(projectPath: string): Promise<Record<string, any> | null> {
  try {
    const pkgFile = Bun.file(`${projectPath}/package.json`);
    if (!(await pkgFile.exists())) return null;
    return await pkgFile.json();
  } catch (error) {
    console.warn(`${c.yellow}Failed to load package.json for ${projectPath}: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    return null;
  }
}

// 3. Derive org/project from package.json or git remote (with security)
async function deriveOrgProject(projectPath: string): Promise<{ org: string, project: string }> {
  const pkg = await loadProjectPackage(projectPath);
  if (pkg?.name?.startsWith("@")) {
    const [org, project] = pkg.name.split("/");
    return { 
      org: sanitizeEnvVar(org.slice(1), "default", false), 
      project: project.toLowerCase().replace(/[^a-z0-9-]/g, "-") 
    };
  }

  // Fallback to git remote (with security)
  try {
    const { stdout } = await $`git -C ${projectPath} remote get-url origin`.quiet();
    const url = stdout.toString().trim();
    const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) return { org: match[1], project: match[2].toLowerCase() };
  } catch {
    // Git command failed, continue to fallback
  }

  return { 
    org: "default", 
    project: sanitizeEnvVar(projectPath.split("/").pop(), "unknown", false).toLowerCase() 
  };
}

// 4. Generate per-project RSS feed (with security)
async function generateProjectRssFeed(projectPath: string, statuses: SecretStatus[], profile: string): Promise<void> {
  try {
    const { org, project } = await deriveOrgProject(projectPath);
    const feedTitle = `Secret Status • ${org}/${project} (${profile})`;

    const items = statuses.map(s => ({
      title: `${s.name} → ${s.overall.toUpperCase()}`,
      description: `${s.maskedValue ? `Value: ${s.maskedValue}` : 'No value'} | Keychain: ${s.keychainStatus} | Env: ${s.envStatus}`,
      pubDate: new Date().toISOString()
    }));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${escapeHTML(feedTitle)}</title>
<link>${escapeHTML(projectPath)}</link>
<description>Secret status updates for ${escapeHTML(org)}/${escapeHTML(project)}</description>
${items.map(item => `
<item>
<title>${escapeHTML(item.title)}</title>
<description>${escapeHTML(item.description)}</description>
<pubDate>${item.pubDate}</pubDate>
</item>`).join("")}
</channel>
</rss>`;

    await Bun.write(`${projectPath}/secrets-status.rss`, xml);
    console.log(`Generated RSS: ${projectPath}/secrets-status.rss`);
  } catch (error) {
    console.warn(`${c.yellow}Failed to generate RSS for ${projectPath}: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// RESOLVE SECRET STATUSES (with security fixes)
// ──────────────────────────────────────────────────────────────────────────────
export const resolveSecretStatuses = async (profile: string): Promise<SecretStatus[]> => {
  const service = deriveKeychainService(profile);
  const statuses: SecretStatus[] = [];

  for (const secretName of BUN_PROFILES_SECRET_NAMES) {
    const envVar = Object.entries(BUN_PROFILES_ENV_MAP).find(([_, v]) => v === secretName)?.[0] || secretName.toUpperCase();

    const keychainResult = await profileKeychainGet(service, secretName);
    const keychainStatus = keychainResult.ok ? "found" : keychainResult.code === "NOT_FOUND" ? "missing" : "error";

    const envValue = process.env[envVar];
    const envStatus = envValue ? "found" : "missing";

    let overall: "success" | "warning" | "error";
    if (keychainStatus === "found") overall = "success";
    else if (envStatus === "found") overall = "warning";
    else overall = "error";

    // SECURITY FIX: Never expose any part of secrets
    statuses.push({
      name: secretName,
      envVar,
      keychainStatus,
      envStatus,
      overall,
      maskedValue: keychainResult.ok || envValue ? "***" : undefined
    });
  }

  return statuses;
};

// ──────────────────────────────────────────────────────────────────────────────
// RENDER MATRIX (Enhanced with multi-project + RSS + security)
// ──────────────────────────────────────────────────────────────────────────────
export const renderSecretMatrix = async (profile: string, scanProjects = false): Promise<void> => {
  const start = nanoseconds();
  let statuses: SecretStatus[];
  
  try {
    statuses = await resolveSecretStatuses(profile);
  } catch (error) {
    console.error(`${c.red}Failed to resolve secret statuses: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    process.exit(1);
  }
  
  const config = getProjectConfig(profile);

  // Header
  console.log(`${c.cyan}${c.bold}🔐 Secret Status Matrix${c.reset}`);
  console.log(`${c.dim}Profile: ${c.reset}${c.bold}${sanitizeEnvVar(profile, "local", false)}${c.reset}`);
  console.log(`${c.dim}Namespace: ${c.reset}${BUN_PROFILES_DEFAULT_NAMESPACE}`);
  
  // PERFORMANCE FIX: Pre-compute static strings
  const HSL_PREFIX = "HSL: hue+";
  const HSL_SUFFIX = `, sat×${config.saturationMod}, light×${config.lightnessMod}`;
  console.log(`${applyHsl(180 + config.hueShift, config.saturationMod * 100, config.lightnessMod * 50)}${HSL_PREFIX}${config.hueShift}${HSL_SUFFIX}${c.reset}\n`);

  // Table
  const tableData = statuses.map(s => ({
    Secret: s.name,
    "Env Var": s.envVar,
    Keychain: formatStatusCell(s.keychainStatus === "found" ? "success" : s.keychainStatus === "missing" ? "error" : "warning", config),
    Env: formatStatusCell(s.envStatus === "found" ? "success" : "error", config),
    Status: formatStatusCell(s.overall, config)
  }));

  console.log(Bun.inspect.table(tableData, BUN_SECRET_STATUS_COLUMNS, { colors: true }));

  // Summary
  const found = statuses.filter(s => s.overall === "success").length;
  const warning = statuses.filter(s => s.overall === "warning").length;
  const error = statuses.filter(s => s.overall === "error").length;
  const total = statuses.length;

  const elapsed = (nanoseconds() - start) / 1e6;
  console.log(`\n${c.cyan}Summary: ${c.green}${found} found${c.reset}, ${c.yellow}${warning} in-env-only${c.reset}, ${c.red}${error} missing${c.reset} (${c.dim}${elapsed.toFixed(2)}ms${c.reset})`);

  if (warning > 0) console.log(`\n${c.yellow}⚠️ Run 'bun run profiles.ts keychain-migrate ${profile}'${c.reset}`);
  
  if (error > 0) {
    // SECURITY FIX: Use dynamic line number detection
    const currentLine = new Error().stack?.split('\n')[2]?.match(/:(\d+):/)?.[1];
    Bun.openInEditor(import.meta.url, { line: parseInt(currentLine || '100') });
    process.exit(1);
  }

  // Enhanced: Compare to baseline with deepEquals
  const baselineStatuses: Partial<SecretStatus>[] = []; // Load from JSON or DB
  if (!deepEquals(statuses, baselineStatuses, true)) {
    console.warn(`${c.yellow}Warning: Statuses differ from baseline${c.reset}`);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MULTI-PROJECT INTEGRATION (if --scan-projects flag)
  // ──────────────────────────────────────────────────────────────────────────────
  if (scanProjects) {
    console.log(`\n${c.cyan}Scanning projects...${c.reset}`);
    const projectPaths = await discoverProjects("./projects");
    console.log(`Found ${projectPaths.length} projects`);

    for (const proj of projectPaths) {
      const { org, project } = await deriveOrgProject(proj);
      console.log(`\n${c.bold}Project: ${org}/${project}${c.reset}`);

      // Generate project-specific RSS feed
      await generateProjectRssFeed(proj, statuses, profile);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EXPORT OPTIONS (with security)
  // ──────────────────────────────────────────────────────────────────────────────
  if (process.argv.includes("--html")) {
    try {
      const html = `<h1>Secret Status Report - ${escapeHTML(profile)}</h1><table border="1"><tr>${BUN_SECRET_STATUS_COLUMNS.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr>${tableData.map(row => `<tr>${Object.values(row).map(v => `<td>${escapeHTML(String(v))}</td>`).join('')}</tr>`).join('')}</table>`;
      await Bun.write("secrets-report.html", html);
      console.log("Exported HTML: secrets-report.html");
    } catch (error) {
      console.error(`${c.red}Failed to export HTML report: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    }
  }

  if (process.argv.includes("--plain")) {
    try {
      const plain = stripANSI(Bun.inspect.table(tableData, BUN_SECRET_STATUS_COLUMNS).toString());
      await Bun.write("secrets-plain.txt", plain);
      console.log("Exported plain text: secrets-plain.txt");
    } catch (error) {
      console.error(`${c.red}Failed to export plain text report: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    }
  }

  // Project-Specific: Scan & validate bunfig.toml configs
  try {
    const glob = new Bun.Glob("**/bunfig.toml");
    const configs = [];
    for await (const path of glob.scan(".")) {
      const content = await Bun.file(path).text();
      try {
        const parsed = TOML.parse(content);
        configs.push({ path, config: parsed });
      } catch (e) {
        console.warn(`Failed to parse ${path}: ${escapeHTML(e instanceof Error ? e.message : String(e))}`);
      }
    }
    console.log(`\n${c.cyan}Scanned ${configs.length} bunfig.toml configs${c.reset}`);
  } catch (error) {
    console.warn(`${c.yellow}Failed to scan project configs: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
  }

  // Project-Specific: Resolve a module in a sub-project
  try {
    const exampleProjectDir = "./projects/my-app";
    const resolved = resolveSync("zod", exampleProjectDir);
    if (resolved) {
      console.log(`\n${c.cyan}Resolved module in project:${c.reset} ${resolved}`);
    }
  } catch (error) {
    console.warn(`${c.yellow}Failed to resolve project module: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
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
  DEFAULT_PROJECT_DIR: "./projects",
  DEFAULT_GLOB_PATTERN: "*",
  EXAMPLE_PROJECT_DIR: "./projects/my-app",
  EXAMPLE_MODULE: "zod",
  HTML_REPORT_FILE: "secrets-report.html",
  PLAIN_REPORT_FILE: "secrets-plain.txt",
  RSS_FEED_FILE: "secrets-status.rss",
  MAX_COLUMN_WIDTH: 60
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args = process.argv.slice(2);
  let profile = "local";
  let scanProjects = false;

  for (const arg of args) {
    if (arg.startsWith("--profile=")) profile = arg.split("=")[1];
    if (arg === "--scan-projects") scanProjects = true;
  }

  if (args[0] === "matrix" || args.length === 0) {
    await renderSecretMatrix(profile, scanProjects);
  } else {
    console.log("Usage: bun run service-color-secrets.ts [matrix] --profile=<name> [--scan-projects] [--html] [--plain]");
  }
}
