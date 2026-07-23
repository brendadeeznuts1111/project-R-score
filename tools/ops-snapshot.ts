#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Ops portal snapshot for Cloudflare Pages — delegates to production orchestrator.
 *
 *   bun run ops:snapshot
 *   bun run ops:snapshot --no-routing --no-report
 *   bun run ops:snapshot --webview
 *
 * @see lib/registry-snapshot.ts
 * @see tools/build-registry-snapshot.ts
 */
import { buildRegistrySnapshot } from '../lib/registry-snapshot.ts';

const args = Bun.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;

const summary = await buildRegistrySnapshot({
  withRouting: !args.includes('--no-routing'),
  withReport: !args.includes('--no-report'),
  withWebView: args.includes('--webview'),
  withStaticRegistry: !args.includes('--no-static'),
  forceRoutingRefresh: args.includes('--force-routing'),
  phase: args.includes('--post') ? 'post' : args.includes('--pre') ? 'pre' : undefined,
  pinStable: args.includes('--stable'),
  outPath,
});

console.log(JSON.stringify(summary, null, 2));
