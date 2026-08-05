#!/usr/bin/env bun
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
/**
 * bake:all — offline registry bake orchestrator.
 *
 * Runs every bake that is safe without a live vault / proton session, in
 * dependency order, with per-step timing and a pass/fail summary.
 * Vault-dependent bakes (vault:health:bake, compliance:bake:vault) are
 * intentionally excluded — run them separately with an agent session.
 *
 * Nested bun argv0 uses resolveBunExecutable (never bare `"bun"`).
 *
 *   bun run bake:all                 # run all offline bakes
 *   bun run bake:all -- --list       # list steps without running
 *   bun run bake:all -- --dry-run    # print commands without running
 *   bun run bake:all -- --only=capabilities,packages
 */
import { isModuleEntrypoint, resolveBunExecutable } from '../lib/bun-executable.ts';
import { resolvePath } from '../scripts/lib/fs-bun';
import { logTable } from '../lib/console-depth';

const ROOT = resolvePath(import.meta.dir, '..');

interface BakeStep {
  id: string; // brand-ok — bake step key, not domain *Id
  /** Args after bun (e.g. `run bake:capabilities`). argv0 resolved at spawn. */
  bunArgs: string[];
  note: string;
}

/** Offline-safe bakes in dependency order (boards read these after). */
const STEPS: BakeStep[] = [
  {
    id: 'capabilities',
    bunArgs: ['run', 'bake:capabilities'],
    note: 'capability-map-subset.json + capability-map-full.json',
  },
  { id: 'bunfig', bunArgs: ['run', 'bunfig:bake'], note: 'bunfig-state.json' },
  {
    id: 'npm-packument',
    bunArgs: ['run', 'bake:npm-packument'],
    note: 'registry/npm/@factorywager/registry-client.json',
  },
  {
    id: 'console-format',
    bunArgs: ['run', 'console-format:bake'],
    note: 'console-format-state.json',
  },
  { id: 'chrome', bunArgs: ['run', 'portal:chrome:bake'], note: 'portal-chrome.json' },
  {
    id: 'brands',
    bunArgs: ['tools/brand-keymap.ts'],
    note: 'brand-keymap.json',
  },
  {
    id: 'bun-brand-map',
    bunArgs: ['run', 'bun:brand-map'],
    note: 'bun-brand-map.json (Bun API × brand cross-map)',
  },
  {
    id: 'glossary',
    bunArgs: ['run', 'glossary:portal'],
    note: 'domain-glossary.json',
  },
  {
    id: 'scrape-wire',
    bunArgs: ['run', 'bake:scrape-wire-taxonomy'],
    note: 'scrape-wire-taxonomy.json',
  },
  {
    id: 'schema-audit',
    bunArgs: ['run', 'schema:audit'],
    note: 'scrape-wire-schema-audit.json',
  },
  {
    id: 'tennis-agent-auth',
    bunArgs: ['run', 'tennis:agent-auth:bake'],
    note: 'tennis/agent-auth.json',
  },
  {
    id: 'packages',
    bunArgs: ['run', 'audit:packages', '--', '--bake'],
    note: 'packages-graph-map.json',
  },
  { id: 'failures', bunArgs: ['run', 'failures:bake'], note: 'failures.json' },
  { id: 'health', bunArgs: ['run', 'monorepo:health:bake'], note: 'monorepo-health.json' },
  { id: 'env', bunArgs: ['run', 'env:inventory:bake'], note: 'env inventory' },
  { id: 'compliance', bunArgs: ['run', 'compliance:bake'], note: 'compliance board' },
  { id: 'ops', bunArgs: ['run', 'ops:snapshot'], note: 'ops-summary + limit-raises' },
  {
    id: 'tennis-partner-contracts',
    // Live when PARTNER_API_TOKEN set; else offline join. Atomic write + keep-last-good.
    bunArgs: ['tools/bake-tennis-partner-contracts.ts'],
    note: 'tennis/partner-contracts.json',
  },
  { id: 'doctor', bunArgs: ['run', 'bake:doctor'], note: 'doctor-state.json' },
  {
    id: 'bake-manifest',
    // Last step: inventory timestamps after other bakes.
    bunArgs: ['tools/bake-registry-manifest.ts'],
    note: 'bake-manifest.json',
  },
];

function bakeSpawnArgv(step: BakeStep): string[] {
  return [resolveBunExecutable(), ...step.bunArgs];
}

const SKIPPED = [
  'vault:health:bake     (needs proton agent session)',
  'compliance:bake:vault (needs proton agent session)',
];

async function main(): Promise<void> {
  const flags = Bun.argv.slice(2);
  const onlyFlag = flags.find(f => f.startsWith('--only='));
  const only = onlyFlag
    ? new Set(
        onlyFlag
          .slice('--only='.length)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
    : undefined;

  if (only) {
    const bad = [...only].filter(id => !STEPS.some(s => s.id === id));
    if (bad.length) {
      console.error(
        `❌ Unknown bake step(s): ${bad.join(', ')}\nKnown: ${STEPS.map(s => s.id).join(', ')}`
      );
      process.exit(1);
    }
  }
  const steps = only ? STEPS.filter(s => only.has(s.id)) : STEPS;

  if (flags.includes('--list') || flags.includes('--dry-run')) {
    const dry = flags.includes('--dry-run');
    for (const s of steps) {
      const argv = bakeSpawnArgv(s);
      console.log(`${dry ? '$ ' : ''}${s.id.padEnd(14)} ${argv.join(' ')}   # ${s.note}`);
    }
    console.log('\nskipped (need vault session): ' + SKIPPED.join(' · '));
    return;
  }

  console.log(`bake:all — ${steps.length} offline bake step(s)`);
  type BakeResult = {
    id: string; // brand-ok — bake step key, not domain *Id
    code: number;
    ms: number;
  };
  const results: BakeResult[] = [];
  for (const s of steps) {
    const t0 = Bun.nanoseconds();
    console.log(`\n── ${s.id} → ${s.note}`);
    const proc = Bun.spawn(bakeSpawnArgv(s), {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      env: { ...Bun.env },
    });
    const code = (await proc.exited) ?? 1;
    const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
    results.push({ id: s.id, code, ms });
    if (code !== 0) {
      console.error(`❌ bake step "${s.id}" failed (exit ${code}) — stopping`);
      break;
    }
  }

  console.log('\n── bake:all summary ──');
  // logTable wrapper (lib/console-depth) — same surface as capabilities doctor.
  logTable(
    results.map(r => ({
      step: r.id,
      status: r.code === 0 ? 'ok' : `fail(${r.code})`,
      ms: r.ms,
    })),
    ['step', 'status', 'ms'],
    { colors: true }
  );
  const failed = results.find(r => r.code !== 0);
  if (failed) {
    console.error(`\n❌ bake:all failed at "${failed.id}"`);
    process.exit(1);
  }
  const totalMs = results.reduce((a, r) => a + r.ms, 0);
  console.log(`\n✓ ${results.length} bake(s) ok in ${(totalMs / 1000).toFixed(1)}s`);
  console.log('skipped (need vault session): ' + SKIPPED.join(' · '));
}

if (isModuleEntrypoint(import.meta)) await main();
