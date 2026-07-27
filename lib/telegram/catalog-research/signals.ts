// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * External signals for catalog research — Bot API probe + static API notes.
 */
import { loadTelegramEnv } from '../telegram-config.ts';
import { telegramApiCall } from '../telegram-api.ts';
import type { HandshakeCatalog } from '../handshake-catalog.ts';
import { TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_REL } from '../handshake-snapshot.ts';

export type CatalogResearchSignals = {
  gatheredAt: string;
  catalogPath: string;
  catalogLoadedFrom: 'registry-file' | 'buildHandshakeCatalog';
  systemTimeZone: string;
  botApi: {
    ok: boolean;
    botUsername?: string;
    customEmojiProbe?: { ok: boolean; note: string };
    forumTopicMethods: readonly string[];
  };
  apiNotes: readonly string[];
  changelog: {
    source: string;
    notes: readonly string[];
  };
};

const FORUM_TOPIC_API_NOTES = [
  'createForumTopic / editForumTopic support icon_color 0–6 (Bot API forum topics).',
  'General forum thread is always message_thread_id=1 — do not createForumTopic for General.',
  'Custom emoji on forum topics requires custom_emoji_id from getCustomEmojiStickers.',
  'setChatDescription applies to supergroup About — separate from topic pinned messages.',
] as const;

const CHANGELOG_NOTES = [
  'Monitor https://core.telegram.org/bots/api-changelog for forum topic + rich message changes.',
  'Bot API 10.1+ InputRichMessage.blocks used by seat capital desk (see seat-capital-desk.md).',
] as const;

export async function loadCatalogSnapshotForResearch(root = process.cwd()): Promise<{
  catalog: HandshakeCatalog;
  path: string;
  loadedFrom: 'registry-file' | 'buildHandshakeCatalog';
}> {
  const rel = TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_REL;
  const abs = root.endsWith('/') ? `${root}${rel}` : `${root}/${rel}`;
  const file = Bun.file(abs);
  if (await file.exists()) {
    const catalog = (await file.json()) as HandshakeCatalog;
    return { catalog, path: rel, loadedFrom: 'registry-file' };
  }
  const { buildHandshakeCatalog } = await import('../handshake-catalog.ts');
  return {
    catalog: buildHandshakeCatalog(),
    path: rel,
    loadedFrom: 'buildHandshakeCatalog',
  };
}

async function probeBotApi(token: string | undefined): Promise<CatalogResearchSignals['botApi']> {
  const forumTopicMethods = [
    'createForumTopic',
    'editForumTopic',
    'editGeneralForumTopic',
  ] as const;
  if (!token?.trim()) {
    return {
      ok: false,
      forumTopicMethods,
      customEmojiProbe: { ok: false, note: 'TELEGRAM_BOT_FACTORY not set' },
    };
  }
  const me = await telegramApiCall(token, 'getMe', {});
  const custom = await telegramApiCall(token, 'getCustomEmojiStickers', {
    custom_emoji_ids: [],
  });
  return {
    ok: me.ok === true,
    botUsername:
      me.ok && me.result && typeof me.result === 'object'
        ? String((me.result as { username?: string }).username ?? '')
        : undefined,
    forumTopicMethods,
    customEmojiProbe: {
      ok: custom.ok === true,
      note:
        custom.ok === true
          ? 'getCustomEmojiStickers reachable (pass ids to resolve custom emoji set)'
          : (custom.description ?? 'getCustomEmojiStickers unavailable'),
    },
  };
}

export async function gatherCatalogResearchSignals(opts?: {
  root?: string;
  catalog?: HandshakeCatalog;
  catalogPath?: string;
  catalogLoadedFrom?: 'registry-file' | 'buildHandshakeCatalog';
}): Promise<CatalogResearchSignals> {
  let catalog = opts?.catalog;
  let catalogPath = opts?.catalogPath ?? TELEGRAM_HANDSHAKE_CATALOG_REGISTRY_REL;
  let loadedFrom = opts?.catalogLoadedFrom ?? 'buildHandshakeCatalog';

  if (!catalog) {
    const snap = await loadCatalogSnapshotForResearch(opts?.root);
    catalog = snap.catalog;
    catalogPath = snap.path;
    loadedFrom = snap.loadedFrom;
  }

  const tg = loadTelegramEnv();
  const botApi = await probeBotApi(tg.effectiveToken);

  return {
    gatheredAt: new Date().toISOString(),
    catalogPath,
    catalogLoadedFrom: loadedFrom,
    systemTimeZone:
      Bun.env.TELEGRAM_CATALOG_RESEARCH_TZ?.trim() ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    botApi,
    apiNotes: [...FORUM_TOPIC_API_NOTES],
    changelog: {
      source: 'https://core.telegram.org/bots/api-changelog',
      notes: [...CHANGELOG_NOTES],
    },
  };
}
