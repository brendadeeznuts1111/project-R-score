#!/usr/bin/env bun
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

const force = Bun.argv.includes('--force');
const result = await seedTenantRegistries({ force });
console.log(JSON.stringify(result, null, 2));
process.exit(result.seeded || !force ? 0 : 1);
