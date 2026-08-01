// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --deep
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Package-group handshake — machine-readable reference (constants, mappings, CLI).
 *
 * Prose runbook: docs/harness/tenants/partner-package-group-handshake.md
 * Human/agent dump: bun run telegram:handshake:catalog [--json]
 *
 * When prose and code disagree, this catalog + implementing modules win.
 */
import { HANDSHAKE_CALL_SIGN_RE, HANDSHAKE_PARTNER_CODE_RE } from './handshake-ref.ts';
import {
  PACKAGE_GROUP_MEMBERS_HOUSE_ONLY,
  PACKAGE_GROUP_MEMBERS_WITH_PARTNER,
} from './package-group-membership.ts';
import { PENDING_PACKAGE_GROUPS_JSONL } from './package-group-registry.ts';
import {
  PARTNER_PACKAGE_FORUM_TOPIC_PLAN,
  PACKAGE_GROUP_FORUM_TOPIC_KEYS,
  PACKAGE_GROUP_FORUM_TOPICS,
  PACKAGE_GROUP_FORUM_TOPICS_MTProto,
  PACKAGE_GROUP_FORUMS_META_DIR,
} from './package-group-forum.ts';
import {
  ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC,
  SEAT_DESK_PARTNER_MESSAGE_TEMPLATES,
} from './seat-desk-partner-message.ts';
import {
  ALL_ACCOUNTING_FORUM_TOPICS,
  formatTocOpsGroupTitle,
  TOC_OPS_SURFACES,
} from './surfaces.ts';
import type { ReadinessPhase } from './handshake-readiness.ts';
import type { DmSeatStatus } from './dm-seat-designation.ts';
import type { PackageGroupMembershipStatus } from './package-group-membership.ts';
import {
  TELEGRAM_FORUM_ICON_COLOR_HEX,
  telegramColorWire,
  telegramTopicColorWire,
} from './telegram-color-kernel.ts';

export const HANDSHAKE_CATALOG_SCHEMA = 'factorywager.telegram-handshake-catalog.v1' as const;

export const HANDSHAKE_JSONL_ACTIONS = [
  'create_package_group',
  'ack_package_group_wired',
  'ack_package_group_linked',
  'ack_dm_seat_designated',
  'ack_forum_invite_sent',
] as const;

export const HANDSHAKE_READINESS_PHASES: readonly ReadinessPhase[] = [
  'blocked',
  'forum_ready',
  'designated',
  'operator_ready',
];

export const HANDSHAKE_DM_SEAT_STATUSES: readonly DmSeatStatus[] = [
  'none',
  'designated',
  'linked',
  'shared',
];

export const HANDSHAKE_MEMBERSHIP_STATUSES: readonly PackageGroupMembershipStatus[] = [
  'unknown',
  'understaffed',
  'house_only',
  'partner_present',
  'extended',
];

export const HANDSHAKE_VERIFY_CHECK_IDS = [
  'partner_code',
  'create_artifact',
  'title_grammar',
  'soft_wired',
  'factory_registry',
  'registry_matches_wired',
  'registry_title',
  'factory_linked_ack',
  'linked_matches_registry',
  'dm_seat',
  'forum_metadata',
  'live_forum_title',
] as const;

export const HANDSHAKE_LANE_CATALOG = [
  { id: 'registry', group: 'forum', summary: 'package_group_registry row' },
  { id: 'jsonl_create', group: 'audit', summary: 'create_package_group in JSONL' },
  { id: 'jsonl_wired', group: 'audit', summary: 'ack_package_group_wired' },
  { id: 'jsonl_linked', group: 'audit', summary: 'ack_package_group_linked' },
  {
    id: 'jsonl_dm_designated',
    group: 'audit',
    summary: 'ack_dm_seat_designated or registry requested_by',
  },
  {
    id: 'jsonl_forum_invite_sent',
    group: 'audit',
    summary: 'ack_forum_invite_sent (when 2·house!)',
  },
  { id: 'known_chat', group: 'forum', summary: 'ops_telegram_known_chats active row' },
  { id: 'known_forum', group: 'forum', summary: 'supergroup + is_forum' },
  { id: 'bot_forum_admin', group: 'forum', summary: 'bot administrator on forum' },
  {
    id: 'forum_members',
    group: 'forum',
    summary: 'member count tell; fails at 2·house! when linked',
  },
  { id: 'forum_invite_gap', group: 'forum', summary: 'linked DM but partner not in group' },
  { id: 'surface_slug', group: 'forum', summary: 'known chat surface_slug set' },
  { id: 'invite_link', group: 'forum', summary: 'registry invite_link stored' },
  { id: 'forum_metadata', group: 'forum', summary: 'reports/telegram/forums/{CODE}.json' },
  {
    id: 'forum_topics',
    group: 'forum',
    summary: 'partner plan: general/ops/alerts/liquidity/outs/accounting',
  },
  { id: 'route_alerts', group: 'routing', summary: 'alerts → forum thread' },
  { id: 'route_plays', group: 'routing', summary: 'plays → forum thread' },
  { id: 'route_toc', group: 'routing', summary: 'toc → forum thread' },
  { id: 'surface_env_pkg', group: 'routing', summary: 'TELEGRAM_SURFACES pkg-{code} bind' },
  { id: 'seat_tree', group: 'operator', summary: 'tree_nodes row for designated seat' },
  { id: 'dm_designated', group: 'operator', summary: 'registry requested_by / designate-dm-seat' },
  { id: 'dm_telegram', group: 'operator', summary: 'tree_nodes.telegram_id linked' },
  { id: 'welcome_dm', group: 'operator', summary: 'package-room welcome can send' },
  {
    id: 'bot_commands',
    group: 'operator',
    summary: '/status · /dossier · /limits · /seat · play callbacks',
  },
] as const;

export const HANDSHAKE_CLI_CATALOG = [
  {
    id: 'onboard-create',
    script: 'bun tools/onboard-partner-package.ts',
    ref: 'call-sign',
    example: 'bun tools/onboard-partner-package.ts ASH-001 --create-package-group',
  },
  {
    id: 'link-package-group',
    script: 'bun run telegram:ops -- link-package-group',
    ref: 'partner CODE',
    flags: ['--invite', '--no-dm', '--no-ack', '--requested-by'],
  },
  {
    id: 'designate-dm-seat',
    script: 'bun run telegram:ops -- designate-dm-seat',
    ref: 'partner CODE + call-sign',
    flags: ['--force'],
  },
  {
    id: 'send-forum-invite',
    script: 'bun run telegram:ops -- send-forum-invite',
    ref: 'partner CODE',
    flags: ['--all', '--dry-run', '--force'],
  },
  {
    id: 'handshake-verify',
    script: 'bun run telegram:handshake:verify',
    ref: 'partner CODE',
    flags: ['--live', '--json'],
  },
  {
    id: 'handshake-desk',
    script: 'bun run telegram:handshake:desk',
    ref: 'optional CODE',
    flags: ['--refresh', '--live', '--invite-gap', '--detail', '--json', '--db', '--path'],
    exitCodes: { 0: 'ok', 1: '--invite-gap with gaps' },
  },
  {
    id: 'handshake-readiness',
    script: 'bun run telegram:handshake:readiness',
    ref: 'optional CODE',
    flags: ['--detail', '--deep', '--live', '--json', '--db', '--path'],
    exitCodes: { 0: 'ok', 1: 'any row phase blocked' },
    note: 'Duplicate: bun run telegram:ops -- readiness (same tool)',
  },
  {
    id: 'handshake-invite-gap',
    script: 'bun run telegram:handshake:invite-gap',
    ref: 'optional CODE',
    flags: ['--refresh', '--send', '--dry-run', '--force', '--json'],
    exitCodes: { 0: 'no gaps', 1: '2·house! rows remain' },
  },
  {
    id: 'seat-map',
    script: 'bun run telegram:ops -- seat-map',
    ref: 'none',
  },
  {
    id: 'link-chat',
    script: 'bun tools/telegram-link-chat.ts',
    ref: 'call-sign + telegram ref',
  },
  {
    id: 'seat-desk-partner-message',
    script: 'bun run seat:desk:partner-message',
    ref: 'call-sign',
    flags: ['--template', '--post', '--json'],
    note: 'Templates: confirm-active · todo · reply-hint · topic-intake · topic-rails · topic-accounting',
  },
  {
    id: 'seat-desk-topic-prompts',
    script: 'bun run seat:desk:topic-prompts',
    ref: 'call-sign',
    flags: ['--post'],
    note: 'Posts topic-intake + topic-rails to Liquidity/Outs thread',
  },
  {
    id: 'seat-desk-accounting-prompt',
    script: 'bun run seat:desk:accounting-prompt',
    ref: 'call-sign',
    flags: ['--post', '--thread-id'],
    note: 'Accounting topic bootstrap when bot lacks can_manage_topics',
  },
  {
    id: 'package-group-accounting',
    script: 'bun run telegram:package-group:accounting',
    ref: 'optional partner CODE',
    flags: ['--all', '--ensure-topics', '--accounting-prompt'],
    note: 'Bulk ensure Accounting topic + prompt for all linked forums',
  },
  {
    id: 'all-accounting-channel',
    script: 'bun run telegram:all-accounting',
    ref: 'chat id',
    flags: ['--brand', '--post-prompt'],
    note: 'House rollup supergroup — TELEGRAM_ACCOUNTING_CHAT_ID',
  },
  {
    id: 'catalog-research',
    script: 'bun run telegram:catalog:research',
    ref: 'none',
    flags: ['--json', '--llm', '--partner'],
    note: 'Enhancement proposals → reports/telegram/catalog-enhancements.json',
  },
  {
    id: 'catalog-apply-enhancements',
    script: 'bun run telegram:catalog:apply-enhancements',
    ref: 'none',
    flags: ['--dry-run', '--all'],
    note: 'Merge safe changes → catalog-overrides.json + regenerate handshake catalog',
  },
] as const;

export const HANDSHAKE_PACKAGE_FORUM_TOPICS = {
  kind: 'partner-package-forum' as const,
  plan: PACKAGE_GROUP_FORUM_TOPICS,
  mtproto: PACKAGE_GROUP_FORUM_TOPICS_MTProto,
  rows: PARTNER_PACKAGE_FORUM_TOPIC_PLAN,
  threadMapKeys: PACKAGE_GROUP_FORUM_TOPIC_KEYS,
  mapKeyRule: 'title.toLowerCase()' as const,
  metadataPath: (code: string) => `${PACKAGE_GROUP_FORUMS_META_DIR}/${code.toUpperCase()}.json`,
  /** Seat desk pinned in Liquidity/Outs; deposit/withdraw proof in Accounting. */
  deskTopicKey: PACKAGE_GROUP_FORUM_TOPIC_KEYS.liquidityOuts,
  accountingTopicKey: PACKAGE_GROUP_FORUM_TOPIC_KEYS.accounting,
} as const;

/** House supergroup topic plans — NOT partner package forums. SSOT: `surfaces.ts`. */
export const HANDSHAKE_HOUSE_FORUM_TOPICS = {
  kind: 'house-surface' as const,
  surfaces: Object.fromEntries(
    TOC_OPS_SURFACES.map(s => [
      s.slug,
      {
        groupTitle: formatTocOpsGroupTitle(s),
        topicSlugs: [...s.topics],
      },
    ])
  ),
  allAccountingForumTitles: [...ALL_ACCOUNTING_FORUM_TOPICS],
} as const;

/** Catalog-row refs for intake-driven pinned prompts (metadata only — not live Telegram posts). */
export const DEFAULT_PINNED_TEMPLATE_REFS = {
  [`partner:${PACKAGE_GROUP_FORUM_TOPIC_KEYS.accounting}`]: {
    templateId: 'topic-accounting',
    builder: 'buildSeatDeskAccountingTopicPrompt',
  },
  [`partner:${PACKAGE_GROUP_FORUM_TOPIC_KEYS.liquidityOuts}:intake`]: {
    templateId: 'topic-intake',
    builder: 'buildSeatDeskTopicPrompt',
  },
  [`partner:${PACKAGE_GROUP_FORUM_TOPIC_KEYS.liquidityOuts}:rails`]: {
    templateId: 'topic-rails',
    builder: 'buildSeatDeskTopicPrompt',
  },
  'house:all-accounting': {
    templateId: 'all-accounting-channel',
    builder: ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC.builder,
  },
} as const;

export const HANDSHAKE_SEAT_DESK_TEMPLATES = {
  partner: SEAT_DESK_PARTNER_MESSAGE_TEMPLATES,
  allAccountingChannel: ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC,
  pinnedTemplateRefs: DEFAULT_PINNED_TEMPLATE_REFS,
} as const;

export const HANDSHAKE_DOC_ROUTING = {
  runbook: 'docs/harness/tenants/partner-package-group-handshake.md',
  factoryBot: 'docs/harness/tenants/telegram-factory.md',
  seatCapitalDesk: 'docs/harness/tenants/seat-capital-desk.md',
  deskAdr: 'docs/adr/0003-telegram-handshake-desk.md',
  moduleIndex: 'lib/telegram/README.md',
  softPlane: 'toc-ops-repo/docs/system/TELEGRAM.md',
} as const;

export const HANDSHAKE_CONSTANTS = {
  partnerCodeRegex: HANDSHAKE_PARTNER_CODE_RE.source,
  callSignRegex: HANDSHAKE_CALL_SIGN_RE.source,
  membersHouseOnly: PACKAGE_GROUP_MEMBERS_HOUSE_ONLY,
  membersWithPartner: PACKAGE_GROUP_MEMBERS_WITH_PARTNER,
  membershipCells: ['2·house', '2·house!', '3·OK', 'N·ext'] as const,
  jsonlPath: PENDING_PACKAGE_GROUPS_JSONL,
  forumsMetaDir: PACKAGE_GROUP_FORUMS_META_DIR,
  surfacesPkgKey: (code: string) => `pkg-${code.toLowerCase()}`,
  registryTable: 'package_group_registry',
  knownChatsTable: 'ops_telegram_known_chats',
} as const;

export const HANDSHAKE_ENV_KEYS = [
  { key: 'TELEGRAM_BOT_FACTORY', plane: 'factory', purpose: 'Bot token (preferred)' },
  { key: 'TELEGRAM_OPS_CHAT_ID', plane: 'factory', purpose: 'Default ops supergroup fallback' },
  {
    key: 'TELEGRAM_ACCOUNTING_CHAT_ID',
    plane: 'factory',
    purpose: 'Cross-partner all-accounting supergroup (alias all-accounting surface)',
  },
  {
    key: 'TELEGRAM_SURFACES',
    plane: 'factory',
    purpose: 'JSON slug→chat_id; includes pkg-{code} for package forums',
  },
  { key: 'TELEGRAM_TOPICS', plane: 'factory', purpose: 'Forum thread id map' },
  { key: 'OPS_DB_PATH', plane: 'factory', purpose: 'SQLite ops db (registry + known chats)' },
] as const;

/** Glossary concept ids owned by lib/telegram/telegram-glossary.ts (keep in sync). */
export const TELEGRAM_GLOSSARY_CONCEPT_IDS = [
  'telegram.wire',
  'telegram.package_group',
  'telegram.forum.topic',
  'telegram.topic_map',
  'telegram.forum.topic.accounting',
  'telegram.forum.topic.liquidity_outs',
  'telegram.surface',
  'telegram.surface.all_accounting',
  'telegram.seat_desk',
  'telegram.deposit_rail',
  'telegram.handshake',
  'telegram.membership',
  'telegram.topic_plan_row',
] as const;

export function buildHandshakeColorMap() {
  const packageTopics = Object.fromEntries(
    Object.values(PACKAGE_GROUP_FORUM_TOPIC_KEYS).map(mapKey => [
      mapKey,
      {
        ...telegramTopicColorWire(mapKey),
        conceptId:
          mapKey === 'accounting'
            ? 'telegram.forum.topic.accounting'
            : mapKey === 'liquidity/outs'
              ? 'telegram.forum.topic.liquidity_outs'
              : 'telegram.forum.topic',
      },
    ])
  );
  const allAccountingTopics = Object.fromEntries(
    ALL_ACCOUNTING_FORUM_TOPICS.map(title => {
      const mapKey = title.toLowerCase();
      return [
        title,
        {
          ...telegramTopicColorWire(mapKey),
          conceptId: 'telegram.surface.all_accounting',
        },
      ];
    })
  );
  return {
    brand: telegramColorWire('brand'),
    packageTopics,
    allAccountingTopics,
    forumIconColorHex: [...TELEGRAM_FORUM_ICON_COLOR_HEX],
    scrapeWireTaxonomyPath: '/registry/scrape-wire-taxonomy.json',
    bookColorNote: 'Deposit book chips resolve hex via scrape-wire bookRegistry colorKey/hex',
  } as const;
}

export type HandshakeCatalog = {
  schema: typeof HANDSHAKE_CATALOG_SCHEMA;
  generatedAt: string;
  docs: typeof HANDSHAKE_DOC_ROUTING;
  constants: typeof HANDSHAKE_CONSTANTS;
  packageForumTopics: typeof HANDSHAKE_PACKAGE_FORUM_TOPICS;
  houseForumTopics: typeof HANDSHAKE_HOUSE_FORUM_TOPICS;
  seatDeskTemplates: typeof HANDSHAKE_SEAT_DESK_TEMPLATES;
  colors: ReturnType<typeof buildHandshakeColorMap>;
  glossary: {
    path: '/portal/glossary/';
    boardPath: '/portal/partners/';
    conceptIds: readonly (typeof TELEGRAM_GLOSSARY_CONCEPT_IDS)[number][];
  };
  jsonlActions: readonly string[];
  readinessPhases: readonly ReadinessPhase[];
  dmSeatStatuses: readonly DmSeatStatus[];
  membershipStatuses: readonly PackageGroupMembershipStatus[];
  verifyChecks: readonly string[];
  lanes: readonly (typeof HANDSHAKE_LANE_CATALOG)[number][];
  cli: readonly (typeof HANDSHAKE_CLI_CATALOG)[number][];
  envKeys: readonly (typeof HANDSHAKE_ENV_KEYS)[number][];
};

export function buildHandshakeCatalog(now = new Date()): HandshakeCatalog {
  return {
    schema: HANDSHAKE_CATALOG_SCHEMA,
    generatedAt: now.toISOString(),
    docs: HANDSHAKE_DOC_ROUTING,
    constants: HANDSHAKE_CONSTANTS,
    packageForumTopics: HANDSHAKE_PACKAGE_FORUM_TOPICS,
    houseForumTopics: HANDSHAKE_HOUSE_FORUM_TOPICS,
    seatDeskTemplates: HANDSHAKE_SEAT_DESK_TEMPLATES,
    colors: buildHandshakeColorMap(),
    glossary: {
      path: '/portal/glossary/',
      boardPath: '/portal/partners/',
      conceptIds: [...TELEGRAM_GLOSSARY_CONCEPT_IDS],
    },
    jsonlActions: [...HANDSHAKE_JSONL_ACTIONS],
    readinessPhases: [...HANDSHAKE_READINESS_PHASES],
    dmSeatStatuses: [...HANDSHAKE_DM_SEAT_STATUSES],
    membershipStatuses: [...HANDSHAKE_MEMBERSHIP_STATUSES],
    verifyChecks: [...HANDSHAKE_VERIFY_CHECK_IDS],
    lanes: [...HANDSHAKE_LANE_CATALOG],
    cli: [...HANDSHAKE_CLI_CATALOG],
    envKeys: [...HANDSHAKE_ENV_KEYS],
  };
}

export function formatHandshakeCatalogHuman(catalog: HandshakeCatalog): string[] {
  const lines: string[] = [
    `telegram handshake catalog · ${catalog.schema}`,
    '',
    'Docs (prose — link here; do not duplicate constants in new files):',
    ...Object.entries(catalog.docs).map(([k, v]) => `  ${k}: ${v}`),
    '',
    'Constants:',
    `  partner_code  ${catalog.constants.partnerCodeRegex}`,
    `  call_sign     ${catalog.constants.callSignRegex}`,
    `  members       house=${catalog.constants.membersHouseOnly} partner=${catalog.constants.membersWithPartner} cells=${catalog.constants.membershipCells.join(' · ')}`,
    `  jsonl         ${catalog.constants.jsonlPath}`,
    `  forums meta   ${catalog.constants.forumsMetaDir}`,
    '',
    'Package forum topics (every partner — same titles, per-chat thread ids):',
    `  plan          ${catalog.packageForumTopics.plan.join(' · ')}`,
    `  map keys      ${Object.values(catalog.packageForumTopics.threadMapKeys).join(' · ')}`,
    `  desk thread   ${catalog.packageForumTopics.deskTopicKey}`,
    `  accounting    ${catalog.packageForumTopics.accountingTopicKey}`,
    '',
    'House surface topics (separate supergroups — not partner forums):',
    ...Object.entries(catalog.houseForumTopics.surfaces).map(
      ([slug, s]) => `  ${slug.padEnd(16)} ${s.groupTitle} → ${s.topicSlugs.join(' · ')}`
    ),
    '',
    `Seat desk templates (${Object.keys(catalog.seatDeskTemplates.partner).length}): ${Object.keys(catalog.seatDeskTemplates.partner).join(' · ')}`,
    `  all-accounting ${catalog.seatDeskTemplates.allAccountingChannel.cli}`,
    '',
    `JSONL actions (${catalog.jsonlActions.length}): ${catalog.jsonlActions.join(' · ')}`,
    `Phases: ${catalog.readinessPhases.join(' → ')}`,
    `DM seat: ${catalog.dmSeatStatuses.join(' · ')}`,
    '',
    `Verify checks (${catalog.verifyChecks.length}): ${catalog.verifyChecks.join(' · ')}`,
    '',
    'Deep lanes:',
    ...catalog.lanes.map(l => `  [${l.group}] ${l.id} — ${l.summary}`),
    '',
    'CLI:',
    ...catalog.cli.map(c => {
      const flags = 'flags' in c && c.flags?.length ? ` flags=${c.flags.join(',')}` : '';
      return `  ${c.script}${flags}`;
    }),
    '',
    'Env:',
    ...catalog.envKeys.map(e => `  ${e.key} — ${e.purpose}`),
    '',
    'Regenerate JSON: bun run telegram:handshake:catalog --json',
  ];
  return lines;
}
