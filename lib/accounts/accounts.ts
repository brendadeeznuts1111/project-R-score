// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
// @see https://bun.sh/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Unified tree-node account system for the operations platform.
 *
 * Manages partners, agents, and sub-agents as a single tree with:
 *   - Growth metrics (plays, volume, PnL per period)
 *   - Automated promotion (agent → partner when thresholds met)
 *   - Play routing (which expert's nodes receive a play)
 *   - Proof recording on every state mutation
 */

import { Database } from 'bun:sqlite';
import {
  asPortalTenantId,
  asTreeNodeId,
  type PortalTenantId,
  type TelegramUserId,
  type TreeNodeId,
} from '../types/branded.ts';

// ── Types ────────────────────────────────────────────────────────────────

export interface TreeNode {
  id: TreeNodeId;
  type: 'partner' | 'agent' | 'sub_agent';
  parentId: TreeNodeId | null;
  expertId: string | null; // brand-ok — opaque expert reference
  name: string;
  email?: string;
  telegramId: TelegramUserId;
  oidcSubject?: string;
  railPreference: string;
  cutPercentage: number;
  totalLiquidity: number;
  totalAccounts: number;
  status: 'prospect' | 'active' | 'partner' | 'suspended';
  promotedAt: string | null;
  createdAt: string;
  lastPlayAt: string | null;
  phoneId: string | null; // brand-ok
}

export interface GrowthMetrics {
  nodeId: TreeNodeId;
  period: string;
  playsReceived: number;
  playsPlaced: number;
  volume: number;
  pnl: number;
  newSubAgents: number;
  newAccounts: number;
}

export const PROMOTION_THRESHOLDS = {
  playsPlaced: 50,
  volume: 10_000,
  pnl: 1_000,
} as const;

// ── AccountSystem ────────────────────────────────────────────────────────

export class AccountSystem {
  private db: Database;
  private tenantId: PortalTenantId;

  constructor(tenantId: PortalTenantId = asPortalTenantId('operations'), dbPath?: string) {
    this.tenantId = tenantId;
    if (dbPath) {
      this.db = new Database(dbPath);
    } else {
      this.db = new Database(`data/accounts-${tenantId as string}.db`, { create: true });
    }
    this.db.run('PRAGMA journal_mode=WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT CHECK(type IN ('partner', 'agent', 'sub_agent')),
        parent_id TEXT REFERENCES tree_nodes(id),
        expert_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        telegram_id TEXT UNIQUE NOT NULL,
        oidc_subject TEXT UNIQUE,
        rail_preference TEXT DEFAULT 'paypal',
        cut_percentage REAL DEFAULT 0,
        total_liquidity REAL DEFAULT 0,
        total_accounts INTEGER DEFAULT 0,
        status TEXT DEFAULT 'prospect' CHECK(status IN ('prospect', 'active', 'partner', 'suspended')),
        promoted_at TEXT,
        created_at TEXT NOT NULL,
        last_play_at TEXT,
        phone_id TEXT
      );

      CREATE TABLE IF NOT EXISTS growth_metrics (
        node_id TEXT NOT NULL REFERENCES tree_nodes(id),
        period TEXT NOT NULL,
        plays_received INTEGER DEFAULT 0,
        plays_placed INTEGER DEFAULT 0,
        volume REAL DEFAULT 0,
        pnl REAL DEFAULT 0,
        new_sub_agents INTEGER DEFAULT 0,
        new_accounts INTEGER DEFAULT 0,
        PRIMARY KEY (node_id, period)
      );

      CREATE INDEX IF NOT EXISTS idx_parent ON tree_nodes(parent_id);
      CREATE INDEX IF NOT EXISTS idx_expert ON tree_nodes(expert_id);
      CREATE INDEX IF NOT EXISTS idx_telegram ON tree_nodes(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_status ON tree_nodes(status);
    `);
  }

  // ── CRUD ────────────────────────────────────────────────────────────

  async create(
    node: Omit<
      TreeNode,
      | 'id'
      | 'createdAt'
      | 'status'
      | 'totalLiquidity'
      | 'totalAccounts'
      | 'promotedAt'
      | 'lastPlayAt'
    > & { status?: TreeNode['status'] }
  ): Promise<TreeNode> {
    const id = asTreeNodeId(Bun.randomUUIDv7());
    const createdAt = new Date().toISOString();
    const status = node.status ?? 'prospect';

    this.db.run(
      `
      INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, email, telegram_id, oidc_subject,
        rail_preference, cut_percentage, status, created_at, phone_id)
      VALUES ($id, $type, $parent, $expert, $name, $email, $telegram, $oidc,
        $rail, $cut, $status, $created, $phone)
    `,
      {
        $id: id,
        $type: node.type,
        $parent: node.parentId ?? null,
        $expert: node.expertId ?? null,
        $name: node.name,
        $email: node.email ?? null,
        $telegram: node.telegramId,
        $oidc: node.oidcSubject ?? null,
        $rail: node.railPreference,
        $cut: node.cutPercentage,
        $status: status,
        $created: createdAt,
        $phone: node.phoneId ?? null,
      }
    );

    return {
      ...node,
      id,
      createdAt,
      status,
      promotedAt: null,
      lastPlayAt: null,
      totalLiquidity: 0,
      totalAccounts: 0,
      email: node.email,
      oidcSubject: node.oidcSubject,
    };
  }

  getById(id: TreeNodeId): TreeNode | null {
    const row = this.db.query('SELECT * FROM tree_nodes WHERE id = $id').get({ $id: id }) as Record<
      string,
      unknown
    > | null;
    return row ? this.deserialize(row) : null;
  }

  getByTelegram(telegramId: TelegramUserId): TreeNode | null {
    const row = this.db
      .query('SELECT * FROM tree_nodes WHERE telegram_id = $t')
      .get({ $t: telegramId }) as Record<string, unknown> | null;
    return row ? this.deserialize(row) : null;
  }

  private deserialize(row: Record<string, unknown>): TreeNode {
    return {
      id: asTreeNodeId(row.id as string),
      type: row.type as TreeNode['type'],
      parentId: row.parent_id ? asTreeNodeId(row.parent_id as string) : null,
      expertId: (row.expert_id as string) ?? null,
      name: row.name as string,
      email: row.email as string | undefined,
      telegramId: row.telegram_id as TelegramUserId,
      oidcSubject: row.oidc_subject as string | undefined,
      railPreference: (row.rail_preference as string) || 'paypal',
      cutPercentage: row.cut_percentage as number,
      totalLiquidity: row.total_liquidity as number,
      totalAccounts: row.total_accounts as number,
      status: row.status as TreeNode['status'],
      promotedAt: (row.promoted_at as string) ?? null,
      createdAt: row.created_at as string,
      lastPlayAt: (row.last_play_at as string) ?? null,
      phoneId: (row.phone_id as string) ?? null,
    };
  }

  // ── Growth & Promotion ──────────────────────────────────────────────

  async canPromote(nodeId: TreeNodeId): Promise<{ eligible: boolean; reason?: string }> {
    const node = this.getById(nodeId);
    if (!node) return { eligible: false, reason: 'Node not found' };
    if (node.type !== 'agent')
      return { eligible: false, reason: 'Only agents can become partners' };

    const metrics = this.db
      .query(
        "SELECT * FROM growth_metrics WHERE node_id = $id AND period = strftime('%Y-%m', 'now')"
      )
      .get({ $id: nodeId }) as GrowthMetrics | null;

    if (!metrics) return { eligible: false, reason: 'No activity this month' };

    const checks = {
      plays: metrics.playsPlaced >= PROMOTION_THRESHOLDS.playsPlaced,
      volume: metrics.volume >= PROMOTION_THRESHOLDS.volume,
      pnl: metrics.pnl >= PROMOTION_THRESHOLDS.pnl,
    };

    if (checks.plays && checks.volume && checks.pnl) return { eligible: true };

    return {
      eligible: false,
      reason: [
        !checks.plays && `plays: ${metrics.playsPlaced}/${PROMOTION_THRESHOLDS.playsPlaced}`,
        !checks.volume && `volume: $${metrics.volume}/${PROMOTION_THRESHOLDS.volume}`,
        !checks.pnl && `PnL: $${metrics.pnl}/${PROMOTION_THRESHOLDS.pnl}`,
      ]
        .filter(Boolean)
        .join(', '),
    };
  }

  async promoteToPartner(nodeId: TreeNodeId): Promise<void> {
    const node = this.getById(nodeId);
    if (!node) throw new Error('Node not found');
    if (node.type !== 'agent') throw new Error('Only agents can become partners');

    this.db.run(
      "UPDATE tree_nodes SET type = 'partner', promoted_at = $at, status = 'partner' WHERE id = $id",
      { $id: nodeId, $at: new Date().toISOString() }
    );

    if (node.telegramId) {
      await this.notify(node.telegramId, [
        '🎉 *PROMOTION*',
        '',
        'You are now a *Partner*!',
        'You can recruit your own agents and sub-agents.',
        `Your cut: ${node.cutPercentage}% from downstream.`,
        '',
        'Use /tree to see your network.',
      ]);
    }
  }

  // ── Tree Traversal ──────────────────────────────────────────────────

  getTree(nodeId: TreeNodeId, depth = 0): TreeNode[] {
    const nodes: TreeNode[] = [];
    const queue: { id: TreeNodeId; level: number }[] = [{ id: nodeId, level: 0 }];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (depth > 0 && level > depth) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      const node = this.getById(id);
      if (!node) continue;
      nodes.push(node);

      const children = this.db
        .query("SELECT id FROM tree_nodes WHERE parent_id = $p AND status != 'suspended'")
        .all({ $p: id }) as { id: TreeNodeId }[];
      for (const child of children) queue.push({ id: child.id, level: level + 1 });
    }
    return nodes;
  }

  getDownstreamLiquidity(nodeId: TreeNodeId): number {
    return this.getTree(nodeId).reduce((sum, n) => sum + n.totalLiquidity, 0);
  }

  getDownstreamAccounts(nodeId: TreeNodeId): number {
    return this.getTree(nodeId).reduce((sum, n) => sum + n.totalAccounts, 0);
  }

  getNodesForExpert(
    expertId: string // brand-ok — opaque expert reference
  ): TreeNode[] {
    return this.db
      .query("SELECT * FROM tree_nodes WHERE expert_id = $e AND status IN ('active', 'partner')")
      .all({ $e: expertId }) as unknown as TreeNode[];
  }

  // ── Metrics ─────────────────────────────────────────────────────────

  recordPlayReceived(nodeId: TreeNodeId): void {
    const period = new Date().toISOString().slice(0, 7);
    this.db.run(
      `
      INSERT INTO growth_metrics (node_id, period, plays_received) VALUES ($id, $p, 1)
      ON CONFLICT(node_id, period) DO UPDATE SET plays_received = plays_received + 1
    `,
      { $id: nodeId, $p: period }
    );
  }

  recordPlayPlaced(nodeId: TreeNodeId, stake: number, pnl: number): void {
    const period = new Date().toISOString().slice(0, 7);
    this.db.run(
      `
      INSERT INTO growth_metrics (node_id, period, plays_placed, volume, pnl) VALUES ($id, $p, 1, $vol, $pnl)
      ON CONFLICT(node_id, period) DO UPDATE SET
        plays_placed = plays_placed + 1, volume = volume + $vol, pnl = pnl + $pnl
    `,
      { $id: nodeId, $p: period, $vol: stake, $pnl: pnl }
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async notify(telegramId: TelegramUserId, lines: string[]): Promise<void> {
    const { loadTelegramEnv } = await import('../telegram/telegram-config.ts');
    const token = loadTelegramEnv().effectiveToken;
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId as string,
        text: lines.join('\n'),
        parse_mode: 'Markdown',
      }),
    });
  }
}
