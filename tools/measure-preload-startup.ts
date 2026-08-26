#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @updated Bun.revision · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.revision · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-revision
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// preload-startup-measurement-reviewed — exact loopback origin, guarded child, no ambient env
import { resolvePath } from '../lib/path-bun.ts';
import { startStartupFixtureServer } from '../lib/security/preload-startup-fixture-server.ts';
import {
  measureStartupChild,
  type StartupSample,
} from '../lib/security/preload-startup-measurement-child.ts';

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]!;
}

const summarize = (samples: readonly StartupSample[]) => ({
  count: samples.length,
  startupMedianMs: percentile(
    samples.map(item => item.startupMs),
    0.5
  ),
  startupP95Ms: percentile(
    samples.map(item => item.startupMs),
    0.95
  ),
  firstRequestMedianMs: percentile(
    samples.map(item => item.firstRequestMs),
    0.5
  ),
  firstRequestP95Ms: percentile(
    samples.map(item => item.firstRequestMs),
    0.95
  ),
});

const root = resolvePath(import.meta.dir, '..');
const server = startStartupFixtureServer();
try {
  const baseline: StartupSample[] = [];
  const preconnect: StartupSample[] = [];
  for (let index = 0; index < 7; index++) {
    baseline.push(await measureStartupChild(root, server.origin, false));
    preconnect.push(await measureStartupChild(root, server.origin, true));
  }
  console.log(
    JSON.stringify(
      {
        bun: Bun.version,
        revision: Bun.revision,
        fixture: 'ephemeral-loopback-http',
        requests: server.requests(),
        baseline: summarize(baseline),
        fetchPreconnect: summarize(preconnect),
        decision: 'measurement-only; no promotion threshold is defined',
      },
      null,
      2
    )
  );
} finally {
  await server.stop();
}
