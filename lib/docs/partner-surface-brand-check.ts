/**
 * partner-surface-brand-check.ts — Layer A brand-bag linking metadata.
 *
 * Cross-checks brand.domain / registryRef / isActive / category against
 * brand-manifest domains, inventory taxonomy machines, and registry rows.
 * Lifecycle fields (`deprecatedAt` · `deprecationReason` · `replacedBy`) and
 * inactive/deprecated consumer references warn by default.
 *
 * @see docs/design/partner-surface-inventory.md
 */
import {
  PARTNER_SURFACE_CALL_SIGN_PATTERN,
  PARTNER_SURFACE_OUT_ID_PATTERN,
  type PartnerSurfaceBrandBag,
  type PartnerSurfaceFitnessScore,
  type PartnerSurfaceOutIdBag,
  type PartnerSurfacePartnerCodeBag,
  type PartnerSurfaceRow,
} from './partner-surface-inventory.ts';

export const PARTNER_SURFACE_BRAND_CATEGORIES = [
  'identity',
  'profile',
  'template',
  'external',
  'node',
] as const;

export type PartnerSurfaceBrandCategory = (typeof PARTNER_SURFACE_BRAND_CATEGORIES)[number];

/** Sentinel for boundary brands that are not interior-managed (no registry SSOT). */
export const BRAND_LINK_CROSS_DOMAIN = 'cross-domain';

/** Accept `YYYY-MM-DD` or full ISO-8601 (with optional time / Z). */
const DEPRECATED_AT_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export type BrandLinkIssue = {
  readonly level: 'error' | 'warn';
  readonly message: string;
};

export function isPartnerSurfaceBrandCategory(value: string): value is PartnerSurfaceBrandCategory {
  return (PARTNER_SURFACE_BRAND_CATEGORIES as readonly string[]).includes(value);
}

export function isBrandLifecycleDate(value: string): boolean {
  if (!DEPRECATED_AT_RE.test(value.trim())) return false;
  const t = Date.parse(value.trim());
  return !Number.isNaN(t);
}

/** Brand is inactive or has an explicit deprecation timestamp. */
export function isBrandDeprecatedOrInactive(bag: PartnerSurfaceBrandBag): boolean {
  return bag.isActive === false || Boolean(bag.deprecatedAt?.trim());
}

/** Domains allowed on brand.domain: brand-catalog ∪ taxonomy machines ∪ cross-domain. */
export function collectAllowedBrandLinkDomains(
  rows: readonly PartnerSurfaceRow[],
  manifestDomains: ReadonlySet<string>
): Set<string> {
  const allowed = new Set<string>(manifestDomains);
  allowed.add(BRAND_LINK_CROSS_DOMAIN);
  for (const r of rows) {
    if (r.aspect !== 'taxonomy') continue;
    if (r.machine === 'conceptDomain' || r.machine === 'chromeDomain') {
      allowed.add(r.token);
    }
  }
  return allowed;
}

export function checkBrandLinkingBag(
  rowId: string, // brand-ok — inventory row key, not a domain entity id
  bag: PartnerSurfaceBrandBag,
  options: {
    readonly allowedDomains: ReadonlySet<string>;
    readonly registryTokens: ReadonlySet<string>;
    /** brand-manifest domain for typeOrExport when known */
    readonly manifestDomain?: string;
    /** Inventory brand tokens for replacedBy resolution */
    readonly brandTokens?: ReadonlySet<string>;
  }
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];

  if (typeof bag.isActive !== 'boolean') {
    issues.push({
      level: 'error',
      message: `${rowId}: brand.isActive must be a boolean`,
    });
  }

  if (!bag.domain?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: brand.domain is required (brand-catalog domain or "${BRAND_LINK_CROSS_DOMAIN}")`,
    });
  } else if (!options.allowedDomains.has(bag.domain)) {
    issues.push({
      level: 'error',
      message:
        `${rowId}: brand.domain "${bag.domain}" not in brand-manifest domains, ` +
        `taxonomy conceptDomain/chromeDomain tokens, or "${BRAND_LINK_CROSS_DOMAIN}"`,
    });
  } else if (
    bag.domain !== BRAND_LINK_CROSS_DOMAIN &&
    options.manifestDomain &&
    bag.domain !== options.manifestDomain
  ) {
    issues.push({
      level: 'warn',
      message: `${rowId}: brand.domain "${bag.domain}" drifts from manifest domain "${options.manifestDomain}"`,
    });
  }

  if (!bag.category?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: brand.category is required`,
    });
  } else if (!isPartnerSurfaceBrandCategory(bag.category)) {
    issues.push({
      level: 'error',
      message:
        `${rowId}: brand.category "${bag.category}" must be one of ` +
        PARTNER_SURFACE_BRAND_CATEGORIES.join('|'),
    });
  }

  if (bag.registryRef !== undefined) {
    if (!bag.registryRef.trim()) {
      issues.push({
        level: 'error',
        message: `${rowId}: brand.registryRef must be a non-empty registry token when set`,
      });
    } else if (!options.registryTokens.has(bag.registryRef)) {
      issues.push({
        level: 'error',
        message: `${rowId}: brand.registryRef "${bag.registryRef}" has no inventory registry row`,
      });
    }
  }

  if (bag.domain === BRAND_LINK_CROSS_DOMAIN && bag.registryRef) {
    issues.push({
      level: 'warn',
      message: `${rowId}: cross-domain brand usually omits registryRef (got "${bag.registryRef}")`,
    });
  }

  issues.push(...checkBrandLifecycleFields(rowId, bag, options.brandTokens));
  issues.push(...checkBrandFitnessFields(rowId, bag));

  return issues;
}

export function isPartnerSurfaceFitnessScore(value: number): value is PartnerSurfaceFitnessScore {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Fitness / test-coverage consistency on a brand bag. */
export function checkBrandFitnessFields(
  rowId: string, // brand-ok — inventory row key
  bag: PartnerSurfaceBrandBag
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];

  if (bag.fitnessScore !== undefined) {
    if (!isPartnerSurfaceFitnessScore(bag.fitnessScore)) {
      issues.push({
        level: 'error',
        message: `${rowId}: brand.fitnessScore must be an integer 1–5 (got ${String(bag.fitnessScore)})`,
      });
    } else if (bag.fitnessScore >= 4 && bag.hasTestCoverage === false) {
      issues.push({
        level: 'warn',
        message: `${rowId}: brand.fitnessScore=${bag.fitnessScore} but hasTestCoverage=false`,
      });
    }
  }

  if (bag.hasTestCoverage !== undefined && typeof bag.hasTestCoverage !== 'boolean') {
    issues.push({
      level: 'error',
      message: `${rowId}: brand.hasTestCoverage must be a boolean`,
    });
  }

  return issues;
}

/**
 * partner-code rows must link an active brand with registryRef and a registry
 * token; optional liveCodes (from partners-ops) warn on inventory drift.
 */
export type BrandBagByTokenEntry = {
  readonly rowId: string; // brand-ok — opaque inventory brand row key
  readonly bag: PartnerSurfaceBrandBag;
};

export function checkPartnerCodeBag(
  rowId: string, // brand-ok — inventory row key
  token: string,
  bag: PartnerSurfacePartnerCodeBag,
  options: {
    readonly brandByToken: ReadonlyMap<string, BrandBagByTokenEntry>;
    readonly registryTokens: ReadonlySet<string>;
    readonly liveCodes?: ReadonlySet<string>;
  }
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];

  if (!bag.brandRef?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: partnerCode.brandRef is required`,
    });
    return issues;
  }
  if (!bag.registryRef?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: partnerCode.registryRef is required`,
    });
    return issues;
  }

  const brand = options.brandByToken.get(bag.brandRef);
  if (!brand) {
    issues.push({
      level: 'error',
      message: `${rowId}: partnerCode.brandRef "${bag.brandRef}" is not an inventory brand token`,
    });
  } else {
    if (!brand.bag.isActive) {
      issues.push({
        level: 'error',
        message: `${rowId}: partnerCode.brandRef "${bag.brandRef}" is inactive (${brand.rowId})`,
      });
    }
    if (!brand.bag.registryRef?.trim()) {
      issues.push({
        level: 'error',
        message: `${rowId}: partnerCode.brandRef "${bag.brandRef}" has no brand.registryRef`,
      });
    } else if (brand.bag.registryRef !== bag.registryRef) {
      issues.push({
        level: 'warn',
        message:
          `${rowId}: partnerCode.registryRef "${bag.registryRef}" drifts from ` +
          `brand.registryRef "${brand.bag.registryRef}"`,
      });
    }
  }

  if (!options.registryTokens.has(bag.registryRef)) {
    issues.push({
      level: 'error',
      message: `${rowId}: partnerCode.registryRef "${bag.registryRef}" has no inventory registry row`,
    });
  }

  if (options.liveCodes && !options.liveCodes.has(token.trim().toUpperCase())) {
    issues.push({
      level: 'warn',
      message: `${rowId}: partner-code "${token}" not present in partners-ops live codes`,
    });
  }

  return issues;
}

export function collectBrandBagsByToken(
  rows: readonly PartnerSurfaceRow[]
): Map<string, BrandBagByTokenEntry> {
  const map = new Map<string, BrandBagByTokenEntry>();
  for (const r of rows) {
    if (r.aspect !== 'brand' || !r.brand) continue;
    map.set(r.token, { rowId: r.id, bag: r.brand });
    // Prefer the primary brand row when typeOrExport aliases collide
    // (e.g. parsers.partners-package also exports PartnerCode).
    if (r.typeOrExport && !map.has(r.typeOrExport)) {
      map.set(r.typeOrExport, { rowId: r.id, bag: r.brand });
    }
  }
  return map;
}

/** Warn when partners-ops has a code with no inventory partner-code row. */
export function checkLiveCodesCoveredByInventory(
  rows: readonly PartnerSurfaceRow[],
  liveCodes: ReadonlySet<string>
): readonly BrandLinkIssue[] {
  const inventoried = new Set(
    rows.filter(r => r.aspect === 'partner-code').map(r => r.token.trim().toUpperCase())
  );
  const issues: BrandLinkIssue[] = [];
  for (const code of liveCodes) {
    if (!inventoried.has(code)) {
      issues.push({
        level: 'warn',
        message: `partners-ops live code "${code}" has no inventory partner-code row`,
      });
    }
  }
  return issues;
}

export type LivePartnerCodeMeta = {
  readonly phase?: string;
  readonly callSign?: string;
};

/**
 * Prove each partner-code token exists in the partners-ops artifact and that
 * phase matches when both sides declare it.
 */
export function checkPartnerCodeArtifactPresence(
  rows: readonly PartnerSurfaceRow[],
  liveByCode: ReadonlyMap<string, LivePartnerCodeMeta | string | undefined>
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];
  for (const r of rows) {
    if (r.aspect !== 'partner-code' || !r.partnerCode) continue;
    const code = r.token.trim().toUpperCase();
    if (!liveByCode.has(code)) {
      issues.push({
        level: 'error',
        message:
          `${r.id}: partner-code "${code}" not found in partners-ops.json ` +
          `partners[].code (registry presence failed)`,
      });
      continue;
    }
    const meta = liveByCode.get(code);
    const livePhase = typeof meta === 'string' ? meta : meta?.phase;
    const bagPhase = r.partnerCode.phase?.trim();
    if (bagPhase && livePhase && bagPhase !== livePhase) {
      issues.push({
        level: 'warn',
        message: `${r.id}: partnerCode.phase "${bagPhase}" drifts from partners-ops phase "${livePhase}"`,
      });
    }
  }
  return issues;
}

/**
 * Warn when a live partner-code is missing callSign or the callSign fails
 * PartnerCallSignCode shape (`CODE-NNN`).
 */
export function checkPartnerCallSignPresence(
  rows: readonly PartnerSurfaceRow[],
  liveByCode: ReadonlyMap<string, LivePartnerCodeMeta>
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];
  for (const r of rows) {
    if (r.aspect !== 'partner-code' || !r.partnerCode) continue;
    const code = r.token.trim().toUpperCase();
    const live = liveByCode.get(code);
    const callSign = (r.partnerCode.callSign ?? live?.callSign)?.trim().toUpperCase();
    if (!callSign) {
      issues.push({
        level: 'warn',
        message: `${r.id}: partners-ops callSign missing for "${code}"`,
      });
      continue;
    }
    if (!PARTNER_SURFACE_CALL_SIGN_PATTERN.test(callSign)) {
      issues.push({
        level: 'warn',
        message:
          `${r.id}: callSign "${callSign}" does not match PartnerCallSignCode ` +
          `(expected ^[A-Z]{3,6}-[0-9]{3}$)`,
      });
    }
  }
  return issues;
}

/**
 * out-id rows must link an active OutId brand with registryRef and an owning
 * PartnerCode present in the live code set when provided.
 */
export function checkOutIdBag(
  rowId: string, // brand-ok — inventory row key
  token: string,
  bag: PartnerSurfaceOutIdBag,
  options: {
    readonly brandByToken: ReadonlyMap<string, BrandBagByTokenEntry>;
    readonly registryTokens: ReadonlySet<string>;
    readonly liveCodes?: ReadonlySet<string>;
  }
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];

  if (!bag.brandRef?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: outId.brandRef is required`,
    });
    return issues;
  }
  if (!bag.registryRef?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: outId.registryRef is required`,
    });
    return issues;
  }
  if (!bag.partnerCode?.trim()) {
    issues.push({
      level: 'error',
      message: `${rowId}: outId.partnerCode is required`,
    });
    return issues;
  }

  const brand = options.brandByToken.get(bag.brandRef);
  if (!brand) {
    issues.push({
      level: 'error',
      message: `${rowId}: outId.brandRef "${bag.brandRef}" is not an inventory brand token`,
    });
  } else {
    if (!brand.bag.isActive) {
      issues.push({
        level: 'error',
        message: `${rowId}: outId.brandRef "${bag.brandRef}" is inactive (${brand.rowId})`,
      });
    }
    if (!brand.bag.registryRef?.trim()) {
      issues.push({
        level: 'error',
        message: `${rowId}: outId.brandRef "${bag.brandRef}" has no brand.registryRef`,
      });
    } else if (brand.bag.registryRef !== bag.registryRef) {
      issues.push({
        level: 'warn',
        message:
          `${rowId}: outId.registryRef "${bag.registryRef}" drifts from ` +
          `brand.registryRef "${brand.bag.registryRef}"`,
      });
    }
  }

  if (!options.registryTokens.has(bag.registryRef)) {
    issues.push({
      level: 'error',
      message: `${rowId}: outId.registryRef "${bag.registryRef}" has no inventory registry row`,
    });
  }

  if (!PARTNER_SURFACE_OUT_ID_PATTERN.test(token.trim())) {
    issues.push({
      level: 'error',
      message: `${rowId}: out-id token "${token}" does not match OutId pattern`,
    });
  }

  const owning = bag.partnerCode.trim().toUpperCase();
  if (options.liveCodes && !options.liveCodes.has(owning)) {
    issues.push({
      level: 'warn',
      message: `${rowId}: outId.partnerCode "${owning}" not present in partners-ops live codes`,
    });
  }

  return issues;
}

export type LiveOutMeta = {
  readonly partnerCode: string;
  readonly status?: string;
};

/** Warn when partners-ops has an out with no inventory out-id row. */
export function checkLiveOutsCoveredByInventory(
  rows: readonly PartnerSurfaceRow[],
  liveOutIds: ReadonlySet<string>
): readonly BrandLinkIssue[] {
  const inventoried = new Set(rows.filter(r => r.aspect === 'out-id').map(r => r.token.trim()));
  const issues: BrandLinkIssue[] = [];
  for (const outId of liveOutIds) {
    if (!inventoried.has(outId)) {
      issues.push({
        level: 'warn',
        message: `partners-ops live out "${outId}" has no inventory out-id row`,
      });
    }
  }
  return issues;
}

/**
 * Prove each out-id token exists in partners-ops outs[] and warn on status drift.
 */
export function checkOutIdArtifactPresence(
  rows: readonly PartnerSurfaceRow[],
  liveByOutId: ReadonlyMap<string, LiveOutMeta>
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];
  for (const r of rows) {
    if (r.aspect !== 'out-id' || !r.outId) continue;
    const outId = r.token.trim();
    const live = liveByOutId.get(outId);
    if (!live) {
      issues.push({
        level: 'error',
        message:
          `${r.id}: out-id "${outId}" not found in partners-ops.json ` +
          `partners[].outs[].id (registry presence failed)`,
      });
      continue;
    }
    const bagCode = r.outId.partnerCode.trim().toUpperCase();
    if (live.partnerCode !== bagCode) {
      issues.push({
        level: 'warn',
        message: `${r.id}: outId.partnerCode "${bagCode}" drifts from partners-ops owner "${live.partnerCode}"`,
      });
    }
    const bagStatus = r.outId.status?.trim();
    if (bagStatus && live.status && bagStatus !== live.status) {
      issues.push({
        level: 'warn',
        message: `${r.id}: outId.status "${bagStatus}" drifts from partners-ops status "${live.status}"`,
      });
    }
  }
  return issues;
}

/**
 * Lifecycle field consistency on a single brand bag.
 * `brandTokens` = inventory brand tokens ∪ typeOrExport names (for replacedBy).
 */
export function checkBrandLifecycleFields(
  rowId: string, // brand-ok — inventory row key
  bag: PartnerSurfaceBrandBag,
  brandTokens?: ReadonlySet<string>
): readonly BrandLinkIssue[] {
  const issues: BrandLinkIssue[] = [];
  const hasDeprecatedAt = Boolean(bag.deprecatedAt?.trim());
  const hasReason = Boolean(bag.deprecationReason?.trim());
  const hasReplacedBy = Boolean(bag.replacedBy?.trim());

  if (hasDeprecatedAt) {
    const at = bag.deprecatedAt!.trim();
    if (!isBrandLifecycleDate(at)) {
      issues.push({
        level: 'error',
        message: `${rowId}: brand.deprecatedAt must be YYYY-MM-DD or ISO-8601 (got "${at}")`,
      });
    }
    if (bag.isActive) {
      issues.push({
        level: 'warn',
        message: `${rowId}: brand.deprecatedAt set but isActive=true — set isActive=false when sunsetting`,
      });
    }
    if (!hasReason) {
      issues.push({
        level: 'warn',
        message: `${rowId}: brand.deprecatedAt set without deprecationReason`,
      });
    }
  }

  if (bag.isActive === false && !hasReason && !hasDeprecatedAt) {
    issues.push({
      level: 'warn',
      message: `${rowId}: brand.isActive=false without deprecationReason or deprecatedAt`,
    });
  }

  if (hasReason && bag.isActive && !hasDeprecatedAt) {
    issues.push({
      level: 'warn',
      message: `${rowId}: brand.deprecationReason set but brand still active (no deprecatedAt)`,
    });
  }

  if (hasReplacedBy) {
    const successor = bag.replacedBy!.trim();
    if (brandTokens && !brandTokens.has(successor)) {
      issues.push({
        level: 'error',
        message: `${rowId}: brand.replacedBy "${successor}" is not an inventory brand token`,
      });
    }
  }

  return issues;
}

export type DeprecatedBrandRef = {
  readonly rowId: string; // brand-ok — inventory brand row key
  readonly token: string;
  readonly typeOrExport?: string;
  readonly bag: PartnerSurfaceBrandBag;
};

export function collectDeprecatedOrInactiveBrands(
  rows: readonly PartnerSurfaceRow[]
): readonly DeprecatedBrandRef[] {
  const out: DeprecatedBrandRef[] = [];
  for (const r of rows) {
    if (r.aspect !== 'brand' || !r.brand) continue;
    if (!isBrandDeprecatedOrInactive(r.brand)) continue;
    out.push({
      rowId: r.id,
      token: r.token,
      typeOrExport: r.typeOrExport,
      bag: r.brand,
    });
  }
  return out;
}

function brandNameKeys(ref: DeprecatedBrandRef): Set<string> {
  const keys = new Set<string>([ref.token]);
  if (ref.typeOrExport) keys.add(ref.typeOrExport);
  return keys;
}

/**
 * Warn when wire-field / portal-board / registry consumers still reference
 * inactive or deprecated brands.
 */
export function checkDeprecatedBrandReferences(
  rows: readonly PartnerSurfaceRow[]
): readonly BrandLinkIssue[] {
  const deprecated = collectDeprecatedOrInactiveBrands(rows);
  if (deprecated.length === 0) return [];

  const issues: BrandLinkIssue[] = [];
  const byName = new Map<string, DeprecatedBrandRef>();
  for (const ref of deprecated) {
    for (const key of brandNameKeys(ref)) {
      byName.set(key, ref);
    }
  }

  for (const row of rows) {
    if (row.aspect === 'wire-field' && row.wireField) {
      const names = [row.wireField.resolvesTo, row.wireField.brandedType, row.typeOrExport].filter(
        (n): n is string => Boolean(n?.trim())
      );
      for (const name of names) {
        const hit = byName.get(name);
        if (!hit) continue;
        issues.push({
          level: 'warn',
          message:
            `${row.id}: references deprecated/inactive brand "${name}" ` +
            `(${hit.rowId}${hit.bag.deprecationReason ? `: ${hit.bag.deprecationReason}` : ''}` +
            `${hit.bag.replacedBy ? `; use ${hit.bag.replacedBy}` : ''})`,
        });
      }
    }

    if ((row.aspect === 'portal-board' || row.aspect === 'chrome-nav') && row.typeOrExport) {
      const hit = byName.get(row.typeOrExport);
      if (hit) {
        issues.push({
          level: 'warn',
          message:
            `${row.id}: portal/chrome typeOrExport "${row.typeOrExport}" is deprecated/inactive ` +
            `(${hit.rowId}${hit.bag.replacedBy ? `; use ${hit.bag.replacedBy}` : ''})`,
        });
      }
    }

    if (row.aspect === 'registry') {
      for (const ref of deprecated) {
        if (ref.bag.registryRef === row.token) {
          issues.push({
            level: 'warn',
            message:
              `${row.id}: registry still linked from deprecated/inactive brand ${ref.rowId} ` +
              `via registryRef${ref.bag.replacedBy ? ` (successor ${ref.bag.replacedBy})` : ''}`,
          });
        }
        if (row.typeOrExport && brandNameKeys(ref).has(row.typeOrExport)) {
          issues.push({
            level: 'warn',
            message:
              `${row.id}: registry typeOrExport "${row.typeOrExport}" is deprecated/inactive ` +
              `(${ref.rowId})`,
          });
        }
      }
    }
  }

  return issues;
}

/** Brand tokens + typeOrExport names for replacedBy resolution. */
export function collectInventoryBrandTokens(rows: readonly PartnerSurfaceRow[]): Set<string> {
  const tokens = new Set<string>();
  for (const r of rows) {
    if (r.aspect !== 'brand') continue;
    tokens.add(r.token);
    if (r.typeOrExport) tokens.add(r.typeOrExport);
  }
  return tokens;
}
