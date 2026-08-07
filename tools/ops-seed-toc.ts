#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
/**
 * Bake TOC Ops demo fixture for portal / Pages.
 *
 *   bun run ops:seed:toc
 *   bun run ops:seed:toc -- --force
 *
 * @see lib/operations/toc-ops-seed.ts
 */
import { seedTocOpsDemo } from '../lib/operations/toc-ops-seed.ts';
import { cliOut } from '../lib/console/index.ts';

const force = Bun.argv.includes('--force');
const result = await seedTocOpsDemo({ force, ifEmpty: !force });
cliOut(result, { mode: 'depth' });

if (result.seeded) {
  console.log('\nNext: bun run ops:snapshot --no-routing  →  /portal/toc/ + ops-summary.toc');
}

process.exit(result.seeded || !force ? 0 : 1);
