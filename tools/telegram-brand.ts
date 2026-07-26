#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Apply TOC Ops Telegram branding — bot profile + concern-separated groups.
 *
 *   bun run telegram:brand
 *   bun run telegram:brand -- --matrix
 *   bun run telegram:brand -- --groups
 *   bun run telegram:brand -- --chat -1003937534779 --surface ash-staging
 */
import { Database } from 'bun:sqlite';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  TOC_OPS_BOT_DISPLAY_NAME,
  applyBotBranding,
  brandGroup,
  descriptionForSurface,
  formatSurfaceMatrix,
  listSurfaceSlugs,
  loadTelegramSurfacesMap,
  resolvePrimaryOpsChatId,
  titleForSurface,
  topicsForSurface,
  topicsMapFromCreated,
} from '../lib/telegram/branding.ts';
import { upsertKnownChat } from '../lib/telegram/known-chats.ts';
import {
  getChat,
  getMyDescription,
  getMyName,
  getMyShortDescription,
} from '../lib/telegram/telegram-api.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

/**
 * Built-in chat bindings when TELEGRAM_SURFACES unset (learned from audit).
 * HQ omitted until a chat id is known — message HQ once, then add to env.
 */
const BUILTIN_SURFACE_CHATS: Record<string, string> = {
  // brand-ok — Telegram chat_id wire
  'ash-staging': '-1003937534779',
  sandbox: '-1004400413853',
};

function resolveSurfaceBindings(): Array<{ chatId: string; surface: string }> {
  // brand-ok — Telegram chat_id wire
  const fromEnv = loadTelegramSurfacesMap();
  const map = { ...BUILTIN_SURFACE_CHATS, ...fromEnv };
  return Object.entries(map).map(([surface, chatId]) => ({ surface, chatId }));
}

function usage(): never {
  console.log(`Usage: bun tools/telegram-brand.ts [options]

Options:
  --matrix            Print concern separation + naming grammar (no API)
  --bot-only          Only set bot name/description/profile photo
  --groups            Brand all bound surfaces (TELEGRAM_SURFACES or builtins)
  --chat <id>         Brand one chat id
  --surface <slug>    ${listSurfaceSlugs().join(' | ')} (with --chat)
  --no-topics         Skip createForumTopic
  --no-photo          Skip setChatPhoto / setMyProfilePhoto
  --help

Naming grammar:  TOC Ops · {CONCERN}[ · {ENV}]
  HQ            → TOC Ops · HQ
  partner desk  → TOC Ops · ASH · staging
  sandbox       → TOC Ops · sandbox

Concerns are separate groups. Topics further split noise inside a group.
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) usage();

  if (argv.includes('--matrix')) {
    for (const line of formatSurfaceMatrix()) console.log(line);
    process.exit(0);
  }

  const botOnly = argv.includes('--bot-only');
  const groups = argv.includes('--groups') || !botOnly;
  const noTopics = argv.includes('--no-topics');
  const noPhoto = argv.includes('--no-photo');

  const chats: Array<{ chatId: string; surface: string }> = []; // brand-ok — Telegram chat_id wire
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--chat') {
      const id = argv[++i];
      const surfaceRaw = argv.includes('--surface')
        ? argv[argv.indexOf('--surface') + 1]
        : 'ash-staging';
      const surface = surfaceRaw ?? 'ash-staging';
      if (id) chats.push({ chatId: id, surface });
    }
  }
  if (groups && chats.length === 0) chats.push(...resolveSurfaceBindings());

  const tg = loadTelegramEnv();
  if (!tg.effectiveToken) {
    console.error('TELEGRAM_BOT_FACTORY required');
    process.exit(1);
  }
  const token = tg.effectiveToken;
  const dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  const db = new Database(dbPath);

  console.log('→ Concern matrix');
  for (const line of formatSurfaceMatrix()) console.log(`   ${line}`);
  console.log('');

  console.log('→ Bot branding');
  const bot = await applyBotBranding(token, {
    outDir: 'public/brand/telegram',
    skipPhoto: noPhoto,
  });
  console.log(
    `   name: ${bot.name.ok ? 'ok' : bot.name.description} → ${TOC_OPS_BOT_DISPLAY_NAME}`
  );
  console.log(`   description: ${bot.description.ok ? 'ok' : bot.description.description}`);
  console.log(`   short: ${bot.shortDescription.ok ? 'ok' : bot.shortDescription.description}`);
  if (!noPhoto) {
    console.log(
      `   profile photo: ${bot.profilePhoto.ok ? 'ok' : bot.profilePhoto.description} (${bot.profileJpegPath})`
    );
  }

  const topicMaps: Record<string, Record<string, number>> = {};
  const surfaceChatJson: Record<string, string> = {};

  if (!botOnly) {
    for (const { chatId, surface } of chats) {
      const title = titleForSurface(surface);
      const topicPlan = topicsForSurface(surface);
      console.log(`→ Group ${chatId} [${surface}] → ${title}`);
      console.log(`   topics plan: ${topicPlan.join(' · ') || '(none)'}`);
      const chatProbe = await getChat(token, chatId);
      if (!chatProbe.ok) {
        console.log(`   ✗ getChat: ${chatProbe.description}`);
        continue;
      }

      const result = await brandGroup({
        token,
        chatId,
        title,
        description: descriptionForSurface(surface),
        setPhoto: !noPhoto,
        ensureTopics: noTopics ? undefined : topicPlan,
        db,
      });

      console.log(`   title: ${result.title.ok ? 'ok' : result.title.description}`);
      if (result.description) {
        console.log(
          `   description: ${result.description.ok ? 'ok' : result.description.description}`
        );
      }
      if (result.photo) {
        console.log(`   photo: ${result.photo.ok ? 'ok' : result.photo.description}`);
      }
      console.log(`   bot=${result.botStatus} can_manage_topics=${result.canManageTopics}`);
      if (result.canManageTopics === false) {
        console.log('   ⚠ Grant the bot “Manage Topics” admin right, then re-run with --groups');
      }
      for (const t of result.topics) {
        console.log(
          t.ok
            ? `   topic ✓ ${t.name} thread=${t.messageThreadId}`
            : `   topic ✗ ${t.name}: ${t.error}`
        );
      }
      if (result.topics.some(t => t.ok)) {
        topicMaps[chatId] = topicsMapFromCreated(result.topics);
      }
      surfaceChatJson[surface] = chatId;

      upsertKnownChat(db, {
        chat: {
          id: chatProbe.chat.id,
          type: chatProbe.chat.type,
          title,
          is_forum: chatProbe.chat.is_forum,
        },
        source: 'manual',
        botStatus: result.botStatus,
      });
    }
  }

  const liveName = await getMyName(token);
  const liveDesc = await getMyDescription(token);
  const liveShort = await getMyShortDescription(token);
  console.log('');
  console.log('✅ Brand apply complete');
  console.log(`   live name: ${JSON.stringify(liveName)}`);
  console.log(`   live description: ${JSON.stringify(liveDesc)}`);
  console.log(`   live short: ${JSON.stringify(liveShort)}`);

  const primaryOps =
    resolvePrimaryOpsChatId() ??
    surfaceChatJson['ash-staging'] ??
    BUILTIN_SURFACE_CHATS['ash-staging']!;
  const topicsJson = topicMaps[primaryOps]
    ? JSON.stringify(topicMaps[primaryOps])
    : '{"ops":1,"alerts":1,"toc":1}';

  const mergedSurfaces = {
    ...BUILTIN_SURFACE_CHATS,
    ...loadTelegramSurfacesMap(),
    ...surfaceChatJson,
  };

  console.log('');
  console.log('Add to .env (concern map + ops hub):');
  console.log(`TELEGRAM_SURFACES=${JSON.stringify(mergedSurfaces)}`);
  console.log(`TELEGRAM_OPS_CHAT_ID=${primaryOps}`);
  console.log(`TELEGRAM_TOPICS=${topicsJson}`);
  console.log('OPS_ADMIN_USER_IDS=8013171035');
  console.log('');
  console.log(
    'Also in @BotFather: /setprivacy → Disable (so group messages reach the bot without @mention).'
  );
  console.log('When HQ chat id is known: add "hq":"-100…" to TELEGRAM_SURFACES and re-brand.');

  db.close();
}

if (import.meta.main) {
  await main();
}
