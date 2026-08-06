// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// tools/bake-stale-anchors.ts — scan the live limit-tracker history for
// stale anchors and bake the result to public/registry/stale-anchors.json.
//
//   bun run ops:anchor:bake            # scan + write registry artifact
//   bun run ops:anchor:bake --json     # also print the scan as JSON
//   bun run ops:anchor:bake --check    # exit 1 when any stale anchor found
//
// Runs as the OS-cron worker (ops:anchor:scan:cron:register) and standalone.
// Analytics signal only — never places bets.
//
// @see docs/harness/tenants/ops-snapshot.md — registry bake conventions
import { ensureParentDirSync } from '../lib/bun-fs-utils.ts';
import { joinPath } from '../lib/path-bun.ts';
import { scanStaleAnchorsFromDb } from '../lib/operations/anchor-stability.ts';
import { jsonOut } from '../lib/console-depth.ts';

export const STALE_ANCHORS_ARTIFACT = 'public/registry/stale-anchors.json';
export const STALE_ANCHORS_SCHEMA = 'stale-anchors.v1';

export function buildStaleAnchorsBake(
  opts: { minDriftUsd?: number; maxVarianceUsd?: number; path?: string } = {}
) {
  const scan = scanStaleAnchorsFromDb(opts);
  return {
    schema: STALE_ANCHORS_SCHEMA,
    ok: true,
    scanned: scan.scanned,
    signalCount: scan.signals.length,
    signals: scan.signals,
    generatedAt: scan.generatedAt,
    opts: scan.opts,
  };
}

export async function bakeStaleAnchors(
  opts: { minDriftUsd?: number; maxVarianceUsd?: number; path?: string } = {}
): Promise<ReturnType<typeof buildStaleAnchorsBake>> {
  const payload = buildStaleAnchorsBake(opts);
  const abs = joinPath(process.cwd(), STALE_ANCHORS_ARTIFACT);
  ensureParentDirSync(abs);
  await Bun.write(abs, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

if (import.meta.main) {
  const json = Bun.argv.includes('--json');
  const check = Bun.argv.includes('--check');
  const payload = await bakeStaleAnchors({
    ...(Bun.argv.includes('--min-drift')
      ? { minDriftUsd: Number(Bun.argv[Bun.argv.indexOf('--min-drift') + 1]) }
      : {}),
    ...(Bun.argv.includes('--max-variance')
      ? { maxVarianceUsd: Number(Bun.argv[Bun.argv.indexOf('--max-variance') + 1]) }
      : {}),
  });

  if (json) jsonOut(payload);
  console.log(
    `stale-anchors bake: partners=${payload.scanned} signals=${payload.signalCount} → ${STALE_ANCHORS_ARTIFACT}`
  );
  for (const s of payload.signals) {
    console.log(`  [${s.kind}] ${s.detail}`);
  }

  if (check && payload.signalCount > 0) process.exit(1);
}
