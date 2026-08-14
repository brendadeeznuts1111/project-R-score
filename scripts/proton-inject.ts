#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @updated Bun.spawn · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.spawn · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawn · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.spawn · fixed v0.6.6 · 2023-05-31 · https://bun.com/blog/bun-v0.6.6
// @updated Bun.spawn · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.spawn · fixed v1.0.8 · 2023-11-02 · https://bun.com/blog/bun-v1.0.8
// @updated Bun.spawn · fixed v1.0.9 · 2023-11-05 · https://bun.com/blog/bun-v1.0.9
// @updated Bun.spawn · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.spawn · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.spawn · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.spawn · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.spawn · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.spawn · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawn · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.spawn · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.spawn · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · fixed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.spawn · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.spawn · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · changed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.spawn · fixed v1.2.16 · 2025-06-11 · https://bun.com/blog/bun-v1.2.16
// @updated Bun.spawn · fixed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated Bun.spawn · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated Bun.spawn · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · changed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.spawn · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawn · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.spawn · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.spawn · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/child-process
/**
 * Bun-native monorepo inject — project map SSOT + @factorywager/proton-pass.
 *
 * Usage:
 *   bun scripts/proton-inject.ts factorywager
 *   bun scripts/proton-inject.ts factorywager --reasonix
 *   bun scripts/proton-inject.ts --list
 *
 * @see lib/security/proton-projects.ts
 * @see docs/harness/tenants/proton-integration.md
 */
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  injectProtonProject,
  listProtonProjects,
  PROTON_INJECT_PROJECTS,
  resolveProtonProject,
} from '../lib/security/proton-projects.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');

const REASONIX_KEYS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_DNS_API_TOKEN',
  'CLOUDFLARE_ACCESS_API_TOKEN',
  'TELEGRAM_BOT_FACTORY',
  'TELEGRAM_WEBHOOK_SECRET',
] as const;

/** Pull CF/Telegram keys from injected .env into ~/.reasonix/.env (derived cache). */
async function syncReasonix(injectedEnvPath: string): Promise<void> {
  const home = Bun.env.HOME;
  if (!home) {
    console.warn('⚠️  --reasonix skipped (HOME unset)');
    return;
  }
  const reasonixEnv = Bun.env.REASONIX_ENV ?? joinPath(home, '.reasonix', '.env');

  const srcText = await Bun.file(injectedEnvPath).text();
  const got = new Map<string, string>();
  for (const line of srcText.split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const k = line.slice(0, eq);
    if ((REASONIX_KEYS as readonly string[]).includes(k)) got.set(k, line.slice(eq + 1));
  }

  if (got.size === 0) {
    console.warn('⚠️  No reasonix keys found in injected .env');
    return;
  }

  const dir = joinPath(home, '.reasonix');
  try {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(dir, { recursive: true });
  } catch {
    /* best effort */
  }

  let text = '';
  try {
    if (await Bun.file(reasonixEnv).exists()) text = await Bun.file(reasonixEnv).text();
  } catch {
    text = '';
  }

  const kept: string[] = [];
  for (const line of text.split('\n')) {
    if (!line || line.trimStart().startsWith('#') || !line.includes('=')) {
      kept.push(line);
      continue;
    }
    const k = line.slice(0, line.indexOf('='));
    if ((REASONIX_KEYS as readonly string[]).includes(k)) continue;
    kept.push(line);
  }
  while (kept.length && kept[kept.length - 1] === '') kept.pop();

  kept.push('', '# --- proton-inject (derived from vault; re-run to refresh) ---');
  for (const k of REASONIX_KEYS) {
    const v = got.get(k);
    if (v !== undefined) kept.push(`${k}=${v}`);
  }
  kept.push('');
  await Bun.write(reasonixEnv, kept.join('\n'));
  try {
    await Bun.spawn(['chmod', '600', reasonixEnv]).exited;
  } catch {
    /* ignore */
  }
  console.log(`✅ reasonix derived cache → ${reasonixEnv} (keys only, no values logged)`);
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('proton-inject', Bun.argv.slice(2));
  if (args.includes('--list') || args[0] === 'list') {
    for (const p of listProtonProjects()) {
      const spec = PROTON_INJECT_PROJECTS[p]!;
      console.log(`${p.padEnd(16)} agent=${spec.agent}  ${spec.templateRel} → ${spec.outRel}`);
    }
    process.exit(0);
  }

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log(`Usage: bun scripts/proton-inject.ts <project> [--reasonix]
Projects: ${listProtonProjects().join(', ')}
  --list     Print project → template map
  --reasonix After factorywager/cloudflare inject, refresh ~/.reasonix/.env keys`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const project = args[0]!;
  const reasonix = args.includes('--reasonix');

  let resolved;
  try {
    resolved = resolveProtonProject(project, REPO_ROOT);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }

  if (reasonix && !resolved.reasonix) {
    console.warn('⚠️  --reasonix only applies to factorywager/cloudflare inject');
  }

  console.log(`🔐 Injecting ${resolved.template} → ${resolved.out}`);
  const result = await injectProtonProject(project, REPO_ROOT, {
    reason: `Inject env secrets for ${project}`,
  });

  if (!result.ok) {
    console.error(`❌ inject failed: ${result.detail}`);
    process.exit(result.code ?? 1);
  }

  console.log(`✅ Wrote ${result.outFile} (${result.agent.mode})`);

  if (reasonix && resolved.reasonix) {
    await syncReasonix(result.outFile);
  }
}

if (import.meta.main) {
  await main();
}
