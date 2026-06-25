#!/usr/bin/env bun
/**
 * Validate gate-map.json and print the project tree.
 *
 * Usage:
 *   bun run gate-map:validate
 *   bun run gate-map:validate -- --zone agents
 *   bun run gate-map:validate -- --json
 */

import {
  formatGateMapTree,
  gitChangedPaths,
  loadGateMap,
  resolveProjects,
  validateGateMap,
} from "../lib/gate-map.ts";

function printUsage(): void {
  console.log("Usage: bun run gate-map:validate [--zone <name>] [--project <id>] [--json]");
}

async function main(): Promise<number> {
  const args = Bun.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return 0;
  }

  const zone = args.includes("--zone") ? args[args.indexOf("--zone") + 1] : undefined;
  const projectId = args.includes("--project") ? args[args.indexOf("--project") + 1] : undefined;
  const asJson = args.includes("--json");

  const map = await loadGateMap();
  const validation = await validateGateMap(map);

  const changed = await gitChangedPaths();
  const projects = resolveProjects(map, {
    all: !zone && !projectId,
    zone,
    projectId,
    changedOnly: args.includes("--changed"),
  }, changed);

  if (asJson) {
    console.log(JSON.stringify({ validation, projects, changedPathCount: changed.length }, null, 2));
    return validation.ok ? 0 : 1;
  }

  console.log(formatGateMapTree(map, projects));
  console.log("");

  if (validation.issues.length > 0) {
    console.log("Validation:");
    for (const issue of validation.issues) {
      const prefix = issue.level === "error" ? "ERROR" : "WARN";
      const pid = issue.projectId ? `[${issue.projectId}] ` : "";
      console.log(`  ${prefix} ${pid}${issue.message}`);
    }
    console.log("");
  }

  if (args.includes("--changed")) {
    console.log(`Changed paths: ${changed.length} (matched ${projects.length} project(s))`);
    console.log("");
  }

  console.log(validation.ok ? "✅ gate-map valid" : "❌ gate-map has errors");
  return validation.ok ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);