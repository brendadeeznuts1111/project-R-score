// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite
/**
 * Deep handshake lanes — per-concern gates for package-group E2E readiness.
 */
import type { Database } from 'bun:sqlite';
import type { OpsChannelTopic } from '../channels/ops-channel-event.ts';
import { assessPackageGroupDmSeat } from './dm-seat-designation.ts';
import {
  interpretPackageGroupMemberCount,
  membershipForumLaneOk,
  probeLinkedSeatInForum,
} from './package-group-membership.ts';
import { getKnownChatById } from './known-chats.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUMS_META_DIR,
  resolvePackageGroupTopicsForChat,
  threadIdForPackageGroupOutboxTopic,
  topicsPlanComplete,
  validateForumMetadataAgainstRegistry,
} from './package-group-forum.ts';
import {
  getPackageGroupRegistry,
  PENDING_PACKAGE_GROUPS_JSONL,
  readPackageGroupEventLog,
  suggestPackageGroupSurfacesMap,
  type PackageGroupRegistryRow,
} from './package-group-registry.ts';
import { loadTelegramSurfacesMap } from './surfaces.ts';
import {
  latestCreateForPartner,
  latestLinkedAckForPartner,
  latestWiredAckForPartner,
} from './verify-package-group-handshake.ts';
import { latestForumInviteSentAck } from './package-group-registry.ts';

export type HandshakeLaneGroup = 'forum' | 'audit' | 'routing' | 'operator';

export type HandshakeLane = {
  id: string; // brand-ok — lane label
  group: HandshakeLaneGroup;
  ok: boolean;
  detail: string;
  /** True when this lane intentionally waits for operator telegram link. */
  blockedUntilTelegramLink: boolean;
};

export type HandshakeLaneReport = {
  partnerCode: string;
  lanes: HandshakeLane[];
  readyNow: string[];
  blockedUntilLink: string[];
  allForumReady: boolean;
  allOperatorReady: boolean;
};

function lane(
  id: string, // brand-ok — lane label
  group: HandshakeLaneGroup,
  ok: boolean,
  detail: string,
  blockedUntilTelegramLink = false
): HandshakeLane {
  return { id, group, ok, detail, blockedUntilTelegramLink };
}

function outboxLane(
  id: string, // brand-ok — lane label
  topic: OpsChannelTopic,
  topics: Record<string, number> | null,
  eventType?: string
): HandshakeLane {
  if (!topics) {
    return lane(id, 'routing', false, `${topic}: no forum topics map`);
  }
  const threadId = threadIdForPackageGroupOutboxTopic(topics, topic, eventType);
  const ok = threadId != null && threadId > 0;
  return lane(
    id,
    'routing',
    ok,
    ok ? `${topic}→thread ${threadId}` : `${topic}: no thread mapping`,
    false
  );
}

export async function assessHandshakeLanes(opts: {
  db: Database;
  partnerCode: string;
  jsonlPath?: string;
  forumsMetaDir?: string;
  env?: Record<string, string | undefined>;
  telegramToken?: string | null;
}): Promise<HandshakeLaneReport> {
  const code = opts.partnerCode.toUpperCase().trim();
  const forumsMetaDir = opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR;
  const reg = getPackageGroupRegistry(opts.db, code);
  const jsonlPath = opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const log = await readPackageGroupEventLog(jsonlPath);
  const create = log.length ? latestCreateForPartner(log, code) : null;
  const wired = log.length ? latestWiredAckForPartner(log, code) : null;
  const linked = log.length ? latestLinkedAckForPartner(log, code) : null;
  const dmSeat = assessPackageGroupDmSeat(opts.db, code);
  const meta = reg ? await loadPackageGroupForumMetadata(code, { rootDir: forumsMetaDir }) : null;
  const topics =
    reg != null
      ? ((await resolvePackageGroupTopicsForChat(opts.db, reg.chatId, forumsMetaDir))?.topics ??
        null)
      : null;

  const lanes: HandshakeLane[] = [];

  lanes.push(
    lane(
      'registry',
      'forum',
      reg != null,
      reg ? `chat_id=${reg.chatId}` : 'no package_group_registry row'
    )
  );

  lanes.push(
    lane(
      'jsonl_create',
      'audit',
      create != null,
      create ? `requested_by=${create.requested_by ?? '—'}` : 'missing create_package_group'
    )
  );
  lanes.push(
    lane(
      'jsonl_wired',
      'audit',
      wired != null,
      wired ? `chat_id=${wired.chat_id}` : 'missing ack_package_group_wired'
    )
  );
  lanes.push(
    lane(
      'jsonl_linked',
      'audit',
      linked != null,
      linked ? `at ${linked.timestamp}` : 'missing ack_package_group_linked'
    )
  );
  const dmAckEntry = log.find(
    e =>
      e.action === 'ack_dm_seat_designated' &&
      e.partner_code === code &&
      e.call_sign === (reg?.requestedBy ?? dmSeat.callSign ?? '')
  );
  lanes.push(
    lane(
      'jsonl_dm_designated',
      'audit',
      dmAckEntry != null ||
        (reg?.requestedBy != null &&
          (create?.requested_by == null || create.requested_by === reg.requestedBy)),
      dmAckEntry
        ? `ack at ${dmAckEntry.timestamp}`
        : reg?.requestedBy
          ? `registry requested_by=${reg.requestedBy}${create?.requested_by && create.requested_by !== reg.requestedBy ? ' (≠ create)' : ''}`
          : 'run designate-dm-seat'
    )
  );

  if (reg) {
    const known = getKnownChatById(opts.db, reg.chatId);
    lanes.push(
      lane(
        'known_chat',
        'forum',
        known != null && known.active,
        known
          ? known.active
            ? `title=${known.title ?? '—'}`
            : 'known chat inactive'
          : 'chat not in telegram_known_chats — run directory --refresh'
      )
    );
    lanes.push(
      lane(
        'known_forum',
        'forum',
        known?.isForum === true,
        known?.isForum ? 'supergroup+forum' : 'not marked as forum'
      )
    );
    const botOk =
      known?.botStatus != null &&
      ['administrator', 'creator'].includes(known.botStatus.toLowerCase());
    lanes.push(
      lane(
        'bot_forum_admin',
        'forum',
        botOk,
        known?.botStatus ? `bot=${known.botStatus}` : 'bot status unknown — refresh known chats'
      )
    );
    const membership = interpretPackageGroupMemberCount(known?.memberCount ?? null, {
      dmSeatStatus: dmSeat.status,
      linkedSeatInForum:
        opts.telegramToken &&
        dmSeat.telegramId &&
        (dmSeat.status === 'linked' || dmSeat.status === 'shared')
          ? await probeLinkedSeatInForum(opts.telegramToken, reg.chatId, dmSeat.telegramId)
          : false,
    });
    lanes.push(
      lane(
        'forum_members',
        'forum',
        membershipForumLaneOk(membership, dmSeat.status),
        membership.detail
      )
    );
    if (membership.needsPartnerInForum) {
      const inviteSent = latestForumInviteSentAck(log, code);
      lanes.push(
        lane(
          'forum_invite_gap',
          'forum',
          false,
          inviteSent
            ? `2·house! — invite DM sent ${inviteSent.timestamp}`
            : '2·house! — partner not in forum; send invite DM'
        )
      );
      lanes.push(
        lane(
          'jsonl_forum_invite_sent',
          'audit',
          inviteSent != null,
          inviteSent
            ? `${inviteSent.call_sign} at ${inviteSent.timestamp}`
            : 'no ack_forum_invite_sent — run send-forum-invite'
        )
      );
    } else {
      lanes.push(
        lane(
          'forum_invite_gap',
          'forum',
          true,
          membership.status === 'partner_present'
            ? membership.memberCount === 2
              ? '2·OK — linked seat in forum (single-operator harness)'
              : '3·OK — partner in forum'
            : 'n/a (pre-link or partner present)'
        )
      );
    }
    lanes.push(
      lane(
        'surface_slug',
        'forum',
        Boolean(known?.surfaceSlug?.trim()),
        known?.surfaceSlug ? `surface=${known.surfaceSlug}` : 'no surface slug on known chat'
      )
    );
    lanes.push(
      lane(
        'invite_link',
        'forum',
        Boolean(reg.inviteLink?.trim()),
        reg.inviteLink ? 'stored in registry' : 'no invite — welcome DM will omit join link'
      )
    );

    if (meta) {
      const v = validateForumMetadataAgainstRegistry(meta, code, reg.chatId);
      lanes.push(lane('forum_metadata', 'forum', v.ok, v.detail));
      lanes.push(
        lane(
          'forum_topics',
          'forum',
          topicsPlanComplete(meta.topics),
          topicsPlanComplete(meta.topics)
            ? 'partner plan complete: general/ops/alerts/liquidity/outs/accounting'
            : 'partial topic plan'
        )
      );
    } else {
      lanes.push(
        lane('forum_metadata', 'forum', false, 'no reports/telegram/forums metadata file')
      );
    }

    lanes.push(outboxLane('route_alerts', 'alerts', topics));
    lanes.push(outboxLane('route_plays', 'plays', topics, 'play.new'));
    lanes.push(outboxLane('route_toc', 'toc', topics, 'toc.soft.posted'));

    const envMap = loadTelegramSurfacesMap(opts.env ?? Bun.env);
    const _suggested = suggestPackageGroupSurfacesMap([reg]);
    const pkgKey = `pkg-${code.toLowerCase()}`;
    const envBound = envMap[pkgKey] === reg.chatId;
    lanes.push(
      lane(
        'surface_env_pkg',
        'routing',
        envBound,
        envBound
          ? `TELEGRAM_SURFACES ${pkgKey}=${reg.chatId}`
          : `missing ${pkgKey} in TELEGRAM_SURFACES (suggested bind)`
      )
    );

    lanes.push(
      lane(
        'seat_tree',
        'operator',
        dmSeat.seatExists || dmSeat.status === 'none',
        dmSeat.callSign
          ? dmSeat.seatExists
            ? `${dmSeat.callSign} · ${dmSeat.seatName ?? 'seat'}`
            : `no tree_nodes row for ${dmSeat.callSign}`
          : 'no DM seat designated'
      )
    );
    lanes.push(
      lane(
        'dm_designated',
        'operator',
        dmSeat.status !== 'none',
        dmSeat.callSign
          ? `${dmSeat.callSign} · ${dmSeat.status}`
          : 'undesignated — run designate-dm-seat'
      )
    );
    lanes.push(
      lane(
        'dm_telegram',
        'operator',
        dmSeat.welcomeDmReady,
        dmSeat.telegramId
          ? `telegram_id=${dmSeat.telegramId}`
          : 'awaiting bun tools/telegram-link-chat.ts',
        !dmSeat.welcomeDmReady
      )
    );
    lanes.push(
      lane(
        'welcome_dm',
        'operator',
        dmSeat.welcomeDmReady,
        dmSeat.welcomeDmReady
          ? 'package-room welcome can send'
          : dmSeat.status === 'designated'
            ? 'blocked until telegram link'
            : 'blocked — designate seat + link telegram',
        !dmSeat.welcomeDmReady
      )
    );
    lanes.push(
      lane(
        'bot_commands',
        'operator',
        dmSeat.botCommandsReady,
        dmSeat.botCommandsReady
          ? '/status · /seat · play callbacks ready'
          : 'blocked until operator telegram linked',
        !dmSeat.botCommandsReady
      )
    );
  }

  const readyNow = lanes.filter(l => l.ok && !l.blockedUntilTelegramLink).map(l => l.id);
  const blockedUntilLink = lanes.filter(l => l.blockedUntilTelegramLink && !l.ok).map(l => l.id);

  const forumIds = new Set([
    'registry',
    'known_chat',
    'known_forum',
    'bot_forum_admin',
    'forum_members',
    'forum_invite_gap',
    'forum_metadata',
    'forum_topics',
  ]);
  const routingCore = new Set(['route_alerts', 'route_plays', 'route_toc']);
  const operatorIds = new Set(['dm_telegram', 'welcome_dm', 'bot_commands']);

  return {
    partnerCode: code,
    lanes,
    readyNow,
    blockedUntilLink,
    allForumReady: lanes.filter(l => forumIds.has(l.id) || routingCore.has(l.id)).every(l => l.ok),
    allOperatorReady: lanes.filter(l => operatorIds.has(l.id)).every(l => l.ok),
  };
}

export function formatHandshakeLaneReport(report: HandshakeLaneReport): string[] {
  const out = [
    `${report.partnerCode} · lanes ${report.lanes.filter(l => l.ok).length}/${report.lanes.length}`,
    `  ready now (${report.readyNow.length}): ${report.readyNow.join(', ') || '—'}`,
    `  blocked until telegram (${report.blockedUntilLink.length}): ${report.blockedUntilLink.join(', ') || '—'}`,
  ];
  const groups: HandshakeLaneGroup[] = ['forum', 'audit', 'routing', 'operator'];
  for (const g of groups) {
    const groupLanes = report.lanes.filter(l => l.group === g);
    if (groupLanes.length === 0) continue;
    out.push(`  ${g}:`);
    for (const l of groupLanes) {
      out.push(`    ${l.ok ? '✓' : '✗'} ${l.id}: ${l.detail}`);
    }
  }
  return out;
}

export function suggestedSurfacesEnvBlock(registry: readonly PackageGroupRegistryRow[]): string[] {
  const map = suggestPackageGroupSurfacesMap(registry);
  const lines = ['# Suggested TELEGRAM_SURFACES package-group binds', 'TELEGRAM_SURFACES={'];
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  for (const [slug, chatId] of entries) {
    lines.push(`  "${slug}": "${chatId}",`);
  }
  lines.push('}');
  return lines;
}
