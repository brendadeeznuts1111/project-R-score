// factory-wager/tabular/renderer.ts
// FactoryWager YAML-Native Tabular v4.4 - 12-Column HSL Terminal Renderer

import type { YAMLNode, COLUMNS_V44, ColumnConfig } from "./types";

export function renderYAMLTable(rows: YAMLNode[], columns: ColumnConfig[]) {
  // Header
  const header = columns.map(col => {
    const color = col.hsl ? (Bun.color(col.hsl) ?? "").toString() : "";
    return color + col.name.padEnd(col.w, ' ') + "\x1b[0m";
  }).join(" │ ");

  console.info("\n" + "─".repeat(160));
  console.info(header);
  console.info("─".repeat(160));

  let currentDoc = -1;

  rows.forEach((row) => {
    // Document Separator
    if (row.docIndex !== currentDoc) {
      currentDoc = row.docIndex;
      console.info("─".repeat(160));
      console.info(`${(Bun.color("hsl(220, 60%, 70%)") ?? "").toString()}📄 Document ${row.docIndex}\x1b[0m`);
      console.info("─".repeat(160));
    }

    const cells = columns.map(col => {
      let val = row[col.key as keyof YAMLNode];

      // Formatting Logic
      if (col.key === "interpolated") {
        return val ? `${(Bun.color("hsl(10,90%,55%)") ?? "").toString()}⚠\x1b[0m` : " ";
      }

      if (col.key === "alias" && val) {
        return `${(Bun.color("hsl(48,100%,60%)") ?? "").toString()}→${val}\x1b[0m`;
      }

      if (col.key === "anchor" && val) {
        return `${(Bun.color("hsl(120,40%,45%)") ?? "").toString()}&${val}\x1b[0m`;
      }

      if (col.key === "status") {
        const statusColor = getStatusColor(String(val || "active"));
        return `${(Bun.color(statusColor) ?? "").toString()}${String(val || "active").padEnd(col.w)}\x1b[0m`;
      }

      if (col.key === "yamlType") {
        const typeColor = getYAMLTypeColor(String(val));
        return `${(Bun.color(typeColor) ?? "").toString()}${String(val).padEnd(col.w)}\x1b[0m`;
      }

      if (val === undefined || val === null || val === "") {
        val = (col.key as string) === "status" ? "active" : "—";
      }

      // Alignment
      const str = String(val).slice(0, col.w);
      return col.align === "right" ? str.padStart(col.w) : str.padEnd(col.w);
    });

    console.info(cells.join(" │ "));
  });

  console.info("─".repeat(160) + "\n");
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active': return 'hsl(145, 80%, 45%)';    // Green
    case 'draft': return 'hsl(48, 100%, 60%)';     // Gold
    case 'deprecated': return 'hsl(10, 90%, 55%)';  // Red
    default: return 'hsl(0, 0%, 40%)';              // Gray
  }
}

function getYAMLTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'scalar': return 'hsl(200, 60%, 50%)';     // Blue
    case 'mapping': return 'hsl(280, 60%, 60%)';    // Purple
    case 'sequence': return 'hsl(120, 60%, 50%)';   // Green
    case 'anchor': return 'hsl(48, 100%, 60%)';     // Gold
    case 'alias': return 'hsl(10, 90%, 55%)';       // Red
    default: return 'hsl(0, 0%, 40%)';              // Gray
  }
}

export function renderSummary(rows: YAMLNode[]) {
  const docCount = Math.max(...rows.map(r => r.docIndex)) + 1;
  const anchorCount = rows.filter(r => r.anchor).length;
  const aliasCount = rows.filter(r => r.alias).length;
  const interpolatedCount = rows.filter(r => r.interpolated).length;

  console.info(`📊 Summary: ${docCount} documents, ${rows.length} total nodes`);
  console.info(`🔗 ${anchorCount} anchors, ${aliasCount} aliases resolved`);
  console.info(`⚡ ${interpolatedCount} interpolated values detected`);
}
