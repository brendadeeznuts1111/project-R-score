import { BUN_GITHUB_REPO, bunReference } from '../shared/tools/bun-urls.ts';

/** Canonical upstream authorities for Bun APIs and their TypeScript declarations. */
export const BUN_API_REFERENCE_URL = bunReference('').replace(/\/$/, '');
export const BUN_REPOSITORY_URL = BUN_GITHUB_REPO;
export const BUN_TYPES_SOURCE_URL = `${BUN_REPOSITORY_URL}/tree/main/packages/bun-types`;

/** Immutable source link for the exact Bun runtime revision under test. */
export function bunRuntimeRevisionSourceUrl(revision: string): string {
  return `${BUN_REPOSITORY_URL}/commit/${revision}`;
}

/** Build an immutable source link for the installed bun-types package version. */
export function bunTypesVersionSourceUrl(version: string): string {
  const tipRevision = /-tip\.([a-f\d]{7,40})$/i.exec(version)?.[1];
  if (!tipRevision && !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Cannot derive an immutable official bun-types source ref from ${version}`);
  }
  const sourceRef = tipRevision ?? `bun-v${version}`;
  return `${BUN_REPOSITORY_URL}/tree/${sourceRef}/packages/bun-types`;
}
