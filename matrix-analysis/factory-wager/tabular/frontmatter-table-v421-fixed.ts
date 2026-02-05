/**
 * FactoryWager Tabular v4.2.1 - Frontmatter Table Display (Fixed)
 * Explicit default value enforcement for every nullable column
 * Guaranteed cell values with visual distinction for defaults
 */

// Column definitions with explicit defaults
const COLUMNS = [
  { name: "#",        key: null,      align: "right", width: 3,  style: "\x1b[90m", default: null },
  { name: "key",      key: "key",     align: "left",  width: 16, style: "\x1b[1m",  default: null }, // Required
  { name: "value",    key: "value",   align: "left",  width: 30, style: "",         default: "" },   // Empty string default
  { name: "type",     key: "type",    align: "center",width: 10, style: "\x1b[36m", default: "unknown" },
  { name: "version",  key: "version", align: "center",width: 10, style: "\x1b[35m", default: "none" },
  { name: "bunVer",   key: "bun",     align: "center",width: 8,  style: "\x1b[34m", default: "any" },
  { name: "author",   key: "author",  align: "left",  width: 12, style: "\x1b[33m", default: "anonymous" },
  { name: "authorHash",key:"authorHash",align:"left", width: 10, style: "\x1b[32m", default: "----------" },
  { name: "status",   key: "status",  align: "center",width: 8,  style: "",         default: "active" },
  { name: "modified", key: "date_iso",align: "right", width: 19, style: "\x1b[36m", default: "never" }
] as const;

const DIM = "\x1b[90m";  // Gray for defaults
const RESET = "\x1b[0m";

/**
 * Render a single cell with default value handling
 */
function renderCell(value: any, col: typeof COLUMNS[number], rowIdx: number): string {
  // Handle index column specially
  if (col.key === null) return String(rowIdx + 1);

  // Check if value is missing/empty/null/undefined
  const isMissing = value === undefined || value === null || value === "" || value === "—";

  // Use default if missing - ensure displayValue is never null
  const defaultValue = col.default ?? "";
  const displayValue = isMissing ? defaultValue : String(value);
  const isDefault = isMissing && col.default !== null;

  // Truncate to width-1 to allow for ellipsis
  const maxLen = col.width - 1;
  let formatted = displayValue;
  if (displayValue.length > col.width) {
    formatted = displayValue.slice(0, maxLen) + "…";
  }

  // Apply styling: dim gray for defaults, column style for actual values
  if (isDefault) {
    return `${DIM}${pad(formatted, col.width, col.align)}${RESET}`;
  }

  // Status gets special color handling
  if (col.key === "status") {
    const color = displayValue === "draft" ? "\x1b[31m" :
                  displayValue === "active" ? "\x1b[32m" :
                  displayValue === "deprecated" ? "\x1b[33m" : DIM;
    return `${color}${pad(formatted, col.width, col.align)}${RESET}`;
  }

  return `${col.style}${pad(formatted, col.width, col.align)}${RESET}`;
}

/**
 * Main function to render FactoryWager tabular frontmatter data
 */
function renderFactoryTabular(fmEntries: any[]) {
  // Enrich with computed defaults
  const enriched = fmEntries.map((entry, idx) => {
    const value = entry.value;
    let type: string = typeof value;
    if (type === "object") type = Array.isArray(value) ? "array" : "object";
    if (value === null) type = "null";

    // Compute author hash if author exists
    let authorHash = entry.authorHash;
    if (!authorHash && entry.author) {
      const hash = Bun.hash.crc32(entry.author); // Fast hash for display
      authorHash = (hash >>> 0).toString(16).padStart(8, '0').slice(0, 10);
    }

    return {
      "#": idx + 1,
      key: entry.key || "unnamed",
      value: String(value || "").slice(0, 200),
      type: type,
      version: entry.version || entry.ver || entry.v,
      bun: entry.bun || entry.bunVersion || entry["bun-version"],
      author: entry.author || entry.creator || entry.by,
      authorHash: authorHash,
      status: entry.status || (entry.draft === true ? "draft" : entry.draft === false ? "active" : undefined),
      date_iso: entry.date_iso || entry.modified || entry.updated
    };
  });

  // Calculate total width
  const widths = COLUMNS.map(c => c.width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + (COLUMNS.length - 1); // borders between columns

  // Build table parts
  const border = "─".repeat(totalWidth);

  const header = COLUMNS.map((c, i) => {
    const headerText = pad(c.name, widths[i], c.align);
    return `${c.style}${headerText}${RESET}`;
  }).join("│");

  // Render table
  console.log(border);
  console.log(header);
  console.log(border);

  // Rows with guaranteed defaults
  enriched.forEach((row, idx) => {
    const cells = COLUMNS.map((col, i) => {
      const val = col.key === null ? idx + 1 : row[col.key as keyof typeof row];
      return renderCell(val, col, idx);
    });
    console.log(cells.join("│"));
  });

  console.log(border);
  console.log(`${DIM}Defaults: type=unknown, version=none, bun=any, author=anonymous, status=active${RESET}`);
}

/**
 * Unicode-aware padding function
 */
function pad(str: string, width: number, align: "left" | "center" | "right"): string {
  const len = str.length; // Bun.stringWidth for unicode if available
  const padding = width - len;

  if (padding <= 0) return str.slice(0, width);

  if (align === "right") return " ".repeat(padding) + str;
  if (align === "center") {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return " ".repeat(left) + str + " ".repeat(right);
  }
  return str + " ".repeat(padding);
}

/**
 * Demo function with sample frontmatter data
 */
function demoFactoryTabular() {
  console.log('📊 FactoryWager Tabular v4.2.1 - Frontmatter Display Demo');
  console.log('=' .repeat(80));

  const sampleData = [
    {
      key: "title",
      value: "FactoryWager API Guide",
      type: "string",
      author: "nolarose",
      date_iso: "2026-02-01T08:10:00Z"
    },
    {
      key: "draft",
      value: false,
      // Missing author, modified - will show defaults
    },
    {
      key: "bunVersion",
      value: "1.3.8",
      author: "system",
      date_iso: "2026-02-01T08:10:00Z"
    },
    {
      key: "tags",
      value: ["api", "cli", "registry"],
      // Missing author, modified - will show defaults
    },
    {
      key: "deprecated",
      value: true,
      author: "admin",
      status: "deprecated",
      date_iso: "2026-01-15T00:00:00Z"
    },
    {
      key: "version",
      value: "4.2.1",
      version: "4.2.1",
      author: "nolarose",
      date_iso: "2026-02-01T08:10:00Z"
    },
    {
      key: "emptyValue",
      value: null,
      // Will show empty string default for value
    },
    {
      key: "missingFields",
      // All fields missing - will show all defaults
    }
  ];

  renderFactoryTabular(sampleData);
}

// Export for use in other modules
export { renderFactoryTabular, COLUMNS, demoFactoryTabular };

// Run demo if executed directly
if (import.meta.main) {
  demoFactoryTabular();
}
