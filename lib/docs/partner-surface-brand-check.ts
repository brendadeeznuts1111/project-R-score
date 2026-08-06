/**
 * partner-surface-brand-check.ts — Layer A brand-bag linking metadata.
 *
 * Cross-checks brand.domain / registryRef / isActive / category against
 * brand-manifest domains, inventory taxonomy machines, and registry rows.
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

export type BrandLinkIssue = {
  readonly level: 'error' | 'warn';
  readonly message: string;
};

export function isPartnerSurfaceBrandCategory(value: string): value is PartnerSurfaceBrandCategory {
  return (PARTNER_SURFACE_BRAND_CATEGORIES as readonly string[]).includes(value);
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

  return issues;
}
