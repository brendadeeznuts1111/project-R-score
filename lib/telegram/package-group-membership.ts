// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * Package-group forum membership — interpret `getChatMemberCount` as an ops tell.
 *
 * Every linked package forum is expected to contain at least:
 *   1. Factory bot (@TOC_Op_bot) — administrator
 *   2. House operator personal Telegram (you)
 *   3. Partner / agent seat human (third — may join later via invite)
 *
 * Additional humans (experts, observers) push the count higher. Member count is a
 * cheap sanity check after `--refresh` / `handshake:desk --live`.
 */
import type { DmSeatStatus } from './dm-seat-designation.ts';

/** Minimum humans + bot before partner joins (bot + house operator). */
export const PACKAGE_GROUP_MEMBERS_HOUSE_ONLY = 2;

/** Typical steady state once partner/agent accepted invite (bot + house + partner). */
export const PACKAGE_GROUP_MEMBERS_WITH_PARTNER = 3;

export type PackageGroupMembershipStatus =
  | 'unknown'
  | 'understaffed'
  | 'house_only'
  | 'partner_present'
  | 'extended';

export type PackageGroupMembershipTell = {
  memberCount: number | null;
  status: PackageGroupMembershipStatus;
  detail: string;
  /** Short label for desk tables. */
  label: string;
  expectedTypical: number;
};

export function interpretPackageGroupMemberCount(
  memberCount: number | null,
  opts?: { dmSeatStatus?: DmSeatStatus | null }
): PackageGroupMembershipTell {
  const expectedTypical = PACKAGE_GROUP_MEMBERS_WITH_PARTNER;

  if (memberCount == null) {
    return {
      memberCount: null,
      status: 'unknown',
      label: '—',
      expectedTypical,
      detail: 'member count unknown — run handshake:desk --refresh or directory --refresh',
    };
  }

  if (memberCount <= 1) {
    return {
      memberCount,
      status: 'understaffed',
      label: '⚠ low',
      expectedTypical,
      detail: `${memberCount} member(s) — expected bot + house operator (≥2); re-check bot admin + invite`,
    };
  }

  if (memberCount === PACKAGE_GROUP_MEMBERS_HOUSE_ONLY) {
    const dm = opts?.dmSeatStatus;
    const partnerPending =
      dm === 'designated' || dm === 'none'
        ? ' (normal while partner not in forum / telegram not linked)'
        : dm === 'linked' || dm === 'shared'
          ? ' — partner may not have accepted forum invite yet'
          : '';
    return {
      memberCount,
      status: 'house_only',
      label: 'house',
      expectedTypical,
      detail: `bot + house operator only${partnerPending}`,
    };
  }

  if (memberCount === PACKAGE_GROUP_MEMBERS_WITH_PARTNER) {
    return {
      memberCount,
      status: 'partner_present',
      label: 'OK',
      expectedTypical,
      detail: 'bot + house operator + partner/agent (typical steady state)',
    };
  }

  return {
    memberCount,
    status: 'extended',
    label: 'ext',
    expectedTypical,
    detail: `${memberCount} members — core trio present; extras (experts/observers) likely`,
  };
}

export function formatPackageGroupMembershipForDesk(tell: PackageGroupMembershipTell): string {
  if (tell.memberCount == null) return '—';
  return `${tell.memberCount} · ${tell.label}`;
}
