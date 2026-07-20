/**
 * @domain security
 * @module lib/types/branded/security.ts
 *
 * Zero-trust challenge and policy brands.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type ChallengeId = BrandedString<'ChallengeId'>;
export type PolicyId = BrandedString<'PolicyId'>;

const challenge = defineBrandConstructors('ChallengeId');
const policy = defineBrandConstructors('PolicyId');

export const asChallengeId = challenge.as;
export const tryChallengeId = challenge.try;
export const parseChallengeId = challenge.parse;

export const asPolicyId = policy.as;
export const tryPolicyId = policy.try;
export const parsePolicyId = policy.parse;

export const SECURITY_BRAND_SPECS: readonly BrandSpec[] = [
  {
    name: 'ChallengeId',
    domain: 'security',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Auth challenge / proof-of-possession handle',
  },
  {
    name: 'PolicyId',
    domain: 'security',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Access policy identity',
  },
] as const;
