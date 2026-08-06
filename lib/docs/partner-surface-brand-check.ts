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
import type { PartnerSurfaceBrandBag, PartnerSurfaceRow } from './partner-surface-inventory.ts';

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
