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
import { getChatMember } from './telegram-api.ts';

const FORUM_MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

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
  /** Linked/shared DM seat but partner human not in forum yet (still at 2·house). */
  needsPartnerInForum: boolean;
};

export function interpretPackageGroupMemberCount(
  memberCount: number | null,
  opts?: { dmSeatStatus?: DmSeatStatus | null; linkedSeatInForum?: boolean }
): PackageGroupMembershipTell {
  const expectedTypical = PACKAGE_GROUP_MEMBERS_WITH_PARTNER;

  const finish = (
    partial: Omit<PackageGroupMembershipTell, 'needsPartnerInForum'>,
    dmSeatStatus?: DmSeatStatus | null
  ): PackageGroupMembershipTell => ({
    ...partial,
    needsPartnerInForum:
      partial.status === 'house_only' && (dmSeatStatus === 'linked' || dmSeatStatus === 'shared'),
  });

  if (memberCount == null) {
    return finish(
      {
        memberCount: null,
        status: 'unknown',
        label: '—',
        expectedTypical,
        detail: 'member count unknown — run handshake:desk --refresh or directory --refresh',
      },
      opts?.dmSeatStatus
    );
  }

  if (memberCount <= 1) {
    return finish(
      {
        memberCount,
        status: 'understaffed',
        label: '⚠ low',
        expectedTypical,
        detail: `${memberCount} member(s) — expected bot + house operator (≥2); re-check bot admin + invite`,
      },
      opts?.dmSeatStatus
    );
  }

  if (memberCount === PACKAGE_GROUP_MEMBERS_HOUSE_ONLY) {
    if (opts?.linkedSeatInForum) {
      return finish(
        {
          memberCount,
          status: 'partner_present',
          label: 'OK',
          expectedTypical,
          detail:
            'linked seat telegram id is a forum member (single-operator harness — bot + operator)',
        },
        opts?.dmSeatStatus
      );
    }
    const dm = opts?.dmSeatStatus;
    const partnerPending =
      dm === 'designated' || dm === 'none'
        ? ' (normal while partner not in forum / telegram not linked)'
        : dm === 'linked' || dm === 'shared'
          ? ' — send forum invite (expect 3·OK when partner joins)'
          : '';
    return finish(
      {
        memberCount,
        status: 'house_only',
        label: 'house',
        expectedTypical,
        detail: `bot + house operator only${partnerPending}`,
      },
      dm
    );
  }

  if (memberCount === PACKAGE_GROUP_MEMBERS_WITH_PARTNER) {
    return finish(
      {
        memberCount,
        status: 'partner_present',
        label: 'OK',
        expectedTypical,
        detail: 'bot + house operator + partner/agent (typical steady state)',
      },
      opts?.dmSeatStatus
    );
  }

  return finish(
    {
      memberCount,
      status: 'extended',
      label: 'ext',
      expectedTypical,
      detail: `${memberCount} members — core trio present; extras (experts/observers) likely`,
    },
    opts?.dmSeatStatus
  );
}

/** Desk/readiness cell: `2·house` or `2·house!` when invite still needed. */
export function formatMembershipDeskCell(
  tell: PackageGroupMembershipTell,
  dmSeatStatus?: DmSeatStatus | null
): string {
  if (tell.memberCount == null) return '—';
  const bang =
    tell.needsPartnerInForum ||
    (tell.status === 'house_only' && (dmSeatStatus === 'linked' || dmSeatStatus === 'shared'))
      ? '!'
      : '';
  return `${tell.memberCount}·${tell.label}${bang}`;
}

export function membershipForumLaneOk(
  tell: PackageGroupMembershipTell,
  _dmSeatStatus?: DmSeatStatus | null
): boolean {
  if (tell.status === 'understaffed' || tell.status === 'unknown') return false;
  if (tell.needsPartnerInForum) return false;
  return true;
}

export function formatPackageGroupMembershipForDesk(tell: PackageGroupMembershipTell): string {
  return formatMembershipDeskCell(tell);
}

/** True when linked seat user id is present in the forum (getChatMember). */
export async function probeLinkedSeatInForum(
  token: string,
  chatId: string, // brand-ok
  telegramUserId: string | null | undefined // brand-ok — linked seat wire id
): Promise<boolean> {
  const raw = telegramUserId?.trim();
  if (!raw) return false;
  const uid = Number(raw);
  if (!Number.isFinite(uid) || uid <= 0) return false;
  const res = await getChatMember(token, chatId, uid);
  if (!res.ok) return false;
  const status = res.member.status ?? '';
  return FORUM_MEMBER_STATUSES.has(status) && status !== 'left' && status !== 'kicked';
}
