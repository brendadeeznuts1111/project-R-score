#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * verify-docs-coverage.ts — RSS + reference + canonical coverage verification.
 *
 * @see docs/BUN_DOCS_OPERATE.md
 * @see lib/docs/docs-coverage-report.ts
 *
 *   bun tools/verify-docs-coverage.ts
 *   bun tools/verify-docs-coverage.ts --save
 *   bun tools/verify-docs-coverage.ts --json --strict
 */
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
import { CryptoHasher, revision, version } from 'bun';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import {
  buildDocsCoverageReport,
  parseReviewJsonl,
  type DocsCoverageReport,
} from '../lib/docs/docs-coverage-report.ts';
import { DOCS_CATALOG } from '../lib/docs/docs-artifact-paths.ts';
import { loadReleaseIndex, parseReleaseEntries, fetchRssXml } from './bun-docs-releases.ts';
import { loadReferenceIndex } from './bun-docs-reference-index.ts';

export const SAVE_PATH = 'public/registry/docs-coverage-proof.json';
export const ALLOWLIST_PATH = 'tools/docs-coverage-allowlist.json';
export const CATALOG_PATH = DOCS_CATALOG;
export const REVIEW_PATH = 'reports/release-scrape-review.jsonl';

const asJson = Bun.argv.includes('--json');
const shouldSave = Bun.argv.includes('--save');
const refreshRss = Bun.argv.includes('--refresh-rss');
const refreshReference = Bun.argv.includes('--refresh-reference');
const strict = Bun.argv.includes('--strict') || !Bun.argv.includes('--no-strict');

async function loadReviewRows(): Promise<ReturnType<typeof parseReviewJsonl>> {
  const file = Bun.file(REVIEW_PATH);
  if (!(await file.exists())) return [];
  return parseReviewJsonl(await file.text());
}

export async function runDocsCoverageVerification(): Promise<DocsCoverageReport> {
  const { file: releaseIndex } = await loadReleaseIndex({
    refresh: refreshRss,
    force: refreshRss,
  });
  const { file: referenceIndex } = await loadReferenceIndex({
    refresh: refreshReference,
    force: refreshReference,
  });

  let liveNewestVersion: string | null = null;
  if (refreshRss) {
    try {
      const fetched = await fetchRssXml({ force: true });
      const live = parseReleaseEntries(fetched.xml);
      liveNewestVersion =
        live.sort((a, b) => (a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0))[0]
          ?.version ?? null;
    } catch {
      liveNewestVersion = null;
    }
  }

  const catalog = (await Bun.file(CATALOG_PATH).json()) as {
    entries: Array<import('../lib/docs/docs-coverage-report.ts').CatalogEntryLike>;
  };
  const allowlist = (await Bun.file(
    ALLOWLIST_PATH
  ).json()) as import('../lib/docs/docs-coverage-report.ts').DocsCoverageAllowlist;

  const report = buildDocsCoverageReport({
    releaseIndex,
    referenceIndex,
    catalogEntries: catalog.entries,
    reviewRows: await loadReviewRows(),
    allowlist,
    liveNewestVersion,
  });

  const hasher = new CryptoHasher('sha256');
  hasher.update(JSON.stringify(report.canonical));
  hasher.update(String(report.summary.ok));
  report.proofHash = hasher.digest('hex');

  const semanticTags = await buildSemanticTags('runtime');
  report.semanticTags = { ...semanticTags, subsystems: ['other'] };

  return report;
}

const report = await runDocsCoverageVerification();

if (asJson) {
  jsonOut(report);
} else {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  Docs coverage — RSS index · API reference · canonical alignment      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  logTable(
    [
      {
        lane: 'rss',
        newest: report.rss.newestVersion ?? '—',
        stale: report.rss.indexStale ? 'yes' : 'no',
        status: report.rss.indexStale ? '⚠️' : '✅',
      },
      {
        lane: 'reference',
        newest: `${report.reference.pageCount} pages`,
        stale: `${report.reference.moduleCount} modules`,
        status: '✅',
      },
      {
        lane: 'catalog',
        newest: `${report.canonical.catalogTracked}/${report.canonical.catalogTotal}`,
        stale: report.canonical.catalogMissing.length
          ? report.canonical.catalogMissing.join(', ')
          : '—',
        status: report.canonical.catalogMissing.length ? '❌' : '✅',
      },
      {
        lane: 'overlay',
        newest: `${report.canonical.overlayTracked}/${report.canonical.overlayTotal}`,
        stale: report.canonical.overlayMissing.length
          ? `${report.canonical.overlayMissing.length} gaps`
          : '—',
        status: report.canonical.overlayMissing.length ? '❌' : '✅',
      },
      {
        lane: 'review(3)',
        newest: `${report.canonical.reviewTracked}/${report.canonical.reviewTotal}`,
        stale: report.canonical.reviewMissing.length
          ? `${report.canonical.reviewMissing.length} gaps`
          : '—',
        status: report.canonical.reviewMissing.length ? '❌' : '✅',
      },
    ],
    ['lane', 'newest', 'stale', 'status']
  );
  console.log(
    `\n  ${report.summary.ok ? '✅' : '❌'} missingCanonical=${report.summary.missingCanonicalCount} indexStale=${report.summary.indexStale}`
  );
  console.log(`  🔒 Proof hash: ${report.proofHash?.slice(0, 16)}…`);
  if (report.referenceUrls.missingFromIndex.length) {
    console.log(
      `  ℹ️  ${report.referenceUrls.missingFromIndex.length} catalog reference URLs not on index page (informational)`
    );
  }
}

if (shouldSave) {
  await Bun.write(SAVE_PATH, JSON.stringify(report, null, 2));
  if (!asJson) console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
}

const exitOk = strict ? report.summary.ok : true;
process.exit(exitOk ? 0 : 1);
