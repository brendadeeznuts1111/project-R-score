/**
 * Snapshot CLI type contracts — no runtime imports (safe for compile-only type tests).
 * @see tests/snapshot-types.test-d.ts
 */
import type { SnapshotScopeName } from './snapshot-scopes.ts';

export type SnapshotManifest = {
  id: string; // brand-ok — opaque snapshot id
  scope: SnapshotScopeName;
  reportType: string;
  capturedAt: string;
  commit: string;
  branch: string;
  bunVersion: string;
  baseUrl: string;
  fileCount: number;
  files: string[];
  metadata: Record<string, string>;
};

export type SnapshotRunOptions = {
  scope: SnapshotScopeName;
  baseUrl?: string;
  dryRun?: boolean;
  debug?: boolean;
};

export type SnapshotFilterOptions = {
  scope?: SnapshotScopeName;
  grep?: string;
  debug?: boolean;
};

export type ParsedSnapshotFlags = {
  scope?: string;
  baseUrl: string;
  dryRun: boolean;
  debug: boolean;
  positional: string[];
};
