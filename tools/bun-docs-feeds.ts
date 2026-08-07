#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/bundler/executables — --force
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bun-docs-feeds.ts — merged RSS + API reference feed indexes.
 *
 * Writes tools/bun-docs-feeds.json ({ rss, reference }) with conditional GET caches
 * in tools/.cache/ (per-source HTML/XML). Legacy release-index.json and
 * reference-index.json are read as fallback until migration rebake.
 *
 * Run:
 *   bun tools/bun-docs-feeds.ts refresh [--force]
 *   bun tools/bun-docs-feeds.ts refresh --rss-only [--force]
 *   bun tools/bun-docs-feeds.ts refresh --reference-only [--force]
 *   bun tools/bun-docs-feeds.ts --migrate-legacy
 */
import {
  DOCS_FEEDS_ABS,
  LEGACY_REFERENCE_INDEX_ABS,
  LEGACY_RELEASE_INDEX_ABS,
} from '../lib/docs/docs-artifact-paths.ts';
import { resolvePath } from '../lib/path-bun';
import { refreshReleaseIndex, type ReleaseIndexFile } from './bun-docs-releases.ts';
import { refreshReferenceIndex, type ReferenceIndexFile } from './bun-docs-reference-index.ts';

export type DocsFeedsFile = {
  generated: string;
  rss: ReleaseIndexFile;
  reference: ReferenceIndexFile;
};

let legacyFeedsWarned = false;

function warnLegacyOnce(message: string): void {
  if (legacyFeedsWarned) return;
  legacyFeedsWarned = true;
  console.warn(`warn: ${message}`);
}

export async function readLegacyReleaseIndex(): Promise<ReleaseIndexFile | null> {
  const file = Bun.file(LEGACY_RELEASE_INDEX_ABS);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as ReleaseIndexFile;
  } catch {
    return null;
  }
}

export async function readLegacyReferenceIndex(): Promise<ReferenceIndexFile | null> {
  const file = Bun.file(LEGACY_REFERENCE_INDEX_ABS);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as ReferenceIndexFile;
  } catch {
    return null;
  }
}

const EMPTY_RSS: ReleaseIndexFile = {
  generated: new Date(0).toISOString(),
  source: 'https://bun.com/rss.xml',
  count: 0,
  entries: [],
};

const EMPTY_REFERENCE: ReferenceIndexFile = {
  generated: new Date(0).toISOString(),
  source: 'https://bun.com/reference',
  count: 0,
  moduleCount: 0,
  modules: [],
  pages: [],
};

/** Load merged feeds file, falling back to legacy split indexes. */
export async function loadFeeds(): Promise<DocsFeedsFile> {
  const merged = Bun.file(DOCS_FEEDS_ABS);
  if (await merged.exists()) {
    try {
      const file = (await merged.json()) as DocsFeedsFile;
      if (file.rss && file.reference) return file;
    } catch {
      /* fall through */
    }
  }

  const rss = (await readLegacyReleaseIndex()) ?? EMPTY_RSS;
  const reference = (await readLegacyReferenceIndex()) ?? EMPTY_REFERENCE;
  if (rss !== EMPTY_RSS || reference !== EMPTY_REFERENCE) {
    warnLegacyOnce(
      'using legacy release-index.json / reference-index.json — run bun tools/bun-docs-feeds.ts --migrate-legacy'
    );
  }
  return {
    generated: new Date().toISOString(),
    rss,
    reference,
  };
}

export async function writeFeeds(file: DocsFeedsFile): Promise<void> {
  await Bun.write(
    DOCS_FEEDS_ABS,
    `${JSON.stringify({ ...file, generated: new Date().toISOString() }, null, 2)}\n`
  );
}

export async function writeFeedsPartial(
  patch: Partial<Pick<DocsFeedsFile, 'rss' | 'reference'>>
): Promise<DocsFeedsFile> {
  const existing = await loadFeeds();
  const next: DocsFeedsFile = {
    generated: new Date().toISOString(),
    rss: patch.rss ?? existing.rss,
    reference: patch.reference ?? existing.reference,
  };
  await writeFeeds(next);
  return next;
}

export async function refreshFeeds(opts?: {
  rss?: boolean;
  reference?: boolean;
  force?: boolean;
}): Promise<DocsFeedsFile> {
  const doRss = opts?.rss ?? true;
  const doReference = opts?.reference ?? true;
  const force = opts?.force ?? false;
  const existing = await loadFeeds();
  let rss = existing.rss;
  let reference = existing.reference;

  if (doRss) {
    const r = await refreshReleaseIndex({ force });
    rss = r.file;
  }
  if (doReference) {
    const r = await refreshReferenceIndex({ force });
    reference = r.file;
  }

  return writeFeedsPartial({ rss, reference });
}

/** One-shot: merge legacy split JSON into bun-docs-feeds.json. */
export async function migrateLegacyFeeds(): Promise<DocsFeedsFile> {
  const rss = (await readLegacyReleaseIndex()) ?? EMPTY_RSS;
  const reference = (await readLegacyReferenceIndex()) ?? EMPTY_REFERENCE;
  if (rss === EMPTY_RSS && reference === EMPTY_REFERENCE) {
    throw new Error('no legacy release-index.json or reference-index.json to migrate');
  }
  const file = await writeFeedsPartial({ rss, reference });
  console.info(
    `✅ migrated feeds → tools/bun-docs-feeds.json (rss=${rss.count} reference=${reference.count})`
  );
  return file;
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('docs:feeds:migrate', Bun.argv.slice(2));
  if (args.includes('--migrate-legacy')) {
    await migrateLegacyFeeds();
    return;
  }

  const sub = args[0] ?? 'refresh';
  if (sub !== 'refresh') {
    console.error(
      'Usage: bun tools/bun-docs-feeds.ts refresh [--force] [--rss-only] [--reference-only]'
    );
    console.error('       bun tools/bun-docs-feeds.ts --migrate-legacy');
    process.exit(1);
  }

  const force = args.includes('--force');
  const rssOnly = args.includes('--rss-only');
  const referenceOnly = args.includes('--reference-only');
  if (rssOnly && referenceOnly) {
    throw new Error('use at most one of --rss-only or --reference-only');
  }

  const file = await refreshFeeds({
    force,
    rss: referenceOnly ? false : true,
    reference: rssOnly ? false : true,
  });

  const rssNote = file.rss.count ? `${file.rss.count} releases` : 'rss empty';
  const refNote = file.reference.count
    ? `${file.reference.count} pages · ${file.reference.moduleCount} modules`
    : 'reference empty';
  console.info(`✅ docs-feeds → tools/bun-docs-feeds.json (${rssNote}; ${refNote})`);
}

if (import.meta.main) {
  await main();
}

export const DOCS_FEEDS_PATH = resolvePath(import.meta.dir, 'bun-docs-feeds.json');
