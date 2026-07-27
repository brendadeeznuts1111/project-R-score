// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Partner onboarding → regulatory compliance binding.
 *
 * After profile bind, optionally attach:
 *   - partner_state_licenses (MA/NJ)
 *   - partner_geo_profiles (state | age | location | zip — discrete columns)
 *   - identity_verified metadata (for NJ special_rules)
 *
 * Used by partner-onboard-package apply and portal/Telegram onboard paths.
 */
import type { Database } from 'bun:sqlite';
import {
  asStateCode,
  asTreeNodeId,
  tryStateCode,
  type StateCode,
  type TreeNodeId,
} from '../types/branded.ts';
import {
  ComplianceRepository,
  ensureStateRegulationSchema,
  setPartnerIdentityVerified,
  upsertPartnerGeoProfile,
  type PartnerGeoProfile,
} from './state-regulation.ts';

export type PartnerComplianceOnboardOpts = {
  /** US state for license + geo (e.g. MA, NJ). */
  stateCode?: string | StateCode;
  /** Discrete age years. */
  age?: number | null;
  /** Locality only — never include ZIP. */
  location?: string | null;
  /** Discrete ZIP / ZIP+4. */
  zipCode?: string | null;
  licenseNumber?: string | null;
  /** Stamp identity_verified (required for NJ soccer special_rules). */
  identityVerified?: boolean;
  /** License status (default active). */
  licenseStatus?: 'active' | 'suspended' | 'revoked';
};

export type PartnerComplianceOnboardResult = {
  applied: boolean;
  stateCode?: StateCode;
  license?: boolean;
  geo?: PartnerGeoProfile;
  identityVerified?: boolean;
  skippedReason?: string;
};

/**
 * Apply compliance surface for an onboarded tree node.
 * No-op when stateCode is absent (legacy onboard paths stay unchanged).
 */
export function applyPartnerComplianceOnboard(
  db: Database,
  treeNodeId: TreeNodeId | string,
  opts?: PartnerComplianceOnboardOpts
): PartnerComplianceOnboardResult {
  if (!opts?.stateCode) {
    return { applied: false, skippedReason: 'no stateCode' };
  }
  const state = tryStateCode(String(opts.stateCode));
  if (!state) {
    return { applied: false, skippedReason: `invalid stateCode ${opts.stateCode}` };
  }

  ensureStateRegulationSchema(db);
  const nid = asTreeNodeId(treeNodeId);
  const compliance = new ComplianceRepository(db);

  compliance.upsertLicense(nid, state, {
    licenseNumber: opts.licenseNumber?.trim() || `ONBOARD-${state}-${String(nid).slice(0, 8)}`,
    status: opts.licenseStatus ?? 'active',
  });

  const geo = upsertPartnerGeoProfile(db, nid, {
    stateCode: state,
    age: opts.age,
    location: opts.location,
    zipCode: opts.zipCode,
  });

  let identityVerified = opts.identityVerified;
  if (identityVerified === undefined) {
    // NJ sports often requires IDV — default true when age known and ≥ 21
    identityVerified = state === 'NJ' ? (geo.age ?? 0) >= 21 : false;
  }
  if (identityVerified) {
    setPartnerIdentityVerified(db, nid, true);
  }

  return {
    applied: true,
    stateCode: state,
    license: true,
    geo,
    identityVerified,
  };
}

/** Wire-friendly: parse onboard CLI / form fields into compliance opts. */
export function parseComplianceOnboardFields(input: {
  state?: string;
  stateCode?: string;
  age?: string | number;
  location?: string;
  zip?: string;
  zipCode?: string;
  licenseNumber?: string;
  identityVerified?: string | boolean;
}): PartnerComplianceOnboardOpts | undefined {
  const stateCode = input.stateCode ?? input.state;
  if (!stateCode?.trim()) return undefined;
  const ageRaw = input.age;
  const age =
    ageRaw === undefined || ageRaw === ''
      ? undefined
      : typeof ageRaw === 'number'
        ? ageRaw
        : Number(ageRaw);
  let identityVerified: boolean | undefined;
  if (typeof input.identityVerified === 'boolean') {
    identityVerified = input.identityVerified;
  } else if (typeof input.identityVerified === 'string') {
    identityVerified = /^(1|true|yes)$/i.test(input.identityVerified.trim());
  }
  return {
    stateCode: asStateCode(stateCode),
    age: age !== undefined && Number.isFinite(age) ? age : undefined,
    location: input.location,
    zipCode: input.zipCode ?? input.zip,
    licenseNumber: input.licenseNumber,
    identityVerified,
  };
}
