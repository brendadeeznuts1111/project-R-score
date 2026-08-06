#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * validate-partner-surface-inventory.ts — Layer 2/3 checks on structured bags.
 *
 *   bun run partner-surface-inventory:validate
 *
 * Uses brand-manifest (not TypeScript AST) + Bun.file.exists for registry artifacts.
 * Does not replace lib:domains:check.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  buildPartnerSurfaceInventory,
  type PartnerSurfaceRow,
} from '../lib/docs/partner-surface-inventory.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const MANIFEST_PATH = resolvePath(ROOT, 'lib/types/brand-manifest.json');

type BrandManifestEntry = {
  name: string;
  module?: string;
  validation?: { pattern?: string };
  constructors?: Record<string, string>;
};

type Issue = { level: 'error' | 'warn'; message: string };

async function loadBrandNames(): Promise<{
  names: Set<string>;
  byName: Map<string, BrandManifestEntry>;
}> {
  const manifest = (await Bun.file(MANIFEST_PATH).json()) as {
    brands?: BrandManifestEntry[];
  };
  const byName = new Map<string, BrandManifestEntry>();
  for (const b of manifest.brands ?? []) byName.set(b.name, b);
  return { names: new Set(byName.keys()), byName };
}

function aspectBagRules(row: PartnerSurfaceRow, issues: Issue[]): void {
  if (row.brand && row.aspect !== 'brand') {
    issues.push({
      level: 'error',
      message: `${row.id}: brand bag only allowed on aspect=brand`,
    });
  }
  if (row.registry && row.aspect !== 'registry') {
    issues.push({
      level: 'error',
      message: `${row.id}: registry bag only allowed on aspect=registry`,
    });
  }
  if (row.wireField && row.aspect !== 'wire-field') {
    issues.push({
      level: 'error',
      message: `${row.id}: wireField bag only allowed on aspect=wire-field`,
    });
  }
  if (row.chromeNav && row.aspect !== 'chrome-nav' && row.aspect !== 'portal-board') {
    issues.push({
      level: 'error',
      message: `${row.id}: chromeNav bag only allowed on chrome-nav|portal-board`,
    });
  }
  if (row.taxonomy && row.aspect !== 'taxonomy') {
    issues.push({
      level: 'error',
      message: `${row.id}: taxonomy bag only allowed on aspect=taxonomy`,
    });
  }
}

async function validate(rows: readonly PartnerSurfaceRow[]): Promise<Issue[]> {
  const issues: Issue[] = [];
  const { names: brandNames, byName } = await loadBrandNames();
  const registryTokens = new Set(rows.filter(r => r.aspect === 'registry').map(r => r.token));

  for (const row of rows) {
    aspectBagRules(row, issues);

    if (row.aspect === 'brand' && row.typeOrExport) {
      if (!row.brand) {
        issues.push({
          level: 'error',
          message: `${row.id}: brand aspect missing brand bag`,
        });
      } else if (!brandNames.has(row.typeOrExport)) {
        issues.push({
          level: 'error',
          message: `${row.id}: typeOrExport "${row.typeOrExport}" not in brand-manifest`,
        });
      } else {
        const entry = byName.get(row.typeOrExport);
        if (
          row.brand.pattern &&
          entry?.validation?.pattern &&
          row.brand.pattern !== entry.validation.pattern
        ) {
          issues.push({
            level: 'warn',
            message: `${row.id}: brand.pattern drifts from manifest (${entry.validation.pattern})`,
          });
        }
        if (!(await Bun.file(resolvePath(ROOT, row.brand.module)).exists())) {
          issues.push({
            level: 'error',
            message: `${row.id}: brand.module missing ${row.brand.module}`,
          });
        }
      }
    }

    if (row.aspect === 'registry') {
      if (!row.registry) {
        issues.push({
          level: 'error',
          message: `${row.id}: registry aspect missing registry bag`,
        });
      } else {
        const abs = resolvePath(ROOT, row.registry.artifactPath);
        if (!(await Bun.file(abs).exists())) {
          issues.push({
            level: 'error',
            message: `${row.id}: registry artifact missing ${row.registry.artifactPath}`,
          });
        }
        if (
          row.registry.moneyPolicy === 'forbidden' &&
          !row.registry.omits.includes('softBalance')
        ) {
          issues.push({
            level: 'warn',
            message: `${row.id}: moneyPolicy=forbidden but softBalance not in omits`,
          });
        }
      }
    }

    if (row.aspect === 'wire-field') {
      if (!row.wireField) {
        issues.push({
          level: 'error',
          message: `${row.id}: wire-field aspect missing wireField bag`,
        });
      } else if (
        row.wireField.resolvesTo === 'PartnerCode' &&
        row.wireField.sourceSystemId !== 'canonical'
      ) {
        issues.push({
          level: 'warn',
          message: `${row.id}: wire resolvesTo PartnerCode from ${row.wireField.sourceSystemId} — prefer ExternalPartnerRef`,
        });
      }
    }

    if (
      (row.aspect === 'portal-board' || row.aspect === 'chrome-nav') &&
      row.chromeNav?.registryArtifact &&
      !registryTokens.has(row.chromeNav.registryArtifact)
    ) {
      // limit-raises / bookmakers / telegram-handshake may not be partner-inventory registries
      const knownExternal = new Set([
        'limit-raises',
        'limit-forecast-lab',
        'bookmakers',
        'telegram-handshake',
      ]);
      if (!knownExternal.has(row.chromeNav.registryArtifact)) {
        issues.push({
          level: 'error',
          message: `${row.id}: chromeNav.registryArtifact "${row.chromeNav.registryArtifact}" not in inventory registry rows`,
        });
      }
    }

    if (row.aspect === 'taxonomy' && row.token === 'partner' && !row.taxonomy?.homonymDistinct) {
      issues.push({
        level: 'warn',
        message: `${row.id}: partner taxonomy row should set taxonomy.homonymDistinct`,
      });
    }

    if (row.aspect === 'portal-board' && row.href?.startsWith('/portal/')) {
      const index = resolvePath(ROOT, row.path, 'index.html');
      if (!(await Bun.file(index).exists())) {
        issues.push({
          level: 'error',
          message: `${row.id}: missing board index ${row.path}index.html`,
        });
      }
    }
  }

  return issues;
}

async function main(): Promise<number> {
  const inv = buildPartnerSurfaceInventory();
  if (inv.schemaVersion < 2) {
    console.error('expected schemaVersion >= 2 (structured bags)');
    return 1;
  }
  const issues = await validate(inv.rows);
  const errors = issues.filter(i => i.level === 'error');
  const warns = issues.filter(i => i.level === 'warn');
  for (const i of warns) console.warn(`⚠️  ${i.message}`);
  for (const i of errors) console.error(`❌ ${i.message}`);
  if (errors.length === 0) {
    console.info(
      `✅ partner-surface-inventory validate: ${inv.rows.length} rows · ${warns.length} warn · schema v${inv.schemaVersion}`
    );
  }
  return errors.length === 0 ? 0 : 1;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}

export { validate };
