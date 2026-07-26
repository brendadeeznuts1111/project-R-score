// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * In-chat ACL for sensitive factory Telegram commands.
 *
 * Portal-linked `account.role === 'admin'` remains authoritative when present.
 * `OPS_ADMIN_USER_IDS` gates Telegram-native ops when the portal account is absent.
 */
import { isOpsAdminUserId, loadTelegramEnv } from './telegram-config.ts';

/** Commands that require ops admin (Telegram user id) or portal admin. */
export const OPS_ADMIN_COMMANDS = new Set(['/deploy']);

/** Commands that must run in a private chat (not groups/channels). */
export const PRIVATE_ONLY_COMMANDS = new Set(['/register']);

export type OpsAclDecision = { ok: true } | { ok: false; reason: string };

export function chatIsPrivate(chatType: string | undefined | null): boolean {
  return chatType === 'private';
}

export function requirePrivateChat(
  command: string,
  chatType: string | undefined | null
): OpsAclDecision {
  if (!PRIVATE_ONLY_COMMANDS.has(command)) return { ok: true };
  if (chatIsPrivate(chatType)) return { ok: true };
  return {
    ok: false,
    reason: `${command} is DM-only — open a private chat with the bot.`,
  };
}

/**
 * Allow if: portal admin, OR telegram user is in OPS_ADMIN_USER_IDS.
 * When the admin list is empty and there is no portal admin, deny deploy
 * (fail closed for sensitive actions).
 */
export function requireOpsAdmin(opts: {
  command: string;
  telegramUserId: number | string;
  portalRole?: string | null;
  adminUserIds?: number[];
}): OpsAclDecision {
  if (!OPS_ADMIN_COMMANDS.has(opts.command)) return { ok: true };

  if (opts.portalRole === 'admin') return { ok: true };

  const admins = opts.adminUserIds ?? loadTelegramEnv().opsAdminUserIds;
  const uid =
    typeof opts.telegramUserId === 'number' ? opts.telegramUserId : Number(opts.telegramUserId);
  if (Number.isFinite(uid) && isOpsAdminUserId(uid, admins)) return { ok: true };

  if (admins.length === 0) {
    return {
      ok: false,
      reason: 'Admin only — set OPS_ADMIN_USER_IDS or link a portal admin account.',
    };
  }
  return { ok: false, reason: 'Admin only.' };
}

/** Combined gate used by factory command handlers. */
export function gateFactoryCommand(opts: {
  command: string;
  chatType?: string | null;
  telegramUserId: number | string;
  portalRole?: string | null;
  adminUserIds?: number[];
}): OpsAclDecision {
  const priv = requirePrivateChat(opts.command, opts.chatType);
  if (!priv.ok) return priv;
  return requireOpsAdmin(opts);
}
