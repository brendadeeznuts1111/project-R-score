#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
/**
 * Thicken tenant registry.json slices from root public/registry/registry.json.
 *
 *   bun run ops:seed:tenants
 *   bun run ops:seed:tenants -- --force
 *
 * @see lib/operations/tenant-registry-seed.ts
 */
import { seedTenantRegistries } from '../lib/operations/tenant-registry-seed.ts';
import { jsonOut } from '../lib/console-depth.ts';

const force = Bun.argv.includes('--force');
const result = await seedTenantRegistries({ force });
jsonOut(result);
process.exit(result.seeded || !force ? 0 : 1);
