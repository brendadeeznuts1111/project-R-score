import { basenamePath } from '../path-bun.ts';
import type { Addressability, FileInventoryRow } from './file-removal-types.ts';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TEXT_EXTENSIONS = new Set([
  ...SOURCE_EXTENSIONS,
  '.css',
  '.csv',
  '.html',
  '.json',
  '.jsonc',
  '.md',
  '.sh',
  '.svg',
  '.toml',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const CONTRACT_BASENAMES = new Set([
  '.bun-version',
  '.gitignore',
  'AGENTS.md',
  'bun.lock',
  'bunfig.toml',
  'package.json',
  'tsconfig.json',
]);

const SAFE_REVIEW_PREFIXES = ['docs/archives/', 'scratch/', 'examples/'];

export function extensionOf(path: string): string {
  const base = basenamePath(path);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

export function isSourcePath(path: string): boolean {
  return SOURCE_EXTENSIONS.has(extensionOf(path));
}

/** Exact source perimeter used by the monorepo-health large-file ratchet. */
export function isMonorepoHealthSourcePath(path: string): boolean {
  if (!/\.(?:ts|tsx)$/.test(path)) return false;
  if (/\.(?:test|spec|bench)\./.test(path) || path.endsWith('.d.ts')) return false;
  return /^(?:lib|tools|scripts|config)\//.test(path) || /^packages\/[^/]+\/src\//.test(path);
}

export function isTextPath(path: string): boolean {
  return TEXT_EXTENSIONS.has(extensionOf(path)) || CONTRACT_BASENAMES.has(basenamePath(path));
}

export function publicUrlFor(path: string): string | null {
  if (!path.startsWith('public/')) return null;
  const rel = path.slice('public/'.length);
  return rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
}

export function looksGenerated(path: string, text: string | null): boolean {
  if (/^(public\/feeds\/|public\/registry\/)/.test(path)) return true;
  if (!text) return false;
  return /(?:auto-?generated|generated file|do not edit|generatedAt)/i.test(text.slice(0, 4096));
}

export function hardProtectionReasons(row: FileInventoryRow): string[] {
  const reasons: string[] = [];
  if (row.dirty) reasons.push('working-tree change');
  if (row.gitMode === '120000') reasons.push('symbolic link');
  if (row.gitMode === '160000') reasons.push('git submodule');
  if (CONTRACT_BASENAMES.has(basenamePath(row.path))) reasons.push('repository contract');
  if (/^(\.github\/|config\/|tests\/fixtures\/)/.test(row.path)) {
    reasons.push('configuration or fixture contract');
  }
  if (/^public\/(feeds\/|registry\/bun-1\.4-|portal\/bun-1\.4\/)/.test(row.path)) {
    reasons.push('Bun 1.4 channel integration contract');
  }
  return reasons;
}

export function addressabilityFor(row: FileInventoryRow): Addressability {
  const referenced = row.inboundReferences.length > 0 || row.importedBy.length > 0;
  if (row.publicUrl) return referenced ? 'public-referenced' : 'public-unreferenced';
  return referenced ? 'internal-referenced' : 'unreferenced';
}

export function isSafeReviewLocation(path: string): boolean {
  return SAFE_REVIEW_PREFIXES.some(prefix => path.startsWith(prefix));
}

export function isSourceOrContractArea(path: string): boolean {
  return (
    isSourcePath(path) ||
    /^(lib\/|scripts\/|tools\/|packages\/|tests\/|config\/|\.github\/)/.test(path)
  );
}
