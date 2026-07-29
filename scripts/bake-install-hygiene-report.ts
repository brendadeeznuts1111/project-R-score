#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
/**
 * Bake install-hygiene audit report for portal/registry.
 *
 *   bun run bake:install-hygiene
 *
 * Collects:
 *   - install-cache slice (lib/monitoring/install-cache-slice.ts)
 *   - npm-install check result (scripts/check-npm-install.ts)
 *   - bun run install:verify --dry-run --json
 *
 * Writes:
 *   public/registry/install-hygiene-report.json
 *   offline embed into public/portal/install-hygiene/index.html
 */
export {};

import { joinPath } from '../lib/path-bun.ts';
import { collectInstallCacheMonitoringSlice } from '../lib/monitoring/install-cache-slice.ts';
import { runNpmInstallCheck } from './check-npm-install.ts';

const ROOT = `${import.meta.dir}/..`;
const OUT_PATH = joinPath(ROOT, 'public/registry/install-hygiene-report.json');
const BOARD_HTML = joinPath(ROOT, 'public/portal/install-hygiene/index.html');
const EMBED_ID = 'install-hygiene-embed';

export type InstallVerifyDryRun = {
  ok: boolean;
  failed: number;
  strict: boolean;
  dryRun: boolean;
  checks: Array<{ ok: boolean; label: string; detail?: string }>;
};

async function runInstallVerifyDryRun(): Promise<InstallVerifyDryRun> {
  const proc = Bun.spawnSync(['bun', 'run', 'install:verify', '--dry-run', '--json'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const text = proc.stdout ? new TextDecoder().decode(proc.stdout).trim() : '';
  try {
    const parsed = JSON.parse(text) as InstallVerifyDryRun;
    return parsed;
  } catch {
    return {
      ok: false,
      failed: 0,
      strict: false,
      dryRun: true,
      checks: [
        {
          ok: false,
          label: 'install:verify parse',
          detail: `non-JSON output (exit ${proc.exitCode}): ${text.slice(0, 200)}`,
        },
      ],
    };
  }
}

export type InstallHygieneBakeResult = {
  ok: boolean;
  path: string;
};

export async function bakeInstallHygieneReport(opts?: {
  outPath?: string;
  log?: boolean;
}): Promise<InstallHygieneBakeResult> {
  const outPath = opts?.outPath ?? OUT_PATH;
  const [installCache, npmInstall, installVerify] = await Promise.all([
    collectInstallCacheMonitoringSlice(),
    runNpmInstallCheck(),
    runInstallVerifyDryRun(),
  ]);

  const report = {
    schemaVersion: 1,
    kind: 'install-hygiene',
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    installCache,
    npmInstall: {
      ok: npmInstall.ok,
      violations: npmInstall.violations,
      violationCount: npmInstall.violations.length,
      allowedPaths: npmInstall.allowedPaths,
    },
    installVerify,
    ok: !installCache.wouldPrune && npmInstall.ok && installVerify.ok,
  };

  await Bun.write(outPath, `${JSON.stringify(report, null, 2)}\n`);
  await injectBoardEmbed(report as Record<string, unknown>);
  if (opts?.log !== false) {
    const cacheText = installCache.available
      ? `${installCache.sizeHuman ?? 'unknown'}`
      : 'unavailable';
    const npmText = npmInstall.ok ? 'clean' : `${npmInstall.violations.length} violations`;
    const verifyText = installVerify.ok ? 'pass' : `${installVerify.failed} failed`;
    console.log(
      `[install-hygiene] bake → ${outPath.replace(ROOT + '/', '')} · board embed · ok=${report.ok} · cache=${cacheText} · npm=${npmText} · verify=${verifyText}`
    );
  }
  return { ok: report.ok, path: outPath };
}

/** Offline SSOT: inject compact JSON into the static board HTML (vault/failures pattern). */
async function injectBoardEmbed(report: Record<string, unknown>): Promise<void> {
  const htmlFile = Bun.file(BOARD_HTML);
  if (!(await htmlFile.exists())) return;
  let html = await htmlFile.text();
  const compact = JSON.stringify(report);
  const embed = `<script type="application/json" id="${EMBED_ID}">${compact}</script>`;
  const re = new RegExp(`<script type="application/json" id="${EMBED_ID}">[\\s\\S]*?</script>`);
  if (re.test(html)) {
    html = html.replace(re, embed);
  } else {
    html = html.replace(
      '<link rel="stylesheet" href="/portal/style.css" />',
      `<link rel="stylesheet" href="/portal/style.css" />\n  ${embed}`
    );
  }
  await Bun.write(BOARD_HTML, html);
}

if (import.meta.main) {
  await bakeInstallHygieneReport();
}
