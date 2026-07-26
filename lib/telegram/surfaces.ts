// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * TOC Ops Telegram surface registry — separation by concern + naming SSOT.
 *
 * Naming grammar (middle-dot U+00B7 — never hyphen mix):
 *
 *   Ops desk:     TOC Ops · HQ
 *   Env desk:     TOC Ops · {CALL_SIGN} · {staging|dev}
 *   Sandbox:      TOC Ops · sandbox
 *   Package (ct): TOC Ops · {CODE} · {DisplayName}   ← toc-ops-repo central-tool
 *
 * Examples:
 *   TOC Ops · HQ
 *   TOC Ops · ASH · staging
 *   TOC Ops · sandbox
 *   TOC Ops · BILLY · Billy Ops
 *
 * Concerns are separate groups (not topics). Topics are *within* a group and
 * further split day-to-day noise (alerts vs day-ops vs plays).
 *
 * @see lib/telegram/branding.ts — applies titles/photos/topics
 * @see toc-ops-repo/src/central-tool/telegram-surfaces.ts — package + HQ map (ct)
 * @see docs/harness/tenants/telegram-factory.md
 */

/** Middle-dot separator (U+00B7) — never hyphen/bullet mix. */
export const TOC_OPS_TITLE_SEP = ' · ';

export const TOC_OPS_TITLE_PREFIX = 'TOC Ops';

/**
 * Concern = why this group exists (separate chat, not a topic).
 * Keep HQ / partner desks / sandbox isolated so staging noise never hits HQ.
 */
export type TocOpsConcern =
  | 'hq' // production ops desk
  | 'partner' // call-sign / partner desk (ASH, NOV, …)
  | 'sandbox'; // experiments, brand tests, noisy bots

export type TocOpsEnv = 'prod' | 'staging' | 'dev';

/** Forum topics allowed inside a concern (subset of outbox topics). */
export type TocOpsTopicSlug =
  | 'alerts'
  | 'day-ops'
  | 'aar'
  | 'plays'
  | 'balances'
  | 'onboard'
  | 'identity'
  | 'scratch'
  | 'experiments';

export type TocOpsSurfaceDef = {
  /** Stable slug for env maps / CLI `--surface`. */
  slug: string;
  concern: TocOpsConcern;
  /** Human concern label in the title (HQ, ASH, sandbox). */
  concernLabel: string;
  env?: TocOpsEnv;
  /** Optional call-sign segment (ASH, NOV) — partner desks only. */
  callSign?: string;
  /** What this group is for (description + operator docs). */
  purpose: string;
  /** Allowed / desired forum topics for this surface. */
  topics: readonly TocOpsTopicSlug[];
  /** Prefer this surface for TELEGRAM_OPS_CHAT_ID when multiple exist. */
  primaryOpsHub?: boolean;
};

/**
 * Canonical surfaces. Add partner desks by cloning `ash-staging` with a new callSign.
 * Do **not** mix concerns in one group.
 */
export const TOC_OPS_SURFACES: readonly TocOpsSurfaceDef[] = [
  {
    slug: 'hq',
    concern: 'hq',
    concernLabel: 'HQ',
    env: 'prod',
    purpose: 'Production ops desk — alerts, day-ops, AAR. Humans + pager traffic only.',
    topics: ['alerts', 'day-ops', 'aar', 'identity'],
    primaryOpsHub: true,
  },
  {
    slug: 'ash-staging',
    concern: 'partner',
    concernLabel: 'ASH',
    env: 'staging',
    callSign: 'ASH',
    purpose: 'ASH partner desk (staging) — Soft balances, plays, onboard. Not production alerts.',
    topics: ['plays', 'balances', 'onboard', 'alerts'],
  },
  {
    slug: 'sandbox',
    concern: 'sandbox',
    concernLabel: 'sandbox',
    env: 'dev',
    purpose: 'Bot / brand / template experiments. Disposable. Never route partner Soft here.',
    topics: ['scratch', 'experiments'],
  },
] as const;

export type TocOpsSurfaceSlug = (typeof TOC_OPS_SURFACES)[number]['slug'];

export function getSurface(slug: string): TocOpsSurfaceDef | undefined {
  return TOC_OPS_SURFACES.find(s => s.slug === slug);
}

export function listSurfaceSlugs(): string[] {
  return TOC_OPS_SURFACES.map(s => s.slug);
}

/**
 * Build canonical group title.
 * Partner desks: TOC Ops · {CALL_SIGN} · {env}
 * HQ / sandbox: TOC Ops · {concernLabel}   (env omitted when prod or label already encodes it)
 */
export function formatTocOpsGroupTitle(surface: TocOpsSurfaceDef): string {
  const parts: string[] = [TOC_OPS_TITLE_PREFIX];

  if (surface.concern === 'partner') {
    parts.push(surface.callSign ?? surface.concernLabel);
    if (surface.env && surface.env !== 'prod') parts.push(surface.env);
  } else if (surface.concern === 'hq') {
    parts.push('HQ');
  } else {
    parts.push(surface.concernLabel);
  }

  return parts.join(TOC_OPS_TITLE_SEP);
}

export type ParsedTocOpsTitle = {
  ok: true;
  concern: TocOpsConcern;
  callSign?: string;
  env?: TocOpsEnv;
  surfaceSlug?: string;
};

export type ParsedTocOpsTitleFail = { ok: false; reason: string };

/** Parse a group title back into concern segments (best-effort). */
export function parseTocOpsGroupTitle(title: string): ParsedTocOpsTitle | ParsedTocOpsTitleFail {
  const raw = title.trim();
  if (!raw.startsWith(`${TOC_OPS_TITLE_PREFIX}${TOC_OPS_TITLE_SEP}`)) {
    return {
      ok: false,
      reason: `title must start with "${TOC_OPS_TITLE_PREFIX}${TOC_OPS_TITLE_SEP}"`,
    };
  }
  const rest = raw.slice((TOC_OPS_TITLE_PREFIX + TOC_OPS_TITLE_SEP).length);
  const segs = rest
    .split(TOC_OPS_TITLE_SEP)
    .map(s => s.trim())
    .filter(Boolean);
  if (segs.length === 0) return { ok: false, reason: 'missing concern segment' };

  const [a, b] = segs;
  if (a === 'HQ') {
    return { ok: true, concern: 'hq', env: 'prod', surfaceSlug: 'hq' };
  }
  if (a?.toLowerCase() === 'sandbox') {
    return { ok: true, concern: 'sandbox', env: 'dev', surfaceSlug: 'sandbox' };
  }

  // Partner: CALL_SIGN [· env]
  const env = b === 'staging' || b === 'dev' || b === 'prod' ? (b as TocOpsEnv) : undefined;
  const callSign = a!.toUpperCase();
  const slug = `${callSign.toLowerCase()}-${env ?? 'prod'}`;
  const known = getSurface(slug) ?? getSurface(`${callSign.toLowerCase()}-staging`);
  return {
    ok: true,
    concern: 'partner',
    callSign,
    env: env ?? 'prod',
    surfaceSlug: known?.slug ?? slug,
  };
}

export function assertTocOpsGroupTitle(title: string): string | null {
  const p = parseTocOpsGroupTitle(title);
  return p.ok ? null : p.reason;
}

/** Titles for every registered surface (CLI / brand). */
export function allSurfaceTitles(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of TOC_OPS_SURFACES) {
    out[s.slug] = formatTocOpsGroupTitle(s);
  }
  return out;
}

/**
 * Partner package group title — aligned with toc-ops-repo `packageGroupTitle`.
 * Factory brand CLI does not create these; Soft package groups live in ct.
 */
export function formatPackageGroupTitle(code: string, displayName: string): string {
  const c = code.trim().toUpperCase();
  const d = displayName.trim() || c;
  return [TOC_OPS_TITLE_PREFIX, c, d].join(TOC_OPS_TITLE_SEP);
}

/**
 * TELEGRAM_SURFACES JSON: { "hq": "-100…", "ash-staging": "-100…", "sandbox": "-100…" }
 * Optional — brand CLI falls back to built-in defaults when unset.
 */
export function parseTelegramSurfacesMap(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
      else if (typeof v === 'number' && Number.isFinite(v)) out[k] = String(Math.trunc(v));
    }
    return out;
  } catch {
    return {};
  }
}

export function loadTelegramSurfacesMap(
  env: Record<string, string | undefined> = Bun.env
): Record<string, string> {
  return parseTelegramSurfacesMap(env.TELEGRAM_SURFACES?.trim() || null);
}

/** Resolve chat id for a surface slug (env map first). */
export function chatIdForSurface(
  slug: string,
  map: Record<string, string> = loadTelegramSurfacesMap()
): string | null {
  return map[slug] ?? null;
}

/** Primary ops hub chat: TELEGRAM_OPS_CHAT_ID, else surface marked primaryOpsHub. */
export function resolvePrimaryOpsChatId(
  env: Record<string, string | undefined> = Bun.env
): string | null {
  const direct = env.TELEGRAM_OPS_CHAT_ID?.trim();
  if (direct) return direct;
  const map = loadTelegramSurfacesMap(env);
  const primary = TOC_OPS_SURFACES.find(s => s.primaryOpsHub);
  if (primary && map[primary.slug]) return map[primary.slug]!;
  return null;
}

/** Operator-facing concern matrix for docs / `telegram:ops directory`. */
export function formatSurfaceMatrix(): string[] {
  const lines = [
    'CONCERN SEPARATION (one Telegram group per row — do not mix)',
    `${'SLUG'.padEnd(14)}  ${'TITLE'.padEnd(28)}  TOPICS`,
    `${'-'.repeat(14)}  ${'-'.repeat(28)}  ${'-'.repeat(40)}`,
  ];
  for (const s of TOC_OPS_SURFACES) {
    lines.push(
      `${s.slug.padEnd(14)}  ${formatTocOpsGroupTitle(s).padEnd(28)}  ${s.topics.join(', ')}`
    );
  }
  lines.push('');
  lines.push('Rules:');
  lines.push('  • HQ = production alerts / AAR only');
  lines.push('  • Partner desks = Soft / plays / onboard for that call-sign');
  lines.push('  • sandbox = experiments; never partner Soft');
  lines.push('  • Topics split noise inside a group; concerns split across groups');
  return lines;
}

/**
 * Preferred surface slug for an ops-channel outbox topic.
 * Staging Soft / plays never prefer HQ; experiments never prefer partner desks.
 */
export function preferredSurfaceForOutboxTopic(topic: string): string {
  switch (topic) {
    case 'alerts':
    case 'dod':
    case 'toc':
      return 'hq';
    case 'plays':
    case 'identity':
    case 'provisioning':
      return 'ash-staging';
    case 'experiments':
      return 'sandbox';
    default:
      return 'hq';
  }
}

export type ResolvedOpsChat = {
  chatId: string; // brand-ok — Telegram chat_id wire
  surfaceSlug: string | null;
  /** Where the chat id came from. */
  source: 'surface' | 'ops_chat' | 'fallback_surface';
};

/**
 * Resolve group chat for outbox rows without a DM `telegramId`.
 * Prefer concern surface from TELEGRAM_SURFACES, then TELEGRAM_OPS_CHAT_ID,
 * then any remaining bound surface (ash-staging → sandbox → hq).
 */
export function resolveOpsChatForOutbox(opts: {
  topic: string;
  env?: Record<string, string | undefined>;
}): ResolvedOpsChat | null {
  const env = opts.env ?? Bun.env;
  const preferred = preferredSurfaceForOutboxTopic(opts.topic);
  const map = loadTelegramSurfacesMap(env);
  const preferredChat = map[preferred]?.trim();
  if (preferredChat) {
    return { chatId: preferredChat, surfaceSlug: preferred, source: 'surface' };
  }

  const ops = env.TELEGRAM_OPS_CHAT_ID?.trim();
  if (ops) {
    const slug = Object.entries(map).find(([, id]) => id === ops)?.[0] ?? (preferred || null);
    return { chatId: ops, surfaceSlug: slug, source: 'ops_chat' };
  }

  for (const slug of ['ash-staging', 'sandbox', 'hq'] as const) {
    const id = map[slug]?.trim();
    if (id) return { chatId: id, surfaceSlug: slug, source: 'fallback_surface' };
  }
  return null;
}

/** Infer surface slug from env map chat id and/or canonical title. */
export function inferSurfaceSlug(opts: {
  chatId: string; // brand-ok
  title?: string | null;
  surfacesMap?: Record<string, string>;
}): string | null {
  const map = opts.surfacesMap ?? loadTelegramSurfacesMap();
  for (const [slug, id] of Object.entries(map)) {
    if (id === opts.chatId) return slug;
  }
  if (opts.title?.trim()) {
    const p = parseTocOpsGroupTitle(opts.title);
    if (p.ok && p.surfaceSlug) return p.surfaceSlug;
  }
  return null;
}
