/**
 * Adapters: catalog entry → TokenRef (interior) → BunToken (export).
 *
 * @see ./token-ref.ts
 * @see ./bun-token.ts
 * @see ../../tools/bun-docs-catalog.ts
 */
import { asDocTokenId } from '../types/branded/documents.ts';
import type {
  TokenRef,
  TokenRefWire,
  TokenExample,
  TokenKind,
  Relation,
  VersionEvidence,
  Locus,
} from './token-ref.ts';
import { locusUrl } from './token-ref.ts';
import type { BunToken, VersionHitLike } from './bun-token.ts';
import {
  announcementUrlFromEvents,
  buildVersionEvents,
  sinceFromEvents,
  toBunTokenKind,
} from './bun-token.ts';

/** Minimal catalog row shape (avoids tools import cycle). */
export type CatalogEntryLike = {
  name: string;
  type: string;
  description?: string;
  stability: string;
  releasedIn?: string;
  releasedAt?: string;
  releasedUrl?: string;
  fixedIn?: string;
  fixedAt?: string;
  fixedUrl?: string;
  changedIn?: string;
  changedAt?: string;
  changedUrl?: string;
  changeNote?: string;
  changeCommit?: string;
  commitUrl?: string;
  lastUpdated?: string;
  verifiedOn?: string;
  docsUrl?: string;
  canonicalPage: string;
  anchor?: string;
  locusUnresolved?: boolean;
  locusStatus?:
    'fragment' | 'page' | 'inherited' | 'dump' | 'reference' | 'coincidence' | 'unresolved';
  blogUrl?: string;
  releaseUrl?: string;
  allPages: string[];
  section: string;
  aliases?: string[];
  related?: string[];
  examples?: TokenExample[];
};

export type CatalogToBunTokenOpts = {
  /** Overlay timeline hits for this token (full attested history). */
  hits?: VersionHitLike[];
  /** Catalog build ISO timestamp when entry.lastUpdated missing. */
  catalogGenerated?: string;
  /** Catalog-level Bun.revision pin. */
  catalogCommitHash?: string;
  /** Rich locus STATUS from catalog build. */
  locusStatus?: CatalogEntryLike['locusStatus'];
};

export function catalogEntryToTokenRef(entry: CatalogEntryLike): TokenRef {
  const fragment = entry.anchor;
  const locus: Locus = {
    page: entry.canonicalPage.replace(/\.md$/, '').split('#')[0]!,
    ...(fragment ? { fragment } : {}),
    ...(entry.locusUnresolved
      ? { unresolved: true }
      : fragment
        ? { unresolved: false }
        : { unresolved: true }),
  };

  const history: VersionEvidence = {
    ...(entry.releasedIn ? { introduced: entry.releasedIn } : {}),
    ...(entry.fixedIn ? { fixed: entry.fixedIn } : {}),
    ...(entry.changedIn ? { changed: entry.changedIn } : {}),
    ...(entry.changeNote ? { changeNote: entry.changeNote } : {}),
    ...(entry.changeCommit ? { commit: entry.changeCommit } : {}),
    evidenceUrl: entry.blogUrl ?? entry.releaseUrl ?? locusUrl(locus),
  };

  const relations: Relation[] = [];
  for (const a of entry.aliases ?? []) {
    relations.push({ kind: 'alias', target: a });
  }
  for (const r of entry.related ?? []) {
    relations.push({ kind: 'related', target: r });
  }

  return {
    id: asDocTokenId(entry.name),
    name: entry.name,
    kind: entry.type as TokenKind,
    stability: entry.stability as TokenRef['stability'],
    note: entry.description,
    locus,
    examples: entry.examples ?? [],
    history,
    relations,
    allPages: entry.allPages,
    section: entry.section,
    buildPin: entry.verifiedOn,
  };
}

/** TokenRef → BunToken (export). Overlay hits preferred for versionEvents. */
export function tokenRefToBunToken(
  ref: TokenRef,
  opts?: {
    hits?: VersionHitLike[];
    announcementUrl?: string | null;
    lastVerified?: string;
    sourceCommit?: string;
    locusStatus?: CatalogEntryLike['locusStatus'];
    eventDates?: Partial<Record<'since' | 'fixed' | 'changed' | 'stabilized', string>>;
    eventUrls?: Partial<Record<'since' | 'fixed' | 'changed' | 'stabilized', string>>;
  }
): BunToken {
  const versionEvents = buildVersionEvents({
    hits: opts?.hits,
    introduced: ref.history.introduced,
    fixed: ref.history.fixed,
    changed: ref.history.changed,
    stabilized: ref.history.stabilized,
    changeNote: ref.history.changeNote,
    evidenceUrl: ref.history.evidenceUrl,
    eventDates: opts?.eventDates,
    eventUrls: opts?.eventUrls,
  });

  const related = ref.relations
    .filter(r => r.kind === 'related' || r.kind === 'seeAlso')
    .map(r => r.target);
  const aliases = ref.relations.filter(r => r.kind === 'alias').map(r => r.target);
  const relatedAll = [...new Set([...related, ...aliases])];

  const fallbackAnnouncement =
    opts?.announcementUrl !== undefined
      ? opts.announcementUrl
      : ref.history.evidenceUrl?.includes('/blog/')
        ? ref.history.evidenceUrl
        : null;
  const announcementUrl = announcementUrlFromEvents(versionEvents, fallbackAnnouncement);

  const token: BunToken = {
    name: ref.name,
    kind: toBunTokenKind(ref.kind),
    description: ref.note ?? '',
    stability: ref.stability,
    docsLocus: {
      page: ref.locus.page,
      anchor: ref.locus.fragment && !ref.locus.unresolved ? ref.locus.fragment : null,
      ...(opts?.locusStatus ? { status: opts.locusStatus } : {}),
    },
    since: sinceFromEvents(versionEvents) ?? ref.history.introduced ?? null,
    announcementUrl: announcementUrl ?? null,
    versionEvents,
    examples: ref.examples.map(e => ({
      lang: e.lang,
      code: e.body,
      ...(e.fragment ? { description: `#${e.fragment}` } : {}),
    })),
    ...(relatedAll.length ? { related: relatedAll } : {}),
    meta: {
      lastVerified: opts?.lastVerified ?? new Date().toISOString(),
      ...(opts?.sourceCommit || ref.history.commit
        ? { sourceCommit: opts?.sourceCommit ?? ref.history.commit }
        : {}),
      ...(ref.buildPin ? { buildPin: ref.buildPin } : {}),
    },
  };
  return token;
}

/** DocCatalogEntry → TokenRef → BunToken. */
export function catalogEntryToBunToken(
  entry: CatalogEntryLike,
  opts?: CatalogToBunTokenOpts
): BunToken {
  const ref = catalogEntryToTokenRef(entry);
  return tokenRefToBunToken(ref, {
    hits: opts?.hits,
    announcementUrl: entry.blogUrl ?? null,
    lastVerified: entry.lastUpdated ?? opts?.catalogGenerated,
    sourceCommit: entry.changeCommit ?? opts?.catalogCommitHash,
    locusStatus: entry.locusStatus,
    eventDates: {
      ...(entry.releasedAt ? { since: entry.releasedAt } : {}),
      ...(entry.fixedAt ? { fixed: entry.fixedAt } : {}),
      ...(entry.changedAt ? { changed: entry.changedAt } : {}),
    },
    eventUrls: {
      ...(entry.releasedUrl ? { since: entry.releasedUrl } : {}),
      ...(entry.fixedUrl ? { fixed: entry.fixedUrl } : {}),
      ...(entry.changedUrl ? { changed: entry.changedUrl } : {}),
    },
  });
}

export function tokenRefToWire(ref: TokenRef): TokenRefWire {
  return { ...ref, id: ref.id as string };
}
