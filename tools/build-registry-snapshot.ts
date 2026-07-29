#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Production-grade registry snapshot CLI.
 *
 *   bun tools/build-registry-snapshot.ts
 *   bun tools/build-registry-snapshot.ts --no-routing --no-report
 *   bun tools/build-registry-snapshot.ts --force-routing --webview
 *
 * @see lib/registry-snapshot.ts
 */
import { logDepth } from '../lib/console-depth.ts';
import { buildRegistrySnapshot } from '../lib/registry-snapshot.ts';

const args = Bun.argv.slice(2);
const withRouting = !args.includes('--no-routing');
const withReport = !args.includes('--no-report');
const withWebView = args.includes('--webview') && !args.includes('--no-webview');
const withStaticRegistry = !args.includes('--no-static');
const forceRoutingRefresh = args.includes('--force-routing');
const phase = args.includes('--post') ? 'post' : args.includes('--pre') ? 'pre' : undefined;
const pinStable = args.includes('--stable');

const summary = await buildRegistrySnapshot({
  withRouting,
  withReport,
  withWebView,
  withStaticRegistry,
  forceRoutingRefresh,
  phase,
  pinStable,
});

logDepth(summary);
