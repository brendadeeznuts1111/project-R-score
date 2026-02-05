/**
 * 🚀 FACTORYWAGER TABULAR v4.3.1: Responsive Compression + Status Badges + Color Swatches
 * Chromatic terminal fortress with dynamic width adaptation and visual polish
 */

console.log("🎨 FACTORYWAGER TABULAR v4.3.1 - RESPONSIVE CHROMATIC DOMINION!");
console.log("=".repeat(80));

// ═══════════════════════════════════════════════════════════════
// TERMINAL WIDTH DETECTION
// ═══════════════════════════════════════════════════════════════
function getTerminalWidth(): number {
  // Check environment variable first (for testing)
  const envCols = process.env.COLUMNS;
  if (envCols) return parseInt(envCols, 10);

  // Use stdout columns if available
  return process.stdout.columns || 120;
}

const TERMINAL_WIDTH = getTerminalWidth();
const IS_NARROW = TERMINAL_WIDTH < 120;

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE COLUMN SCHEMA (v4.3.1 with dynamic compression)
// ═══════════════════════════════════════════════════════════════
// Base widths for full terminal (>= 120 cols)
const BASE_COLUMNS = [
  { name: "#", key: null, align: "right" as const, width: 3, hsl: "hsl(210, 20%, 50%)", default: null },
  { name: "key", key: "key", align: "left" as const, width: 18, hsl: "hsl(0, 0%, 95%)", default: "unnamed" },
  { name: "value", key: "value", align: "left" as const, width: 32, hsl: "hsl(200, 15%, 80%)", default: "" },
  { name: "type", key: "type", align: "center" as const, width: 10, hsl: "hsl(180, 60%, 55%)", default: "unknown" },
  { name: "version", key: "version", align: "center" as const, width: 12, hsl: "hsl(280, 70%, 65%)", default: "none" },
  { name: "bunVer", key: "bun", align: "center" as const, width: 10, hsl: "hsl(220, 90%, 60%)", default: "any" },
  { name: "author", key: "author", align: "left" as const, width: 14, hsl: "hsl(48, 100%, 60%)", default: "anon" },
  { name: "authorHash", key: "authorHash", align: "left" as const, width: 10, hsl: "hsl(120, 40%, 45%)", default: "—" },
  { name: "status", key: "status", align: "center" as const, width: 10, hsl: null, default: "active" },
  { name: "modified", key: "date_iso", align: "right" as const, width: 16, hsl: "hsl(195, 40%, 55%)", default: "never" },
];

// Compression ratios for narrow terminals (< 120 cols)
// Priority: value (most shrinkable) → author → key
const COMPRESSION_RATIOS: Record<string, number> = {
  value: 0.5, // Shrink to 50% first
  author: 0.7, // Then author to 70%
  key: 0.85, // Finally key to 85%
};

// Calculate responsive column widths
const COLUMNS = BASE_COLUMNS.map((col) => {
  if (!IS_NARROW) return col;

  const ratio = COMPRESSION_RATIOS[col.name];
  if (ratio) {
    return { ...col, width: Math.max(6, Math.floor(col.width * ratio)) };
  }
  return col;
});

const RESET = "\x1b[0m";

// ═══════════════════════════════════════════════════════════════
// HSL COLOR PALETTE (Bun.color Native)
// ═══════════════════════════════════════════════════════════════
const PALETTE = {
  // Semantic Status Colors (HSL precision)
  status: {
    active: Bun.color("hsl(145, 80%, 45%)", "ansi-16m"),
    draft: Bun.color("hsl(10, 90%, 55%)", "ansi-16m"),
    deprecated: Bun.color("hsl(270, 60%, 55%)", "ansi-16m"),
    default: Bun.color("hsl(0, 0%, 60%)", "ansi-16m"),
  },

  // Column Type Colors (HSL spectrum)
  col: {
    idx: Bun.color("hsl(210, 20%, 50%)", "ansi-16m"),
    key: Bun.color("hsl(0, 0%, 95%)", "ansi-16m"),
    value: Bun.color("hsl(200, 15%, 80%)", "ansi-16m"),
    type: Bun.color("hsl(180, 60%, 55%)", "ansi-16m"),
    version: Bun.color("hsl(280, 70%, 65%)", "ansi-16m"),
    bun: Bun.color("hsl(220, 90%, 60%)", "ansi-16m"),
    author: Bun.color("hsl(48, 100%, 60%)", "ansi-16m"),
    hash: Bun.color("hsl(120, 40%, 45%)", "ansi-16m"),
    modified: Bun.color("hsl(195, 40%, 55%)", "ansi-16m"),
  },

  // Default/Fallback Dimming
  dim: Bun.color("hsl(0, 0%, 40%)", "ansi-16m"),
  border: Bun.color("hsl(220, 20%, 30%)", "ansi-16m"),
  header: Bun.color("hsl(220, 60%, 70%)", "ansi-16m"),
};

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const STATUS_BADGES: Record<string, string> = {
  active: "███",
  draft: "▒▒▒",
  deprecated: "░░░",
  default: "░░░",
};

// ═══════════════════════════════════════════════════════════════
// UNICODE-AWARE WIDTH (Bun.stringWidth native)
// ═══════════════════════════════════════════════════════════════
function uWidth(str: string): number {
  return (Bun as any).stringWidth?.(str) ?? str.length;
}

function uPad(str: string, width: number, align: "left" | "center" | "right"): string {
  const strWidth = uWidth(str);
  const padding = width - strWidth;

  if (padding <= 0) {
    if (strWidth > width) {
      let truncated = "";
      let w = 0;
      for (const char of str) {
        const cw = uWidth(char);
        if (w + cw + 1 > width) break;
        truncated += char;
        w += cw;
      }
      return truncated + "…";
    }
    return str;
  }

  if (align === "right") return " ".repeat(padding) + str;
  if (align === "center") {
    const left = Math.floor(padding / 2);
    return " ".repeat(left) + str + " ".repeat(padding - left);
  }
  return str + " ".repeat(padding);
}

// ═══════════════════════════════════════════════════════════════
// CHROMATIC RENDERING ENGINE (v4.3.1 with badges)
// ═══════════════════════════════════════════════════════════════
function renderCell(
  value: any,
  col: (typeof COLUMNS)[number],
  isDefault: boolean,
  useBadges = false,
): string {
  if (col.key === null) {
    const color = PALETTE.col.idx;
    return `${color}${uPad(String(value), col.width, col.align)}${RESET}`;
  }

  if (isDefault) {
    const dimColor = PALETTE.dim;
    const dimmed = uPad(String(col.default), col.width, col.align);
    return `${dimColor}${dimmed}${RESET}`;
  }

  // Special handling for status with optional badge
  if (col.key === "status") {
    const statusColor = PALETTE.status[value as keyof typeof PALETTE.status] || PALETTE.status.default;
    let displayValue = String(value);

    if (useBadges) {
      const badge = STATUS_BADGES[value as keyof typeof STATUS_BADGES] || STATUS_BADGES.default;
      displayValue = `${badge} ${value}`.slice(0, col.width);
    }

    const padded = uPad(displayValue, col.width, col.align);
    return `${statusColor}${padded}${RESET}`;
  }

  const color = PALETTE.col[col.name.toLowerCase() as keyof typeof PALETTE.col] || PALETTE.dim;
  const padded = uPad(String(value), col.width, col.align);
  return `${color}${padded}${RESET}`;
}

// ═══════════════════════════════════════════════════════════════
// COLOR SWATCH LEGEND
// ═══════════════════════════════════════════════════════════════
function renderColorSwatches(): void {
  const swatches = [
    { label: "active", hsl: [145, 80, 45] },
    { label: "draft", hsl: [10, 90, 55] },
    { label: "deprecated", hsl: [270, 60, 55] },
    { label: "author", hsl: [48, 100, 60] },
    { label: "type", hsl: [180, 60, 55] },
    { label: "bunVer", hsl: [220, 90, 60] },
  ];

  console.log("");
  let legendLine = `${PALETTE.dim}Legend: ${RESET}`;

  swatches.forEach((swatch, idx) => {
    const [h, s, l] = swatch.hsl;
    const color = Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi-16m");
    legendLine += `${color}████${RESET} ${swatch.label}`;
    if (idx < swatches.length - 1) legendLine += "  ";
  });

  console.log(legendLine);
}

// ═══════════════════════════════════════════════════════════════
// MAIN TABULAR ENGINE (v4.3.1)
// ═══════════════════════════════════════════════════════════════
export async function renderFactoryTabular(fmEntries: any[], options?: { badges?: boolean }) {
  const useBadges = options?.badges ?? true;

  // Show compression notice for narrow terminals
  if (IS_NARROW) {
    console.log(`${PALETTE.dim}📱 Responsive mode: ${TERMINAL_WIDTH} cols (compressed)${RESET}`);
  }

  // Enrich entries
  const enriched = fmEntries.map((entry, idx) => {
    const value = entry.value;

    let type: string = typeof value;
    if (type === "object") {
      if (Array.isArray(value)) {
        type = "array";
      } else if (value === null) {
        type = "null";
      } else {
        type = "object";
      }
    }

    let authorHash = entry.authorHash;
    if (!authorHash && entry.author) {
      const hash = Bun.hash.crc32(entry.author);
      authorHash = (hash >>> 0).toString(16).slice(0, 8);
    }

    let status = entry.status;
    if (!status && entry.draft === true) status = "draft";
    else if (!status && entry.draft === false) status = "active";

    return {
      "#": idx + 1,
      key: entry.key,
      value: String(value).slice(0, 100),
      type: type,
      version: entry.version || entry.ver,
      bun: entry.bun || entry.bunVersion || entry.runtime,
      author: entry.author || entry.creator,
      authorHash: authorHash,
      status: status,
      date_iso: entry.date_iso || entry.modified,
    };
  });

  // Calculate total width for borders
  const totalInnerWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);
  const totalWidth = totalInnerWidth + COLUMNS.length * 3 - 1;

  // Border rendering
  const borderColor = PALETTE.border;
  const borderLine = borderColor + "─".repeat(totalWidth) + RESET;
  const headerColor = PALETTE.header;

  // Header
  console.log(borderLine);
  const headers = COLUMNS.map((col) => {
    const color = col.key === "status" ? headerColor : Bun.color(col.hsl || "hsl(0,0%,70%)", "ansi-16m");
    return `${color}${uPad(col.name, col.width, col.align)}${RESET}`;
  }).join(`${borderColor} │ ${RESET}`);
  console.log(`${borderColor} ${headers} ${RESET}`);
  console.log(borderLine);

  // Rows
  enriched.forEach((row, idx) => {
    const cells = COLUMNS.map((col) => {
      let val = col.key === null ? idx + 1 : row[col.key as keyof typeof row];
      const isDefault = val === undefined || val === null || val === "";
      if (isDefault) val = col.default;

      return renderCell(val, col, isDefault && col.key !== null, useBadges);
    }).join(`${borderColor} │ ${RESET}`);

    console.log(`${borderColor} ${cells} ${RESET}`);
  });

  console.log(borderLine);

  // Color swatch legend
  renderColorSwatches();

  // Footer defaults
  const legendColor = PALETTE.dim;
  console.log(
    `${legendColor}Defaults: type=unknown  version=none  bun=any  author=anon  status=active${RESET}`,
  );
}

// ═══════════════════════════════════════════════════════════════
// HSL UTILITY SHORTCUTS
// ═══════════════════════════════════════════════════════════════
export const hsl = (h: number, s: number, l: number) => Bun.color(`hsl(${h}, ${s}%, ${l}%)`);

export const statusColor = (status: string) => {
  switch (status) {
    case "active":
      return Bun.color("hsl(145, 80%, 45%)", "ansi-16m");
    case "draft":
      return Bun.color("hsl(10, 90%, 55%)", "ansi-16m");
    case "deprecated":
      return Bun.color("hsl(270, 60%, 55%)", "ansi-16m");
    default:
      return Bun.color("hsl(0, 0%, 60%)", "ansi-16m");
  }
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION DEMO - v4.3.1 Responsive Chromatic Table
// ═══════════════════════════════════════════════════════════════

console.log("\n🔥 FACTORYWAGER TABULAR v4.3.1 - RESPONSIVE CHROMATIC DEMO");
console.log("-".repeat(50));

// Sample data with Unicode and various types
const sampleData = [
  {
    key: "title",
    value: "FactoryWager API Guide",
    version: "none",
    bun: "any",
    author: "nolarose",
    status: "active",
    date_iso: "2026-02-01T08:14:00",
  },
  {
    key: "draft",
    value: false,
    version: "none",
    bun: "any",
    status: "draft",
    date_iso: null,
  },
  {
    key: "bunVersion",
    value: "1.3.8",
    version: "none",
    bun: "1.3.8",
    author: "system",
    status: "active",
    date_iso: "2026-02-01T08:14:00",
  },
  {
    key: "tags",
    value: ["api", "cli", "registry"],
    version: "none",
    bun: "any",
    status: "active",
    date_iso: null,
  },
  {
    key: "complexName",
    value: "中文测试文本",
    version: "none",
    bun: "any",
    author: "user",
    status: "active",
    date_iso: null,
  },
];

// Render the chromatic table with badges
await renderFactoryTabular(sampleData, { badges: true });

// ═══════════════════════════════════════════════════════════════
// FEATURE HIGHLIGHT
// ═══════════════════════════════════════════════════════════════

console.log("\n✨ v4.3.1 FEATURES:");
console.log("  • Responsive column compression (< 120 cols)");
console.log("  • Status badges (███ active / ▒▒▒ draft / ░░░ deprecated)");
console.log("  • Color swatch legend at bottom");
console.log(`  • Terminal width: ${TERMINAL_WIDTH} cols ${IS_NARROW ? "(compressed)" : "(full)"}`);

console.log("\n🏆 FACTORYWAGER TABULAR v4.3.1 - RESPONSIVE CHROMATIC DOMINION ACHIEVED!");
console.log("🚀 Dynamic compression + Status badges + Color swatches!");
console.log("💎 Terminal visual supremacy - Now responsive!");
