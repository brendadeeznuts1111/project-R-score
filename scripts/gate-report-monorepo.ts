#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Run gate-map projects and emit monorepo HTML + JSON dashboard.
 *
 * Usage:
 *   bun run gate-report:monorepo
 *   bun run gate-report:monorepo -- --zone agents
 *   bun run gate-report:monorepo -- --project plannator
 *   bun run gate-report:monorepo -- --changed
 *   bun run gate-report:monorepo -- --open
 */

import { gitChangedPaths, loadGateMap, resolveProjects, validateGateMap } from '../lib/gate-map.ts';
import {
  buildGithubSummary,
  buildMonorepoHtml,
  buildMonorepoJson,
  DEFAULT_HTML_OUTPUT,
  DEFAULT_JSON_OUTPUT,
  runProject,
  summarizeZones,
  type MonorepoReport,
} from '../lib/gate-report-monorepo.ts';
import { toolVersion } from '../plannator/lib/gate-report.ts';

function printUsage(): void {
  console.info('Usage: bun run gate-report:monorepo [options]');
  console.info('  --all                 Run all enabled projects (default)');
  console.info('  --zone <name>         Filter by zone');
  console.info('  --project <id>        Run one project');
  console.info('  --changed             Only projects with git changes vs HEAD');
  console.info('  --fail-fast           Stop after first failing project');
  console.info('  --open                Open HTML in browser');
  console.info('  --output <path>       HTML output path');
  console.info('  --json <path>         JSON output path');
}

async function main(): Promise<number> {
  const args = applyUnknownLongOptionGuardFor('gate-report:monorepo', Bun.argv.slice(2));
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }

  let htmlPath = DEFAULT_HTML_OUTPUT;
  let jsonPath = DEFAULT_JSON_OUTPUT;
  let jsonExplicit = false;
  const openAfter = args.includes('--open');
  const failFast = args.includes('--fail-fast');

  let zone: string | undefined;
  let projectId: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--zone' && args[i + 1]) {
      zone = args[++i];
    } else if (args[i] === '--project' && args[i + 1]) {
      projectId = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      htmlPath = args[i + 1].startsWith('/') ? args[i + 1] : `${import.meta.dir}/../${args[i + 1]}`;
      i++;
    } else if (args[i] === '--json' && args[i + 1]) {
      jsonPath = args[i + 1].startsWith('/') ? args[i + 1] : `${import.meta.dir}/../${args[i + 1]}`;
      jsonExplicit = true;
      i++;
    }
  }
  if (!jsonExplicit && htmlPath !== DEFAULT_HTML_OUTPUT) {
    jsonPath = htmlPath.replace(/\.html$/i, '.json');
  }

  const map = await loadGateMap();
  const validation = await validateGateMap(map);
  if (!validation.ok) {
    console.error('gate-map validation failed — run bun run gate-map:validate');
    return 1;
  }

  const changed = await gitChangedPaths();
  const projects = resolveProjects(
    map,
    {
      all: args.includes('--all') || (!zone && !projectId && !args.includes('--changed')),
      zone,
      projectId,
      changedOnly: args.includes('--changed'),
    },
    changed
  );

  if (projects.length === 0) {
    console.info('No projects matched filter.');
    return 0;
  }

  const start = Bun.nanoseconds();
  const [bunVersion, astGrepVersion] = await Promise.all([
    toolVersion(['bun', '--version']),
    toolVersion(['ast-grep', '--version'], 'not installed'),
  ]);

  console.info(`Running ${projects.length} project(s) from gate-map …`);
  const results = [];
  for (const project of projects) {
    process.stdout.write(`  [${project.zone}] ${project.id} … `);
    const result = await runProject(project);
    results.push(result);
    console.info(result.status === 'pass' ? 'PASS' : 'FAIL');
    if (result.status === 'fail' && failFast) {
      console.info('Stopping early (--fail-fast)');
      break;
    }
  }

  const report: MonorepoReport = {
    generatedAt: new Date().toISOString(),
    bunVersion,
    astGrepVersion,
    mode: 'live',
    overall: results.every(p => p.status === 'pass') ? 'pass' : 'fail',
    totalDurationMs: Math.round((Bun.nanoseconds() - start) / 1_000_000),
    projects: results,
    zones: summarizeZones(results),
  };

  await Bun.write(htmlPath, buildMonorepoHtml(report));
  await Bun.write(jsonPath, buildMonorepoJson(report));
  console.info(`\nHTML: ${htmlPath}`);
  console.info(`JSON: ${jsonPath}`);

  const summaryPath = Bun.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const existing = (await Bun.file(summaryPath).exists())
      ? await Bun.file(summaryPath).text()
      : '';
    await Bun.write(summaryPath, `${existing}\n${buildGithubSummary(report)}\n`);
  }

  if (openAfter) {
    const platform = process.platform;
    const openCmd =
      platform === 'darwin'
        ? ['open', htmlPath]
        : platform === 'win32'
          ? ['cmd', '/c', 'start', '', htmlPath]
          : ['xdg-open', htmlPath];
    await Bun.spawn({ cmd: openCmd }).exited;
  }

  return report.overall === 'pass' ? 0 : 1;
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
