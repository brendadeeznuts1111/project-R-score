#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * House forum surface — brand + topics + optional welcome prompt.
 *
 *   bun tools/house-forum-channel.ts hq --chat -100… --brand
 *   bun tools/house-forum-channel.ts all-accounting --chat -100… --brand --post-prompt
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  ALL_ACCOUNTING_SURFACE_SLUG,
  brandGroup,
  chatIdForSurface,
  descriptionForSurface,
  forumTopicNamesForSurface,
  getSurface,
  titleForSurface,
} from '../lib/telegram/branding.ts';
import {
  loadHouseForumMetadata,
  saveHouseForumMetadata,
  HOUSE_FORUMS_META_DIR,
  type HouseForumMetadata,
} from '../lib/telegram/house-forum-metadata.ts';
import { upsertKnownChat } from '../lib/telegram/known-chats.ts';
import { buildHouseForumWelcomePrompt } from '../lib/telegram/seat-desk-partner-message.ts';
import { getChat, sendTelegramBotMessage } from '../lib/telegram/telegram-api.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

export const HOUSE_FORUM_SURFACES = ['hq', ALL_ACCOUNTING_SURFACE_SLUG, 'sandbox'] as const;
export type HouseForumSurfaceSlug = (typeof HOUSE_FORUM_SURFACES)[number];

export function isHouseForumSurface(slug: string): slug is HouseForumSurfaceSlug {
  return (HOUSE_FORUM_SURFACES as readonly string[]).includes(slug);
}

export function resolveHouseChatId(surfaceSlug: string): string {
  const tg = loadTelegramEnv();
  const explicit = chatIdForSurface(surfaceSlug) ?? '';
  if (surfaceSlug === ALL_ACCOUNTING_SURFACE_SLUG) {
    return tg.accountingChatId?.trim() ?? explicit;
  }
  if (surfaceSlug === 'hq') {
    const ops = tg.opsChatId?.trim();
    if (ops) return ops;
    const ash = chatIdForSurface('ash-staging') ?? '';
    if (explicit && explicit !== ash) return explicit;
    return '';
  }
  return explicit;
}

/** Async resolver — falls back to persisted house metadata when env map is unset. */
export async function resolveHouseChatIdAsync(surfaceSlug: string): Promise<string> {
  const sync = resolveHouseChatId(surfaceSlug);
  if (sync) return sync;
  if (surfaceSlug === 'sandbox') {
    const meta = await loadHouseForumMetadata('sandbox');
    return meta?.chatId?.trim() ?? '';
  }
  return '';
}

export async function brandHouseForumSurface(opts: {
  surfaceSlug: HouseForumSurfaceSlug;
  chatId: string; // brand-ok — Telegram chat_id wire
  brand?: boolean;
  postPrompt?: boolean;
  noTopics?: boolean;
  noPhoto?: boolean;
}): Promise<void> {
  const { surfaceSlug, chatId } = opts;
  const brand = opts.brand ?? false;
  const postPrompt = opts.postPrompt ?? false;
  if (!brand && !postPrompt) {
    throw new Error('Specify --brand and/or --post-prompt');
  }

  const tg = loadTelegramEnv();
  if (!tg.effectiveToken) throw new Error('TELEGRAM_BOT_FACTORY required');
  const token = tg.effectiveToken;
  const db = openOperationsDb({ path: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH });

  try {
    const topicPlan = forumTopicNamesForSurface(surfaceSlug);
    const title = titleForSurface(surfaceSlug);
    let meta = await loadHouseForumMetadata(surfaceSlug);

    if (brand) {
      console.log(`→ ${surfaceSlug} ${chatId} · ${title}`);
      console.log(`   topics: ${topicPlan.join(' · ')}`);
      const result = await brandGroup({
        token,
        chatId,
        title,
        description: descriptionForSurface(surfaceSlug),
        setPhoto: !opts.noPhoto,
        ensureTopics: opts.noTopics ? undefined : topicPlan,
        surfaceSlug,
        db,
      });
      console.log(`   title: ${result.title.ok ? 'ok' : result.title.description}`);
      console.log(`   can_manage_topics=${result.canManageTopics}`);
      for (const t of result.topics) {
        console.log(
          t.ok ? `   topic ✓ ${t.name} #${t.messageThreadId}` : `   topic ✗ ${t.name}: ${t.error}`
        );
      }

      const topics = [
        { title: 'General', messageThreadId: 1 },
        ...result.topics.map(t => ({
          title: t.name,
          messageThreadId: t.ok ? t.messageThreadId : null,
        })),
      ];
      const topicsComplete = topics.every(t => t.messageThreadId != null && t.messageThreadId > 0);
      const surfaceTopics = getSurface(surfaceSlug)?.topics ?? [];
      const slugByTitle = Object.fromEntries(
        topicPlan.map((name, i) => [name.toLowerCase(), surfaceTopics[i] ?? name.toLowerCase()])
      );
      const normalizedTopicMap: Record<string, number> = { general: 1 };
      for (const t of result.topics) {
        if (!t.ok || t.messageThreadId <= 0) continue;
        const slug = slugByTitle[t.name.toLowerCase()] ?? t.name.toLowerCase().replace(/\s+/g, '-');
        normalizedTopicMap[slug] = t.messageThreadId;
      }
      meta = {
        surfaceSlug,
        title,
        chatId,
        chatRef: `tg:chat:${chatId}`,
        topics,
        topicsThreadMap: normalizedTopicMap,
        welcomePromptMessageId: meta?.welcomePromptMessageId,
        welcomePromptPostedAt: meta?.welcomePromptPostedAt,
        topicsComplete,
        createdAt: meta?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const metadataPath = await saveHouseForumMetadata(meta);
      console.log('');
      console.log(`metadata: ${metadataPath}`);
      console.log(`TELEGRAM_TOPICS=${JSON.stringify(meta.topicsThreadMap)}`);
    }

    if (postPrompt) {
      const probe = await getChat(token, chatId);
      if (probe.ok) {
        upsertKnownChat(db, {
          chat: {
            id: probe.chat.id,
            type: probe.chat.type,
            title: probe.chat.title,
            is_forum: probe.chat.is_forum,
          },
          source: 'manual',
          surfaceSlug,
        });
      }
      const existing = meta ?? (await loadHouseForumMetadata(surfaceSlug));
      if (existing?.welcomePromptMessageId) {
        console.log(`welcome prompt skip #${existing.welcomePromptMessageId} (already posted)`);
        return;
      }
      const text = buildHouseForumWelcomePrompt(surfaceSlug);
      if (!text) {
        console.log(`welcome prompt: n/a for ${surfaceSlug}`);
        return;
      }
      console.log(text);
      console.log('');
      let sent = await sendTelegramBotMessage(token, { chatId, text, messageThreadId: 1 });
      if (!sent.ok) sent = await sendTelegramBotMessage(token, { chatId, text });
      if (!sent.ok || sent.messageId == null) {
        throw new Error(`post failed: ${sent.description ?? 'unknown'}`);
      }
      console.log(`posted ${surfaceSlug} welcome prompt #${sent.messageId} · chat ${chatId}`);
      if (existing) {
        await saveHouseForumMetadata({
          ...existing,
          welcomePromptMessageId: sent.messageId,
          welcomePromptPostedAt: new Date().toISOString(),
        });
      }
    }
  } finally {
    db.close();
  }
}

const argv = Bun.argv.slice(2);
let surfaceSlug = '';
let chatId = '';
let brand = false;
let postPrompt = false;
let noTopics = false;
let noPhoto = false;

async function main(): Promise<void> {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--chat') chatId = argv[++i]?.trim() ?? '';
    else if (a.startsWith('--chat=')) chatId = a.slice('--chat='.length).trim();
    else if (a === '--brand') brand = true;
    else if (a === '--post-prompt') postPrompt = true;
    else if (a === '--no-topics') noTopics = true;
    else if (a === '--no-photo') noPhoto = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: bun tools/house-forum-channel.ts <surface> [--chat id] [--brand] [--post-prompt]

Surfaces: ${HOUSE_FORUM_SURFACES.join(' · ')}
`);
      process.exit(0);
    } else if (!a.startsWith('-') && !surfaceSlug) {
      surfaceSlug = a.trim();
    }
  }

  if (!isHouseForumSurface(surfaceSlug)) {
    console.error(`Unsupported surface: ${surfaceSlug || '(missing)'}`);
    process.exit(1);
  }

  if (!chatId) chatId = await resolveHouseChatIdAsync(surfaceSlug);
  if (!chatId) {
    console.error(`Pass --chat or bind ${surfaceSlug} in TELEGRAM_SURFACES`);
    process.exit(1);
  }

  await brandHouseForumSurface({
    surfaceSlug,
    chatId,
    brand,
    postPrompt,
    noTopics,
    noPhoto,
  });
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
