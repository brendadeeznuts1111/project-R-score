/**
 * Adapter: catalog entry → TokenRef knowledge unit.
 *
 * @see ./token-ref.ts
 * @see ../../tools/bun-docs-catalog.ts
 */
import { asDocTokenId } from '../types/branded/documents.ts';
import type {
  TokenRef,
  TokenExample,
  TokenKind,
  Relation,
  VersionEvidence,
  Locus,
} from './token-ref.ts';
import { locusUrl } from './token-ref.ts';

/** Minimal catalog row shape (avoids tools import cycle). */
export type CatalogEntryLike = {
  name: string;
  type: string;
  description?: string;
  stability: string;
  releasedIn?: string;
  fixedIn?: string;
  changedIn?: string;
  changeNote?: string;
  changeCommit?: string;
  commitUrl?: string;
  verifiedOn?: string;
  docsUrl?: string;
  canonicalPage: string;
  anchor?: string;
  locusUnresolved?: boolean;
  blogUrl?: string;
  releaseUrl?: string;
  allPages: string[];
  section: string;
  aliases?: string[];
  related?: string[];
  examples?: TokenExample[];
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

export function tokenRefToWire(ref: TokenRef): TokenRefWire {
  return { ...ref, id: ref.id as string };
}
