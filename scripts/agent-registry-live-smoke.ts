#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Optional operator smoke: prove live packument against serve-public (:3000).
 *
 *   bun run serve:public   # other terminal
 *   bun scripts/agent-registry-live-smoke.ts
 *
 * Exit 0 when source is live|live+snapshot, or when live fails but liveError is set
 * (path exercised). Exit 1 when :3000 is unreachable.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout
 */
import {
  REGISTRY_PRESETS,
  resolveRegistryPackage,
} from '../lib/operator-research/registry-desk.ts';

const pkg = Bun.argv[2] || 'event-store';
const base = REGISTRY_PRESETS.local.url;

try {
  const ping = await fetch(new URL('/-/ping', base), { signal: AbortSignal.timeout(1500) });
  if (!ping.ok) {
    console.error(`live-smoke: ${base}-/ping → HTTP ${ping.status}`);
    process.exit(1);
  }
} catch (err) {
  console.error(
    `live-smoke: ${base} unreachable — start with: bun run serve:public\n`,
    err instanceof Error ? err.message : err
  );
  process.exit(1);
}

const detail = await resolveRegistryPackage(pkg, {
  live: true,
  preset: 'local',
  timeoutMs: 4000,
});

if (!detail) {
  console.error(`live-smoke: no detail for ${pkg}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      name: detail.name,
      source: detail.source,
      selectedVersion: detail.selectedVersion,
      latest: detail.latest,
      liveError: detail.liveError ?? null,
      hasReadme: !!detail.readme,
      preset: detail.preset,
    },
    null,
    2
  )
);

if (detail.liveError) {
  console.error('live-smoke: live path failed (snapshot returned); see liveError above');
  process.exit(2);
}

if (detail.source !== 'live' && detail.source !== 'live+snapshot') {
  console.error(`live-smoke: unexpected source=${detail.source}`);
  process.exit(1);
}

console.error('live-smoke: OK');
