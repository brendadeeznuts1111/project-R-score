#!/usr/bin/env bun
/** @deprecated Use `bun tools/house-forum-channel.ts all-accounting` */
import { ALL_ACCOUNTING_SURFACE_SLUG } from '../lib/telegram/surfaces.ts';
import { brandHouseForumSurface, resolveHouseChatId } from './house-forum-channel.ts';

const argv = Bun.argv.slice(2);
let chatId = '';
let brand = false;
let postPrompt = false;
let noTopics = false;
let noPhoto = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--chat') chatId = argv[++i]?.trim() ?? '';
  else if (a.startsWith('--chat=')) chatId = a.slice('--chat='.length).trim();
  else if (a === '--brand') brand = true;
  else if (a === '--post-prompt') postPrompt = true;
  else if (a === '--no-topics') noTopics = true;
  else if (a === '--no-photo') noPhoto = true;
  else if (a === '--help' || a === '-h') {
    console.log(
      'Use: bun tools/house-forum-channel.ts all-accounting [--chat id] [--brand] [--post-prompt]'
    );
    process.exit(0);
  }
}

if (!chatId) chatId = resolveHouseChatId(ALL_ACCOUNTING_SURFACE_SLUG);
if (!chatId) {
  console.error('Set TELEGRAM_ACCOUNTING_CHAT_ID or pass --chat');
  process.exit(1);
}

try {
  await brandHouseForumSurface({
    surfaceSlug: ALL_ACCOUNTING_SURFACE_SLUG,
    chatId,
    brand,
    postPrompt,
    noTopics,
    noPhoto,
  });
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
