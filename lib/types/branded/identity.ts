/**
 * @domain identity
 * @module lib/types/branded/identity.ts
 *
 * Identity / account / credential brands.
 * Credential trio (AccountId, AccessKeyId) use try* heavily at soft config merge;
 * wire parse* for env/API. Never brand empty secrets or account placeholders.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type UserId = BrandedString<'UserId'>;
export type AccountId = BrandedString<'AccountId'>;
export type IdentityId = BrandedString<'IdentityId'>;
export type AccessKeyId = BrandedString<'AccessKeyId'>;
export type TokenId = BrandedString<'TokenId'>;

const user = defineBrandConstructors('UserId');
const account = defineBrandConstructors('AccountId');
const identity = defineBrandConstructors('IdentityId');
const accessKey = defineBrandConstructors('AccessKeyId');
const token = defineBrandConstructors('TokenId');

export const asUserId = user.as;
export const tryUserId = user.try;
export const parseUserId = user.parse;

export const asAccountId = account.as;
export const tryAccountId = account.try;
export const parseAccountId = account.parse;

export const asIdentityId = identity.as;
export const tryIdentityId = identity.try;
export const parseIdentityId = identity.parse;

export const asAccessKeyId = accessKey.as;
export const tryAccessKeyId = accessKey.try;
export const parseAccessKeyId = accessKey.parse;

export const asTokenId = token.as;
export const tryTokenId = token.try;
export const parseTokenId = token.parse;

export const IDENTITY_BRAND_SPECS = [
  {
    name: 'UserId',
    domain: 'identity',
    tiers: ['as', 'try', 'parse'],
    mint: ['user-input', 'wire-input', 'system-internal'],
    description: 'Human or agent principal identity',
  },
  {
    name: 'AccountId',
    domain: 'identity',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'user-input'],
    description: 'Cloud account (e.g. Cloudflare/R2 account) — env/wire only, never empty forge',
  },
  {
    name: 'IdentityId',
    domain: 'identity',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Zero-trust / federated identity record',
  },
  {
    name: 'AccessKeyId',
    domain: 'identity',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'S3/R2 access key id (not the secret material)',
  },
  {
    name: 'TokenId',
    domain: 'identity',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Opaque token handle (not the token secret)',
  },
] as const satisfies readonly BrandSpec[];
