#!/usr/bin/env bun
/**
 * Enhanced CLI + Shortcuts Help System v3.0
 *
 * January 22, 2026 - Bun 1.3.6
 *
 * Features:
 * - Matrix-style CLI with category flags and shortcut aliases
 * - Interactive search mode (filter as you type)
 * - Multi-format export (JSON, Markdown, HTML)
 * - Validation of shortcuts.toml with detailed reports
 * - Cross-platform keymaps (Mac/Win/Linux)
 * - Box-drawing quick reference tables
 * - Bun-native (zero deps)
 *
 * Usage:
 *   bun scripts/shortcuts-help.ts [options]
 *
 * Category Flags:
 *   -g, --global       Global shortcuts (6)
 *   -t, --tabs         Tab navigation (8)
 *   -d, --data         Data operations (6)
 *   -v, --view         View controls (7)
 *   -p, --projects     Project actions (7)
 *   -n, --network      Network status (3)
 *   -x, --dev          Developer tools (5)
 *   -c, --chords       Vim chord sequences (8)
 *   -a, --all          All shortcuts (50)
 *
 * Shortcut Aliases:
 *   -nav               = -g -t           (Navigation shortcuts)
 *   -edit              = -d -p           (Editing shortcuts)
 *   -power             = -x -c           (Power user shortcuts)
 *   -essential         = -g -t -d -v     (Essential shortcuts)
 *
 * Export & Validation:
 *   --format=json      Export as JSON
 *   --format=md        Export as Markdown
 *   --format=html      Export as HTML (styled)
 *   --validate         Validate shortcuts.toml
 *   --interactive, -i  Interactive search mode
 *   --os=<platform>    Force keymap: mac, win, linux
 */

import shortcuts from "../src/client/config/shortcuts.toml" with { type: "toml" };
import { platform } from "os";

// ============================================
// CLI ARGUMENT PARSING
// ============================================

const args = new Set(Bun.argv.slice(2));
const getArg = (short: string, long: string) => args.has(short) || args.has(long);
const getNumArg = (flag: string): number | null => {
  const idx = Bun.argv.indexOf(flag);
  if (idx !== -1 && Bun.argv[idx + 1]) {
    return parseInt(Bun.argv[idx + 1], 10);
  }
  return null;
};

// --help / -h flag
if (args.has("--help") || args.has("-h")) {
  console.log(`
\x1b[1mKeyboard Shortcuts Help System\x1b[0m - Enterprise Dashboard v3.0

\x1b[1mUSAGE:\x1b[0m
  bun scripts/shortcuts-help.ts [FLAGS] [OPTIONS]

\x1b[1mCATEGORY FLAGS:\x1b[0m
  -g,  --global     Global shortcuts           (6 shortcuts)
  -t,  --tabs       Tab navigation             (8 shortcuts)
  -d,  --data       Data operations            (6 shortcuts)
  -v,  --view       View controls              (7 shortcuts)
  -p,  --projects   Project actions            (7 shortcuts)
  -n,  --network    Network status             (3 shortcuts)
  -x,  --dev        Developer tools            (5 shortcuts)
  -c,  --chords     Vim chord sequences        (8 shortcuts)
  -a,  --all        All shortcuts combined     (50 shortcuts)

\x1b[1mSHORTCUT ALIASES:\x1b[0m
  -nav          -g -t               Navigation (global + tabs)     (14 shortcuts)
  -edit         -d -p               Editing (data + projects)      (13 shortcuts)
  -power        -x -c               Power user (dev + chords)      (13 shortcuts)
  -essential    -g -t -d -v         Essential shortcuts            (27 shortcuts)
  -minimal      -g -t               Minimal set for beginners      (14 shortcuts)

\x1b[1mEXPORT & OUTPUT OPTIONS:\x1b[0m
  --format=json     Export as JSON (stdout)
  --format=md       Export as Markdown
  --format=html     Export as styled HTML
  --validate        Validate shortcuts.toml structure
  --interactive,-i  Interactive search mode (TTY required)
  --os=<platform>   Force keymap: mac, win, linux
  --compact         Compact single-table output
  --help, -h        Show this help message

\x1b[1mQUICK REFERENCE:\x1b[0m
  ┌─────┬────────────┬──────┬────────────────────────────────────────────────────────────────────┐
  │ Flg │ Category   │ Keys │ Notable Shortcuts                                                  │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -g  │ Global     │   6  │ ⌘K search, ⌘/ palette, ⌘, settings, ? help, Esc close             │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -t  │ Tabs       │   8  │ 1-6 quick nav, ⌘[ prev, ⌘] next tab                               │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -d  │ Data       │   6  │ ⌘R refresh, ⌘S save, ⌘E export, ⌘C copy                           │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -v  │ View       │   7  │ ⌘+/⌘- zoom, ⌘\\ sidebar, ⌘⇧F fullscreen, T theme                  │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -p  │ Projects   │   7  │ ⌘N new, ⌘O open, ⌘D duplicate, ⌫ delete, ↵ open, ␣ preview        │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -n  │ Network    │   3  │ P probe host, ⇧P probe all, ⌘⇧R refresh network                   │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -x  │ Dev        │   5  │ ⌘⇧D devtools, ⌘⇧L logs, ⌘I inspector, ⌘⇧M metrics, F12 devtools  │
  ├─────┼────────────┼──────┼────────────────────────────────────────────────────────────────────┤
  │ -c  │ Chords     │   8  │ gg top, G bottom, gc commit, gp push, gl pull, dd delete, yy yank │
  └─────┴────────────┴──────┴────────────────────────────────────────────────────────────────────┘

\x1b[1mEXAMPLES:\x1b[0m
  \x1b[2m# Basic usage\x1b[0m
  bun scripts/shortcuts-help.ts                     Default output (all shortcuts)
  bun scripts/shortcuts-help.ts -g -t               Global + Tabs only
  bun scripts/shortcuts-help.ts -nav                Navigation shortcuts (alias)

  \x1b[2m# Single categories\x1b[0m
  bun scripts/shortcuts-help.ts -g                  Global shortcuts only
  bun scripts/shortcuts-help.ts -c                  Vim chords only
  bun scripts/shortcuts-help.ts -x                  Developer tools only

  \x1b[2m# Using aliases\x1b[0m
  bun scripts/shortcuts-help.ts -essential          Essential shortcuts for daily use
  bun scripts/shortcuts-help.ts -power              Power user shortcuts (dev + chords)
  bun scripts/shortcuts-help.ts -edit               Editing shortcuts (data + projects)

  \x1b[2m# Export formats\x1b[0m
  bun scripts/shortcuts-help.ts --format=json > shortcuts.json
  bun scripts/shortcuts-help.ts --format=md > SHORTCUTS.md
  bun scripts/shortcuts-help.ts --format=html > shortcuts.html
  bun scripts/shortcuts-help.ts -g --format=json    Export only global shortcuts

  \x1b[2m# Platform-specific\x1b[0m
  bun scripts/shortcuts-help.ts --os=win            Windows key labels
  bun scripts/shortcuts-help.ts --os=linux          Linux key labels
  bun scripts/shortcuts-help.ts --os=mac -a         Mac symbols (default on macOS)

  \x1b[2m# Validation & search\x1b[0m
  bun scripts/shortcuts-help.ts --validate          Validate shortcuts.toml
  bun scripts/shortcuts-help.ts --interactive       Interactive fuzzy search

\x1b[2mBun ${Bun.version} │ Shortcuts Help v3.0 │ 8 categories │ 50 total shortcuts\x1b[0m
`);
  process.exit(0);
}

// Shortcut aliases - expand to individual flags
if (args.has("-nav")) {
  args.add("-g").add("-t");
  args.delete("-nav");
}
if (args.has("-edit")) {
  args.add("-d").add("-p");
  args.delete("-edit");
}
if (args.has("-power")) {
  args.add("-x").add("-c");
  args.delete("-power");
}
if (args.has("-essential")) {
  args.add("-g").add("-t").add("-d").add("-v");
  args.delete("-essential");
}
if (args.has("-minimal")) {
  args.add("-g").add("-t");
  args.delete("-minimal");
}

// Category visibility flags
const SHOW_GLOBAL = getArg("-g", "--global");
const SHOW_TABS = getArg("-t", "--tabs");
const SHOW_DATA = getArg("-d", "--data");
const SHOW_VIEW = getArg("-v", "--view");
const SHOW_PROJECTS = getArg("-p", "--projects");
const SHOW_NETWORK = getArg("-n", "--network");
const SHOW_DEV = getArg("-x", "--dev");
const SHOW_CHORDS = getArg("-c", "--chords");
const SHOW_ALL = getArg("-a", "--all");
const SHOW_COMPACT = args.has("--compact");

// Check if any category flag is set
const NO_CATEGORY_FLAGS = !SHOW_GLOBAL && !SHOW_TABS && !SHOW_DATA && !SHOW_VIEW &&
                          !SHOW_PROJECTS && !SHOW_NETWORK && !SHOW_DEV && !SHOW_CHORDS && !SHOW_ALL;

// Category filter map
const CATEGORY_FILTER: Record<string, boolean> = {
  Global: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_GLOBAL,
  Tabs: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_TABS,
  Data: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_DATA,
  View: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_VIEW,
  Projects: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_PROJECTS,
  Network: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_NETWORK,
  Dev: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_DEV,
  Chords: NO_CATEGORY_FLAGS || SHOW_ALL || SHOW_CHORDS,
};

// ============================================
// CONFIGURATION & PLATFORM DETECTION
// ============================================

const PLATFORM = platform();
const IS_MAC = PLATFORM === "darwin";
const IS_WIN = PLATFORM === "win32";

type PlatformKey = "mac" | "win" | "linux";

const keymap: Record<PlatformKey, Record<string, string>> = {
  mac: {
    cmd: "\u2318",
    meta: "\u2318",
    ctrl: "\u2303",
    alt: "\u2325",
    option: "\u2325",
    shift: "\u21E7",
    esc: "\u238B",
    escape: "\u238B",
    enter: "\u21B5",
    return: "\u21B5",
    tab: "\u21E5",
    space: "\u2423",
    delete: "\u232B",
    backspace: "\u232B",
    up: "\u2191",
    down: "\u2193",
    left: "\u2190",
    right: "\u2192",
  },
  win: {
    cmd: "Ctrl",
    meta: "Win",
    ctrl: "Ctrl",
    alt: "Alt",
    option: "Alt",
    shift: "Shift",
    esc: "Esc",
    escape: "Esc",
    enter: "Enter",
    return: "Enter",
    tab: "Tab",
    space: "Space",
    delete: "Del",
    backspace: "Bksp",
    up: "\u2191",
    down: "\u2193",
    left: "\u2190",
    right: "\u2192",
  },
  linux: {
    cmd: "Ctrl",
    meta: "Super",
    ctrl: "Ctrl",
    alt: "Alt",
    option: "Alt",
    shift: "Shift",
    esc: "Esc",
    escape: "Esc",
    enter: "Enter",
    return: "Enter",
    tab: "Tab",
    space: "Space",
    delete: "Del",
    backspace: "Bksp",
    up: "\u2191",
    down: "\u2193",
    left: "\u2190",
    right: "\u2192",
  },
};

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[90m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

const categoryColors: Record<string, string> = {
  Global: c.blue,
  Tabs: c.green,
  Data: c.magenta,
  View: c.cyan,
  Projects: c.yellow,
  Network: c.yellow,
  Dev: c.red,
  Chords: c.cyan,
};

// ──────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ──────────────────────────────────────────────────────────────

interface Shortcut {
  Category: string;
  Key: string;
  Action: string;
  Description: string;
  RawKey: string;
}

interface ValidationReport {
  total: number;
  duplicates: string[];
  invalidKeys: string[];
  missingActions: string[];
  missingDescriptions: string[];
  isValid: boolean;
}

interface ExportData {
  shortcuts: Shortcut[];
  metadata: {
    generated: string;
    version: string;
    platform: string;
    total: number;
    categories: number;
  };
}

// ──────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ──────────────────────────────────────────────────────────────

function detectPlatform(): PlatformKey {
  const osFlag = process.argv.find((arg) => arg.startsWith("--os="));
  if (osFlag) {
    const val = osFlag.split("=")[1];
    if (val === "mac" || val === "darwin") return "mac";
    if (val === "win" || val === "windows") return "win";
    if (val === "linux") return "linux";
  }
  return IS_MAC ? "mac" : IS_WIN ? "win" : "linux";
}

function formatKey(rawKey: string, os: PlatformKey): string {
  const symbols = keymap[os];
  return rawKey
    .split(/\s*\+\s*/)
    .map((part) => {
      const lower = part.toLowerCase();
      // Handle Cmd/Ctrl dual binding
      if (lower === "cmd/ctrl") {
        return os === "mac" ? symbols.cmd : symbols.ctrl;
      }
      return symbols[lower] || part.toUpperCase();
    })
    .join(os === "mac" ? "" : "+");
}

function loadShortcuts(os: PlatformKey): Shortcut[] {
  const all: Shortcut[] = [];

  // Keyboard shortcuts
  for (const [category, bindings] of Object.entries(shortcuts.keyboard)) {
    for (const [rawKey, binding] of Object.entries(bindings as Record<string, any>)) {
      all.push({
        Category: category.charAt(0).toUpperCase() + category.slice(1),
        Key: formatKey(rawKey, os),
        Action: binding.action || "",
        Description: binding.description || "",
        RawKey: rawKey,
      });
    }
  }

  // Chord shortcuts
  for (const [rawKey, binding] of Object.entries(shortcuts.chords)) {
    all.push({
      Category: "Chords",
      Key: rawKey,
      Action: (binding as any).action || "",
      Description: (binding as any).description || "",
      RawKey: rawKey,
    });
  }

  return all;
}

function validateShortcuts(shortcutsList: Shortcut[]): ValidationReport {
  const keyCounts = new Map<string, number>();
  const duplicates: string[] = [];
  const invalidKeys: string[] = [];
  const missingActions: string[] = [];
  const missingDescriptions: string[] = [];

  for (const s of shortcutsList) {
    // Check duplicates (within same category would be more problematic)
    const fullKey = `${s.Category}:${s.RawKey}`;
    keyCounts.set(fullKey, (keyCounts.get(fullKey) || 0) + 1);

    // Validate key syntax (allow common keyboard characters)
    if (s.RawKey.length === 0) {
      invalidKeys.push(`(empty key in ${s.Category})`);
    }

    // Check missing actions
    if (!s.Action || s.Action.trim().length === 0) {
      missingActions.push(`${s.Category}:${s.RawKey}`);
    }

    // Check missing descriptions
    if (!s.Description || s.Description.trim().length === 0) {
      missingDescriptions.push(`${s.Category}:${s.RawKey}`);
    }
  }

  for (const [key, count] of keyCounts.entries()) {
    if (count > 1) duplicates.push(key);
  }

  return {
    total: shortcutsList.length,
    duplicates,
    invalidKeys,
    missingActions,
    missingDescriptions,
    isValid: duplicates.length === 0 && invalidKeys.length === 0 && missingActions.length === 0,
  };
}

// ──────────────────────────────────────────────────────────────
// RENDER FUNCTIONS
// ──────────────────────────────────────────────────────────────

function renderHeader(text: string, emoji: string = "") {
  console.log(`\n${c.bold}${c.cyan}${emoji}  ${text}${c.reset}\n`);
}

function renderCategoryHeader(cat: string, count: number) {
  const color = categoryColors[cat] || c.dim;
  console.log(`${color}${c.bold}\u250F\u2501\u2501\u2501 ${cat} (${count}) \u2501\u2501\u2501${c.reset}`);
}

function renderTable(shortcutsList: Shortcut[], compact: boolean = false): void {
  // Filter by enabled categories
  const filtered = shortcutsList.filter((s) => CATEGORY_FILTER[s.Category]);
  const categories = [...new Set(filtered.map((s) => s.Category))];

  renderHeader("Keyboard Shortcuts Reference", "\u2328\uFE0F");

  if (compact) {
    // Compact mode: single table with all shortcuts
    console.log(
      Bun.inspect.table(
        filtered.map((s) => ({
          "#": filtered.indexOf(s) + 1,
          Cat: s.Category.slice(0, 8),
          Key: s.Key,
          Description: s.Description.slice(0, 40),
        })),
        { colors: true }
      )
    );
  } else {
    // Standard mode: grouped by category
    for (const cat of categories) {
      const catShortcuts = filtered.filter((s) => s.Category === cat);
      renderCategoryHeader(cat, catShortcuts.length);

      console.log(
        Bun.inspect.table(
          catShortcuts.map((s) => ({
            Key: s.Key,
            Description: s.Description,
          })),
          { colors: true }
        )
      );
    }
  }

  // Show filter info if not showing all
  const totalFiltered = filtered.length;
  const totalAll = shortcutsList.length;
  const filterInfo = totalFiltered < totalAll
    ? ` (filtered from ${totalAll})`
    : "";

  console.log(
    `${c.dim}${totalFiltered} shortcuts${filterInfo} \u2022 Press ${c.bold}?${c.reset}${c.dim} in dashboard to view modal${c.reset}\n`
  );
}

function renderJSON(shortcutsList: Shortcut[]): void {
  // Filter by enabled categories
  const filtered = shortcutsList.filter((s) => CATEGORY_FILTER[s.Category]);
  const categories = [...new Set(filtered.map((s) => s.Category))];
  const exportData: ExportData = {
    shortcuts: filtered,
    metadata: {
      generated: new Date().toISOString(),
      version: "3.0.0",
      platform: PLATFORM,
      total: filtered.length,
      categories: categories.length,
    },
  };
  console.log(JSON.stringify(exportData, null, 2));
}

function renderMarkdown(shortcutsList: Shortcut[]): void {
  // Filter by enabled categories
  const filtered = shortcutsList.filter((s) => CATEGORY_FILTER[s.Category]);
  const categories = [...new Set(filtered.map((s) => s.Category))];

  console.log(`# Keyboard Shortcuts Reference\n`);
  console.log(`> Auto-generated from \`shortcuts.toml\` using \`bun scripts/shortcuts-help.ts\`\n`);
  console.log(`| Property | Value |`);
  console.log(`|----------|-------|`);
  console.log(`| Generated | ${new Date().toISOString()} |`);
  console.log(`| Platform | ${PLATFORM} |`);
  console.log(`| Total | ${filtered.length} shortcuts |`);
  console.log(`| Categories | ${categories.length} |`);
  console.log(`| Version | 3.0.0 |`);
  console.log();

  for (const cat of categories) {
    const catShortcuts = filtered.filter((s) => s.Category === cat);
    console.log(`## ${cat} (${catShortcuts.length})\n`);
    console.log(`| Key | Description |`);
    console.log(`|-----|-------------|`);

    for (const s of catShortcuts) {
      // Escape pipe characters in markdown
      const key = s.Key.replace(/\|/g, "\\|");
      const desc = s.Description.replace(/\|/g, "\\|");
      console.log(`| \`${key}\` | ${desc} |`);
    }
    console.log();
  }

  console.log(`---\n`);
  console.log(`*Press \`?\` in the dashboard to view the interactive shortcuts modal.*`);
}

function renderHTML(shortcutsList: Shortcut[]): void {
  // Filter by enabled categories
  const filtered = shortcutsList.filter((s) => CATEGORY_FILTER[s.Category]);
  const categories = [...new Set(filtered.map((s) => s.Category))];

  console.log(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keyboard Shortcuts - Enterprise Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
    }
    h1 {
      color: #38bdf8;
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .meta {
      color: #64748b;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    .category {
      margin: 2rem 0;
      background: rgba(30, 41, 59, 0.8);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .category h2 {
      color: #4ade80;
      font-size: 1.25rem;
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .category h2 span {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: normal;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #334155;
    }
    th {
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td:first-child {
      width: 120px;
    }
    .key {
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
      background: #334155;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #f8fafc;
      border: 1px solid #475569;
      display: inline-block;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #334155;
      color: #64748b;
      font-size: 0.875rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>\u2328\uFE0F Keyboard Shortcuts</h1>
  <p class="meta">
    Platform: ${PLATFORM} |
    Total: ${filtered.length} shortcuts |
    Categories: ${categories.length} |
    Generated: ${new Date().toLocaleDateString()}
  </p>`);

  const catColors: Record<string, string> = {
    Global: "#60a5fa",
    Tabs: "#4ade80",
    Data: "#a78bfa",
    View: "#22d3ee",
    Projects: "#fbbf24",
    Network: "#fb923c",
    Dev: "#f87171",
    Chords: "#38bdf8",
  };

  for (const cat of categories) {
    const catShortcuts = filtered.filter((s) => s.Category === cat);
    const color = catColors[cat] || "#94a3b8";

    console.log(`  <div class="category">`);
    console.log(
      `    <h2 style="color: ${color}">${cat} <span>(${catShortcuts.length})</span></h2>`
    );
    console.log(`    <table>`);
    console.log(`      <thead><tr><th>Key</th><th>Description</th></tr></thead>`);
    console.log(`      <tbody>`);

    for (const s of catShortcuts) {
      const escapedKey = s.Key.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedDesc = s.Description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      console.log(
        `        <tr><td><span class="key">${escapedKey}</span></td><td>${escapedDesc}</td></tr>`
      );
    }

    console.log(`      </tbody>`);
    console.log(`    </table>`);
    console.log(`  </div>`);
  }

  console.log(`  <div class="footer">`);
  console.log(`    Press <span class="key">?</span> in the dashboard to view the interactive modal`);
  console.log(`  </div>`);
  console.log(`</body>`);
  console.log(`</html>`);
}

function renderValidation(report: ValidationReport): void {
  renderHeader("Validation Report", "\uD83D\uDD0D");

  const status = report.isValid
    ? `${c.green}\u2713 Valid${c.reset}`
    : `${c.red}\u2717 Invalid${c.reset}`;

  console.log(
    Bun.inspect.table(
      [
        {
          Metric: "Total Shortcuts",
          Value: report.total.toString(),
          Status: `${c.green}\u2713${c.reset}`,
        },
        {
          Metric: "Duplicates",
          Value: report.duplicates.length.toString(),
          Status: report.duplicates.length === 0 ? `${c.green}\u2713${c.reset}` : `${c.red}\u2717${c.reset}`,
        },
        {
          Metric: "Invalid Keys",
          Value: report.invalidKeys.length.toString(),
          Status: report.invalidKeys.length === 0 ? `${c.green}\u2713${c.reset}` : `${c.red}\u2717${c.reset}`,
        },
        {
          Metric: "Missing Actions",
          Value: report.missingActions.length.toString(),
          Status: report.missingActions.length === 0 ? `${c.green}\u2713${c.reset}` : `${c.red}\u2717${c.reset}`,
        },
        {
          Metric: "Missing Descriptions",
          Value: report.missingDescriptions.length.toString(),
          Status: report.missingDescriptions.length === 0 ? `${c.green}\u2713${c.reset}` : `${c.yellow}\u26A0${c.reset}`,
        },
      ],
      { colors: true }
    )
  );

  console.log(`\n${c.bold}Overall: ${status}${c.reset}\n`);

  if (report.duplicates.length > 0) {
    console.log(`${c.yellow}\u26A0  Duplicates:${c.reset}`);
    for (const d of report.duplicates) {
      console.log(`   - ${d}`);
    }
    console.log();
  }

  if (report.invalidKeys.length > 0) {
    console.log(`${c.red}\u2717 Invalid Keys:${c.reset}`);
    for (const k of report.invalidKeys) {
      console.log(`   - ${k}`);
    }
    console.log();
  }

  if (report.missingActions.length > 0) {
    console.log(`${c.red}\u2717 Missing Actions:${c.reset}`);
    for (const a of report.missingActions) {
      console.log(`   - ${a}`);
    }
    console.log();
  }
}

function renderCliFlags(): void {
  renderHeader("CLI Flags Reference", "\u2699\uFE0F");

  const cliFlags = [
    { Flag: "-f, --filter <text>", Description: "Filter projects by name" },
    { Flag: "-c, --compact", Description: "Start in compact view mode" },
    { Flag: "-p, --problems", Description: "Problems-only view" },
    { Flag: "-a, --auto", Description: "Enable auto-refresh (30s)" },
    { Flag: "--fast", Description: "Fast refresh mode (100ms)" },
    { Flag: "-d, --depth <n>", Description: "Git scan depth (default: 3)" },
    { Flag: "--config <file>", Description: "YAML config file" },
    { Flag: "-q, --quiet", Description: "Disable interactive console" },
    { Flag: "-l, --log", Description: "Log viewer mode (pipe stdin)" },
    { Flag: "-h, --help", Description: "Show help message" },
  ];

  console.log(Bun.inspect.table(cliFlags, { colors: true }));
}

function renderSummary(shortcutsList: Shortcut[]): void {
  const categories = [...new Set(shortcutsList.map((s) => s.Category))];
  const chordsCount = shortcutsList.filter((s) => s.Category === "Chords").length;

  renderHeader("System Summary", "\uD83D\uDCCA");

  console.log(
    Bun.inspect.table(
      [
        {
          Feature: "Keyboard Shortcuts",
          Count: shortcutsList.length.toString(),
          Categories: categories.length.toString(),
          Status: `${c.green}\u2713 Active${c.reset}`,
        },
        {
          Feature: "CLI Flags",
          Count: "10",
          Categories: "1",
          Status: `${c.green}\u2713 Active${c.reset}`,
        },
        {
          Feature: "Vim Chords",
          Count: chordsCount.toString(),
          Categories: "1",
          Status: `${c.green}\u2713 Active${c.reset}`,
        },
      ],
      { colors: true }
    )
  );
}

function renderUsage(): void {
  console.log(`${c.bold}Usage:${c.reset}`);
  console.log(`  bun scripts/shortcuts-help.ts [FLAGS] [OPTIONS]\n`);

  console.log(`${c.bold}Category Flags:${c.reset}`);
  console.log(`  -g, --global      Global shortcuts (6)`);
  console.log(`  -t, --tabs        Tab navigation (8)`);
  console.log(`  -d, --data        Data operations (6)`);
  console.log(`  -v, --view        View controls (7)`);
  console.log(`  -p, --projects    Project actions (7)`);
  console.log(`  -n, --network     Network status (3)`);
  console.log(`  -x, --dev         Developer tools (5)`);
  console.log(`  -c, --chords      Vim chords (8)`);
  console.log(`  -a, --all         All shortcuts (50)\n`);

  console.log(`${c.bold}Aliases:${c.reset}`);
  console.log(`  -nav              Navigation (global + tabs)`);
  console.log(`  -edit             Editing (data + projects)`);
  console.log(`  -power            Power user (dev + chords)`);
  console.log(`  -essential        Essential (global + tabs + data + view)\n`);

  console.log(`${c.bold}Options:${c.reset}`);
  console.log(`  --format=<fmt>    Export: json, md, html`);
  console.log(`  --validate        Validate shortcuts.toml`);
  console.log(`  --interactive,-i  Interactive search mode`);
  console.log(`  --os=<platform>   Force keymap: mac, win, linux`);
  console.log(`  --compact         Single table output`);
  console.log(`  --flags           Show CLI flags only`);
  console.log(`  --help, -h        Show full help\n`);

  console.log(`${c.bold}Examples:${c.reset}`);
  console.log(`  bun scripts/shortcuts-help.ts -g -t          ${c.dim}# Global + Tabs${c.reset}`);
  console.log(`  bun scripts/shortcuts-help.ts -nav           ${c.dim}# Navigation alias${c.reset}`);
  console.log(`  bun scripts/shortcuts-help.ts --format=json  ${c.dim}# Export to JSON${c.reset}`);
  console.log(`  bun scripts/shortcuts-help.ts -c --os=win    ${c.dim}# Chords with Windows keys${c.reset}\n`);
}

async function interactiveMode(shortcutsList: Shortcut[]): Promise<void> {
  // Check if stdin is a TTY
  if (!process.stdin.isTTY) {
    console.error(`${c.red}Error: Interactive mode requires a TTY${c.reset}`);
    console.log(`${c.dim}Use the default table view instead${c.reset}`);
    renderTable(shortcutsList);
    return;
  }

  console.log(`${c.bold}${c.cyan}\uD83D\uDD0D Interactive Search Mode${c.reset}`);
  console.log(`${c.dim}Type to filter shortcuts, Ctrl+C to exit${c.reset}\n`);

  // Pre-compute search text
  const searchText = shortcutsList.map(
    (s) => `${s.Category} ${s.Key} ${s.Action} ${s.Description}`.toLowerCase()
  );

  let query = "";

  // Set up raw mode
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  // Initial render
  const render = () => {
    console.clear();
    console.log(`${c.bold}${c.cyan}Search: ${c.reset}${query}${c.dim}_${c.reset}\n`);

    const filtered = shortcutsList.filter((_, i) =>
      query === "" ? true : searchText[i].includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      console.log(`${c.red}No matches found${c.reset}`);
    } else {
      // Group and render
      const cats = [...new Set(filtered.map((s) => s.Category))];
      for (const cat of cats) {
        const catShortcuts = filtered.filter((s) => s.Category === cat);
        renderCategoryHeader(cat, catShortcuts.length);
        console.log(
          Bun.inspect.table(
            catShortcuts.map((s) => ({ Key: s.Key, Description: s.Description })),
            { colors: true }
          )
        );
      }
      console.log(`${c.dim}${filtered.length} matches${c.reset}`);
    }
  };

  render();

  // Handle input
  for await (const chunk of process.stdin) {
    const char = chunk as string;

    // Ctrl+C to exit
    if (char === "\u0003") {
      console.log(`\n${c.dim}Exiting...${c.reset}`);
      process.exit(0);
    }

    // Backspace
    if (char === "\u007F" || char === "\b") {
      query = query.slice(0, -1);
    }
    // Enter - just refresh
    else if (char === "\r" || char === "\n") {
      // Do nothing, just refresh
    }
    // Escape - clear query
    else if (char === "\u001B") {
      query = "";
    }
    // Printable characters
    else if (char >= " " && char.length === 1) {
      query += char;
    }

    render();
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const startTime = Bun.nanoseconds();
  const argList = process.argv.slice(2);
  const os = detectPlatform();
  const shortcutsList = loadShortcuts(os);

  // --- VALIDATION MODE ---
  if (args.has("--validate")) {
    const report = validateShortcuts(shortcutsList);
    renderValidation(report);

    const elapsed = (Bun.nanoseconds() - startTime) / 1e6;
    console.log(`${c.dim}Validated in ${elapsed.toFixed(2)}ms${c.reset}\n`);

    if (!report.isValid) {
      process.exit(1);
    }
    return;
  }

  // --- EXPORT MODE ---
  const formatFlag = argList.find((arg) => arg.startsWith("--format="));
  if (formatFlag) {
    const format = formatFlag.split("=")[1];
    switch (format) {
      case "json":
        renderJSON(shortcutsList);
        break;
      case "md":
      case "markdown":
        renderMarkdown(shortcutsList);
        break;
      case "html":
        renderHTML(shortcutsList);
        break;
      default:
        console.error(`${c.red}Unknown format: ${format}${c.reset}`);
        console.log(`${c.dim}Supported: json, md, html${c.reset}`);
        process.exit(1);
    }
    return;
  }

  // --- INTERACTIVE MODE ---
  if (args.has("--interactive") || args.has("-i")) {
    await interactiveMode(shortcutsList);
    return;
  }

  // --- DEFAULT VIEW ---
  // Count enabled categories for header
  const enabledCount = Object.values(CATEGORY_FILTER).filter(Boolean).length;
  const catInfo = enabledCount === 8 ? "all" : `${enabledCount} categories`;

  console.log(`\n${c.bold}${c.cyan}\u2728 Enterprise Dashboard - Help System v3.0${c.reset}`);
  console.log(`${c.dim}Platform: ${os} | Detected: ${PLATFORM} | Showing: ${catInfo}${c.reset}`);

  const showFlags = args.has("--flags");

  if (!showFlags) {
    renderTable(shortcutsList, SHOW_COMPACT);
  }

  if (showFlags || NO_CATEGORY_FLAGS) {
    renderCliFlags();
  }

  if (NO_CATEGORY_FLAGS) {
    renderSummary(shortcutsList);
  }

  // Performance footer
  const elapsed = (Bun.nanoseconds() - startTime) / 1e6;
  const mem = process.memoryUsage();
  const filteredCount = shortcutsList.filter((s) => CATEGORY_FILTER[s.Category]).length;
  console.log(
    `${c.dim}${filteredCount} shortcuts | Rendered in ${elapsed.toFixed(2)}ms | Memory: ${(mem.heapUsed / 1024).toFixed(0)} KB${c.reset}\n`
  );
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`${c.red}Fatal error:${c.reset}`, err.message);
    process.exit(1);
  });
}
