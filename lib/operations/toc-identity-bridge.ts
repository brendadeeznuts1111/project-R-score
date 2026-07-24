// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Bind TOC partner codes / call signs to ops tree_nodes, rails, sb_accounts.
 * Enables future Soft/gates dual-write; Pages still serves read-only fixture.
 *
 * @see lib/toc-ops/identity.ts
 * @see lib/operations/toc-ops-seed.ts
 */
import { randomUUIDv7 } from 'bun';
import type { Database } from 'bun:sqlite';
import type { TocIdentityBridge, TocPartnerBinding } from '../toc-ops/identity.ts';
import type { TocOpsSnapshot, TocPartner } from '../toc-ops/types.ts';
import { bindPartnerProfile, type PartnerLifecycleStatus } from './partner-profile-bridge.ts';
import { asTreeNodeId, type TreeNodeId } from '../types/branded/operations.ts';

const DEMO_WARNING =
  'DEMO · read-only on Pages — Soft Balance, Hard Gates, and DoD are not enforced here. Operate via toc-ops-repo Central Tool or local bun-only APIs.';

export function ensureTocIdentitySchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS toc_identity_bindings (
      partner_code TEXT PRIMARY KEY,
      tree_node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      metadata_json TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_toc_identity_node ON toc_identity_bindings(tree_node_id);

    CREATE TABLE IF NOT EXISTS toc_call_sign_bindings (
      call_sign TEXT PRIMARY KEY,
      partner_code TEXT NOT NULL,
      tree_node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      sb_account_id TEXT,
      rail_id TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_toc_call_sign_partner ON toc_call_sign_bindings(partner_code);
  `);
}

type PartnerRow = {
  id: string; // brand-ok
  name: string;
  call_sign: string | null;
  rail_preference: string | null;
};

function listPartners(db: Database): PartnerRow[] {
  return db
    .query(
      `SELECT id, name, call_sign, rail_preference FROM tree_nodes
       WHERE type = 'partner' AND active = 1 ORDER BY created_at ASC`
    )
    .all() as PartnerRow[];
}

function upsertPartnerBinding(
  db: Database,
  partnerCode: string,
  treeNodeId: TreeNodeId,
  now: string
): void {
  db.run(
    `INSERT INTO toc_identity_bindings (partner_code, tree_node_id, metadata_json, updated_at)
     VALUES ($code, $nid, '{}', $now)
     ON CONFLICT(partner_code) DO UPDATE SET
       tree_node_id = excluded.tree_node_id,
       updated_at = excluded.updated_at`,
    { $code: partnerCode, $nid: treeNodeId, $now: now }
  );
  db.run(
    `UPDATE tree_nodes SET call_sign = $code WHERE id = $nid AND (call_sign IS NULL OR call_sign = $code)`,
    {
      $code: partnerCode,
      $nid: treeNodeId,
    }
  );
}

function ensureAgent(
  db: Database,
  parentNodeId: TreeNodeId,
  callSign: string,
  now: string
): TreeNodeId {
  const existing = db
    .query(`SELECT id FROM tree_nodes WHERE call_sign = $cs LIMIT 1`)
    .get({ $cs: callSign }) as { id: string } | null; // brand-ok
  if (existing) return asTreeNodeId(existing.id);

  const id = randomUUIDv7(); // brand-ok — new tree node pk
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, rail_preference, active, created_at)
     VALUES ($id, 'agent', $parent, NULL, $name, $cs, NULL, 'venmo', 1, $now)`,
    {
      $id: id,
      $parent: parentNodeId,
      $name: `TOC ${callSign}`,
      $cs: callSign,
      $now: now,
    }
  );
  return asTreeNodeId(id);
}

function ensureHardrockAccount(
  db: Database,
  agentNodeId: TreeNodeId,
  balance: number,
  now: string
): string {
  // brand-ok — opaque sb_accounts.id
  const existing = db
    .query(`SELECT id FROM sb_accounts WHERE agent_id = $aid AND book = 'hardrock' LIMIT 1`)
    .get({ $aid: agentNodeId }) as { id: string } | null; // brand-ok
  if (existing) {
    db.run(`UPDATE sb_accounts SET balance = $bal WHERE id = $id`, {
      $bal: balance,
      $id: existing.id,
    });
    return existing.id;
  }
  const id = randomUUIDv7(); // brand-ok — opaque sb_accounts.id
  db.run(
    `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status, created_at)
     VALUES ($id, $aid, 'hardrock', $user, $bal, 'active', $now)`,
    {
      $id: id,
      $aid: agentNodeId,
      $user: `hr-${String(agentNodeId).slice(0, 8)}`,
      $bal: balance,
      $now: now,
    }
  );
  return id;
}

function pickRailForPartner(
  db: Database,
  partnerNodeId: TreeNodeId,
  preferType: string
): { id: string; type: string; identifier: string } | null {
  // brand-ok — opaque rails row
  // Rails hang on agents under this partner
  const row = db
    .query(
      `SELECT r.id, r.type, r.identifier FROM rails r
       JOIN tree_nodes a ON a.id = r.agent_id
       WHERE a.parent_id = $p OR a.id = $p
       ORDER BY CASE WHEN lower(r.type) = lower($t) THEN 0 ELSE 1 END, r.created_at
       LIMIT 1`
    )
    .get({ $p: partnerNodeId, $t: preferType }) as
    | { id: string; type: string; identifier: string } // brand-ok
    | null;
  return row;
}

function ensureRail(
  db: Database,
  agentNodeId: TreeNodeId,
  railType: string,
  identifier: string,
  now: string
): string {
  // brand-ok — opaque rails.id
  const existing = db
    .query(`SELECT id FROM rails WHERE agent_id = $aid AND lower(type) = lower($t) LIMIT 1`)
    .get({ $aid: agentNodeId, $t: railType }) as { id: string } | null; // brand-ok
  if (existing) return existing.id;
  const id = randomUUIDv7(); // brand-ok — opaque rails.id
  db.run(
    `INSERT INTO rails (id, type, agent_id, identifier, daily_limit, monthly_limit, total_sent, status, created_at)
     VALUES ($id, $type, $aid, $ident, 10000, 40000, 0, 'active', $now)`,
    {
      $id: id,
      $type: railType.toLowerCase(),
      $aid: agentNodeId,
      $ident: identifier,
      $now: now,
    }
  );
  return id;
}

function ensureNovPartner(db: Database, now: string): TreeNodeId {
  const existing = db
    .query(`SELECT id FROM tree_nodes WHERE call_sign = 'NOV' AND type = 'partner' LIMIT 1`)
    .get() as { id: string } | null; // brand-ok — opaque pk
  if (existing) return asTreeNodeId(existing.id);

  const id = randomUUIDv7(); // brand-ok — new tree node pk
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, rail_preference, active, created_at)
     VALUES ($id, 'partner', NULL, NULL, 'NOV Onboarding', 'NOV', 'tg:dm:nov-onboarding', 'venmo', 1, $now)`,
    { $id: id, $now: now }
  );
  try {
    bindPartnerProfile(db, asTreeNodeId(id), {
      lifecycleStatus: 'kyc_pending' as PartnerLifecycleStatus,
    });
  } catch {
    /* binding optional if template missing */
  }
  return asTreeNodeId(id);
}

export type SeedTocIdentityResult = {
  partnersBound: number;
  accountsBound: number;
  railsBound: number;
  createdNov: boolean;
};

/**
 * Assign ASH/PAT/NOV to ops partners, create missing agents/accounts/rails, write binding tables.
 */
export function seedTocIdentityBindings(
  db: Database,
  tocPartners: TocPartner[],
  opts?: { force?: boolean }
): SeedTocIdentityResult {
  ensureTocIdentitySchema(db);
  const now = new Date().toISOString();
  const force = opts?.force ?? false;

  if (!force) {
    const n = db.query(`SELECT COUNT(*) AS n FROM toc_identity_bindings`).get() as { n: number };
    if ((n?.n ?? 0) >= 3) {
      return { partnersBound: n.n, accountsBound: 0, railsBound: 0, createdNov: false };
    }
  }

  const partners = listPartners(db);
  let createdNov = false;
  const codeOrder = tocPartners.map(p => p.partnerCode);

  // Map ASH → first partner (prefer paypal), PAT → second (prefer venmo), NOV → create
  const ash =
    partners.find(p => p.call_sign === 'ASH') ??
    partners.find(p => (p.rail_preference || '').toLowerCase() === 'paypal') ??
    partners[0];
  const pat =
    partners.find(p => p.call_sign === 'PAT') ??
    partners.find(p => p.id !== ash?.id && (p.rail_preference || '').toLowerCase() === 'venmo') ??
    partners.find(p => p.id !== ash?.id) ??
    partners[1];

  const novExisting = partners.find(p => p.call_sign === 'NOV');
  let novNodeId: TreeNodeId | null = novExisting ? asTreeNodeId(novExisting.id) : null;
  if (!novNodeId && codeOrder.includes('NOV')) {
    novNodeId = ensureNovPartner(db, now);
    createdNov = true;
  }

  const partnerIds: Record<string, TreeNodeId> = {};
  if (ash) {
    const ashId = asTreeNodeId(ash.id);
    upsertPartnerBinding(db, 'ASH', ashId, now);
    partnerIds.ASH = ashId;
  }
  if (pat) {
    const patId = asTreeNodeId(pat.id);
    upsertPartnerBinding(db, 'PAT', patId, now);
    partnerIds.PAT = patId;
  }
  if (novNodeId) {
    upsertPartnerBinding(db, 'NOV', novNodeId, now);
    partnerIds.NOV = novNodeId;
  }

  let accountsBound = 0;
  let railsBound = 0;

  for (const tp of tocPartners) {
    const partnerId = partnerIds[tp.partnerCode];
    if (!partnerId) continue;

    const primaryRailType = (tp.rails[0]?.railType || 'Venmo').toLowerCase();
    let opsRail = pickRailForPartner(db, partnerId, primaryRailType);

    for (const acc of tp.accounts) {
      const agentId = ensureAgent(db, partnerId, acc.callSign, now);
      const sbId = ensureHardrockAccount(db, agentId, acc.hardBalance || 0, now);
      accountsBound++;

      if (!opsRail) {
        const railId = ensureRail(
          db,
          agentId,
          tp.rails[0]?.railType || 'Venmo',
          tp.rails[0]?.destinationHint || `@${tp.partnerCode.toLowerCase()}`,
          now
        );
        opsRail = {
          id: railId,
          type: (tp.rails[0]?.railType || 'Venmo').toLowerCase(),
          identifier: tp.rails[0]?.destinationHint || '',
        };
        railsBound++;
      }

      db.run(
        `INSERT INTO toc_call_sign_bindings (call_sign, partner_code, tree_node_id, sb_account_id, rail_id, updated_at)
         VALUES ($cs, $pc, $nid, $sb, $rail, $now)
         ON CONFLICT(call_sign) DO UPDATE SET
           partner_code = excluded.partner_code,
           tree_node_id = excluded.tree_node_id,
           sb_account_id = excluded.sb_account_id,
           rail_id = excluded.rail_id,
           updated_at = excluded.updated_at`,
        {
          $cs: acc.callSign,
          $pc: tp.partnerCode,
          $nid: agentId,
          $sb: sbId,
          $rail: opsRail.id,
          $now: now,
        }
      );
    }
  }

  return {
    partnersBound: Object.keys(partnerIds).length,
    accountsBound,
    railsBound,
    createdNov,
  };
}

function lifecycleFor(db: Database, treeNodeId: TreeNodeId): string | null {
  try {
    const row = db
      .query(
        `SELECT lifecycle_status, profile_key FROM partner_profile_bindings WHERE tree_node_id = $id`
      )
      .get({ $id: treeNodeId }) as { lifecycle_status: string; profile_key: string } | null;
    return row?.lifecycle_status ?? null;
  } catch {
    return null;
  }
}

function profileKeyFor(db: Database, treeNodeId: TreeNodeId): string | null {
  try {
    const row = db
      .query(`SELECT profile_key FROM partner_profile_bindings WHERE tree_node_id = $id`)
      .get({ $id: treeNodeId }) as { profile_key: string } | null;
    return row?.profile_key ?? null;
  } catch {
    return null;
  }
}

/** Build identity bridge snapshot from binding tables (+ live ops names). */
export function buildTocIdentityBridge(db: Database, tocPartners: TocPartner[]): TocIdentityBridge {
  ensureTocIdentitySchema(db);
  const generatedAt = new Date().toISOString();
  const bindings = db
    .query(`SELECT partner_code, tree_node_id FROM toc_identity_bindings`)
    .all() as { partner_code: string; tree_node_id: string }[]; // brand-ok

  const byCode = new Map(bindings.map(b => [b.partner_code, b.tree_node_id]));
  const partners: TocPartnerBinding[] = [];

  let linkedAccounts = 0;
  let linkedRails = 0;

  for (const tp of tocPartners) {
    const treeNodeId = byCode.get(tp.partnerCode) ?? null;
    let opsName: string | null = null;
    if (treeNodeId) {
      const row = db
        .query(`SELECT name FROM tree_nodes WHERE id = $id`)
        .get({ $id: treeNodeId }) as { name: string } | null;
      opsName = row?.name ?? null;
    }

    const callRows = db
      .query(
        `SELECT call_sign, tree_node_id, sb_account_id, rail_id FROM toc_call_sign_bindings
         WHERE partner_code = $pc`
      )
      .all({ $pc: tp.partnerCode }) as Array<{
      call_sign: string;
      tree_node_id: string; // brand-ok — SQLite wire
      sb_account_id: string | null; // brand-ok — opaque sb_accounts.id
      rail_id: string | null; // brand-ok — opaque rails.id
    }>;

    const accounts = tp.accounts.map(acc => {
      const row = callRows.find(c => c.call_sign === acc.callSign);
      let book: string | null = null;
      let balance: number | null = null;
      if (row?.sb_account_id) {
        const sb = db
          .query(`SELECT book, balance FROM sb_accounts WHERE id = $id`)
          .get({ $id: row.sb_account_id }) as { book: string; balance: number } | null;
        book = sb?.book ?? null;
        balance = sb?.balance ?? null;
        linkedAccounts++;
      }
      return {
        callSign: acc.callSign,
        treeNodeId: row?.tree_node_id ?? null,
        sbAccountId: row?.sb_account_id ?? null,
        opsRailId: row?.rail_id ?? null,
        book,
        balance,
      };
    });

    const railIds = new Set(accounts.map(a => a.opsRailId).filter(Boolean) as string[]);
    const rails = tp.rails.map(r => {
      let linkedRailId: string | null = null; // brand-ok — opaque rails.id
      let identifier: string | null = null;
      for (const rid of railIds) {
        const row = db
          .query(`SELECT id, type, identifier FROM rails WHERE id = $id`)
          .get({ $id: rid }) as { id: string; type: string; identifier: string } | null; // brand-ok
        if (row && row.type.toLowerCase() === r.railType.toLowerCase()) {
          linkedRailId = row.id;
          identifier = row.identifier;
          linkedRails++;
          break;
        }
      }
      if (!linkedRailId && railIds.size) {
        const first = [...railIds][0]!;
        const row = db
          .query(`SELECT id, identifier FROM rails WHERE id = $id`)
          .get({ $id: first }) as { id: string; identifier: string } | null; // brand-ok
        linkedRailId = row?.id ?? null;
        identifier = row?.identifier ?? null;
        if (linkedRailId) linkedRails++;
      }
      return {
        tocRailId: r.id,
        opsRailId: linkedRailId,
        railType: r.railType,
        confirmed: r.confirmed,
        identifier,
      };
    });

    const brandedNode = treeNodeId ? asTreeNodeId(treeNodeId) : null;
    partners.push({
      partnerCode: tp.partnerCode,
      treeNodeId,
      opsName,
      lifecycleStatus: brandedNode ? lifecycleFor(db, brandedNode) : null,
      profileKey: brandedNode ? profileKeyFor(db, brandedNode) : null,
      linked: treeNodeId != null,
      rails,
      accounts,
    });
  }

  const linkedPartners = partners.filter(p => p.linked).length;

  return {
    plane: linkedPartners > 0 ? 'linked' : 'demo-readonly',
    linked: linkedPartners > 0,
    linkedPartners,
    linkedAccounts,
    linkedRails,
    generatedAt,
    warning: DEMO_WARNING,
    partners,
  };
}

/** Attach identity bridge to a TOC fixture (mutates copy). */
export function enrichTocFixtureWithIdentity(
  db: Database,
  fixture: TocOpsSnapshot,
  opts?: { seed?: boolean; force?: boolean }
): TocOpsSnapshot {
  if (opts?.seed !== false) {
    seedTocIdentityBindings(db, fixture.partners, { force: opts?.force });
  }
  const identity = buildTocIdentityBridge(db, fixture.partners);
  return {
    ...fixture,
    plane: 'demo-readonly',
    identity,
  };
}
