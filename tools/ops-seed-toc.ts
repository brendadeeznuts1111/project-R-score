#!/usr/bin/env bun
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

const force = Bun.argv.includes('--force');
const result = await seedTocOpsDemo({ force, ifEmpty: !force });
console.log(JSON.stringify(result, null, 2));

if (result.seeded) {
  console.log('\nNext: bun run ops:snapshot --no-routing  →  /portal/toc/ + ops-summary.toc');
}

process.exit(result.seeded || !force ? 0 : 1);
