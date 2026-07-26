// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Granular Telegram Bot API + local harness asset discovery.
 *
 * Plane note:
 * - Bot API (https://core.telegram.org/bots/api) — HTTP `api.telegram.org/bot<token>/…`
 * - Telegram API / MTProto — client protocol for user accounts; not used by factory bots
 *
 * @see docs/harness/tenants/telegram-factory.md
 */
import { Database } from 'bun:sqlite';
import { DEFAULT_OPS_DB_PATH } from '../operations/db.ts';
import { listKnownChats, type KnownChatRow } from './known-chats.ts';
import {
  FACTORY_BOT_COMMANDS,
  getBotMe,
  getChat,
  getChatAdministrators,
  getChatMember,
  getChatMemberCount,
  getChatMenuButton,
  getMyCommands,
  getMyDefaultAdministratorRights,
  getMyDescription,
  getMyName,
  getMyShortDescription,
  getWebhookInfo,
  type TelegramBotCommand,
  type TelegramBotUser,
  type TelegramChatAdministratorRights,
  type TelegramChatInfo,
  type TelegramChatMember,
  type TelegramMenuButton,
  type TelegramWebhookInfo,
} from './telegram-api.ts';
import { loadTelegramEnv, type TelegramEnvSnapshot } from './telegram-config.ts';

export type TelegramLinkedSeat = {
  treeNodeId: string; // brand-ok — tree_nodes.id
  name: string | null;
  callSign: string | null;
  telegramId: string; // brand-ok — tree_nodes.telegram_id wire
  probeable: boolean;
};

export type TelegramChannelMetaAsset = {
  chatId: string; // brand-ok
  treeNodeIds: string[];
  callSigns: string[];
  locale: string;
  linkedAt: string | null;
};

export type TelegramChatAsset = {
  chatId: string; // brand-ok
  source: 'ops_chat' | 'env_extra' | 'linked_seat' | 'channel_meta' | 'known_chat' | 'cli';
  label?: string;
  probeable: boolean;
  accessible: boolean | null;
  chat: TelegramChatInfo | null;
  memberCount: number | null;
  botMember: TelegramChatMember | null;
  administrators: Array<{
    userId: number | null;
    username: string | null;
    status: string;
    isBot: boolean | null;
  }> | null;
  error?: string;
  errorCode?: number;
};

export type TelegramDiscoveryReport = {
  generatedAt: string;
  planes: {
    botApi: {
      name: 'Telegram Bot API';
      baseUrl: string;
      docs: string;
      usedByFactory: true;
    };
    telegramApiMtproto: {
      name: 'Telegram API (MTProto)';
      docs: string;
      usedByFactory: false;
      note: string;
    };
  };
  token: {
    present: boolean;
    source: 'TELEGRAM_BOT_FACTORY' | 'TELEGRAM_BOT_TOKEN' | null;
    botIdFromToken: number | null;
  };
  env: {
    hasWebhookSecret: boolean;
    opsChatId: string | null; // brand-ok
    topics: Record<string, number>;
    rateLimitMinIntervalMs: number;
    opsDbPath: string;
  };
  bot: TelegramBotUser | null;
  profile: {
    name: string | null;
    description: string | null;
    shortDescription: string | null;
  };
  webhook: TelegramWebhookInfo | null;
  commands: {
    byScope: Record<string, TelegramBotCommand[]>;
    factoryCatalog: TelegramBotCommand[];
    missingFromDefault: string[];
    extraInDefault: string[];
  };
  menuButton: TelegramMenuButton | null;
  defaultAdminRights: {
    groups: TelegramChatAdministratorRights | null;
    channels: TelegramChatAdministratorRights | null;
  };
  chats: TelegramChatAsset[];
  local: {
    opsDbExists: boolean;
    linkedSeats: TelegramLinkedSeat[];
    channelMeta: TelegramChannelMetaAsset[];
    knownChats: KnownChatRow[];
    fixtureLikeTelegramIds: number;
  };
  apiSurface: {
    wrappedMethods: string[];
    discoveryProbed: string[];
    botApiOnlyNote: string;
  };
  summary: {
    ready: boolean;
    accessibleChats: number;
    inaccessibleChats: number;
    skippedNonProbeable: number;
  };
  gaps: string[];
  recommendations: string[];
};

const WRAPPED_METHODS = [
  'getMe',
  'getWebhookInfo',
  'getMyCommands',
  'getMyName',
  'getMyDescription',
  'getMyShortDescription',
  'getChatMenuButton',
  'getMyDefaultAdministratorRights',
  'getChat',
  'getChatMember',
  'getChatMemberCount',
  'getChatAdministrators',
  'setMyCommands',
  'sendMessage',
  'editMessageText',
  'answerCallbackQuery',
  'setWebhook',
] as const;

const COMMAND_SCOPES = [
  { key: 'default', scope: { type: 'default' as const } },
  { key: 'all_private_chats', scope: { type: 'all_private_chats' as const } },
  { key: 'all_group_chats', scope: { type: 'all_group_chats' as const } },
  { key: 'all_chat_administrators', scope: { type: 'all_chat_administrators' as const } },
];

/** True when chat id looks like a Telegram Bot API chat_id (numeric or @username). */
export function isProbeableTelegramChatId(chatId: string): boolean {
  // brand-ok — Telegram chat_id wire
  const t = chatId.trim();
  if (!t) return false;
  if (t.startsWith('@') && t.length > 1) return true;
  if (/^-?\d+$/.test(t)) return true;
  return false;
}

function botIdFromToken(token: string): number | null {
  const prefix = token.split(':')[0];
  const n = Number(prefix);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tokenSource(
  env: TelegramEnvSnapshot
): 'TELEGRAM_BOT_FACTORY' | 'TELEGRAM_BOT_TOKEN' | null {
  if (env.factoryToken) return 'TELEGRAM_BOT_FACTORY';
  if (env.legacyToken) return 'TELEGRAM_BOT_TOKEN';
  return null;
}

function loadLinkedSeats(db: Database): TelegramLinkedSeat[] {
  try {
    const rows = db
      .query(
        `SELECT id, name, call_sign, telegram_id
         FROM tree_nodes
         WHERE active = 1
           AND telegram_id IS NOT NULL
           AND telegram_id != ''
           AND telegram_id NOT LIKE 'pending-%'
         ORDER BY name`
      )
      .all() as Array<{
      id: string; // brand-ok
      name: string | null;
      call_sign: string | null;
      telegram_id: string; // brand-ok
    }>;
    return rows.map(r => ({
      treeNodeId: r.id,
      name: r.name,
      callSign: r.call_sign,
      telegramId: r.telegram_id,
      probeable: isProbeableTelegramChatId(r.telegram_id),
    }));
  } catch {
    return [];
  }
}

function loadChannelMeta(db: Database): TelegramChannelMetaAsset[] {
  try {
    const rows = db
      .query(
        `SELECT chat_id, tree_node_ids_json, call_signs_json, locale, linked_at
         FROM ops_chat_channel_meta`
      )
      .all() as Array<{
      chat_id: string; // brand-ok
      tree_node_ids_json: string;
      call_signs_json: string;
      locale: string;
      linked_at: string | null;
    }>;
    return rows.map(r => {
      let treeNodeIds: string[] = [];
      let callSigns: string[] = [];
      try {
        const a = JSON.parse(r.tree_node_ids_json) as unknown;
        treeNodeIds = Array.isArray(a) ? a.map(String) : [];
      } catch {
        /* ignore */
      }
      try {
        const a = JSON.parse(r.call_signs_json) as unknown;
        callSigns = Array.isArray(a) ? a.map(String) : [];
      } catch {
        /* ignore */
      }
      return {
        chatId: r.chat_id,
        treeNodeIds,
        callSigns,
        locale: r.locale,
        linkedAt: r.linked_at,
      };
    });
  } catch {
    return [];
  }
}

async function probeChat(
  token: string,
  botUserId: number,
  chatId: string, // brand-ok — Telegram chat_id wire
  source: TelegramChatAsset['source'],
  label?: string
): Promise<TelegramChatAsset> {
  const probeable = isProbeableTelegramChatId(chatId);
  if (!probeable) {
    return {
      chatId,
      source,
      label,
      probeable: false,
      accessible: null,
      chat: null,
      memberCount: null,
      botMember: null,
      administrators: null,
      error: 'not a Bot API chat_id (need numeric id or @username)',
    };
  }

  const chatRes = await getChat(token, chatId);
  if (!chatRes.ok) {
    return {
      chatId,
      source,
      label,
      probeable: true,
      accessible: false,
      chat: null,
      memberCount: null,
      botMember: null,
      administrators: null,
      error: chatRes.description ?? 'getChat failed',
      errorCode: chatRes.errorCode,
    };
  }

  const memberCount = await getChatMemberCount(token, chatId);
  const memberRes = await getChatMember(token, chatId, botUserId);
  const botMember = memberRes.ok ? memberRes.member : null;

  let administrators: TelegramChatAsset['administrators'] = null;
  if (
    chatRes.chat.type === 'group' ||
    chatRes.chat.type === 'supergroup' ||
    chatRes.chat.type === 'channel'
  ) {
    const admins = await getChatAdministrators(token, chatId);
    if (admins) {
      administrators = admins.map(a => ({
        userId: typeof a.user?.id === 'number' ? a.user.id : null,
        username: typeof a.user?.username === 'string' ? a.user.username : null,
        status: a.status,
        isBot: typeof a.user?.is_bot === 'boolean' ? a.user.is_bot : null,
      }));
    }
  }

  return {
    chatId,
    source,
    label,
    probeable: true,
    accessible: true,
    chat: chatRes.chat,
    memberCount,
    botMember,
    administrators,
    error: memberRes.ok ? undefined : memberRes.description,
    errorCode: memberRes.ok ? undefined : memberRes.errorCode,
  };
}

export type DiscoverTelegramAssetsOpts = {
  token?: string;
  opsDbPath?: string;
  /** Extra chat ids to probe (CLI `--chat`). */
  extraChatIds?: string[];
  /** Cap linked-seat probes (default 40). */
  maxLinkedProbes?: number;
  /** Skip live Bot API probes (env + local only). */
  localOnly?: boolean;
};

export async function discoverTelegramAssets(
  opts: DiscoverTelegramAssetsOpts = {}
): Promise<TelegramDiscoveryReport> {
  const env = loadTelegramEnv();
  const opsDbPath = opts.opsDbPath ?? (Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH);
  const token = opts.token ?? env.effectiveToken;
  const gaps: string[] = [];
  const recommendations: string[] = [];

  const report: TelegramDiscoveryReport = {
    generatedAt: new Date().toISOString(),
    planes: {
      botApi: {
        name: 'Telegram Bot API',
        baseUrl: 'https://api.telegram.org/bot<token>/<method>',
        docs: 'https://core.telegram.org/bots/api',
        usedByFactory: true,
      },
      telegramApiMtproto: {
        name: 'Telegram API (MTProto)',
        docs: 'https://core.telegram.org/api',
        usedByFactory: false,
        note: 'Client protocol for user accounts / TDLib. Factory bots use Bot API only.',
      },
    },
    token: {
      present: Boolean(token),
      source: tokenSource(env),
      botIdFromToken: token ? botIdFromToken(token) : null,
    },
    env: {
      hasWebhookSecret: Boolean(env.webhookSecret),
      opsChatId: env.opsChatId,
      topics: env.topics,
      rateLimitMinIntervalMs: env.rateLimitMinIntervalMs,
      opsDbPath,
    },
    bot: null,
    profile: { name: null, description: null, shortDescription: null },
    webhook: null,
    commands: {
      byScope: {},
      factoryCatalog: FACTORY_BOT_COMMANDS.map(c => ({ ...c })),
      missingFromDefault: [],
      extraInDefault: [],
    },
    menuButton: null,
    defaultAdminRights: { groups: null, channels: null },
    chats: [],
    local: {
      opsDbExists: false,
      linkedSeats: [],
      channelMeta: [],
      knownChats: [],
      fixtureLikeTelegramIds: 0,
    },
    apiSurface: {
      wrappedMethods: [...WRAPPED_METHODS],
      discoveryProbed: [],
      botApiOnlyNote:
        'All factory traffic is Bot API. MTProto / user-session APIs are out of scope.',
    },
    summary: {
      ready: false,
      accessibleChats: 0,
      inaccessibleChats: 0,
      skippedNonProbeable: 0,
    },
    gaps,
    recommendations,
  };

  if (!token) {
    gaps.push('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN unset');
    recommendations.push('Set TELEGRAM_BOT_FACTORY in .env (never commit)');
    return report;
  }

  // Local harness assets
  try {
    const db = new Database(opsDbPath, { readonly: true });
    report.local.opsDbExists = true;
    report.local.linkedSeats = loadLinkedSeats(db);
    report.local.channelMeta = loadChannelMeta(db);
    try {
      report.local.knownChats = listKnownChats(db, { activeOnly: false, limit: 200 });
    } catch {
      report.local.knownChats = [];
    }
    report.local.fixtureLikeTelegramIds = report.local.linkedSeats.filter(s => !s.probeable).length;
    db.close();
  } catch {
    report.local.opsDbExists = false;
    recommendations.push(`Ops DB not readable at ${opsDbPath} — linked seats skipped`);
  }

  if (!env.opsChatId) {
    gaps.push('TELEGRAM_OPS_CHAT_ID unset — group projector has no fallback chat');
    recommendations.push('Set TELEGRAM_OPS_CHAT_ID to the ops supergroup id');
  }
  if (!env.webhookSecret) {
    gaps.push('TELEGRAM_WEBHOOK_SECRET unset');
  }
  if (Object.keys(env.topics).length === 0 && env.opsChatId) {
    recommendations.push('Set TELEGRAM_TOPICS JSON if the ops chat uses forum topics');
  }

  if (opts.localOnly) {
    report.summary.ready = report.token.present;
    return report;
  }

  const probed: string[] = [];
  const me = await getBotMe(token);
  probed.push('getMe');
  report.bot = me;
  if (!me) {
    gaps.push('getMe failed — token invalid or revoked');
    report.apiSurface.discoveryProbed = probed;
    return report;
  }

  report.profile.name = await getMyName(token);
  probed.push('getMyName');
  report.profile.description = await getMyDescription(token);
  probed.push('getMyDescription');
  report.profile.shortDescription = await getMyShortDescription(token);
  probed.push('getMyShortDescription');

  report.webhook = await getWebhookInfo(token);
  probed.push('getWebhookInfo');
  if (!report.webhook?.url) {
    gaps.push('webhook URL empty — run bun run telegram:factory:setup');
  }

  for (const { key, scope } of COMMAND_SCOPES) {
    const cmds = await getMyCommands(token, scope);
    report.commands.byScope[key] = cmds ?? [];
  }
  probed.push('getMyCommands');

  const defaultCmds = report.commands.byScope.default ?? [];
  const defaultSet = new Set(defaultCmds.map(c => c.command));
  const catalogSet = new Set(FACTORY_BOT_COMMANDS.map(c => c.command));
  report.commands.missingFromDefault = FACTORY_BOT_COMMANDS.map(c => c.command).filter(
    c => !defaultSet.has(c)
  );
  report.commands.extraInDefault = defaultCmds.map(c => c.command).filter(c => !catalogSet.has(c));
  if (report.commands.missingFromDefault.length) {
    recommendations.push(
      `Command menu missing: ${report.commands.missingFromDefault.join(', ')} — run telegram:factory:setup`
    );
  }

  report.menuButton = await getChatMenuButton(token);
  probed.push('getChatMenuButton');
  report.defaultAdminRights.groups = await getMyDefaultAdministratorRights(token, false);
  report.defaultAdminRights.channels = await getMyDefaultAdministratorRights(token, true);
  probed.push('getMyDefaultAdministratorRights');

  // Build chat probe list (dedupe)
  type Pending = { chatId: string; source: TelegramChatAsset['source']; label?: string }; // brand-ok — Telegram chat_id wire
  const pending: Pending[] = [];
  const seen = new Set<string>();
  const pushChat = (chatId: string, source: TelegramChatAsset['source'], label?: string) => {
    // brand-ok — Telegram chat_id wire
    const key = chatId.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    pending.push({ chatId: key, source, label });
  };

  if (env.opsChatId) pushChat(env.opsChatId, 'ops_chat', 'TELEGRAM_OPS_CHAT_ID');
  for (const id of opts.extraChatIds ?? []) pushChat(id, 'cli', 'cli --chat');

  const maxLinked = opts.maxLinkedProbes ?? 40;
  let linkedProbes = 0;
  for (const seat of report.local.linkedSeats) {
    if (!seat.probeable) {
      // still record as non-probeable asset without API call
      report.chats.push({
        chatId: seat.telegramId,
        source: 'linked_seat',
        label: seat.callSign ?? seat.name ?? seat.treeNodeId,
        probeable: false,
        accessible: null,
        chat: null,
        memberCount: null,
        botMember: null,
        administrators: null,
        error: 'fixture/non-numeric telegram_id — skip Bot API probe',
      });
      continue;
    }
    if (linkedProbes >= maxLinked) continue;
    pushChat(seat.telegramId, 'linked_seat', seat.callSign ?? seat.name ?? seat.treeNodeId);
    linkedProbes++;
  }

  for (const meta of report.local.channelMeta) {
    pushChat(meta.chatId, 'channel_meta', meta.callSigns.join(',') || undefined);
  }

  for (const kc of report.local.knownChats) {
    if (!kc.active) continue;
    pushChat(kc.chatId, 'known_chat', kc.title ?? kc.username ?? kc.firstName ?? kc.chatType);
  }

  if (report.local.knownChats.filter(k => k.active).length === 0 && !env.opsChatId) {
    recommendations.push(
      'No known chats yet — add bot to a group (my_chat_member) or DM /start, then telegram:ops:consume'
    );
  }

  for (const p of pending) {
    const asset = await probeChat(token, me.id, p.chatId, p.source, p.label);
    report.chats.push(asset);
  }
  probed.push('getChat', 'getChatMember', 'getChatMemberCount', 'getChatAdministrators');

  report.apiSurface.discoveryProbed = [...new Set(probed)];
  report.summary.accessibleChats = report.chats.filter(c => c.accessible === true).length;
  report.summary.inaccessibleChats = report.chats.filter(c => c.accessible === false).length;
  report.summary.skippedNonProbeable = report.chats.filter(c => !c.probeable).length;
  report.summary.ready = Boolean(me) && Boolean(report.webhook?.url);

  if (report.summary.accessibleChats === 0 && !env.opsChatId) {
    recommendations.push(
      'No accessible chats yet — add bot to ops group, set TELEGRAM_OPS_CHAT_ID, or link a real DM chat id'
    );
  }

  report.gaps = [...new Set(gaps)];
  report.recommendations = [...new Set(recommendations)];
  return report;
}

/** Human-readable digest lines for CLI. */
export function formatDiscoveryDigest(report: TelegramDiscoveryReport): string[] {
  const lines: string[] = [];
  const tokenOk = report.token.present ? `yes (${report.token.source})` : 'NO';
  lines.push(`token: ${tokenOk}`);
  if (report.bot) {
    lines.push(
      `bot: @${report.bot.username ?? '?'} id=${report.bot.id} name=${JSON.stringify(report.bot.first_name)}`
    );
    lines.push(
      `  caps: groups=${report.bot.can_join_groups ?? '?'} read_all=${report.bot.can_read_all_group_messages ?? '?'} inline=${report.bot.supports_inline_queries ?? '?'} business=${report.bot.can_connect_to_business ?? '?'} webapp=${report.bot.has_main_web_app ?? '?'}`
    );
  } else {
    lines.push('bot: (unavailable)');
  }
  if (report.profile.name || report.profile.description || report.profile.shortDescription) {
    lines.push(
      `profile: name=${JSON.stringify(report.profile.name)} short=${JSON.stringify(report.profile.shortDescription)}`
    );
  }
  const wh = report.webhook;
  if (wh?.url) {
    lines.push(
      `webhook: ${wh.url} pending=${wh.pending_update_count ?? 0}` +
        (wh.last_error_message ? ` last_error=${wh.last_error_message}` : '')
    );
    if (wh.allowed_updates?.length) {
      lines.push(`  allowed_updates: ${wh.allowed_updates.join(', ')}`);
    }
  } else {
    lines.push('webhook: (not set)');
  }
  const defCmds = report.commands.byScope.default ?? [];
  lines.push(
    `commands(default): ${defCmds.map(c => c.command).join(', ') || '(none)'}` +
      (report.commands.missingFromDefault.length
        ? ` missing=[${report.commands.missingFromDefault.join(',')}]`
        : '')
  );
  if (report.menuButton) {
    lines.push(
      `menu_button: ${report.menuButton.type}${report.menuButton.text ? ` "${report.menuButton.text}"` : ''}`
    );
  }
  const knownActive = report.local.knownChats.filter(k => k.active).length;
  lines.push(
    `local: seats=${report.local.linkedSeats.length} meta=${report.local.channelMeta.length} known_chats=${knownActive}/${report.local.knownChats.length} fixture_ids=${report.local.fixtureLikeTelegramIds}`
  );
  lines.push(
    `chats: accessible=${report.summary.accessibleChats} inaccessible=${report.summary.inaccessibleChats} skipped=${report.summary.skippedNonProbeable}`
  );
  for (const c of report.chats.filter(x => x.accessible || x.accessible === false)) {
    if (c.accessible && c.chat) {
      const status = c.botMember?.status ?? '?';
      lines.push(
        `  ✓ ${c.chatId} [${c.source}] type=${c.chat.type} title=${JSON.stringify(c.chat.title ?? c.chat.username ?? c.chat.first_name ?? '')} members=${c.memberCount ?? '?'} bot=${status}${c.chat.is_forum ? ' forum' : ''}`
      );
      if (c.administrators?.length) {
        const adm = c.administrators
          .slice(0, 8)
          .map(a => `@${a.username ?? a.userId ?? '?'}(${a.status})`)
          .join(' ');
        lines.push(`      admins: ${adm}${c.administrators.length > 8 ? ' …' : ''}`);
      }
    } else if (c.accessible === false) {
      lines.push(`  ✗ ${c.chatId} [${c.source}] ${c.error ?? 'inaccessible'}`);
    }
  }
  for (const g of report.gaps) lines.push(`gap: ${g}`);
  for (const r of report.recommendations) lines.push(`→ ${r}`);
  return lines;
}
