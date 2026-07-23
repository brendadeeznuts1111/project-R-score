#!/usr/bin/env bun
// @see https://bun.com/docs/guides/runtime/build-time-constants
// @see https://bun.com/docs/guides/runtime/define-constant
// @see https://bun.com/docs/runtime — feature() from bun:bundle (compile-time DCE)
/**
 * Thin CLI that reads AST-injected build constants.
 *
 * Prefer the compiled artifact from `bun run build:defines`.
 * Under `bun run` without `--define`, falls back to dev placeholders.
 */
import { feature } from 'bun:bundle';

function readString(name: 'BUILD_VERSION' | 'BUILD_TIME' | 'GIT_COMMIT', fallback: string): string {
  // typeof works for undeclared bindings (no ReferenceError)
  switch (name) {
    case 'BUILD_VERSION':
      return typeof BUILD_VERSION !== 'undefined' ? BUILD_VERSION : fallback;
    case 'BUILD_TIME':
      return typeof BUILD_TIME !== 'undefined' ? BUILD_TIME : fallback;
    case 'GIT_COMMIT':
      return typeof GIT_COMMIT !== 'undefined' ? GIT_COMMIT : fallback;
  }
}

/** Prefer --define DEBUG; fall back to bun:bundle feature flag. */
function readDebug(): boolean {
  if (typeof DEBUG !== 'undefined') return DEBUG;
  // feature() must appear directly in if / ternary (bundler constraint)
  if (feature('DEBUG')) return true;
  return false;
}

const meta = {
  version: readString('BUILD_VERSION', '0.0.0-dev'),
  buildTime: readString('BUILD_TIME', 'unknown'),
  commit: readString('GIT_COMMIT', 'unknown'),
  debug: readDebug(),
  standalone: Bun.isStandaloneExecutable === true,
};

if (feature('DEBUG')) {
  console.info('[fw-build-info] debug gate open');
}

const arg = Bun.argv[2];
if (arg === '--json') {
  process.stdout.write(`${JSON.stringify(meta, null, 2)}\n`);
} else {
  console.info(`FactoryWager ${meta.version} (${meta.commit.slice(0, 12)})`);
  console.info(`built ${meta.buildTime}${meta.standalone ? ' · standalone' : ''}`);
  if (typeof DEBUG !== 'undefined' && DEBUG) console.info('DEBUG=on');
}
