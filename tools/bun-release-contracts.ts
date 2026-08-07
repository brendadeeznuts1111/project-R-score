#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/project/contributing#download-release-build-from-pull-requests — bunx bun-pr
/**
 * bun-release-contracts.ts — root entry for Bun release inventory generation.
 *
 * Delegates to `@factorywager/bun-release-contracts` CLI with harness
 * allowlist (`bun:release-contracts`) + `cliOut` dual-mode summary.
 *
 *   bun run bun:release-contracts -- [vX.Y.Z | latest] [--check] [--json]
 *   bun run bun:release-contracts -- --all --since v1.3.0 --limit 10
 *
 * Against an unreleased Bun PR build:
 *   bunx bun-pr <pr> && bun run bun:pr:verify -- <pr>
 *
 * Unknown long options: ALLOWED_LONG_REGISTRY['bun:release-contracts'].
 */
import {
  BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  runCli,
} from '../packages/bun-release-contracts/src/cli.ts';

export { BUN_RELEASE_CONTRACTS_ALLOWED_LONG, runCli };

if (import.meta.main) {
  try {
    await runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
