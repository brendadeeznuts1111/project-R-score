/**
 * @domain proton
 * @module lib/types/branded/proton.ts
 *
 * Proton Pass identity brands.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type VaultId = BrandedString<'VaultId'>;
export type ItemId = BrandedString<'ItemId'>;

const vault = defineBrandConstructors('VaultId');
const item = defineBrandConstructors('ItemId');

export const asVaultId = vault.as;
export const tryVaultId = vault.try;
export const parseVaultId = vault.parse;

export const asItemId = item.as;
export const tryItemId = item.try;
export const parseItemId = item.parse;

export const PROTON_BRAND_SPECS: readonly BrandSpec[] = [
  {
    name: 'VaultId',
    domain: 'proton',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'user-input'],
    description: 'Proton Pass vault identifier',
  },
  {
    name: 'ItemId',
    domain: 'proton',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'user-input'],
    description: 'Proton Pass vault item identifier',
  },
] as const;
