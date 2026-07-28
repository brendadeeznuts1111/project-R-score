// @see https://bun.com/docs/runtime/sqlite
/**
 * Package-group DM seat designation — acknowledge operator seat before Telegram id exists.
 *
 * SSOT: `package_group_registry.requested_by` = designated call-sign (e.g. NOV-001).
 * Real link: `bun tools/telegram-link-chat.ts NOV-001 <telegram_user_id>`.
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

/** Acknowledge which seat receives package-room DMs (no Telegram id required yet). */
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
