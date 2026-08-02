#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * partner-profile:bake — bake unified Partner Profiles into the portal read plane.
 *
 * Reads every `config/partner-profiles/<CODE>.toml` (skip `.example.toml`),
 * validates against the v0 schema, and writes:
 *   public/registry/partner-profiles.json
 *     { schemaVersion, generatedAt, profiles: Record<CODE, PartnerProfile>,
 *       summary: { count, byLifecycle, byPhase } }
 *
 *   bun run partner-profile:bake          # write the bake
 *   bun run partner-profile:bake --check  # fail when stale (generatedAt ignored)
 *   bun run partner-profile:bake --json   # machine summary
 *
 * @see docs/design/unified-partner-profile.md
 */

import { dirname, join } from 'node:path';
import { parsePartnerProfileToml } from './parse';

export const PROFILES_DIR = 'config/partner-profiles';
export const PARTNER_PROFILES_REGISTRY_PATH = 'public/registry/partner-profiles.json';
export const PROFILES_GLOB = '*.toml';

export interface PartnerProfilesBakeResult {
  schemaVersion: 1;
  generatedAt: string;
  profiles: Record<string, unknown>;
  summary: { count: number; byLifecycle: Record<string, number>; byPhase: Record<string, number> };
}

/** Load + validate all profiles from the profiles dir (pure over the fs). */
export async function loadAllProfiles(
  dir = PROFILES_DIR,
  fetcher: (path: string) => Promise<string> = p => Bun.file(p).text()
): Promise<{ profiles: Record<string, unknown>; issues: string[] }> {
  const profiles: Record<string, unknown> = {};
  const issues: string[] = [];
  const glob = new Bun.Glob(PROFILES_GLOB);
  for await (const file of glob.scan({ cwd: dir, onlyFiles: true })) {
    if (file.startsWith('.example')) continue;
    const code = file.replace(/\.toml$/, '');
    try {
      const text = await fetcher(join(dir, file));
      const profile = parsePartnerProfileToml(text, code);
      profiles[code] = profile;
    } catch (err) {
      issues.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { profiles, issues };
}

export function buildPartnerProfilesBake(
  profiles: Record<string, unknown>,
  generatedAt = new Date().toISOString()
): PartnerProfilesBakeResult {
  const byLifecycle: Record<string, number> = {};
  const byPhase: Record<string, number> = {};
  for (const profile of Object.values(profiles)) {
    const lifecycle = (profile as { lifecycle?: { status?: string; phase?: string } }).lifecycle;
    if (lifecycle?.status) byLifecycle[lifecycle.status] = (byLifecycle[lifecycle.status] ?? 0) + 1;
    if (lifecycle?.phase) byPhase[lifecycle.phase] = (byPhase[lifecycle.phase] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    generatedAt,
    profiles,
    summary: { count: Object.keys(profiles).length, byLifecycle, byPhase },
  };
}

async function main(): Promise<void> {
  const check = Bun.argv.includes('--check');
  const asJson = Bun.argv.includes('--json');

  const { profiles, issues } = await loadAllProfiles();
  if (issues.length > 0) {
    console.error(`partner-profile:bake: ${issues.length} profile issue(s):`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  const payload = buildPartnerProfilesBake(profiles);
  const body = `${JSON.stringify(payload, null, 2)}\n`;

  if (check) {
    let current: Record<string, unknown> | null = null;
    try {
      current = JSON.parse(await Bun.file(PARTNER_PROFILES_REGISTRY_PATH).text()) as Record<
        string,
        unknown
      >;
    } catch {
      // missing/unparseable → stale
    }
    const fresh = JSON.parse(body) as Record<string, unknown>;
    const { generatedAt: _f, ...freshRest } = fresh;
    const { generatedAt: _c, ...currentRest } = current ?? {};
    if (JSON.stringify(freshRest) === JSON.stringify(currentRest)) {
      console.log(`partner-profile:bake --check: up to date (${payload.summary.count} profiles)`);
      return;
    }
    console.error(
      `partner-profile:bake --check: STALE — run \`bun run partner-profile:bake\` ` +
        `(now ${payload.summary.count} profiles)`
    );
    process.exit(1);
  }

  await Bun.write(PARTNER_PROFILES_REGISTRY_PATH, body);
  console.log(`✓ Baked ${PARTNER_PROFILES_REGISTRY_PATH} (${payload.summary.count} profiles)`);
  if (asJson) console.log(JSON.stringify(payload.summary));
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
