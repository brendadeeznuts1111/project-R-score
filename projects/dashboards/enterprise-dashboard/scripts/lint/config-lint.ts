#!/usr/bin/env bun
/**
 * 🌌 COSMIC CONFIG LINT
 * Unified TOML Schema Validator for all configuration files
 *
 * January 21, 2026 - Bun 1.3.6
 *
 * Validates:
 * - ui-themes.toml against ui-themes.schema.json
 * - shortcuts.toml against shortcuts.schema.json
 * - syntax-colors.toml against colors.schema.json
 *
 * Usage:
 *   bun scripts/config-lint.ts [--verbose] [--no-warnings]
 */

import Ajv from "ajv";
import { join } from "path";

// Schemas (relative to scripts/lint)
import themesSchema from "../../src/client/config/schemas/ui-themes.schema.json" with { type: "json" };
import shortcutsSchema from "../../src/client/config/schemas/shortcuts.schema.json" with { type: "json" };
import syntaxSchema from "../../src/client/utils/colors.schema.json" with { type: "json" };

// ANSI colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// CLI flags
const args = new Set(Bun.argv.slice(2));
const VERBOSE = args.has("--verbose") || args.has("-v");
const NO_WARNINGS = args.has("--no-warnings") || args.has("-W");
const JSON_OUTPUT = args.has("--json");

// Config file definitions
interface ConfigFile {
  name: string;
  path: string;
  schema: object;
  semanticChecks?: (data: any) => string[];
}

const ROOT = join(import.meta.dir, "..", "..");

const CONFIG_FILES: ConfigFile[] = [
  {
    name: "UI Themes",
    path: join(ROOT, "src/client/config/ui-themes.toml"),
    schema: themesSchema,
    semanticChecks: checkThemes,
  },
  {
    name: "Shortcuts",
    path: join(ROOT, "src/client/config/shortcuts.toml"),
    schema: shortcutsSchema,
    semanticChecks: checkShortcuts,
  },
  {
    name: "Syntax Colors",
    path: join(ROOT, "src/client/utils/syntax-colors.toml"),
    schema: syntaxSchema,
    semanticChecks: checkSyntaxColors,
  },
];

// ============================================
// Semantic Checks
// ============================================

function checkThemes(data: any): string[] {
  const warnings: string[] = [];

  // Check all themes have required color keys
  const requiredKeys = ["primary", "background", "text-primary", "border"];
  const themeNames = ["light", "dark", "high-contrast", "midnight"];

  for (const themeName of themeNames) {
    const theme = data[themeName];
    if (!theme) continue;

    for (const key of requiredKeys) {
      if (!theme[key]) {
        warnings.push(`Theme '${themeName}' missing required key: ${key}`);
      }
    }

    // Validate hex colors
    for (const [key, value] of Object.entries(theme)) {
      if (typeof value === "string" && key !== "shadow" && key !== "shadow-md" && key !== "shadow-lg") {
        if (!value.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/)) {
          warnings.push(`Theme '${themeName}.${key}' invalid hex color: ${value}`);
        }
      }
    }
  }

  // Check contrast ratios (basic)
  if (data.light) {
    const bg = data.light.background;
    const text = data.light["text-primary"];
    if (bg && text && isLowContrast(bg, text)) {
      warnings.push(`Light theme may have low contrast between background and text-primary`);
    }
  }

  return warnings;
}

function checkShortcuts(data: any): string[] {
  const warnings: string[] = [];
  const allShortcuts = new Map<string, string[]>();

  // Collect all shortcuts to check for conflicts
  function collectShortcuts(obj: any, category: string) {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null && "action" in value) {
        if (!allShortcuts.has(key)) {
          allShortcuts.set(key, []);
        }
        allShortcuts.get(key)!.push(category);
      }
    }
  }

  if (data.keyboard) {
    for (const [category, bindings] of Object.entries(data.keyboard)) {
      collectShortcuts(bindings, `keyboard.${category}`);
    }
  }

  // Check for duplicate shortcuts
  for (const [key, categories] of allShortcuts) {
    if (categories.length > 1) {
      warnings.push(`Shortcut '${key}' defined in multiple categories: ${categories.join(", ")}`);
    }
  }

  // Check for dangerous shortcuts
  const dangerousKeys = ["Cmd/Ctrl + W", "Cmd/Ctrl + Q", "Alt + F4"];
  for (const key of dangerousKeys) {
    if (allShortcuts.has(key) && !data.settings?.disabled?.[key]) {
      warnings.push(`Dangerous shortcut '${key}' is enabled - consider disabling`);
    }
  }

  return warnings;
}

function checkSyntaxColors(data: any): string[] {
  const warnings: string[] = [];

  if (data.colors && data.names) {
    const colorKeys = new Set(Object.keys(data.colors));
    const nameKeys = new Set(Object.keys(data.names));

    // Warn about colors without names
    for (const key of colorKeys) {
      if (!nameKeys.has(key)) {
        warnings.push(`Color '${key}' has no display name in [names]`);
      }
    }
  }

  // Check text_colors coverage
  if (data.colors && data.text_colors) {
    const colorKeys = new Set(Object.keys(data.colors));
    const textKeys = new Set(Object.keys(data.text_colors));

    for (const key of colorKeys) {
      if (!textKeys.has(key)) {
        warnings.push(`Color '${key}' has no text_color (will use fallback)`);
      }
    }
  }

  return warnings;
}

// ============================================
// Utilities
// ============================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function isLowContrast(bg: string, fg: string): boolean {
  const bgRgb = hexToRgb(bg);
  const fgRgb = hexToRgb(fg);
  if (!bgRgb || !fgRgb) return false;

  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const fgLum = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);

  const ratio =
    (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);

  // WCAG AA requires 4.5:1 for normal text
  return ratio < 4.5;
}

// ============================================
// Main Validation
// ============================================

interface LintResult {
  file: string;
  name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  crc32?: string;
}

async function lintConfig(config: ConfigFile): Promise<LintResult> {
  const result: LintResult = {
    file: config.path,
    name: config.name,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Load TOML with native loader
    let data: any;
    try {
      const module = await import(config.path, { with: { type: "toml" } });
      data = module.default;
    } catch (parseError: any) {
      result.valid = false;
      result.errors.push(`TOML parse error: ${parseError.message}`);
      return result;
    }

    // Calculate CRC32
    result.crc32 = Bun.hash.crc32(JSON.stringify(data)).toString(16).padStart(8, "0");

    // Validate against JSON Schema
    const ajv = new Ajv({ allErrors: true, verbose: true });
    const validate = ajv.compile(config.schema);
    const valid = validate(data);

    if (!valid && validate.errors) {
      result.valid = false;
      for (const err of validate.errors) {
        const path = err.instancePath || "/";
        const msg = err.message || "unknown error";
        result.errors.push(`${path}: ${msg}`);

        if (VERBOSE && err.params) {
          result.errors.push(`  params: ${JSON.stringify(err.params)}`);
        }
      }
    }

    // Run semantic checks
    if (config.semanticChecks) {
      const semanticWarnings = config.semanticChecks(data);
      result.warnings.push(...semanticWarnings);
    }
  } catch (err: any) {
    result.valid = false;
    result.errors.push(`Unexpected error: ${err.message}`);
  }

  return result;
}

async function main() {
  console.log(`\n${BOLD}${CYAN}🌌 COSMIC CONFIG LINT${RESET}`);
  console.log(`${DIM}Bun ${Bun.version} • ${new Date().toISOString()}${RESET}\n`);

  const results: LintResult[] = [];
  let hasErrors = false;
  let totalWarnings = 0;

  for (const config of CONFIG_FILES) {
    const result = await lintConfig(config);
    results.push(result);

    if (!result.valid) hasErrors = true;
    totalWarnings += result.warnings.length;

    // Print result
    const status = result.valid
      ? `${GREEN}✓ VALID${RESET}`
      : `${RED}✗ INVALID${RESET}`;

    console.log(`${status} ${BOLD}${result.name}${RESET}`);
    console.log(`   ${DIM}${result.file}${RESET}`);

    if (result.crc32) {
      console.log(`   ${DIM}CRC32: ${result.crc32}${RESET}`);
    }

    // Print errors
    for (const err of result.errors) {
      console.log(`   ${RED}ERROR: ${err}${RESET}`);
    }

    // Print warnings
    if (!NO_WARNINGS) {
      for (const warn of result.warnings) {
        console.log(`   ${YELLOW}WARN: ${warn}${RESET}`);
      }
    }

    console.log();
  }

  // Summary
  console.log("─".repeat(60));
  const validCount = results.filter((r) => r.valid).length;
  const totalCount = results.length;

  if (hasErrors) {
    console.log(`${RED}${BOLD}✗ ${validCount}/${totalCount} configs valid${RESET}`);
    if (totalWarnings > 0 && !NO_WARNINGS) {
      console.log(`${YELLOW}  ${totalWarnings} warning(s)${RESET}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}✓ All ${totalCount} configs valid${RESET}`);
    if (totalWarnings > 0 && !NO_WARNINGS) {
      console.log(`${YELLOW}  ${totalWarnings} warning(s)${RESET}`);
    }

    // Print combined integrity
    const combined = Bun.hash
      .crc32(results.map((r) => r.crc32).join(""))
      .toString(16)
      .padStart(8, "0");
    console.log(`${DIM}  Combined CRC32: ${combined}${RESET}`);
  }

  // JSON output mode
  if (JSON_OUTPUT) {
    console.log("\n" + JSON.stringify(results, null, 2));
  }
}

main();
