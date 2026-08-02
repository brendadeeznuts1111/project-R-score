#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Bake an npm packument for the publishable workspace package
 * (`packages/registry-client` → `@factorywager/registry-client`) into the
 * static registry plane: `public/registry/npm/@factorywager/registry-client.json`.
 *
 * Served at the edge by `functions/@factorywager/[pkg].ts`, which turns the
 * pm publish-plane probes (`bun run verify:pm`) from fail-soft skips into
 * live checks. Tarball `dist.tarball` URLs point at the artifact registry;
 * publish the tarball to R2 under the same key when cutting a release.
 *
 * Re-run after every version bump / publish:
 *   bun run bake:npm-packument
 */
import { joinPath } from './lib/fs-bun';

const REPO_ROOT = `${import.meta.dir}/..`;
const PKG_DIR = joinPath(REPO_ROOT, 'packages/registry-client');
const OUT_PATH = joinPath(REPO_ROOT, 'public/registry/npm/@factorywager/registry-client.json');
const REGISTRY_BASE = 'https://registry.factory-wager.com';
const PKG_NAME = '@factorywager/registry-client';

interface Manifest {
  name: string;
  version: string;
  description?: string;
  [key: string]: unknown;
}

const manifest = (await Bun.file(joinPath(PKG_DIR, 'package.json')).json()) as Manifest;
if (manifest.name !== PKG_NAME) {
  console.error(`❌ manifest name drift: expected ${PKG_NAME}, got ${manifest.name}`);
  process.exit(1);
}

const readmePath = joinPath(PKG_DIR, 'README.md');
const readme = (await Bun.file(readmePath).exists()) ? await Bun.file(readmePath).text() : '';
const readmeFilename = readme.length > 0 ? 'README.md' : undefined;

const now = new Date().toISOString();
const version = manifest.version;
const tarball = `${REGISTRY_BASE}/api/registry/npm/@factorywager/registry-client/-/registry-client-${version}.tgz`;

/** Per-version entry: manifest + publish metadata Bun ≥1.3.14 would send. */
const versionEntry = {
  ...manifest,
  _id: `${PKG_NAME}@${version}`,
  dist: {
    tarball,
    integrity: '', // filled at real publish time by `bun publish`
  },
  ...(readmeFilename ? { readme, readmeFilename } : {}),
};

const packument = {
  _id: PKG_NAME,
  name: PKG_NAME,
  description: manifest.description ?? '',
  'dist-tags': { latest: version },
  versions: { [version]: versionEntry },
  time: { created: now, modified: now, [version]: now },
  ...(readmeFilename ? { readme, readmeFilename } : {}),
};

await Bun.write(OUT_PATH, `${JSON.stringify(packument, null, 2)}\n`);
console.info(
  `📦 npm packument baked → ${OUT_PATH.replace(`${REPO_ROOT}/`, '')} (${PKG_NAME}@${version}, readme=${readme.length} chars)`
);
