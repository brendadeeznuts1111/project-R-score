// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Scope configs for snapshot-data-plane — prediction, portal, gaps, limits.
 * @see docs/harness/tenants/prediction-report.md
 */
import { resolvePath } from '../lib/path-bun.ts';

export type SnapshotScopeName = 'prediction' | 'portal' | 'gaps' | 'limits';

export type SnapshotScopeConfig = {
  label: string;
  /** Primary report URL path (under baseUrl) or empty when generateReport is used. */
  reportPath: string;
  reportKind: 'html' | 'json';
  assetPaths: string[];
  /** Repo-relative files copied into snapshot dir (gaps / offline). */
  localAssets?: string[];
  manifestExtra: Record<string, string>;
};

export const DEFAULT_SNAPSHOT_BASE =
  (typeof Bun !== 'undefined' ? Bun.env.SNAPSHOT_BASE_URL : undefined) ?? 'http://localhost:3000';

/** Local data-plane output belongs in the artifact store, never at repository root. */
export const DEFAULT_SNAPSHOT_DIR = 'artifacts/snapshots';

export const scopeConfigs: Record<SnapshotScopeName, SnapshotScopeConfig> = {
  prediction: {
    label: 'Coverage prediction report',
    reportPath: '/registry/prediction/report/',
    reportKind: 'html',
    assetPaths: [
      '/registry/prediction/report/summary.json',
      '/registry/prediction/coverage-chart.svg',
      '/registry/prediction/error-histogram.svg',
      '/registry/prediction/rolling-mae.svg',
      '/registry/prediction/error-chart.svg',
    ],
    manifestExtra: { reportType: 'prediction' },
  },
  portal: {
    label: 'Portal ops summary + weave',
    reportPath: '/registry/ops-summary.json',
    reportKind: 'json',
    assetPaths: [
      '/registry/portal-weave.json',
      '/registry/static.json',
      '/registry/monitoring.json',
      '/registry/limit-raises.json',
    ],
    manifestExtra: { reportType: 'portal' },
  },
  gaps: {
    label: 'Public-plane gap discovery',
    reportPath: '',
    reportKind: 'json',
    assetPaths: [],
    localAssets: ['reports/audit-report.json'],
    manifestExtra: { reportType: 'gaps' },
  },
  limits: {
    label: 'Limit changes snapshot',
    reportPath: '/api/limits/summary?format=json',
    reportKind: 'json',
    assetPaths: ['/api/limits/analyze'],
    manifestExtra: { reportType: 'limits' },
  },
};

export function isSnapshotScope(name: string): name is SnapshotScopeName {
  return name in scopeConfigs;
}

export function resolveSnapshotUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = baseUrl.replace(/\/$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function repoRoot(): string {
  return resolvePath(import.meta.dir, '..');
}
