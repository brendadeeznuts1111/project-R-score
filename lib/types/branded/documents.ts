/**
 * @domain documents
 * @module lib/types/branded/documents.ts
 *
 * Document and zone brands (wiki, DNS zones).
 * ZoneId: prefer parseZoneId for Cloudflare wire JSON.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type DocumentId = BrandedString<'DocumentId'>;
export type ZoneId = BrandedString<'ZoneId'>;
/** Bun documentation token identity (Bun.serve, --filter, install.linker, …). */
export type DocTokenId = BrandedString<'DocTokenId'>;

const document = defineBrandConstructors('DocumentId');
const zone = defineBrandConstructors('ZoneId');
const docToken = defineBrandConstructors('DocTokenId');

export const asDocumentId = document.as;
export const tryDocumentId = document.try;
export const parseDocumentId = document.parse;

export const asZoneId = zone.as;
export const tryZoneId = zone.try;
export const parseZoneId = zone.parse;

export const asDocTokenId = docToken.as;
export const tryDocTokenId = docToken.try;
export const parseDocTokenId = docToken.parse;

export const DOCUMENT_BRAND_SPECS: readonly BrandSpec[] = [
  {
    name: 'DocumentId',
    domain: 'documents',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Wiki / collab document identity',
  },
  {
    name: 'ZoneId',
    domain: 'documents',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input'],
    description: 'DNS / Cloudflare zone — mint from wire via parseZoneId',
  },
  {
    name: 'DocTokenId',
    domain: 'documents',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'Bun documentation token identity (catalog / TokenRef northstar)',
  },
] as const;
