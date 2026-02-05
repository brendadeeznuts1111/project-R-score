/**
 * 🚀 FACTORYWAGER TABULAR v4.3: Bun.color + Unicode + HSL Semantic Chromatics
 * Chromatic terminal fortress with HSL precision and Unicode safety
 */

console.log('🎨 FACTORYWAGER TABULAR v4.3 - HSL CHROMATIC DOMINION!')
console.log('=' .repeat(80))

// ═══════════════════════════════════════════════════════════════
// HSL COLOR PALETTE (Bun.color Native)
// ═══════════════════════════════════════════════════════════════
const PALETTE = {
  // Semantic Status Colors (HSL precision)
  status: {
    active:    Bun.color("hsl(145, 80%, 45%)", "ansi-16m"),    // Vibrant green
    draft:     Bun.color("hsl(10, 90%, 55%)", "ansi-16m"),     // Alert orange-red
    deprecated:Bun.color("hsl(270, 60%, 55%)", "ansi-16m"),    // Purple warning
    default:   Bun.color("hsl(0, 0%, 60%)", "ansi-16m")        // Neutral gray
  },

  // Column Type Colors (HSL spectrum)
  col: {
    idx:       Bun.color("hsl(210, 20%, 50%)", "ansi-16m"),    // Steel blue-gray
    key:       Bun.color("hsl(0, 0%, 95%)", "ansi-16m"),       // Bright white
    value:     Bun.color("hsl(200, 15%, 80%)", "ansi-16m"),    // Soft silver
    type:      Bun.color("hsl(180, 60%, 55%)", "ansi-16m"),    // Cyan teal
    version:   Bun.color("hsl(280, 70%, 65%)", "ansi-16m"),    // Magenta
    bun:       Bun.color("hsl(220, 90%, 60%)", "ansi-16m"),    // Electric blue
    author:    Bun.color("hsl(48, 100%, 60%)", "ansi-16m"),    // Factory gold
    hash:      Bun.color("hsl(120, 40%, 45%)", "ansi-16m"),    // Muted green
    modified:  Bun.color("hsl(195, 40%, 55%)", "ansi-16m")     // Steel cyan
  },

  // Default/Fallback Dimming
  dim:       Bun.color("hsl(0, 0%, 40%)", "ansi-16m"),         // Dim gray for defaults
  border:    Bun.color("hsl(220, 20%, 30%)", "ansi-16m"),      // Deep border
  header:    Bun.color("hsl(220, 60%, 70%)", "ansi-16m")       // Header blue
};

// ═══════════════════════════════════════════════════════════════
// 10-COLUMN SCHEMA (v4.3 with Bun.color HSL)
// ═══════════════════════════════════════════════════════════════
const COLUMNS = [
  { name: "#",        key: null,      align: "right",  width: 3,  hsl: "hsl(210, 20%, 50%)", default: null      },
  { name: "key",      key: "key",     align: "left",   width: 18, hsl: "hsl(0, 0%, 95%)",   default: "unnamed" },
  { name: "value",    key: "value",   align: "left",   width: 32, hsl: "hsl(200, 15%, 80%)",default: ""        },
  { name: "type",     key: "type",    align: "center", width: 10, hsl: "hsl(180, 60%, 55%)",default: "unknown" },
  { name: "version",  key: "version", align: "center", width: 12, hsl: "hsl(280, 70%, 65%)",default: "none"    },
  { name: "bunVer",   key: "bun",     align: "center", width: 10, hsl: "hsl(220, 90%, 60%)",default: "any"     },
  { name: "author",   key: "author",  align: "left",   width: 14, hsl: "hsl(48, 100%, 60%)",default: "anon"    },
  { name: "authorHash",key:"authorHash",align:"left",  width: 10, hsl: "hsl(120, 40%, 45%)",default: "—"       },
  { name: "status",   key: "status",  align: "center", width: 10, hsl: null,                default: "active"  }, // Dynamic HSL
  { name: "modified", key: "date_iso",align: "right",  width: 16, hsl: "hsl(195, 40%, 55%)",default: "never"   }
] as const;

const RESET = "\x1b[0m";

// ═══════════════════════════════════════════════════════════════
// UNICODE-AWARE WIDTH (Bun.stringWidth native)
// ═══════════════════════════════════════════════════════════════
function uWidth(str: string): number {
  // Bun.stringWidth handles East Asian Wide (EAW), emojis, zero-width joiners
  return (Bun as any).stringWidth?.(str) ?? str.length;
}

function uPad(str: string, width: number, align: "left" | "center" | "right"): string {
  const strWidth = uWidth(str);
  const padding = width - strWidth;

  if (padding <= 0) {
    // Truncate with ellipsis if overflow
    if (strWidth > width) {
      // Rough truncation considering Unicode
      let truncated = "";
      let w = 0;
      for (const char of str) {
        const cw = uWidth(char);
        if (w + cw + 1 > width) break; // +1 for ellipsis
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
// CHROMATIC RENDERING ENGINE
// ═══════════════════════════════════════════════════════════════
function renderCell(value: any, col: typeof COLUMNS[number], isDefault: boolean): string {
  // Handle null column (index)
  if (col.key === null) {
    const color = PALETTE.col.idx;
    return `${color}${uPad(String(value), col.width, col.align)}${RESET}`;
  }

  // Dim defaults significantly
  if (isDefault) {
    const dimColor = PALETTE.dim;
    const dimmed = uPad(String(col.default), col.width, col.align);
    return `${dimColor}${dimmed}${RESET}`;
  }

  // Special handling for status (semantic HSL)
  if (col.key === "status") {
    const statusColor = PALETTE.status[value as keyof typeof PALETTE.status] || PALETTE.status.default;
    const padded = uPad(String(value), col.width, col.align);
    return `${statusColor}${padded}${RESET}`;
  }

  // Standard HSL coloring via pre-computed ANSI color strings
  const color = PALETTE.col[col.name.toLowerCase() as keyof typeof PALETTE.col] || PALETTE.dim;
  const padded = uPad(String(value), col.width, col.align);
  return `${color}${padded}${RESET}`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN TABULAR ENGINE
// ═══════════════════════════════════════════════════════════════
export async function renderFactoryTabular(fmEntries: any[]) {
  // Enrich entries with type inference and defaults
  const enriched = fmEntries.map((entry, idx) => {
    const value = entry.value;

    // Type inference
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

    // Author hash generation (CRC32 for speed, shown as hex)
    let authorHash = entry.authorHash;
    if (!authorHash && entry.author) {
      const hash = Bun.hash.crc32(entry.author);
      authorHash = (hash >>> 0).toString(16).slice(0, 8);
    }

    // Status resolution
    let status = entry.status;
    if (!status && entry.draft === true) status = "draft";
    else if (!status && entry.draft === false) status = "active";

    return {
      "#": idx + 1,
      key: entry.key,
      value: String(value).slice(0, 100), // Prevent overflow
      type: type,
      version: entry.version || entry.ver,
      bun: entry.bun || entry.bunVersion || entry.runtime,
      author: entry.author || entry.creator,
      authorHash: authorHash,
      status: status,
      date_iso: entry.date_iso || entry.modified
    };
  });

  // Calculate total width for borders
  const totalInnerWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);
  const totalWidth = totalInnerWidth + (COLUMNS.length * 3) - 1; // 3 chars per cell (space+pad+space)

  // Border rendering with Bun.color HSL
  const borderColor = PALETTE.border;
  const borderLine = borderColor + "─".repeat(totalWidth) + RESET;
  const headerColor = PALETTE.header;

  // Header
  console.log(borderLine);
  const headers = COLUMNS.map(col => {
    const color = col.key === "status" ? headerColor : Bun.color(col.hsl || "hsl(0,0%,70%)", "ansi-16m");
    return `${color}${uPad(col.name, col.width, col.align)}${RESET}`;
  }).join(`${borderColor} │ ${RESET}`);
  console.log(`${borderColor} ${headers} ${RESET}`);
  console.log(borderLine);

  // Rows
  enriched.forEach((row, idx) => {
    const cells = COLUMNS.map(col => {
      let val = col.key === null ? idx + 1 : row[col.key as keyof typeof row];
      const isDefault = val === undefined || val === null || val === "";
      if (isDefault) val = col.default;

      return renderCell(val, col, isDefault && col.key !== null);
    }).join(`${borderColor} │ ${RESET}`);

    console.log(`${borderColor} ${cells} ${RESET}`);
  });

  console.log(borderLine);

  // Footer legend with HSL semantics
  const legendColor = PALETTE.dim;
  console.log(`${legendColor}Defaults: type=unknown(version=none(bun=any(author=anon(status=active${RESET}`);
}

// ═══════════════════════════════════════════════════════════════
// HSL UTILITY SHORTCUTS
// ═══════════════════════════════════════════════════════════════
export const hsl = (h: number, s: number, l: number) => Bun.color(`hsl(${h}, ${s}%, ${l}%)`);

// Semantic color generators
export const statusColor = (status: string) => {
  switch(status) {
    case "active": return Bun.color("hsl(145, 80%, 45%)", "ansi-16m");
    case "draft": return Bun.color("hsl(10, 90%, 55%)", "ansi-16m");
    case "deprecated": return Bun.color("hsl(270, 60%, 55%)", "ansi-16m");
    default: return Bun.color("hsl(0, 0%, 60%)", "ansi-16m");
  }
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION DEMO - Chromatic Tabular in Action
// ═══════════════════════════════════════════════════════════════

console.log('\n🔥 FACTORYWAGER TABULAR v4.3 - CHROMATIC DEMO')
console.log('-' .repeat(50))

// Sample data with Unicode and various types
const sampleData = [
  {
    key: "title",
    value: "FactoryWager API Guide",
    version: "none",
    bun: "any",
    author: "nolarose",
    status: "active",
    date_iso: "2026-02-01T08:14:00"
  },
  {
    key: "draft",
    value: false,
    version: "none",
    bun: "any",
    status: "draft",
    date_iso: null
  },
  {
    key: "bunVersion",
    value: "1.3.8",
    version: "none",
    bun: "1.3.8",
    author: "system",
    status: "active",
    date_iso: "2026-02-01T08:14:00"
  },
  {
    key: "tags",
    value: ["api", "cli", "registry"],
    version: "none",
    bun: "any",
    status: "active",
    date_iso: null
  },
  {
    key: "complexName",
    value: "中文测试文本",
    version: "none",
    bun: "any",
    author: "user",
    status: "active",
    date_iso: null
  }
];

// Render the chromatic table
await renderFactoryTabular(sampleData);

// ═══════════════════════════════════════════════════════════════
// HSL COLOR TESTING SUITE
// ═══════════════════════════════════════════════════════════════

console.log('\n🎨 HSL COLOR TESTING SUITE')
console.log('-' .repeat(50))

const hslTests = [
  { name: "Success/Active", hsl: "hsl(145, 80%, 45%)" },
  { name: "Warning/Draft", hsl: "hsl(10, 90%, 55%)" },
  { name: "Info/Type", hsl: "hsl(180, 60%, 55%)" },
  { name: "Accent/Version", hsl: "hsl(280, 70%, 65%)" },
  { name: "Gold/Author", hsl: "hsl(48, 100%, 60%)" },
  { name: "Muted/Default", hsl: "hsl(0, 0%, 40%)" }
];

hslTests.forEach(test => {
  const color = Bun.color(test.hsl, "ansi-16m");
  const hex = Bun.color(test.hsl, "hex");
  const rgb = Bun.color(test.hsl, "[rgb]");
  console.log(`  ${test.name.padEnd(18)}: ${color}${test.hsl}${RESET} → ${hex} → RGB[${rgb?.join(', ')}]`);
});

// ═══════════════════════════════════════════════════════════════
// UNICODE WIDTH TESTING
// ═══════════════════════════════════════════════════════════════

console.log('\n🌐 UNICODE WIDTH TESTING')
console.log('-' .repeat(50))

const unicodeTests = [
  "ASCII",
  "中文测试",
  "🚀rocket",
  "café",
  "👨‍💻developer",
  "한국어",
  "العربية"
];

unicodeTests.forEach(str => {
  const length = str.length;
  const width = uWidth(str);
  const padded = uPad(str, 15, "left");
  console.log(`  "${str}" → Length: ${length}, Width: ${width}, Padded: "${padded}"`);
});

console.log('\n🏆 FACTORYWAGER TABULAR v4.3 - CHROMATIC DOMINION ACHIEVED!')
console.log('🚀 HSL precision + Unicode safety + Guaranteed defaults!')
console.log('💎 Computational aesthetic perfection - Terminal chromatics unleashed!')
console.log('🎨 Next vector: v4.4 gradient interpolation? Your command awaits!')
