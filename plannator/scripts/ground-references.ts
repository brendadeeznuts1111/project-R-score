#!/usr/bin/env bun
/**
 * Grounding script for Bun API docs and Effect references.
 *
 * Verifies that the local reference cards exist and are parseable.
 * With --online, it also HEAD-checks the canonical ecosystem URLs.
 */

import { join } from "node:path";

const REPO_ROOT = import.meta.dir.replace(/\/scripts$/, "");
const MANIFEST_PATH = join(REPO_ROOT, "docs", "references", "canonical-references.json");

type ReferenceManifest = {
  schemaVersion: number;
  generatedAt: string;
  ecosystem: Array<{
    id: string;
    name: string;
    kind: string;
    homepage: string;
    docs: string;
    apiReference?: string;
    rss?: string;
    minVersion?: string;
    usage: string;
  }>;
  localDocs: Array<{
    id: string;
    repoPath: string;
    purpose: string;
  }>;
};

async function readManifest(): Promise<ReferenceManifest> {
  const file = Bun.file(MANIFEST_PATH);
  if (!(await file.exists())) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
  }
  return file.json() as Promise<ReferenceManifest>;
}

async function checkLocalDocs(manifest: ReferenceManifest): Promise<string[]> {
  const errors: string[] = [];
  for (const doc of manifest.localDocs) {
    const path = join(REPO_ROOT, doc.repoPath);
    const file = Bun.file(path);
    if (!(await file.exists())) {
      errors.push(`MISSING: ${doc.repoPath} (${doc.purpose})`);
      continue;
    }
    const text = await file.text();
    if (text.trim().length === 0) {
      errors.push(`EMPTY: ${doc.repoPath}`);
    }
  }
  return errors;
}

async function checkOnlineUrl(url: string, id: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.ok) return null;
    return `${id}: ${url} returned ${res.status}`;
  } catch (err) {
    return `${id}: ${url} unreachable (${err instanceof Error ? err.message : String(err)})`;
  }
}

async function checkOnline(manifest: ReferenceManifest): Promise<string[]> {
  const errors: string[] = [];
  const urls: { url: string; id: string }[] = [];
  for (const eco of manifest.ecosystem) {
    urls.push({ url: eco.homepage, id: `${eco.id}-homepage` });
    urls.push({ url: eco.docs, id: `${eco.id}-docs` });
    if (eco.apiReference) urls.push({ url: eco.apiReference, id: `${eco.id}-api` });
    if (eco.rss) urls.push({ url: eco.rss, id: `${eco.id}-rss` });
  }

  const results = await Promise.all(urls.map((u) => checkOnlineUrl(u.url, u.id)));
  for (const error of results) {
    if (error) errors.push(error);
  }
  return errors;
}

function printUsage(): void {
  console.log("Usage: bun run scripts/ground-references.ts [--online]");
  console.log("  --online   HEAD-check canonical ecosystem URLs (requires network)");
}

async function main(): Promise<number> {
  const args = Bun.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return 0;
  }
  const online = args.includes("--online");

  const manifest = await readManifest();
  console.log(`Grounding references (manifest v${manifest.schemaVersion})`);
  console.log(`  generatedAt: ${manifest.generatedAt}`);

  const localErrors = await checkLocalDocs(manifest);
  if (localErrors.length === 0) {
    console.log(`  local docs: OK (${manifest.localDocs.length} files)`);
  } else {
    console.error("  local docs: FAIL");
    for (const err of localErrors) console.error(`    - ${err}`);
  }

  if (online) {
    console.log("  online checks: running …");
    const onlineErrors = await checkOnline(manifest);
    if (onlineErrors.length === 0) {
      console.log("  online checks: OK");
    } else {
      console.error("  online checks: FAIL");
      for (const err of onlineErrors) console.error(`    - ${err}`);
    }
    return localErrors.length + onlineErrors.length === 0 ? 0 : 1;
  }

  console.log("  online checks: skipped (pass --online to check canonical URLs)");
  return localErrors.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
