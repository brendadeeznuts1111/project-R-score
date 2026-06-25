// factory-wager/tabular/renderer-v45.ts
// FactoryWager YAML-Native Tabular v4.5 - Smart Renderer with Visual Guidance

import type { YAMLNode, DocStats } from "./types-v45";
import { COLUMNS_V45 } from "./types-v45";

export function renderYAMLTableV45(rows: YAMLNode[], stats: DocStats) {
  const cols = COLUMNS_V45;
  const totalWidth = cols.reduce((sum, c) => sum + c.w, 0) + (cols.length * 3) - 1;

  const c = (hsl: string) => (Bun.color(hsl) ?? "").toString();
  const reset = "\x1b[0m";

  // Title block
  console.info("\n" + "█".repeat(totalWidth));
  console.info(`${c("hsl(48, 100%, 60%)")} ▵ FACTORYWAGER YAML-NATIVE TABULAR v4.5 ${reset}`);
  console.info(`${c("hsl(210, 20%, 50%)")}  Infrastructure Nexus Integration • ${stats.totalDocs} docs • ${stats.totalNodes} nodes ${reset}`);
  console.info("█".repeat(totalWidth));

  // Legend
  console.info(`${c("hsl(0,0%,60%)")} Legend: &anchor  →alias  ⚠env-interp  …truncated  ${c("hsl(300,70%,65%)")}M${c("hsl(0,0%,60%)")}merge  →inheritance+ovrd${reset}`);

  // Header
  const header = cols.map(col => {
    const color = col.hsl ? c(col.hsl) : c("hsl(0,0%,70%)");
    return color + col.name.padEnd(col.w, ' ') + reset;
  }).join(" │ ");

  console.info("─".repeat(totalWidth));
  console.info(header);
  console.info("═".repeat(totalWidth));

  // Rows with document separators
  let currentDoc = -1;

  rows.forEach((row) => {
    // Document separator with metadata
    if (row.docIndex !== currentDoc) {
      currentDoc = row.docIndex;
      console.info("─".repeat(totalWidth));
      const docHeader = `${c("hsl(220, 60%, 70%)")}📄 Document ${row.docIndex}`;
      console.info(docHeader.padEnd(totalWidth - 10) + reset + " ".repeat(10));
      console.info("─".repeat(totalWidth));
    }

    // Indentation visual (depth)
    const indent = "  ".repeat(Math.min(row._depth, 2));
    const displayKey = indent + row.key.split('.').pop(); // Show short key with indent

    const cells = cols.map(col => {
      let val: any;
      let colorCode = col.hsl ? c(col.hsl) : "";

      switch(col.key) {
        case 'key':
          val = displayKey.length > col.w ? displayKey.slice(0, col.w-1) + '…' : displayKey;
          break;
        case 'value':
          val = row.isMerge ? `${c("hsl(300,70%,65%)")}M${reset} ${row.value}` : row.value;
          break;
        case '_truncated':
          return row._truncated ? `${c("hsl(10,90%,55%)")}…${reset}` : " ";
        case '_depth':
          val = row._depth;
          break;
        case 'interpolated':
          return row.interpolated ? `${c("hsl(10,90%,55%)")}⚠${reset}` : " ";
        case 'anchor':
          return row.anchor ? `${c("hsl(120,40%,45%)")}&${row.anchor}${reset}` : " ".repeat(col.w);
        case 'alias':
          return row.alias ? `${c("hsl(48,100%,60%)")}→${row.alias}${reset}` : " ".repeat(col.w);
        case 'status':
          const statusColor = row.status === 'active' ? c("hsl(145,80%,45%)") :
                             row.status === 'draft' ? c("hsl(10,90%,55%)") :
                             row.status === 'merged' ? c("hsl(300,70%,65%)") :
                             c("hsl(0, 0%, 60%)");
          return statusColor + (row.status || "active").padEnd(col.w) + reset;
        case 'inheritance':
          if (row.inheritance) {
            return `${c("hsl(300,70%,65%)")}${row.inheritance.padEnd(col.w)}${reset}`;
          }
          return " ".repeat(col.w);
        case 'yamlType':
          const typeColor = row.yamlType === 'merge' ? c("hsl(300, 70%, 65%)") :
                            row.yamlType === 'scalar' ? c("hsl(200, 60%, 55%)") :
                            row.yamlType === 'mapping' ? c("hsl(280, 60%, 60%)") :
                            row.yamlType === 'sequence' ? c("hsl(120, 60%, 55%)") :
                            c("hsl(0, 0%, 70%)");
          return typeColor + String(row.yamlType).padEnd(col.w) + reset;
        default:
          val = row[col.key as keyof YAMLNode] ?? "—";
      }

      // Default string formatting with truncation awareness
      const str = String(val);
      const padded = col.align === "right" ? str.padStart(col.w) : str.padEnd(col.w);
      return colorCode + padded + reset;
    });

    console.info(cells.join(" │ "));
  });

  // Statistics footer
  console.info("═".repeat(totalWidth));
  console.info(`${c("hsl(180,60%,55%)")}📊 Statistics:${reset}`);
  console.info(`  Anchors defined: ${c("hsl(120,40%,45%)")}${stats.anchorsDefined}${reset}  │  ` +
              `Aliases resolved: ${c("hsl(48,100%,60%)")}${stats.aliasesResolved}${reset}  │  ` +
              `Env vars: ${c("hsl(10,90%,55%)")}${stats.interpolated}${reset}  │  ` +
              `Max depth: ${c("hsl(280,60%,60%)")}${stats.maxDepth}${reset}`);
  console.info("█".repeat(totalWidth) + "\n");
}
