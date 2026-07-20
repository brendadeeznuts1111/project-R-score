import type { MigrateSection } from '../bun-migrate.ts';

/** Phase number → migrateSection (apply + validate). */
export const PHASE_SECTION: Record<number, MigrateSection> = {
  6: 'crypto',
  7: 'fs',
  8: 'shell',
  9: 'runtime',
};
