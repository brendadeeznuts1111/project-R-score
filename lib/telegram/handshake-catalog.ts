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
import { PACKAGE_GROUP_FORUMS_META_DIR } from './package-group-forum.ts';
import type { ReadinessPhase } from './handshake-readiness.ts';
import type { DmSeatStatus } from './dm-seat-designation.ts';
import type { PackageGroupMembershipStatus } from './package-group-membership.ts';

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
  { id: 'forum_topics', group: 'forum', summary: 'general/ops/alerts topic plan' },
  { id: 'route_alerts', group: 'routing', summary: 'alerts → forum thread' },
  { id: 'route_plays', group: 'routing', summary: 'plays → forum thread' },
  { id: 'route_toc', group: 'routing', summary: 'toc → forum thread' },
  { id: 'surface_env_pkg', group: 'routing', summary: 'TELEGRAM_SURFACES pkg-{code} bind' },
  { id: 'seat_tree', group: 'operator', summary: 'tree_nodes row for designated seat' },
  { id: 'dm_designated', group: 'operator', summary: 'registry requested_by / designate-dm-seat' },
  { id: 'dm_telegram', group: 'operator', summary: 'tree_nodes.telegram_id linked' },
  { id: 'welcome_dm', group: 'operator', summary: 'package-room welcome can send' },
  { id: 'bot_commands', group: 'operator', summary: '/status · /seat · play callbacks' },
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
] as const;

export const HANDSHAKE_DOC_ROUTING = {
  runbook: 'docs/harness/tenants/partner-package-group-handshake.md',
  factoryBot: 'docs/harness/tenants/telegram-factory.md',
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
    key: 'TELEGRAM_SURFACES',
    plane: 'factory',
    purpose: 'JSON slug→chat_id; includes pkg-{code} for package forums',
  },
  { key: 'TELEGRAM_TOPICS', plane: 'factory', purpose: 'Forum thread id map' },
  { key: 'OPS_DB_PATH', plane: 'factory', purpose: 'SQLite ops db (registry + known chats)' },
] as const;

export type HandshakeCatalog = {
  schema: typeof HANDSHAKE_CATALOG_SCHEMA;
  generatedAt: string;
  docs: typeof HANDSHAKE_DOC_ROUTING;
  constants: typeof HANDSHAKE_CONSTANTS;
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
