export type MigrateSection = 'runtime' | 'crypto' | 'fs' | 'shell' | 'test' | 'bundler' | 'http';

export type UsageHit = {
  file: string;
  line: number;
  snippet: string;
  nodePattern: string;
  bunToken: string;
  migrateSection: MigrateSection;
  catalogSection?: string;
  locusStatus?: string;
  docsUrl?: string;
  /** True when file is in VALIDATE_WHITELIST (catalog / intentional Node). */
  whitelisted?: boolean;
};

/** Tool and catalog files intentionally excluded from automated migration. */
export const VALIDATE_WHITELIST = new Set([
  'scripts/bun-migrate.ts',
  'scripts/lib/migrate-crypto.ts',
  'scripts/lib/migrate-fs.ts',
  'scripts/lib/migrate-shell.ts',
  'scripts/lib/migrate-runtime.ts',
  'scripts/validate-integrity.ts',
  'tools/bun-docs-changelog.ts',
  'lib/console-depth.ts',
  'scripts/dx-mcp.ts',
  'scripts/lib/fs-bun.ts',
  'packages/guards/src/bun-first-guard.ts',
  'lib/docs/constants/utils.ts',
  'packages/docs-tools/src/builders/url-builder.ts',
  'scripts/pack-all.ts',
  'scripts/brand-cpu-profile.ts',
  'scripts/search-benchmark-dashboard.ts',
  'lib/docs/ripgrep-spawn.ts',
  'lib/docs/smart-symbol-index.ts',
  'tools/overseer-cli.ts',
]);

/** Phase number → migrateSection (apply + validate). */
export const PHASE_SECTION: Record<number, MigrateSection> = {
  6: 'crypto',
  7: 'fs',
  8: 'shell',
  9: 'runtime',
};
