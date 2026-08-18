import { BUN_API_REFERENCE_URL } from './bun-source-links.ts';
import { BUN_RSS_URL, LLMS_URL } from '../shared/tools/bun-urls.ts';

export const BUN_REFERENCE_INDEX_URL = BUN_API_REFERENCE_URL;

export type OfficialDocumentationEvidence = {
  official: boolean;
  plane: 'docs' | 'reference' | 'unrecognized';
  match: 'page' | 'module-prefix' | 'none';
  indexSource: string | null;
  indexedUrl: string | null;
  anchor: 'not-requested' | 'verified' | 'unavailable' | 'missing';
};

type DocsIndexEntry = {
  url: string;
  anchors?: string[];
};

type DocsIndexFile = {
  generated?: string;
  source?: string;
  bunVersion?: string;
  entries?: DocsIndexEntry[];
};

type ReferencePage = {
  url: string;
};

type DocsFeedsFile = {
  generated?: string;
  rss?: {
    generated?: string;
    source?: string;
    count?: number;
    entries?: unknown[];
  };
  reference?: {
    generated?: string;
    source?: string;
    pages?: ReferencePage[];
  };
};

export type OfficialBunDocumentationIndexes = {
  docs: {
    generated: string | null;
    source: string;
    sha256: string;
    bunVersion: string | null;
    entries: DocsIndexEntry[];
  };
  reference: {
    generated: string | null;
    source: string;
    sha256: string;
    pages: ReferencePage[];
  };
  releases: {
    generated: string | null;
    source: string;
    sha256: string;
    count: number;
  };
};

export type BunOfficialSourceSnapshots = {
  docs: unknown;
  feeds: unknown;
  docsSha256: string;
  feedsSha256: string;
};

function withoutFragment(url: string): string {
  return url.split('#', 1)[0]!.replace(/\/$/, '');
}

function normalizedDocsPage(url: string): string {
  return withoutFragment(url)
    .replace(/\.md$/, '')
    .replace(/\/index$/, '');
}

function parseOfficialSource(actual: unknown, expected: string, artifact: string): string {
  if (actual !== expected) {
    throw new Error(`${artifact} source must be ${expected}; received ${String(actual)}`);
  }
  return expected;
}

function parseSha256(actual: unknown, artifact: string): string {
  if (typeof actual !== 'string' || !/^[a-f\d]{64}$/.test(actual)) {
    throw new Error(`${artifact} SHA-256 must be a lowercase 64-character digest`);
  }
  return actual;
}

/**
 * Validate parsed snapshots against the official Bun authorities.
 *
 * This module deliberately knows no repository paths. Callers may materialize
 * the snapshots in files, object storage, or memory, but their embedded source
 * identities must remain Bun's official docs, reference, and release surfaces.
 */
export function parseOfficialBunDocumentationIndexes(
  snapshots: BunOfficialSourceSnapshots
): OfficialBunDocumentationIndexes {
  const docs = snapshots.docs as DocsIndexFile;
  const feeds = snapshots.feeds as DocsFeedsFile;

  if (!Array.isArray(docs.entries)) {
    throw new Error('Bun docs index materialization entries must be an array');
  }
  if (!Array.isArray(feeds.reference?.pages)) {
    throw new Error('Bun reference index materialization pages must be an array');
  }
  if (!Array.isArray(feeds.rss?.entries) || feeds.rss.count !== feeds.rss.entries.length) {
    throw new Error('Bun release feed materialization count must match its entries');
  }

  return {
    docs: {
      generated: docs.generated ?? null,
      source: parseOfficialSource(docs.source, LLMS_URL, 'Bun docs index materialization'),
      sha256: parseSha256(snapshots.docsSha256, 'Bun docs index materialization'),
      bunVersion: docs.bunVersion ?? null,
      entries: docs.entries,
    },
    reference: {
      generated: feeds.reference.generated ?? feeds.generated ?? null,
      source: parseOfficialSource(
        feeds.reference.source,
        BUN_REFERENCE_INDEX_URL,
        'Bun reference index materialization'
      ),
      sha256: parseSha256(snapshots.feedsSha256, 'Bun reference index materialization'),
      pages: feeds.reference.pages,
    },
    releases: {
      generated: feeds.rss.generated ?? feeds.generated ?? null,
      source: parseOfficialSource(
        feeds.rss.source,
        BUN_RSS_URL,
        'Bun release feed materialization'
      ),
      sha256: parseSha256(snapshots.feedsSha256, 'Bun release feed materialization'),
      count: feeds.rss.count,
    },
  };
}

/**
 * Prove that a canonical URL belongs to an official Bun documentation index.
 *
 * The docs index provides page and heading data. The reference index currently
 * publishes module pages, so member URLs are honestly reported as
 * `module-prefix` matches instead of being overstated as exact page matches.
 */
export function officialDocumentationEvidence(
  url: string | null,
  indexes: OfficialBunDocumentationIndexes
): OfficialDocumentationEvidence {
  if (!url) {
    return {
      official: false,
      plane: 'unrecognized',
      match: 'none',
      indexSource: null,
      indexedUrl: null,
      anchor: 'not-requested',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      official: false,
      plane: 'unrecognized',
      match: 'none',
      indexSource: null,
      indexedUrl: null,
      anchor: 'not-requested',
    };
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'bun.com') {
    return {
      official: false,
      plane: 'unrecognized',
      match: 'none',
      indexSource: null,
      indexedUrl: null,
      anchor: parsed.hash ? 'missing' : 'not-requested',
    };
  }

  if (parsed.pathname.startsWith('/docs/')) {
    const requestedPage = normalizedDocsPage(url);
    const entry = indexes.docs.entries.find(item => normalizedDocsPage(item.url) === requestedPage);
    const requestedAnchor = parsed.hash.slice(1);
    const anchors = entry?.anchors ?? [];
    const anchor = !requestedAnchor
      ? 'not-requested'
      : anchors.length === 0
        ? 'unavailable'
        : anchors.includes(requestedAnchor)
          ? 'verified'
          : 'missing';
    return {
      official: entry !== undefined && anchor !== 'missing',
      plane: 'docs',
      match: entry ? 'page' : 'none',
      indexSource: indexes.docs.source,
      indexedUrl: entry ? normalizedDocsPage(entry.url) : null,
      anchor,
    };
  }

  if (parsed.pathname.startsWith('/reference/')) {
    const requestedPage = withoutFragment(url);
    const exact = indexes.reference.pages.find(item => withoutFragment(item.url) === requestedPage);
    const parent = exact
      ? undefined
      : indexes.reference.pages
          .filter(item => requestedPage.startsWith(`${withoutFragment(item.url)}/`))
          .sort((a, b) => b.url.length - a.url.length)[0];
    const indexed = exact ?? parent;
    return {
      official: indexed !== undefined,
      plane: 'reference',
      match: exact ? 'page' : parent ? 'module-prefix' : 'none',
      indexSource: indexes.reference.source,
      indexedUrl: indexed ? withoutFragment(indexed.url) : null,
      anchor: parsed.hash ? 'unavailable' : 'not-requested',
    };
  }

  return {
    official: false,
    plane: 'unrecognized',
    match: 'none',
    indexSource: null,
    indexedUrl: null,
    anchor: parsed.hash ? 'missing' : 'not-requested',
  };
}
