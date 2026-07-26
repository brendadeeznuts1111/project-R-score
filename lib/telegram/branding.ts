// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/sqlite
/**
 * TOC Ops Telegram branding — bot profile, group titles/photos, forum topics.
 *
 * Naming / concern SSOT: [`surfaces.ts`](./surfaces.ts)
 * - Bot display name: "TOC Ops" (username @TOC_Op_bot is BotFather-owned)
 * - Groups: `TOC Ops · {CONCERN}[ · {ENV}]` — one group per concern
 * - Topics: per-surface plan (HQ ≠ partner ≠ sandbox)
 */
import { Database } from 'bun:sqlite';
import { letterMarkPng } from '../../tools/generate-portal-icons.ts';
import { upsertKnownChat } from './known-chats.ts';
import {
  allSurfaceTitles,
  formatTocOpsGroupTitle,
  getSurface,
  type TocOpsSurfaceSlug,
  type TocOpsTopicSlug,
} from './surfaces.ts';
import {
  telegramApiCall,
  type TelegramApiResult,
  getChat,
  getChatMember,
  getBotMe,
} from './telegram-api.ts';

export {
  TOC_OPS_SURFACES,
  TOC_OPS_TITLE_PREFIX,
  TOC_OPS_TITLE_SEP,
  allSurfaceTitles,
  formatTocOpsGroupTitle,
  formatPackageGroupTitle,
  formatSurfaceMatrix,
  getSurface,
  listSurfaceSlugs,
  parseTocOpsGroupTitle,
  assertTocOpsGroupTitle,
  loadTelegramSurfacesMap,
  chatIdForSurface,
  resolvePrimaryOpsChatId,
} from './surfaces.ts';
export {
  buildSurfaceGraph,
  formatSurfaceGraphAscii,
  formatSurfaceGraphMermaid,
  formatSurfaceGraphEnvBlock,
  suggestTelegramSurfacesMap,
} from './surface-graph.ts';
export type { TocOpsConcern, TocOpsEnv, TocOpsSurfaceDef, TocOpsTopicSlug } from './surfaces.ts';

export const TOC_OPS_BOT_DISPLAY_NAME = 'TOC Ops';
export const TOC_OPS_BOT_DESCRIPTION =
  'FactoryWager TOC Ops desk — Soft balances, plays, accounts, and partner onboarding.';
export const TOC_OPS_BOT_SHORT_DESCRIPTION = 'TOC Ops · Soft · plays · partners';

/** @deprecated Prefer per-surface `getSurface(slug).topics` — HQ ≠ partner ≠ sandbox. */
export const TOC_OPS_TOPIC_PLAN = ['alerts', 'day-ops', 'aar', 'sandbox'] as const;

/** Surface slug alias (kept for CLI callers). */
export type TocOpsSurface = TocOpsSurfaceSlug;

/** Canonical titles derived from surfaces SSOT. */
export const TOC_OPS_GROUP_TITLES: Record<string, string> = allSurfaceTitles();

export function titleForSurface(slug: string): string {
  const s = getSurface(slug);
  return s ? formatTocOpsGroupTitle(s) : (TOC_OPS_GROUP_TITLES[slug] ?? `TOC Ops · ${slug}`);
}

export function topicsForSurface(slug: string): readonly TocOpsTopicSlug[] {
  return getSurface(slug)?.topics ?? TOC_OPS_TOPIC_PLAN;
}

export function descriptionForSurface(slug: string): string {
  const s = getSurface(slug);
  const title = titleForSurface(slug);
  if (!s) return `${title} — FactoryWager TOC Ops`;
  return `${title} — ${s.purpose}`;
}

/** Brand mark color — deep teal (not default purple/cream AI palette). */
export const TOC_OPS_BRAND_RGB = { r: 15, g: 118, b: 110 } as const; // #0f766e

export async function renderTocOpsProfileJpeg(size = 640): Promise<Uint8Array> {
  const png = letterMarkPng(
    TOC_OPS_BRAND_RGB.r,
    TOC_OPS_BRAND_RGB.g,
    TOC_OPS_BRAND_RGB.b,
    'T',
    size
  );
  return new Bun.Image(png).jpeg({ quality: 90 }).bytes();
}

async function telegramMultipart(
  token: string,
  method: string,
  fields: Record<string, string>,
  files: Array<{ name: string; filename: string; bytes: Uint8Array; type: string }>
): Promise<TelegramApiResult> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  for (const f of files) {
    form.append(f.name, new Blob([Buffer.from(f.bytes)], { type: f.type }), f.filename);
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/` + method, {
    method: 'POST',
    body: form,
  });
  return (await res.json()) as TelegramApiResult;
}

export async function setMyName(token: string, name: string): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'setMyName', { name });
}

export async function setMyDescription(
  token: string,
  description: string
): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'setMyDescription', { description });
}

export async function setMyShortDescription(
  token: string,
  shortDescription: string
): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'setMyShortDescription', { short_description: shortDescription });
}

export async function setMyProfilePhotoJpeg(
  token: string,
  jpeg: Uint8Array
): Promise<TelegramApiResult> {
  return telegramMultipart(
    token,
    'setMyProfilePhoto',
    {
      photo: JSON.stringify({ type: 'static', photo: 'attach://pic' }),
    },
    [{ name: 'pic', filename: 'toc-ops-profile.jpg', bytes: jpeg, type: 'image/jpeg' }]
  );
}

export async function setChatTitle(
  token: string,
  chatId: string | number, // brand-ok — Telegram chat_id wire
  title: string
): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'setChatTitle', { chat_id: chatId, title });
}

export async function setChatDescription(
  token: string,
  chatId: string | number, // brand-ok
  description: string
): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'setChatDescription', { chat_id: chatId, description });
}

export async function setChatPhotoJpeg(
  token: string,
  chatId: string | number, // brand-ok
  jpeg: Uint8Array
): Promise<TelegramApiResult> {
  return telegramMultipart(token, 'setChatPhoto', { chat_id: String(chatId) }, [
    { name: 'photo', filename: 'toc-ops-group.jpg', bytes: jpeg, type: 'image/jpeg' },
  ]);
}

export type ForumTopicCreated = {
  messageThreadId: number;
  name: string;
  ok: boolean;
  error?: string;
};

export async function createForumTopic(
  token: string,
  chatId: string | number, // brand-ok
  name: string,
  iconColor = 0x6fb9f0
): Promise<ForumTopicCreated> {
  const r = await telegramApiCall(token, 'createForumTopic', {
    chat_id: chatId,
    name,
    icon_color: iconColor,
  });
  if (!r.ok || !r.result || typeof r.result !== 'object') {
    return {
      messageThreadId: 0,
      name,
      ok: false,
      error: r.description ?? 'createForumTopic failed',
    };
  }
  const topic = r.result as { message_thread_id?: number; name?: string };
  return {
    messageThreadId: typeof topic.message_thread_id === 'number' ? topic.message_thread_id : 0,
    name: topic.name ?? name,
    ok: true,
  };
}

export type ApplyBotBrandingResult = {
  name: TelegramApiResult;
  description: TelegramApiResult;
  shortDescription: TelegramApiResult;
  profilePhoto: TelegramApiResult;
  profileJpegPath: string;
};

export async function applyBotBranding(
  token: string,
  opts?: { outDir?: string; skipPhoto?: boolean }
): Promise<ApplyBotBrandingResult> {
  const outDir = opts?.outDir ?? 'public/brand/telegram';
  await Bun.write(`${outDir}/.gitkeep`, '');
  const jpeg = await renderTocOpsProfileJpeg(640);
  const profileJpegPath = `${outDir}/toc-ops-profile.jpg`;
  await Bun.write(profileJpegPath, jpeg);

  const profilePhoto = opts?.skipPhoto
    ? ({ ok: true, result: true, description: 'skipped' } as const)
    : await setMyProfilePhotoJpeg(token, jpeg);

  return {
    name: await setMyName(token, TOC_OPS_BOT_DISPLAY_NAME),
    description: await setMyDescription(token, TOC_OPS_BOT_DESCRIPTION),
    shortDescription: await setMyShortDescription(token, TOC_OPS_BOT_SHORT_DESCRIPTION),
    profilePhoto,
    profileJpegPath,
  };
}

export type BrandGroupOpts = {
  token: string;
  chatId: string; // brand-ok
  title: string;
  description?: string;
  setPhoto?: boolean;
  ensureTopics?: readonly string[];
  db?: Database;
};

export type BrandGroupResult = {
  chatId: string; // brand-ok
  title: TelegramApiResult;
  description?: TelegramApiResult;
  photo?: TelegramApiResult;
  topics: ForumTopicCreated[];
  canManageTopics: boolean | null;
  botStatus: string | null;
};

export async function brandGroup(opts: BrandGroupOpts): Promise<BrandGroupResult> {
  const me = await getBotMe(opts.token);
  let canManageTopics: boolean | null = null;
  let botStatus: string | null = null;
  if (me) {
    const m = await getChatMember(opts.token, opts.chatId, me.id);
    if (m.ok) {
      botStatus = m.member.status;
      canManageTopics =
        typeof m.member.can_manage_topics === 'boolean' ? m.member.can_manage_topics : null;
    }
  }

  const title = await setChatTitle(opts.token, opts.chatId, opts.title);
  let description: TelegramApiResult | undefined;
  if (opts.description) {
    description = await setChatDescription(opts.token, opts.chatId, opts.description);
  }

  let photo: TelegramApiResult | undefined;
  if (opts.setPhoto !== false) {
    const jpeg = await renderTocOpsProfileJpeg(640);
    photo = await setChatPhotoJpeg(opts.token, opts.chatId, jpeg);
  }

  const topics: ForumTopicCreated[] = [];
  if (opts.ensureTopics?.length) {
    if (canManageTopics === false) {
      for (const name of opts.ensureTopics) {
        topics.push({
          messageThreadId: 0,
          name,
          ok: false,
          error: 'bot lacks can_manage_topics — promote in group admin settings',
        });
      }
    } else {
      for (const name of opts.ensureTopics) {
        topics.push(await createForumTopic(opts.token, opts.chatId, name));
      }
    }
  }

  if (opts.db) {
    const chat = await getChat(opts.token, opts.chatId);
    if (chat.ok) {
      upsertKnownChat(opts.db, {
        chat: {
          id: chat.chat.id,
          type: chat.chat.type,
          title: chat.chat.title ?? opts.title,
          username: chat.chat.username,
          is_forum: chat.chat.is_forum,
        },
        source: 'manual',
        botStatus: botStatus ?? 'administrator',
      });
    }
  }

  return {
    chatId: opts.chatId,
    title,
    description,
    photo,
    topics,
    canManageTopics,
    botStatus,
  };
}

/** Build TELEGRAM_TOPICS JSON from created topic results + optional General=1. */
export function topicsMapFromCreated(
  topics: ForumTopicCreated[],
  extras?: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...(extras ?? {}), general: 1 };
  for (const t of topics) {
    if (t.ok && t.messageThreadId > 0) out[t.name] = t.messageThreadId;
  }
  return out;
}
