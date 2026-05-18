#!/usr/bin/env bun
/**
 * Route Topology Explorer (CLI)
 *
 * Usage:
 *   bun run topology          # Tree view (default)
 *   bun run topology json     # JSON output
 *   bun run topology risk     # Risk heatmap
 *   bun run topology table    # Table view
 */

import { parseArgs } from "util";
import {
  ROUTES,
  GROUP_ICONS,
  RISK_LABELS,
  getTopologyStats,
  getGroupedRoutes,
  getExposedHighRiskRoutes,
  type Route,
} from "../src/server/topology";

// =============================================================================
// ANSI Colors
// =============================================================================

const RISK_COLORS = {
  0: "\x1b[32m", // green - none
  1: "\x1b[36m", // cyan - low
  2: "\x1b[33m", // yellow - medium
  3: "\x1b[35m", // magenta - high
  4: "\x1b[31m", // red - critical
  5: "\x1b[41m\x1b[37m", // red bg - severe
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// =============================================================================
// Tree Data Structure
// =============================================================================

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  routes: Route[];
}

function buildTree(routes: Route[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map(), routes: [] };

  for (const route of routes) {
    const parts = route.path.split("/").filter(Boolean);
    let current = root;

    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, { name: part, children: new Map(), routes: [] });
      }
      current = current.children.get(part)!;
    }
    current.routes.push(route);
  }

  return root;
}

function printTree(node: TreeNode, prefix = "", isLast = true, depth = 0): void {
  const children = Array.from(node.children.values());

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isChildLast = i === children.length - 1;
    const connector = isChildLast ? "└── " : "├── ";
    const extension = isChildLast ? "    " : "│   ";

    // Format node name
    let nodeName = child.name;
    if (nodeName.startsWith(":")) {
      nodeName = `${DIM}${nodeName}${RESET}`;
    }

    // Add route info if this is a leaf
    if (child.routes.length > 0) {
      const route = child.routes[0];
      const icon = GROUP_ICONS[route.group] || "•";
      const methods = child.routes
        .flatMap((r) => r.methods)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(",");
      const riskColor = RISK_COLORS[route.risk as keyof typeof RISK_COLORS];
      const authBadge = route.auth !== "none" ? ` 🔒${route.auth}` : "";
      const devBadge = route.devOnly ? ` ${DIM}(dev)${RESET}` : "";

      console.info(
        `${prefix}${connector}${icon} ${nodeName} ${DIM}[${methods}]${RESET}${riskColor}${authBadge}${RESET}${devBadge}`
      );
    } else {
      console.info(`${prefix}${connector}${BOLD}${nodeName}${RESET}`);
    }

    printTree(child, prefix + extension, isChildLast, depth + 1);
  }
}

// =============================================================================
// Output Views
// =============================================================================

function printTreeView(): void {
  console.info(`\n${BOLD}Route Topology${RESET}`);
  console.info(`${"─".repeat(60)}\n`);

  const tree = buildTree(ROUTES);
  printTree(tree);

  // Legend
  console.info(`\n${DIM}${"─".repeat(60)}${RESET}`);
  console.info(`${BOLD}Legend:${RESET}`);
  console.info(`  ${RISK_COLORS[0]}●${RESET} None  ${RISK_COLORS[1]}●${RESET} Low  ${RISK_COLORS[2]}●${RESET} Medium  ${RISK_COLORS[3]}●${RESET} High  ${RISK_COLORS[4]}●${RESET} Critical  ${RISK_COLORS[5]}●${RESET} Severe`);
  console.info(`  🔒 = Requires authentication\n`);
}

function printJsonView(): void {
  const grouped = getGroupedRoutes();
  const stats = getTopologyStats();

  const output = {
    generated: new Date().toISOString(),
    stats,
    groups: grouped,
    routes: ROUTES,
  };

  console.info(JSON.stringify(output, null, 2));
}

function printRiskView(): void {
  console.info(`\n${BOLD}Route Risk Heatmap${RESET}`);
  console.info(`${"─".repeat(70)}\n`);

  const riskBlocks = ["░", "▒", "▓", "█", "█", "█"];
  const stats = getTopologyStats();

  // Group by risk level
  for (let risk = 5; risk >= 0; risk--) {
    const routes = ROUTES.filter((r) => r.risk === risk);
    if (routes.length === 0) continue;

    const color = RISK_COLORS[risk as keyof typeof RISK_COLORS];
    const label = RISK_LABELS[risk].padEnd(8);
    const bar = riskBlocks[risk].repeat(Math.min(routes.length, 30));
    const count = `(${routes.length})`.padStart(4);

    console.info(`${color}${label}${RESET} ${color}${bar}${RESET} ${count}`);

    // Show high-risk routes
    if (risk >= 3) {
      for (const route of routes.slice(0, 5)) {
        const methods = route.methods.join(",");
        console.info(`${DIM}         └─ ${route.path} [${methods}] ${route.auth}${RESET}`);
      }
      if (routes.length > 5) {
        console.info(`${DIM}         └─ ... and ${routes.length - 5} more${RESET}`);
      }
    }
  }

  // Summary
  console.info(`\n${DIM}${"─".repeat(70)}${RESET}`);
  console.info(`${BOLD}Summary:${RESET}`);
  console.info(`  Average Risk Score: ${stats.avgRiskScore.toFixed(2)} / 5.0`);
  console.info(`  High/Critical Routes: ${stats.highRisk}`);
  if (stats.unauthHighRisk > 0) {
    console.info(`  ${RISK_COLORS[4]}⚠ Unauthenticated High-Risk: ${stats.unauthHighRisk}${RESET}`);
    const exposed = getExposedHighRiskRoutes(3);
    for (const route of exposed) {
      console.info(`    ${RISK_COLORS[4]}└─ ${route.path}${RESET}`);
    }
  }
  console.info();
}

function printTableView(): void {
  const formatted = ROUTES.map((r) => ({
    Path: r.path,
    Methods: r.methods.join(","),
    Group: `${GROUP_ICONS[r.group] || "•"} ${r.group}`,
    Auth: r.auth === "none" ? "public" : `🔒 ${r.auth}`,
    Risk: "●".repeat(r.risk + 1).padEnd(6, "○"),
  }));

  console.info(`\n${BOLD}Route Table${RESET} (${ROUTES.length} routes)\n`);
  console.info(Bun.inspect.table(formatted, { colors: true }));
}

// =============================================================================
// Main
// =============================================================================

const { positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
});

const mode = positionals[0] || "tree";

switch (mode) {
  case "json":
    printJsonView();
    break;
  case "risk":
    printRiskView();
    break;
  case "table":
    printTableView();
    break;
  case "tree":
  default:
    printTreeView();
    break;
}
