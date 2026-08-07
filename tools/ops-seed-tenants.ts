#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:seed:tenants', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const force = argv.includes('--force');
const result = await seedTenantRegistries({ force });
jsonOut(result);
process.exit(result.seeded || !force ? 0 : 1);
