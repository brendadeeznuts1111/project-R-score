#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * validate-partner-surface-inventory.ts — Layer 2/3 checks on structured bags.
 *
 *   bun run partner-surface-inventory:validate
 *
 * Uses brand-manifest (not TypeScript AST) + Bun.file.exists for registry artifacts,
 * then Layer B: omit / schemaId / moneyPolicy / requiredTopKeys against baked JSON.
 * Does not replace lib:domains:check. Ast-grep wire traps are Layer C (separate).
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  checkBrandLinkingBag,
  checkDeprecatedBrandReferences,
  checkLiveCodesCoveredByInventory,
  checkLiveOutsCoveredByInventory,
  checkOutIdArtifactPresence,
  checkOutIdBag,
  checkPartnerCallSignPresence,
  checkPartnerCodeArtifactPresence,
  checkPartnerCodeBag,
  collectAllowedBrandLinkDomains,
  collectBrandBagsByToken,
  collectInventoryBrandTokens,
  type LiveOutMeta,
  type LivePartnerCodeMeta,
} from '../lib/docs/partner-surface-brand-check.ts';
import {
  liveOutIdsFromPartnersOps,
  livePartnerCodesFromPartnersOps,
} from '../lib/docs/partner-surface-docs.ts';
import {
  checkBrandMintModuleEvidence,
  checkBrandTestCoverageEvidence,
  loadBrandModuleTexts,
  loadTestCorpusText,
} from '../lib/docs/partner-surface-fitness-evidence.ts';
import {
  buildPartnerSurfaceInventory,
  type PartnerSurfaceLiveCode,
  type PartnerSurfaceLiveOut,
  type PartnerSurfaceRow,
} from '../lib/docs/partner-surface-inventory.ts';
import { checkRegistryArtifact } from '../lib/docs/partner-surface-registry-check.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const MANIFEST_PATH = resolvePath(ROOT, 'lib/types/brand-manifest.json');
const PARTNERS_OPS_PATH = resolvePath(ROOT, 'public/registry/partners-ops.json');

type BrandManifestEntry = {
  name: string;
  domain?: string;
  module?: string;
  validation?: { pattern?: string };
  constructors?: Record<string, string>;
};

type Issue = { level: 'error' | 'warn'; message: string };

async function loadBrandNames(): Promise<{
  names: Set<string>;
  byName: Map<string, BrandManifestEntry>;
  domains: Set<string>;
}> {
  const manifest = (await Bun.file(MANIFEST_PATH).json()) as {
    brands?: BrandManifestEntry[];
  };
  const byName = new Map<string, BrandManifestEntry>();
  const domains = new Set<string>();
  for (const b of manifest.brands ?? []) {
    byName.set(b.name, b);
    if (b.domain) domains.add(b.domain);
  }
  return { names: new Set(byName.keys()), byName, domains };
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
  if (row.partnerCode && row.aspect !== 'partner-code') {
    issues.push({
      level: 'error',
      message: `${row.id}: partnerCode bag only allowed on aspect=partner-code`,
    });
  }
  if (row.outId && row.aspect !== 'out-id') {
    issues.push({
      level: 'error',
      message: `${row.id}: outId bag only allowed on aspect=out-id`,
    });
  }
}

async function validate(rows: readonly PartnerSurfaceRow[]): Promise<Issue[]> {
  const issues: Issue[] = [];
  const { names: brandNames, byName, domains: manifestDomains } = await loadBrandNames();
  const registryTokens = new Set(rows.filter(r => r.aspect === 'registry').map(r => r.token));
  const allowedBrandDomains = collectAllowedBrandLinkDomains(rows, manifestDomains);
  const brandTokens = collectInventoryBrandTokens(rows);
  const brandByToken = collectBrandBagsByToken(rows);

  let liveCodes: Set<string> | undefined;
  let liveByCode: Map<string, LivePartnerCodeMeta> | undefined;
  let liveOutIdSet: Set<string> | undefined;
  let liveByOutId: Map<string, LiveOutMeta> | undefined;
  const partnersOpsFile = Bun.file(PARTNERS_OPS_PATH);
  if (await partnersOpsFile.exists()) {
    try {
      const artifact = await partnersOpsFile.json();
      const live = livePartnerCodesFromPartnersOps(artifact);
      liveCodes = new Set(live.map(c => c.code.trim().toUpperCase()));
      liveByCode = new Map(
        live.map(c => [
          c.code.trim().toUpperCase(),
          {
            ...(c.phase ? { phase: c.phase } : {}),
            ...(c.callSign ? { callSign: c.callSign } : {}),
          },
        ])
      );
      const outs = liveOutIdsFromPartnersOps(artifact);
      liveOutIdSet = new Set(outs.map(o => o.outId));
      liveByOutId = new Map(
        outs.map(o => [
          o.outId,
          {
            partnerCode: o.partnerCode,
            ...(o.status ? { status: o.status } : {}),
          },
        ])
      );
    } catch {
      issues.push({
        level: 'warn',
        message:
          'partners-ops.json present but failed to parse — skip partner-code/out-id live sync',
      });
    }
  }

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
        issues.push(
          ...checkBrandLinkingBag(row.id, row.brand, {
            allowedDomains: allowedBrandDomains,
            registryTokens,
            manifestDomain: entry?.domain,
            brandTokens,
          })
        );
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
        const file = Bun.file(abs);
        if (!(await file.exists())) {
          issues.push({
            level: 'error',
            message: `${row.id}: registry artifact missing ${row.registry.artifactPath}`,
          });
        } else {
          try {
            const artifact = await file.json();
            issues.push(...checkRegistryArtifact(row.id, row.registry, artifact));
          } catch (err) {
            issues.push({
              level: 'error',
              message: `${row.id}: failed to parse registry JSON (${String(err)})`,
            });
          }
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

    if (row.aspect === 'partner-code') {
      if (!row.partnerCode) {
        issues.push({
          level: 'error',
          message: `${row.id}: partner-code aspect missing partnerCode bag`,
        });
      } else {
        issues.push(
          ...checkPartnerCodeBag(row.id, row.token, row.partnerCode, {
            brandByToken,
            registryTokens,
            liveCodes,
          })
        );
      }
    }

    if (row.aspect === 'out-id') {
      if (!row.outId) {
        issues.push({
          level: 'error',
          message: `${row.id}: out-id aspect missing outId bag`,
        });
      } else {
        issues.push(
          ...checkOutIdBag(row.id, row.token, row.outId, {
            brandByToken,
            registryTokens,
            liveCodes,
          })
        );
      }
    }

    if (row.aspect === 'wire-field') {
      if (!row.wireField) {
        issues.push({
          level: 'error',
          message: `${row.id}: wire-field aspect missing wireField bag`,
        });
      } else {
        const bag = row.wireField;
        if (!bag.resolvesTo?.trim()) {
          issues.push({
            level: 'error',
            message: `${row.id}: wireField.resolvesTo is required`,
          });
        }
        if (bag.pattern !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(bag.pattern)) {
          issues.push({
            level: 'error',
            message: `${row.id}: wireField.pattern must be a simple identifier (got "${bag.pattern}")`,
          });
        }
        for (const p of bag.patterns ?? []) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p)) {
            issues.push({
              level: 'error',
              message: `${row.id}: wireField.patterns entry must be a simple identifier (got "${p}")`,
            });
          }
        }
        if (bag.nakedType && bag.nakedType !== 'string' && bag.nakedType !== 'number') {
          issues.push({
            level: 'error',
            message: `${row.id}: wireField.nakedType must be "string" or "number"`,
          });
        }
        const hasSimplePattern =
          (bag.pattern && /^[A-Za-z_][A-Za-z0-9_]*$/.test(bag.pattern)) ||
          (bag.patterns?.some(p => /^[A-Za-z_][A-Za-z0-9_]*$/.test(p)) ?? false) ||
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(bag.wireName) ||
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(row.token);
        const hasGlobs = (bag.boundaryPathGlobs?.length ?? 0) > 0;
        if (!hasSimplePattern && !hasGlobs) {
          issues.push({
            level: 'warn',
            message: `${row.id}: wire-field has no simple pattern and no boundaryPathGlobs — lint cannot use this row`,
          });
        }
        if (bag.resolvesTo === 'PartnerCode' && bag.sourceSystemId !== 'canonical') {
          issues.push({
            level: 'warn',
            message: `${row.id}: wire resolvesTo PartnerCode from ${bag.sourceSystemId} — prefer ExternalPartnerRef`,
          });
        }
      }
    }

    if (
      (row.aspect === 'portal-board' || row.aspect === 'chrome-nav') &&
      row.chromeNav?.registryArtifact &&
      !registryTokens.has(row.chromeNav.registryArtifact)
    ) {
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

  issues.push(...checkDeprecatedBrandReferences(rows));
  if (liveCodes) {
    issues.push(...checkLiveCodesCoveredByInventory(rows, liveCodes));
  }
  if (liveByCode) {
    issues.push(...checkPartnerCodeArtifactPresence(rows, liveByCode));
    issues.push(...checkPartnerCallSignPresence(rows, liveByCode));
  }
  if (liveOutIdSet) {
    issues.push(...checkLiveOutsCoveredByInventory(rows, liveOutIdSet));
  }
  if (liveByOutId) {
    issues.push(...checkOutIdArtifactPresence(rows, liveByOutId));
  }

  const corpus = await loadTestCorpusText(ROOT);
  issues.push(...checkBrandTestCoverageEvidence(rows, corpus));
  const moduleTexts = await loadBrandModuleTexts(ROOT, rows);
  issues.push(...checkBrandMintModuleEvidence(rows, moduleTexts));

  return issues;
}

async function loadLiveFromPartnersOps(): Promise<{
  livePartnerCodes: readonly PartnerSurfaceLiveCode[];
  liveOutIds: readonly PartnerSurfaceLiveOut[];
}> {
  const file = Bun.file(PARTNERS_OPS_PATH);
  if (!(await file.exists())) return { livePartnerCodes: [], liveOutIds: [] };
  try {
    const artifact = await file.json();
    return {
      livePartnerCodes: livePartnerCodesFromPartnersOps(artifact),
      liveOutIds: liveOutIdsFromPartnersOps(artifact),
    };
  } catch {
    return { livePartnerCodes: [], liveOutIds: [] };
  }
}

async function main(): Promise<number> {
  const { livePartnerCodes, liveOutIds } = await loadLiveFromPartnersOps();
  const inv = buildPartnerSurfaceInventory(new Date().toISOString(), {
    livePartnerCodes,
    liveOutIds,
  });
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
