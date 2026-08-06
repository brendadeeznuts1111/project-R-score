/**
 * Join partners-ops + telegram-handshake + vault-map into an env-board plane.
 * Keys / presence only — never secret values or staging passwords.
 *
 * Consumed by env:inventory bake → /registry/env-inventory.json → /portal/env/
 */
import { tryOutId, type OutId } from '../../lib/types/branded.ts';

export type PartnerEnvBindingRole =
  | 'telegram-bot'
  | 'partner-api'
  | 'webhook'
  | 'signing'
  | 'other';

export type PartnerEnvConsumer =
  | 'partners-board'
  | 'tennis-hq'
  | 'factory-bot'
  | 'seat-desk'
  | 'account-dossier';

/** Shared Bun.env keys that power partner / account surfaces. */
export const PARTNER_SHARED_ENV_BINDINGS: ReadonlyArray<{
  envKey: string;
  role: PartnerEnvBindingRole;
  consumers: readonly PartnerEnvConsumer[];
}> = [
  {
    envKey: 'PARTNER_API_TOKEN',
    role: 'partner-api',
    consumers: ['tennis-hq', 'partners-board'],
  },
  {
    envKey: 'TELEGRAM_BOT_FACTORY',
    role: 'telegram-bot',
    consumers: ['partners-board', 'factory-bot', 'seat-desk'],
  },
  {
    envKey: 'TELEGRAM_WEBHOOK_SECRET',
    role: 'webhook',
    consumers: ['factory-bot', 'partners-board'],
  },
  {
    envKey: 'TELEGRAM_BOT_TOKEN',
    role: 'telegram-bot',
    consumers: ['factory-bot'],
  },
  {
    envKey: 'FACTORY_WAGER_TOKEN',
    role: 'signing',
    consumers: ['tennis-hq', 'partners-board'],
  },
] as const;

export type VaultMapEntryLite = {
  envKey: string;
  passRef?: string | null;
  inTemplate?: boolean;
  runtimePresent?: boolean;
};

export type PartnerSharedEnvBinding = {
  envKey: string;
  role: PartnerEnvBindingRole;
  consumers: PartnerEnvConsumer[];
  passRef: string | null;
  inVaultMap: boolean;
  inTemplate: boolean;
  runtimePresent: boolean;
};

export type PartnerAccountOutRow = {
  outId: OutId;
  bookSlug: string; // brand-ok — sportsbook slug from partners-ops wire
  bookName: string;
  status: string;
  /** Staging login label only — never a password. */
  usernameLabel: string | null;
  href: string; // brand-ok — portal path
};

export type PartnerAccountsRow = {
  partnerCode: string; // brand-ok — registry CODE until PartnerCode brand exists
  callSign: string;
  phase: string;
  handshakeOk: boolean;
  telegramChatLinked: boolean;
  accountsTotal: number;
  accountsReady: number;
  accountsDeferred: number;
  accountsBlocked: number;
  outsReady: number;
  outsTotal: number;
  outs: PartnerAccountOutRow[];
  partnersHref: string; // brand-ok — portal path
  accountHref: string; // brand-ok — dossier ?partner=CODE
};

export type PartnersAccountsPlane = {
  generatedAt: string;
  sources: {
    partnersOps: string;
    handshake: string;
    vaultMap: string;
  };
  sharedEnvBindings: PartnerSharedEnvBinding[];
  partners: PartnerAccountsRow[];
  summary: {
    partnerCount: number;
    accountsTotal: number;
    accountsReady: number;
    outsTotal: number;
    outsReady: number;
    sharedEnvMissing: number;
    partnersMissingHandshake: number;
    partnersMissingTelegram: number;
  };
};

type HandshakeRow = {
  partnerCode?: unknown;
  handshakeOk?: unknown;
  callSign?: unknown;
  phase?: unknown;
};

type PartnersOpsOut = {
  id?: unknown;
  status?: unknown;
  credentials?: { username?: unknown };
  book?: { slug?: unknown; name?: unknown };
};

type PartnersOpsPartner = {
  code?: unknown;
  callSign?: unknown;
  phase?: unknown;
  telegram?: { chatId?: unknown };
  tracking?: {
    accounts?: {
      total?: unknown;
      ready?: unknown;
      deferred?: unknown;
      blocked?: unknown;
    };
    communication?: { chatLinked?: unknown; ready?: unknown };
  };
  outs?: PartnersOpsOut[];
};

/** Wire parsers for partners-ops / handshake JSON (edge of registry bake). */
function parseOptionalString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function parseFiniteNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function parseStrictBool(v: unknown): boolean {
  return v === true;
}

/** Pure join — inject registry JSON + vault-map entries (tests / bake). */
export function buildPartnersAccountsPlane(opts: {
  partnersOps: unknown;
  handshake: unknown;
  vaultEntries: readonly VaultMapEntryLite[];
  generatedAt?: string;
}): PartnersAccountsPlane {
  const vaultByKey = new Map(
    opts.vaultEntries.map(e => [e.envKey, e] as const).filter(([k]) => !!k)
  );

  const sharedEnvBindings: PartnerSharedEnvBinding[] = PARTNER_SHARED_ENV_BINDINGS.map(b => {
    const v = vaultByKey.get(b.envKey);
    const runtimePresent = v
      ? Boolean(v.runtimePresent)
      : Boolean(Bun.env[b.envKey]?.toString().trim());
    return {
      envKey: b.envKey,
      role: b.role,
      consumers: [...b.consumers],
      passRef: v?.passRef ?? null,
      inVaultMap: Boolean(v),
      inTemplate: Boolean(v?.inTemplate),
      runtimePresent,
    };
  });

  const ops =
    opts.partnersOps && typeof opts.partnersOps === 'object'
      ? (opts.partnersOps as { partners?: unknown })
      : {};
  const hs =
    opts.handshake && typeof opts.handshake === 'object'
      ? (opts.handshake as { partners?: unknown; rows?: unknown })
      : {};
  // telegram-handshake.json uses `partners` as a count and `rows` as the table.
  const hsRows: HandshakeRow[] = [
    ...(Array.isArray(hs.partners) ? (hs.partners as HandshakeRow[]) : []),
    ...(Array.isArray(hs.rows) ? (hs.rows as HandshakeRow[]) : []),
  ];
  const hsByCode = new Map<string, HandshakeRow>();
  for (const row of hsRows) {
    const code = parseOptionalString(row.partnerCode)?.toUpperCase();
    if (code) hsByCode.set(code, row);
  }

  const opsPartners: PartnersOpsPartner[] = Array.isArray(ops.partners)
    ? (ops.partners as PartnersOpsPartner[])
    : [];
  const partners: PartnerAccountsRow[] = [];
  for (const raw of opsPartners) {
    const partnerCode = parseOptionalString(raw.code)?.toUpperCase();
    if (!partnerCode) continue;
    const hsRow = hsByCode.get(partnerCode);
    const accounts = raw.tracking?.accounts ?? {};
    const outsRaw = Array.isArray(raw.outs) ? raw.outs : [];
    const outs: PartnerAccountOutRow[] = [];
    for (const o of outsRaw) {
      const idRaw = parseOptionalString(o.id);
      // OutId wire shape: out-<CODE>-<n> (tryOutId alone is too permissive for opaque strings).
      if (!idRaw || !/^out-[A-Za-z0-9]+-\d+$/.test(idRaw)) continue;
      const outId = tryOutId(idRaw);
      if (!outId) continue;
      const bookSlug = parseOptionalString(o.book?.slug) ?? 'unknown';
      const bookName = parseOptionalString(o.book?.name) ?? bookSlug;
      const status = parseOptionalString(o.status) ?? 'unknown';
      const usernameLabel = parseOptionalString(o.credentials?.username);
      outs.push({
        outId,
        bookSlug,
        bookName,
        status,
        usernameLabel,
        href: `/portal/account/?partner=${encodeURIComponent(partnerCode)}`,
      });
    }
    const outsReady = outs.filter(o => o.status === 'ready').length;
    const telegramChatLinked =
      parseStrictBool(raw.tracking?.communication?.chatLinked) ||
      Boolean(parseOptionalString(raw.telegram?.chatId)) ||
      parseStrictBool(raw.tracking?.communication?.ready);

    partners.push({
      partnerCode,
      callSign:
        parseOptionalString(raw.callSign) ?? parseOptionalString(hsRow?.callSign) ?? partnerCode,
      phase: parseOptionalString(raw.phase) ?? parseOptionalString(hsRow?.phase) ?? 'unknown',
      handshakeOk: parseStrictBool(hsRow?.handshakeOk),
      telegramChatLinked,
      accountsTotal: parseFiniteNumber(accounts.total) || outs.length,
      accountsReady: parseFiniteNumber(accounts.ready) || outsReady,
      accountsDeferred: parseFiniteNumber(accounts.deferred),
      accountsBlocked: parseFiniteNumber(accounts.blocked),
      outsReady,
      outsTotal: outs.length,
      outs,
      partnersHref: '/portal/partners/',
      accountHref: `/portal/account/?partner=${encodeURIComponent(partnerCode)}`,
    });
  }

  partners.sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));

  const accountsTotal = partners.reduce((n, p) => n + p.accountsTotal, 0);
  const accountsReady = partners.reduce((n, p) => n + p.accountsReady, 0);
  const outsTotal = partners.reduce((n, p) => n + p.outsTotal, 0);
  const outsReady = partners.reduce((n, p) => n + p.outsReady, 0);

  return {
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    sources: {
      partnersOps: '/registry/partners-ops.json',
      handshake: '/registry/telegram-handshake.json',
      vaultMap: '/registry/vault-map.json',
    },
    sharedEnvBindings,
    partners,
    summary: {
      partnerCount: partners.length,
      accountsTotal,
      accountsReady,
      outsTotal,
      outsReady,
      sharedEnvMissing: sharedEnvBindings.filter(b => !b.runtimePresent).length,
      partnersMissingHandshake: partners.filter(p => !p.handshakeOk).length,
      partnersMissingTelegram: partners.filter(p => !p.telegramChatLinked).length,
    },
  };
}

/** Load registry JSON from a monorepo root (offline bake). */
export async function loadPartnersAccountsPlane(
  root: string,
  vaultEntries: readonly VaultMapEntryLite[]
): Promise<PartnersAccountsPlane> {
  const partnersOps = await Bun.file(`${root}/public/registry/partners-ops.json`)
    .json()
    .catch(() => null);
  const handshake = await Bun.file(`${root}/public/registry/telegram-handshake.json`)
    .json()
    .catch(() => null);
  return buildPartnersAccountsPlane({
    partnersOps,
    handshake,
    vaultEntries,
  });
}
