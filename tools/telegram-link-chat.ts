#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Explicit Telegram chat bind for a call-sign / tree node (ChatChannelMeta).
 *
 * Usage:
 *   bun tools/telegram-link-chat.ts ASH-001 tg:chat:-1001234567890
 *   bun tools/telegram-link-chat.ts <tree-node-id> -1001234567890 --locale=es
 *   bun tools/telegram-link-chat.ts ASH-001 tg:chat:… --no-welcome
 *
 * Never invents chat ids — the ref must be a real Telegram chat id.
 * When a partner profile binding exists, enqueues partner.welcome (idempotent).
 */
import { enqueuePartnerWelcomeEvent } from '../lib/channels/outbox.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { resolveOnboardTreeNodeId } from '../lib/operations/partner-onboard-package.ts';
import { materializePartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import {
  getChatChannelMeta,
  linkTelegramChat,
  normalizeTelegramChatRef,
} from '../lib/telegram/flows/channel-meta.ts';
import { resolveLocale } from '../lib/telegram/flows/i18n.ts';

const ref = process.argv[2];
const chatRaw = process.argv[3];
if (!ref || !chatRaw) {
  console.error(
    'Usage: bun tools/telegram-link-chat.ts <call-sign|tree-node-id> <tg:chat:ID|chatId> [--locale=en|es] [--no-welcome]'
  );
  process.exit(1);
}

const localeFlag = process.argv.find(a => a.startsWith('--locale='));
const locale = resolveLocale(localeFlag?.split('=')[1]);
const skipWelcome = process.argv.includes('--no-welcome');

const db = openOperationsDb();
try {
  const treeNodeId = resolveOnboardTreeNodeId(db, ref);
  const node = db
    .query('SELECT call_sign, name, telegram_id FROM tree_nodes WHERE id = $id')
    .get({ $id: treeNodeId as string }) as {
    call_sign: string | null;
    name: string;
    telegram_id: string | null; // brand-ok
  };

  const chatId = normalizeTelegramChatRef(chatRaw);
  const wasUnlinked = !node.telegram_id || node.telegram_id.startsWith('pending-');
  const meta = linkTelegramChat(db, {
    treeNodeId,
    callSign: node.call_sign,
    chatId,
    locale,
  });

  let welcomeEnqueued = false;
  if (!skipWelcome) {
    const profile = materializePartnerProfile(db, treeNodeId);
    if (profile) {
      const evt = enqueuePartnerWelcomeEvent(db, {
        treeNodeId: profile.binding.treeNodeId,
        profileKey: profile.binding.profileKey as string,
        partnerTemplate: profile.binding.templateId,
        lifecycleStatus: profile.binding.lifecycleStatus,
        telegramId: chatId,
        nodeName: profile.nodeName,
      });
      welcomeEnqueued = evt != null;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        treeNodeId: treeNodeId as string,
        callSign: node.call_sign,
        name: node.name,
        chatId: meta.chatId,
        callSigns: meta.callSigns,
        treeNodeIds: meta.treeNodeIds,
        locale: meta.locale,
        linkedAt: meta.linkedAt,
        previousTelegramId: node.telegram_id,
        newlyLinked: wasUnlinked,
        welcomeEnqueued,
        meta: getChatChannelMeta(db, meta.chatId),
      },
      null,
      2
    )
  );
} finally {
  db.close();
}
