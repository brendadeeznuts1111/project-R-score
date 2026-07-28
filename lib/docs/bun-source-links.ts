/** Canonical upstream authorities for Bun APIs and their TypeScript declarations. */
export const BUN_API_REFERENCE_URL = 'https://bun.com/reference';
export const BUN_REPOSITORY_URL = 'https://github.com/oven-sh/bun';
export const BUN_TYPES_SOURCE_URL = 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';

/** Build an immutable source link for the installed bun-types package version. */
export function bunTypesVersionSourceUrl(version: string): string {
  return `${BUN_REPOSITORY_URL}/tree/bun-v${version}/packages/bun-types`;
}
