// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/bundler/executables — --force
/**
 * Demo seed for partner profile bindings, platform accounts, and ops channels.
 * Fills `/portal/ops/` partners + channels panels and `/portal/catalog`.
 *
 * @see tools/ops-seed-partners.ts
 * @see lib/operations/partner-profile-bridge.ts
 * @see lib/channels/outbox.ts
 */
import { randomUUIDv7 } from 'bun';
import type { Database } from 'bun:sqlite';
import { enqueueIdentityChannelEvent, enqueueOpsChannelEvent } from '../channels/outbox.ts';
import type { PartnerLifecycleStatus } from '../partner-profile/schema.ts';
import {
  asTreeNodeId,
  type PartnerTemplateId,
  type TreeNodeId,
} from '../types/branded/operations.ts';
import { ensurePlatformCoverageSchema } from './platform-coverage.ts';
import { bindPartnerProfile } from './partner-profile-bridge.ts';
import { ensureProvisioningSchema } from '../provisioning/schema.ts';
import { isOperationsDbEmpty, seedOperationsDemo } from './ops-seed.ts';
import { seedPredictionDemo } from './prediction-seed.ts';

export type SeedPartnerProfilesDemoOpts = {
  force?: boolean;
  /** Only seed when partner_profile_bindings is empty (default true). */
  ifEmpty?: boolean;
};

export type SeedPartnerProfilesDemoResult = {
  seeded: boolean;
  reason?: string;
  bindings?: number;
  byLifecycle?: Partial<Record<PartnerLifecycleStatus, number>>;
  platformAccounts?: number;
  channelEvents?: number;
  provisioningTasks?: number;
  opsSeeded?: boolean;
  predictionSeeded?: boolean;
};

const LIFECYCLE_ROTATION: PartnerLifecycleStatus[] = [
  'active',
  'materialized',
  'kyc_pending',
  'active',
  'signup',
  'suspended',
  'active',
  'terminated',
];

export function isPartnerProfileBindingsEmpty(db: Database): boolean {
  try {
    const row = db.query('SELECT COUNT(*) AS n FROM partner_profile_bindings').get() as {
      n: number;
    };
    return (row?.n ?? 0) === 0;
  } catch {
    return true;
  }
}

function ensureExtraPlatformAccounts(db: Database, now: string): number {
  ensurePlatformCoverageSchema(db);
  const partners = db
    .query(
      `SELECT id FROM tree_nodes WHERE type = 'partner' AND active = 1 ORDER BY created_at LIMIT 4`
    )
    .all() as { id: string }[]; // brand-ok — tree node ids
  if (partners.length === 0) return 0;

  const platforms = db
    .query(`SELECT id FROM platforms WHERE active = 1 ORDER BY id LIMIT 8`)
    .all() as { id: string }[]; // brand-ok — platform ids
  if (platforms.length === 0) return 0;

  let count = 0;
  const statuses = ['active', 'active', 'limited', 'pending', 'inactive'] as const;
  for (let i = 0; i < partners.length; i++) {
    const partnerId = partners[i]!.id;
    for (let j = 0; j < Math.min(3, platforms.length); j++) {
      const platformId = platforms[(i + j) % platforms.length]!.id;
      const exists = db
        .query(
          `SELECT id FROM partner_platform_accounts
           WHERE partner_id = $p AND platform_id = $plat LIMIT 1`
        )
        .get({ $p: partnerId, $plat: platformId }) as { id: string } | null; // brand-ok
      if (exists) continue;
      db.run(
        `INSERT INTO partner_platform_accounts
           (id, platform_id, partner_id, account_identifier, balance, status, is_test, notes, opened_at, created_at)
         VALUES ($id, $plat, $partner, $ident, $bal, $st, 0, $notes, $opened, $now)`,
        {
          $id: randomUUIDv7(),
          $plat: platformId,
          $partner: partnerId,
          $ident: `pp-${platformId}-${String(partnerId).slice(0, 8)}`,
          $bal: 5_000 + count * 1_750,
          $st: statuses[count % statuses.length],
          $notes: 'partner-profile-seed',
          $opened: new Date(Date.now() - (30 + count) * 86_400_000).toISOString(),
          $now: now,
        }
      );
      count++;
    }
  }
  return count;
}

function seedProvisioningDemo(db: Database, now: string): number {
  ensureProvisioningSchema(db);
  const partners = db
    .query(
      `SELECT id FROM tree_nodes WHERE type = 'partner' AND active = 1 ORDER BY created_at LIMIT 2`
    )
    .all() as { id: string }[]; // brand-ok
  if (partners.length === 0) return 0;

  const existing = db
    .query(`SELECT COUNT(*) AS n FROM provisioning_tasks WHERE notes LIKE 'partner-profile-seed%'`)
    .get() as { n: number };
  if ((existing?.n ?? 0) > 0) return 0;

  const steps = ['pending', 'in_progress', 'completed'] as const;
  const modes = ['manual', 'automated_test'] as const;
  let inserted = 0;

  for (let i = 0; i < partners.length; i++) {
    for (let s = 0; s < steps.length; s++) {
      db.run(
        `INSERT INTO provisioning_tasks
           (id, partner_id, platform_id, step, mode, notes, created_at)
         VALUES ($id, $partner, $plat, $step, $mode, $notes, $now)`,
        {
          $id: randomUUIDv7(),
          $partner: partners[i]!.id,
          $plat: 'fanduel',
          $step: steps[s],
          $mode: modes[i % modes.length],
          $notes: 'partner-profile-seed',
          $now: now,
        }
      );
      inserted++;
    }
  }
  return inserted;
}

function seedChannelMix(
  db: Database,
  bindings: Array<{
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    lifecycleStatus: PartnerLifecycleStatus;
  }>,
  force: boolean
): number {
  let n = 0;
  const batch = force ? randomUUIDv7().slice(0, 8) : 'demo';

  for (const b of bindings) {
    if (force) {
      enqueueOpsChannelEvent(db, {
        topic: 'identity',
        eventType: 'partner.bound',
        idempotencyKey: `bind:${batch}:${b.treeNodeId as string}`,
        payload: {
          treeNodeId: b.treeNodeId as string,
          profileKey: b.profileKey,
          partnerTemplate: b.partnerTemplate as string,
          lifecycleStatus: b.lifecycleStatus,
        },
        projectors: ['r2'],
      });
    } else {
      enqueueIdentityChannelEvent(db, {
        treeNodeId: b.treeNodeId,
        profileKey: b.profileKey,
        partnerTemplate: b.partnerTemplate,
        lifecycleStatus: b.lifecycleStatus,
      });
    }
    n++;
  }

  // Extra topics so channels health shows pending/sent/failed mix.
  const extras: Array<{
    topic: 'plays' | 'dod' | 'alerts' | 'provisioning' | 'experiments' | 'toc';
    type: string;
  }> = [
    { topic: 'plays', type: 'play.placed' },
    { topic: 'plays', type: 'play.settled' },
    { topic: 'dod', type: 'dod.flagged' },
    { topic: 'alerts', type: 'ops.alert' },
    { topic: 'provisioning', type: 'provision.queued' },
    { topic: 'experiments', type: 'experiment.assigned' },
    { topic: 'toc', type: 'toc.metrics.baked' },
  ];

  for (let i = 0; i < extras.length; i++) {
    const e = extras[i]!;
    enqueueOpsChannelEvent(db, {
      topic: e.topic,
      eventType: e.type,
      idempotencyKey: `${e.topic}:${e.type}:${batch}:${i}`,
      payload: { source: 'partner-profile-seed', i },
    });
    n++;
  }

  // Mark a deterministic mix of outbox rows sent/failed for dashboard health.
  db.run(
    `UPDATE ops_channel_outbox SET status = 'sent', sent_at = datetime('now')
     WHERE id IN (
       SELECT id FROM ops_channel_outbox WHERE status = 'pending'
       ORDER BY created_at ASC LIMIT 3
     )`
  );
  db.run(
    `UPDATE ops_channel_outbox SET status = 'failed', retries = 1, last_error = 'demo seed failure'
     WHERE id IN (
       SELECT id FROM ops_channel_outbox WHERE status = 'pending'
       ORDER BY created_at DESC LIMIT 1
     )`
  );

  return n;
}

/** Bind tree nodes, thicken accounts, enqueue channel events, seed provisioning. */
export async function seedPartnerProfilesDemo(
  db: Database,
  opts?: SeedPartnerProfilesDemoOpts
): Promise<SeedPartnerProfilesDemoResult> {
  const ifEmpty = opts?.ifEmpty ?? true;
  if (!opts?.force && ifEmpty && !isPartnerProfileBindingsEmpty(db)) {
    return {
      seeded: false,
      reason: 'partner_profile_bindings already present (use --force)',
    };
  }

  let opsSeeded = false;
  let predictionSeeded = false;

  if (isOperationsDbEmpty(db)) {
    const ops = await seedOperationsDemo(db, { ifEmpty: true });
    opsSeeded = ops.seeded;
  }

  // Platforms + partner_platform_accounts for catalog panel.
  const pred = seedPredictionDemo(db, { ifEmpty: true, days: 14 });
  predictionSeeded = pred.seeded;

  const now = new Date().toISOString();
  const platformAccounts = ensureExtraPlatformAccounts(db, now);

  const nodes = db
    .query(
      `SELECT id, type, status FROM tree_nodes WHERE active = 1 ORDER BY
         CASE type WHEN 'partner' THEN 0 WHEN 'agent' THEN 1 ELSE 2 END, created_at`
    )
    .all() as Array<{ id: string; type: string; status: string }>; // brand-ok

  if (nodes.length === 0) {
    return { seeded: false, reason: 'no active tree_nodes — run ops:seed first' };
  }

  const byLifecycle: Partial<Record<PartnerLifecycleStatus, number>> = {};
  const bindingRows: Array<{
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    lifecycleStatus: PartnerLifecycleStatus;
  }> = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    // Prefer active for partners; rotate the rest for a useful byLifecycle chart.
    const lifecycle: PartnerLifecycleStatus =
      node.type === 'partner' && i === 0
        ? 'active'
        : LIFECYCLE_ROTATION[i % LIFECYCLE_ROTATION.length]!;

    const binding = bindPartnerProfile(db, asTreeNodeId(node.id), {
      lifecycleStatus: lifecycle,
    });

    // Optional metadata for portal detail.
    db.run(
      `UPDATE partner_profile_bindings
       SET metadata_json = $meta, updated_at = $now
       WHERE tree_node_id = $id`,
      {
        $id: node.id,
        $now: now,
        $meta: JSON.stringify({
          source: 'partner-profile-seed',
          nodeType: node.type,
          nodeStatus: node.status,
        }),
      }
    );

    byLifecycle[lifecycle] = (byLifecycle[lifecycle] ?? 0) + 1;
    bindingRows.push({
      treeNodeId: binding.treeNodeId,
      profileKey: binding.profileKey as string,
      partnerTemplate: binding.templateId,
      lifecycleStatus: binding.lifecycleStatus,
    });
  }

  const channelEvents = seedChannelMix(db, bindingRows, !!opts?.force);
  const provisioningTasks = seedProvisioningDemo(db, now);

  return {
    seeded: true,
    bindings: bindingRows.length,
    byLifecycle,
    platformAccounts,
    channelEvents,
    provisioningTasks,
    opsSeeded,
    predictionSeeded,
  };
}

/** Query used by live catalog + Pages snapshot. */
export function queryCatalogAccounts(db: Database): Record<string, unknown>[] {
  ensurePlatformCoverageSchema(db);
  return db
    .query(
      `SELECT p.id as platform_id, p.name as platform, p.category, p.sub_category,
              a.id as account_id, a.partner_id, a.account_identifier, a.balance, a.status,
              a.notes, a.opened_at, a.last_verified_at,
              n.name as partner_name, n.type as partner_type
       FROM partner_platform_accounts a
       JOIN platforms p ON a.platform_id = p.id
       JOIN tree_nodes n ON a.partner_id = n.id
       WHERE a.status != 'closed'
       ORDER BY p.category, p.name`
    )
    .all() as Record<string, unknown>[];
}

/** Write public/registry/catalog-snapshot.json for Pages `/api/catalog`. */
export async function exportCatalogSnapshot(
  db: Database,
  outPath = 'public/registry/catalog-snapshot.json'
): Promise<{ accounts: number; path: string }> {
  const accounts = queryCatalogAccounts(db);
  const payload = {
    source: 'snapshot',
    generatedAt: new Date().toISOString(),
    accounts,
  };
  await Bun.write(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  return { accounts: accounts.length, path: outPath };
}
