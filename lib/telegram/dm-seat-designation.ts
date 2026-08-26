// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated bun:sqlite · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated bun:sqlite · fixed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated bun:sqlite · changed v0.6.8 · 2023-06-09 · https://bun.com/blog/bun-v0.6.8
// @updated bun:sqlite · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated bun:sqlite · changed v0.7.1 · 2023-07-29 · https://bun.com/blog/bun-v0.7.1
// @updated bun:sqlite · fixed v0.7.3 · 2023-08-06 · https://bun.com/blog/bun-v0.7.3
// @updated bun:sqlite · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated bun:sqlite · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated bun:sqlite · fixed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated bun:sqlite · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated bun:sqlite · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated bun:sqlite · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated bun:sqlite · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated bun:sqlite · changed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated bun:sqlite · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated bun:sqlite · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated bun:sqlite · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated bun:sqlite · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated bun:sqlite · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated bun:sqlite · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated bun:sqlite · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated bun:sqlite · changed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.16 · 2024-06-23 · https://bun.com/blog/bun-v1.1.16
// @updated bun:sqlite · fixed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @updated bun:sqlite · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated bun:sqlite · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated bun:sqlite · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated bun:sqlite · changed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated bun:sqlite · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated bun:sqlite · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated bun:sqlite · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated bun:sqlite · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated bun:sqlite · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated bun:sqlite · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/sqlite
/**
 * Package-group DM seat designation — acknowledge operator seat before Telegram id exists.
 *
 * SSOT: `package_group_registry.requested_by` = designated call-sign (e.g. NOV-001).
 */
import type { Database } from 'bun:sqlite';
import {
  getPackageGroupRegistry,
  upsertPackageGroupRegistry,
  type PackageGroupRegistryRow,
} from './package-group-registry.ts';
import { getChatChannelMeta } from './flows/channel-meta.ts';
import { resolveSeatTelegramId, telegramIdWireLinked } from './flows/seat-telegram-id.ts';
import { assertCallSignArg, partnerCodeFromCallSign } from './handshake-ref.ts';

export type DmSeatStatus = 'none' | 'designated' | 'linked' | 'shared';

export type DmSeatAssessment = {
  partnerCode: string;
  callSign: string | null;
  status: DmSeatStatus;
  telegramId: string | null; // brand-ok
  seatExists: boolean;
  seatName: string | null;
  welcomeDmReady: boolean;
  botCommandsReady: boolean;
  nextStep: string;
};

function seatRowForCallSign(
  db: Database,
  callSign: string
): { id: string; name: string; telegram_id: string | null } | null {
  // brand-ok — tree_nodes wire row
  try {
    return db
      .query(
        `SELECT id, name, telegram_id FROM tree_nodes
         WHERE active = 1 AND call_sign = $cs LIMIT 1`
      )
      .get({ $cs: callSign }) as {
      id: string; // brand-ok
      name: string;
      telegram_id: string | null; // brand-ok
    } | null;
  } catch {
    return null;
  }
}

/** Read designation + link state for a partner package group. */
export function assessPackageGroupDmSeat(db: Database, partnerCode: string): DmSeatAssessment {
  const reg = getPackageGroupRegistry(db, partnerCode);
  const code = reg?.partnerCode ?? partnerCode.toUpperCase().trim();
  const callSign = reg?.requestedBy?.trim() ?? null;

  if (!callSign) {
    return {
      partnerCode: code,
      callSign: null,
      status: 'none',
      telegramId: null,
      seatExists: false,
      seatName: null,
      welcomeDmReady: false,
      botCommandsReady: false,
      nextStep: `bun run telegram:ops -- designate-dm-seat ${code} ${code}-001`,
    };
  }

  const seat = seatRowForCallSign(db, callSign);
  let telegramId: string | null = null; // brand-ok — wire until linked
  try {
    telegramId = resolveSeatTelegramId(db, { callSign });
  } catch {
    telegramId = null;
  }
  const linked = telegramIdWireLinked(telegramId);

  if (!linked) {
    return {
      partnerCode: code,
      callSign,
      status: 'designated',
      telegramId: null,
      seatExists: seat != null,
      seatName: seat?.name ?? null,
      welcomeDmReady: false,
      botCommandsReady: false,
      nextStep: `bun tools/telegram-link-chat.ts ${callSign} <telegram_user_id>  # when operator ready`,
    };
  }

  const primaryOwner = (() => {
    try {
      return db
        .query(`SELECT call_sign FROM tree_nodes WHERE active = 1 AND telegram_id = $tg LIMIT 1`)
        .get({ $tg: telegramId }) as { call_sign: string | null } | null;
    } catch {
      return null;
    }
  })();

  const meta = getChatChannelMeta(db, telegramId!);
  const shared =
    primaryOwner?.call_sign != null &&
    primaryOwner.call_sign !== callSign &&
    (meta?.callSigns.includes(callSign) ?? false);

  return {
    partnerCode: code,
    callSign,
    status: shared ? 'shared' : 'linked',
    telegramId,
    seatExists: seat != null,
    seatName: seat?.name ?? null,
    welcomeDmReady: true,
    botCommandsReady: true,
    nextStep: shared
      ? `/seat ${callSign}  # switch bot context in shared DM`
      : 'operator linked — welcome DM + bot commands ready',
  };
}

export type DesignateDmSeatInput = {
  partnerCode: string;
  callSign: string;
  /** When false, refuse if requested_by already set (default true). */
  force?: boolean;
};

export type DesignateDmSeatResult = {
  registry: PackageGroupRegistryRow;
  assessment: DmSeatAssessment;
  changed: boolean;
};

export function designatePackageGroupDmSeat(
  db: Database,
  input: DesignateDmSeatInput
): DesignateDmSeatResult {
  const callSign = assertCallSignArg(input.callSign);
  const codeFromSeat = partnerCodeFromCallSign(callSign);
  if (!codeFromSeat) {
    throw new Error(`Invalid call-sign for designation: ${callSign}`);
  }

  const partnerCode = input.partnerCode.toUpperCase().trim();
  if (codeFromSeat !== partnerCode) {
    throw new Error(`Seat ${callSign} belongs to ${codeFromSeat}, not ${partnerCode}`);
  }

  const reg = getPackageGroupRegistry(db, partnerCode);
  if (!reg) {
    throw new Error(
      `No package_group_registry row for ${partnerCode} — run link-package-group first`
    );
  }

  const seat = seatRowForCallSign(db, callSign);
  if (!seat) {
    throw new Error(`No active tree_nodes seat for call-sign ${callSign}`);
  }

  if (reg.requestedBy && reg.requestedBy !== callSign && !input.force) {
    throw new Error(
      `DM seat already designated as ${reg.requestedBy} — pass force to replace with ${callSign}`
    );
  }

  const changed = reg.requestedBy !== callSign;
  const updated = upsertPackageGroupRegistry(db, {
    partnerCode: reg.partnerCode,
    chatId: reg.chatId,
    displayName: reg.title.replace(/^TOC Ops · [A-Z]+ · /, '') || reg.partnerCode,
    inviteLink: reg.inviteLink,
    requestedBy: callSign,
  });

  return {
    registry: updated,
    assessment: assessPackageGroupDmSeat(db, partnerCode),
    changed,
  };
}

export function formatDmSeatStatus(status: DmSeatStatus): string {
  switch (status) {
    case 'none':
      return 'undesignated';
    case 'designated':
      return 'designated (awaiting telegram)';
    case 'linked':
      return 'linked';
    case 'shared':
      return 'linked (shared DM)';
  }
}
