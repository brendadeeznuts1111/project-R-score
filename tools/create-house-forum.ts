#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Create a house forum via MTProto user session, then bind + brand via Bot API.
 *
 *   bun tools/create-house-forum.ts hq
 *   bun tools/create-house-forum.ts sandbox
 *   bun tools/create-house-forum.ts --all
 */
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import {
  ALL_ACCOUNTING_FORUM_TOPICS,
  ALL_ACCOUNTING_SURFACE_SLUG,
  formatTocOpsGroupTitle,
  getSurface,
} from '../lib/telegram/surfaces.ts';
import { descriptionForSurface, forumTopicNamesForSurface } from '../lib/telegram/branding.ts';
import { chatIdForSurface } from '../lib/telegram/surfaces.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { createHouseForum } from '../toc-ops-repo/src/central-tool/telegram/create-forum.ts';
import {
  HOUSE_FORUM_SURFACES,
  isHouseForumSurface,
  type HouseForumSurfaceSlug,
} from './house-forum-channel.ts';

const ICON_BY_SURFACE: Record<HouseForumSurfaceSlug, string> = {
  hq: 'HQ',
  'all-accounting': 'ACC',
  sandbox: 'SBX',
};

const argv = Bun.argv.slice(2);
let surfaces: HouseForumSurfaceSlug[] = [];
let chatId = '';
let bindOnly = false;
let skipBind = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--chat') chatId = argv[++i]?.trim() ?? '';
  else if (a.startsWith('--chat=')) chatId = a.slice('--chat='.length).trim();
  else if (a === '--bind-only') bindOnly = true;
  else if (a === '--skip-bind') skipBind = true;
  else if (a === '--all') surfaces = [...HOUSE_FORUM_SURFACES];
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/create-house-forum.ts <surface> [options]

Surfaces: ${HOUSE_FORUM_SURFACES.join(' · ')}
  --all                 Create/bind any unbound house surfaces
  --bind-only --chat id Skip MTProto create
  --skip-bind           Create only (print bind hint)
`);
    process.exit(0);
  } else if (!a.startsWith('-') && isHouseForumSurface(a)) {
    surfaces.push(a);
  }
}

if (surfaces.length === 0) {
  console.error(`Pass a surface (${HOUSE_FORUM_SURFACES.join(' | ')}) or --all`);
  process.exit(1);
}

await loadReasonixEnv();

function existingChatId(slug: HouseForumSurfaceSlug): string {
  const explicit = chatIdForSurface(slug) ?? '';
  if (slug === ALL_ACCOUNTING_SURFACE_SLUG) {
    return loadTelegramEnv().accountingChatId?.trim() ?? explicit;
  }
  if (slug === 'hq') {
    const ash = chatIdForSurface('ash-staging') ?? '';
    if (explicit && explicit !== ash) return explicit;
    return '';
  }
  return explicit;
}

let exitCode = 0;

for (const surfaceSlug of surfaces) {
  let id = chatId || existingChatId(surfaceSlug);

  if (!bindOnly && !id) {
    const def = getSurface(surfaceSlug);
    if (!def) {
      console.error(`Missing surface ${surfaceSlug}`);
      exitCode = 1;
      continue;
    }
    console.log(`→ MTProto create ${formatTocOpsGroupTitle(def)}`);
    try {
      const created = await createHouseForum({
        surfaceSlug,
        title: formatTocOpsGroupTitle(def),
        about: descriptionForSurface(surfaceSlug),
        topicTitles: forumTopicNamesForSurface(surfaceSlug),
        iconLabel: ICON_BY_SURFACE[surfaceSlug],
        skipTopics: true,
      });
      id = created.chatId;
      console.log(`   chat ${id}`);
      console.log(`   invite ${created.inviteLink}`);
      if (created.iconError) console.log(`   icon warn: ${created.iconError}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      exitCode = 1;
      continue;
    }
  } else if (id) {
    console.log(`${surfaceSlug} already bound → ${id}`);
  }

  if (!id) {
    console.error(`${surfaceSlug}: no chat id`);
    exitCode = 1;
    continue;
  }

  if (skipBind) {
    console.log(`bun run telegram:bind-surface ${surfaceSlug} --chat ${id} --brand`);
    continue;
  }

  const bindArgs = ['tools/telegram-bind-surface.ts', surfaceSlug, '--chat', id, '--brand'];
  if (surfaceSlug === ALL_ACCOUNTING_SURFACE_SLUG) bindArgs.push('--post-prompt');

  const proc = Bun.spawn(['bun', ...bindArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
    cwd: import.meta.dir + '/..',
  });
  const code = await proc.exited;
  if (code !== 0) exitCode = code;
}

process.exit(exitCode);
