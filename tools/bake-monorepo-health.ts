#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Bake public/registry/monorepo-health.json for Pages / TOC / ops-summary.
 *
 *   bun run monorepo:health:bake
 */
import { bakeMonorepoHealthRegistry } from '../lib/monitoring/monorepo-health-slice.ts';

const bake = await bakeMonorepoHealthRegistry({ log: true });
process.exit(bake.grade === 'critical' ? 0 : 0); // always 0 — ci:core uses check:monorepo-health ratchet
