// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Live TOC Ops concern graph — known chats + surfaces + outbox routing.
 *
 *   bun run telegram:ops -- graph
 *   bun run telegram:ops -- graph --mermaid
 */
import type { KnownChatRow } from './known-chats.ts';
import type { PackageGroupRegistryRow } from './package-group-registry.ts';
import { suggestPackageGroupSurfacesMap } from './package-group-registry.ts';
import {
  TOC_OPS_SURFACES,
  formatTocOpsGroupTitle,
  loadTelegramSurfacesMap,
  preferredSurfaceForOutboxTopic,
  type TocOpsSurfaceDef,
} from './surfaces.ts';
import { OPS_CHANNEL_TOPICS } from '../channels/ops-channel-event.ts';

export type SurfaceLiveBinding = {
  slug: string;
  title: string;
  purpose: string;
  topics: readonly string[];
  concern: string;
  /** Bound chat id from env map and/or known chats. */
  chatId: string | null; // brand-ok
  known: KnownChatRow | null;
  status: 'live' | 'env-only' | 'missing';
  isOpsHub: boolean;
};

export type OutboxRouteEdge = {
  topic: string;
  preferredSurface: string;
  resolvedChatId: string | null; // brand-ok
};

export type SurfaceGraphModel = {
  generatedAt: string;
  botLabel: string;
  opsChatId: string | null; // brand-ok
  surfacesEnvSet: boolean;
  bindings: SurfaceLiveBinding[];
  privateChats: KnownChatRow[];
  unboundGroups: KnownChatRow[];
  routes: OutboxRouteEdge[];
  /** Suggested TELEGRAM_SURFACES JSON from live + env. */
  suggestedSurfacesJson: string;
  gaps: string[];
};

function chatBySurface(rows: KnownChatRow[], slug: string): KnownChatRow | undefined {
  return rows.find(r => r.active && r.surfaceSlug === slug);
}

function chatById(rows: KnownChatRow[], chatId: string): KnownChatRow | undefined {
  // brand-ok — wire id lookup
  return rows.find(r => r.chatId === chatId);
}

/** Merge TELEGRAM_SURFACES + inferred known-chat surface_slug + package groups. */
export function suggestTelegramSurfacesMap(opts: {
  knownChats: KnownChatRow[];
  env?: Record<string, string | undefined>;
  packageGroups?: readonly PackageGroupRegistryRow[];
}): Record<string, string> {
  const envMap = loadTelegramSurfacesMap(opts.env ?? Bun.env);
  const out: Record<string, string> = { ...envMap };
  for (const row of opts.knownChats) {
    if (!row.active || !row.surfaceSlug) continue;
    if (row.chatType === 'private' || row.chatType === 'channel') continue;
    if (!out[row.surfaceSlug]) out[row.surfaceSlug] = row.chatId;
  }
  if (opts.packageGroups?.length) {
    const pkg = suggestPackageGroupSurfacesMap(opts.packageGroups);
    for (const [slug, chatId] of Object.entries(pkg)) {
      if (!out[slug]) out[slug] = chatId;
    }
  }
  return out;
}

export function buildSurfaceGraph(opts: {
  knownChats: KnownChatRow[];
  env?: Record<string, string | undefined>;
  botLabel?: string;
  packageGroups?: readonly PackageGroupRegistryRow[];
}): SurfaceGraphModel {
  const env = opts.env ?? Bun.env;
  const envMap = loadTelegramSurfacesMap(env);
  const opsChatId = env.TELEGRAM_OPS_CHAT_ID?.trim() || null;
  const suggested = suggestTelegramSurfacesMap({
    knownChats: opts.knownChats,
    env,
    packageGroups: opts.packageGroups,
  });
  const active = opts.knownChats.filter(r => r.active);

  const bindings: SurfaceLiveBinding[] = TOC_OPS_SURFACES.map((s: TocOpsSurfaceDef) => {
    const fromEnv = envMap[s.slug] ?? null;
    const fromKnown = chatBySurface(active, s.slug);
    const chatId = fromEnv ?? fromKnown?.chatId ?? suggested[s.slug] ?? null;
    const known = chatId ? (chatById(active, chatId) ?? fromKnown ?? null) : (fromKnown ?? null);
    let status: SurfaceLiveBinding['status'] = 'missing';
    if (known) status = 'live';
    else if (fromEnv) status = 'env-only';
    return {
      slug: s.slug,
      title: formatTocOpsGroupTitle(s),
      purpose: s.purpose,
      topics: s.topics,
      concern: s.concern,
      chatId,
      known: known ?? null,
      status,
      isOpsHub: opsChatId != null && chatId === opsChatId,
    };
  });

  const boundIds = new Set(bindings.map(b => b.chatId).filter(Boolean) as string[]);
  const privateChats = active.filter(r => r.chatType === 'private');
  const unboundGroups = active.filter(
    r =>
      (r.chatType === 'group' || r.chatType === 'supergroup') &&
      !boundIds.has(r.chatId) &&
      !r.surfaceSlug
  );

  const routes: OutboxRouteEdge[] = OPS_CHANNEL_TOPICS.map(topic => {
    const preferred = preferredSurfaceForOutboxTopic(topic);
    const bind = bindings.find(b => b.slug === preferred);
    const resolved =
      bind?.chatId ?? opsChatId ?? bindings.find(b => b.slug === 'ash-staging')?.chatId ?? null;
    return { topic, preferredSurface: preferred, resolvedChatId: resolved };
  });

  const gaps: string[] = [];
  for (const b of bindings) {
    if (b.status === 'missing') {
      gaps.push(
        `${b.slug} unbound — create/rename group to "${b.title}" or set TELEGRAM_SURFACES.${b.slug}`
      );
    }
  }
  if (!env.TELEGRAM_SURFACES?.trim() && Object.keys(suggested).length > 0) {
    gaps.push('TELEGRAM_SURFACES unset — copy suggested JSON into .env');
  }
  if (unboundGroups.length) {
    gaps.push(
      `${unboundGroups.length} group(s) without surface tag — rename to TOC Ops · … or brand`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    botLabel: opts.botLabel ?? '@TOC_Op_bot',
    opsChatId,
    surfacesEnvSet: Boolean(env.TELEGRAM_SURFACES?.trim()),
    bindings,
    privateChats,
    unboundGroups,
    routes,
    suggestedSurfacesJson: JSON.stringify(suggested),
    gaps,
  };
}

function escMermaid(s: string): string {
  return s.replace(/"/g, "'").replace(/\n/g, ' ');
}

function nodeId(prefix: string, key: string): string {
  return `${prefix}_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/** Mermaid flowchart from live model. */
export function formatSurfaceGraphMermaid(model: SurfaceGraphModel): string {
  const lines: string[] = ['flowchart TB', `  BOT["${escMermaid(model.botLabel)}"]`];

  lines.push('  subgraph SURFACES["Concern groups"]');
  for (const b of model.bindings) {
    const id = nodeId('S', b.slug);
    const status = b.status === 'live' ? 'LIVE' : b.status === 'env-only' ? 'ENV' : 'MISSING';
    const hub = b.isOpsHub ? ' · OPS_HUB' : '';
    const chat = b.chatId ? `<br/>${b.chatId}` : '';
    const members = b.known?.memberCount != null ? `<br/>members ${b.known.memberCount}` : '';
    lines.push(
      `    ${id}["${escMermaid(b.title)}<br/>${b.slug} · ${status}${hub}${chat}${members}"]`
    );
  }
  lines.push('  end');

  for (const b of model.bindings) {
    lines.push(`  BOT --> ${nodeId('S', b.slug)}`);
  }

  for (const b of model.bindings) {
    if (b.topics.length === 0) continue;
    const tid = nodeId('T', b.slug);
    lines.push(`  subgraph ${tid}["${b.slug} topics"]`);
    for (const t of b.topics) {
      lines.push(`    ${nodeId('TT', `${b.slug}_${t}`)}["${t}"]`);
    }
    lines.push('  end');
    lines.push(`  ${nodeId('S', b.slug)} --> ${tid}`);
  }

  if (model.privateChats.length) {
    lines.push('  subgraph DMS["Private"]');
    for (const p of model.privateChats) {
      const label = p.username ? `@${p.username}` : (p.firstName ?? p.chatId);
      lines.push(`    ${nodeId('DM', p.chatId)}["${escMermaid(label)}<br/>${p.chatId}"]`);
    }
    lines.push('  end');
    for (const p of model.privateChats) {
      lines.push(`  BOT --> ${nodeId('DM', p.chatId)}`);
    }
  }

  lines.push('  subgraph ROUTES["Outbox topic → surface"]');
  const seen = new Set<string>();
  for (const r of model.routes) {
    const key = `${r.topic}_${r.preferredSurface}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rid = nodeId('R', r.topic);
    lines.push(`    ${rid}["${r.topic}"] --> ${nodeId('S', r.preferredSurface)}`);
  }
  lines.push('  end');

  return lines.join('\n');
}

/** Compact ASCII topology for terminals. */
export function formatSurfaceGraphAscii(model: SurfaceGraphModel): string[] {
  const lines: string[] = [
    `TOC OPS SURFACE GRAPH  ${model.generatedAt.slice(0, 19).replace('T', ' ')}Z`,
    `bot ${model.botLabel}  ops_chat=${model.opsChatId ?? '(unset)'}  TELEGRAM_SURFACES=${model.surfacesEnvSet ? 'set' : 'unset'}`,
    '',
  ];

  for (const b of model.bindings) {
    const mark = b.status === 'live' ? '●' : b.status === 'env-only' ? '◐' : '○';
    const hub = b.isOpsHub ? ' [OPS_HUB]' : '';
    lines.push(`${mark} ${b.slug.padEnd(14)} ${b.title}${hub}`);
    lines.push(`    chat=${b.chatId ?? '—'}  status=${b.status}  topics=${b.topics.join(' · ')}`);
    if (b.known) {
      lines.push(
        `    members=${b.known.memberCount ?? '—'}  forum=${b.known.isForum ? 'yes' : 'no'}  bot=${b.known.botStatus ?? '—'}`
      );
    }
  }

  if (model.privateChats.length) {
    lines.push('');
    lines.push('Private');
    for (const p of model.privateChats) {
      const label = p.username ? `@${p.username}` : (p.firstName ?? p.chatId);
      lines.push(`  · ${label}  ${p.chatId}`);
    }
  }

  if (model.unboundGroups.length) {
    lines.push('');
    lines.push('Unbound groups');
    for (const g of model.unboundGroups) {
      lines.push(`  · ${g.title ?? g.chatId}  ${g.chatId}`);
    }
  }

  lines.push('');
  lines.push('Outbox routes (no DM telegramId)');
  for (const r of model.routes) {
    lines.push(
      `  ${r.topic.padEnd(14)} → ${r.preferredSurface.padEnd(14)} chat=${r.resolvedChatId ?? '—'}`
    );
  }

  lines.push('');
  lines.push(`Suggested TELEGRAM_SURFACES=${model.suggestedSurfacesJson}`);

  if (model.gaps.length) {
    lines.push('');
    lines.push('Gaps');
    for (const g of model.gaps) lines.push(`  ! ${g}`);
  }

  return lines;
}

export function formatSurfaceGraphEnvBlock(model: SurfaceGraphModel): string[] {
  return [
    '# paste into .env / ~/.reasonix/.env',
    `TELEGRAM_SURFACES=${model.suggestedSurfacesJson}`,
    model.opsChatId
      ? `TELEGRAM_OPS_CHAT_ID=${model.opsChatId}`
      : '# TELEGRAM_OPS_CHAT_ID=<primary hub chat id>',
  ];
}
