// @see https://bun.com/docs/runtime/sqlite
/**
 * Re-export of ScopedRepository and Scope from operations/state-regulation.
 * Created to fix broken imports from tools/deep-audit-report.ts and
 * lib/zip-enrichment-repo.ts which reference './repository.ts'.
 */
export { ScopedRepository } from './operations/state-regulation.ts';
export type { Scope } from './operations/state-regulation.ts';
