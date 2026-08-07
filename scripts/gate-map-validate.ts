#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Validate gate-map.json and print the project tree.
 *
 * Usage:
 *   bun run gate-map:validate
 *   bun run gate-map:validate -- --zone agents
 *   bun run gate-map:validate -- --json
 */

import { jsonOut } from '../lib/console-depth.ts';
import {
  formatGateMapTree,
  gitChangedPaths,
  loadGateMap,
  resolveProjects,
  validateGateMap,
} from '../lib/gate-map.ts';

function printUsage(): void {
  console.info('Usage: bun run gate-map:validate [--zone <name>] [--project <id>] [--json]');
}

async function main(): Promise<number> {
  const args = applyUnknownLongOptionGuardFor('gate-map:validate', Bun.argv.slice(2));
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }

  const zone = args.includes('--zone') ? args[args.indexOf('--zone') + 1] : undefined;
  const projectId = args.includes('--project') ? args[args.indexOf('--project') + 1] : undefined;
  const asJson = args.includes('--json');

  const map = await loadGateMap();
  const validation = await validateGateMap(map);

  const changed = await gitChangedPaths();
  const projects = resolveProjects(
    map,
    {
      all: !zone && !projectId,
      zone,
      projectId,
      changedOnly: args.includes('--changed'),
    },
    changed
  );

  if (asJson) {
    jsonOut({ validation, projects, changedPathCount: changed.length });
    return validation.ok ? 0 : 1;
  }

  console.info(formatGateMapTree(map, projects));
  console.info('');

  if (validation.issues.length > 0) {
    console.info('Validation:');
    for (const issue of validation.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      const pid = issue.projectId ? `[${issue.projectId}] ` : '';
      console.info(`  ${prefix} ${pid}${issue.message}`);
    }
    console.info('');
  }

  if (args.includes('--changed')) {
    console.info(`Changed paths: ${changed.length} (matched ${projects.length} project(s))`);
    console.info('');
  }

  console.info(validation.ok ? '✅ gate-map valid' : '❌ gate-map has errors');
  return validation.ok ? 0 : 1;
}

if (import.meta.main) {
  main().then(
    code => process.exit(code),
    err => {
      console.error(err);
      process.exit(1);
    }
  );
}
