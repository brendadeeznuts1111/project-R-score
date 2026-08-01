#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Bind a house surface chat id into Reasonix env + optional brand bootstrap.
 *
 *   bun tools/telegram-bind-surface.ts hq --chat -100… --brand
 *   bun tools/telegram-bind-surface.ts sandbox --chat -100… --brand
 *   bun tools/telegram-bind-surface.ts all-accounting --chat -100… --brand --post-prompt
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { ALL_ACCOUNTING_SURFACE_SLUG } from '../lib/telegram/surfaces.ts';
import {
  bindHouseSurfaceInEnvFile,
  defaultReasonixEnvPath,
} from '../lib/telegram/telegram-env-bind.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import {
  HOUSE_FORUM_SURFACES,
  isHouseForumSurface,
  type HouseForumSurfaceSlug,
} from './house-forum-channel.ts';

const argv = Bun.argv.slice(2);
let surface = '';
let chatId = '';
let envPath = defaultReasonixEnvPath();
let brand = false;
let postPrompt = false;
let envOnly = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--chat') chatId = argv[++i]?.trim() ?? '';
  else if (a.startsWith('--chat=')) chatId = a.slice('--chat='.length).trim();
  else if (a === '--env') envPath = argv[++i]?.trim() ?? envPath;
  else if (a.startsWith('--env=')) envPath = a.slice('--env='.length).trim();
  else if (a === '--brand') brand = true;
  else if (a === '--post-prompt') postPrompt = true;
  else if (a === '--env-only') envOnly = true;
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-bind-surface.ts <surface> --chat id [options]

Surfaces: ${HOUSE_FORUM_SURFACES.join(' · ')}

Options:
  --chat id        Supergroup chat id (required)
  --env path       Dotenv file (default ~/.reasonix/.env)
  --env-only       Write env keys only — skip Telegram brand/prompt
  --brand          Run house-forum-channel --brand after bind
  --post-prompt    all-accounting welcome prompt (implies --brand)
`);
    process.exit(0);
  } else if (!a.startsWith('-') && !surface) {
    surface = a.trim();
  }
}

if (!surface || !chatId) {
  console.error(`Usage: bun tools/telegram-bind-surface.ts <surface> --chat -100…`);
  process.exit(1);
}

if (!isHouseForumSurface(surface)) {
  console.error(`Unsupported surface: ${surface} (${HOUSE_FORUM_SURFACES.join(' · ')})`);
  process.exit(1);
}

const bound = await bindHouseSurfaceInEnvFile({ surfaceSlug: surface, chatId, envPath });
console.log(`bound ${surface} → ${bound.chatId}`);
console.log(`  env: ${bound.envPath}`);
if (surface === ALL_ACCOUNTING_SURFACE_SLUG) {
  console.log(`  TELEGRAM_ACCOUNTING_CHAT_ID=${bound.chatId}`);
}
if (surface === 'hq') {
  console.log(`  TELEGRAM_OPS_CHAT_ID=${bound.chatId}`);
}

if (envOnly && !brand && !postPrompt) {
  console.log('');
  console.log(`Next: bun tools/house-forum-channel.ts ${surface} --brand`);
  process.exit(0);
}

if (postPrompt) brand = true;
if (!brand && !postPrompt) {
  console.log('');
  console.log(`Next: bun tools/house-forum-channel.ts ${surface} --brand`);
  process.exit(0);
}

const tg = loadTelegramEnv();
if (!tg.effectiveToken) {
  console.error('TELEGRAM_BOT_FACTORY required for --brand');
  process.exit(1);
}

const args = ['tools/house-forum-channel.ts', surface, '--chat', chatId];
if (brand) args.push('--brand');
if (postPrompt && surface === ALL_ACCOUNTING_SURFACE_SLUG) args.push('--post-prompt');

const proc = Bun.spawn(bunSpawnArgs(args), {
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...Bun.env,
    TELEGRAM_SURFACES: bound.surfacesJson,
    ...(surface === ALL_ACCOUNTING_SURFACE_SLUG ? { TELEGRAM_ACCOUNTING_CHAT_ID: chatId } : {}),
    ...(surface === 'hq' ? { TELEGRAM_OPS_CHAT_ID: chatId } : {}),
  },
});
process.exit(await proc.exited);
