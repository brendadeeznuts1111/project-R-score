#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/fetch — fetch
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bun tools/harvest-ai-universal.ts --ai https://example.com/blog ./report 0
 * bun tools/harvest-ai-universal.ts https://example.com/blog ./report 0
 *
 * Edit include* flags in tools/harvest.ts (CONFIG).
 */
import { CONFIG } from './harvest.ts';
import { runHarvestUniversal } from '../lib/docs/harvest-universal.ts';

const code = await runHarvestUniversal(Bun.argv.slice(2), CONFIG);
process.exitCode = code;
