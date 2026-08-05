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
  asTelegramUserId,
  asTreeNodeId,
  type PortalTenantId,
  type TelegramUserId,
  type TreeNodeId,
} from '../types/branded.ts';
import { telegramBotApiUrl } from '../telegram/telegram-api-url.ts';

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

function parseRequiredString(row: Record<string, unknown>, column: string): string {
  const value = row[column];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`tree row column ${column} must be a non-empty string`);
  }
  return value;
}

function parseOptionalString(row: Record<string, unknown>, column: string): string | undefined {
  const value = row[column];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`tree row column ${column} must be a string`);
  return value;
}

function parseRequiredNumber(row: Record<string, unknown>, column: string): number {
  const value = row[column];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`tree row column ${column} must be a finite number`);
  }
  return value;
}

function parseTreeNodeType(value: unknown): TreeNode['type'] {
  if (value === 'partner' || value === 'agent' || value === 'sub_agent') return value;
  throw new Error(`tree_nodes.type is invalid: ${String(value)}`);
}

function parseTreeNodeStatus(value: unknown): TreeNode['status'] {
  if (value === 'prospect' || value === 'active' || value === 'partner' || value === 'suspended') {
    return value;
  }
  throw new Error(`tree_nodes.status is invalid: ${String(value)}`);
}

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
    return row ? this.parseTreeNodeRow(row) : null;
  }

  getByTelegram(telegramId: TelegramUserId): TreeNode | null {
    const row = this.db
      .query('SELECT * FROM tree_nodes WHERE telegram_id = $t')
      .get({ $t: telegramId }) as Record<string, unknown> | null;
    return row ? this.parseTreeNodeRow(row) : null;
  }

  getByOidcSubject(oidcSubject: string): TreeNode | null {
    const row = this.db
      .query('SELECT * FROM tree_nodes WHERE oidc_subject = $sub')
      .get({ $sub: oidcSubject }) as Record<string, unknown> | null;
    return row ? this.parseTreeNodeRow(row) : null;
  }

  private parseTreeNodeRow(row: Record<string, unknown>): TreeNode {
    const parentId = parseOptionalString(row, 'parent_id');
    return {
      id: asTreeNodeId(parseRequiredString(row, 'id')),
      type: parseTreeNodeType(row.type),
      parentId: parentId ? asTreeNodeId(parentId) : null,
      expertId: parseOptionalString(row, 'expert_id') ?? null,
      name: parseRequiredString(row, 'name'),
      email: parseOptionalString(row, 'email'),
      telegramId: asTelegramUserId(parseRequiredString(row, 'telegram_id')),
      oidcSubject: parseOptionalString(row, 'oidc_subject'),
      railPreference: parseOptionalString(row, 'rail_preference') ?? 'paypal',
      cutPercentage: parseRequiredNumber(row, 'cut_percentage'),
      totalLiquidity: parseRequiredNumber(row, 'total_liquidity'),
      totalAccounts: parseRequiredNumber(row, 'total_accounts'),
      status: parseTreeNodeStatus(row.status),
      promotedAt: parseOptionalString(row, 'promoted_at') ?? null,
      createdAt: parseRequiredString(row, 'created_at'),
      lastPlayAt: parseOptionalString(row, 'last_play_at') ?? null,
      phoneId: parseOptionalString(row, 'phone_id') ?? null,
    };
  }

  private parseGrowthMetricsRow(row: Record<string, unknown>): GrowthMetrics {
    return {
      nodeId: asTreeNodeId(parseRequiredString(row, 'node_id')),
      period: parseRequiredString(row, 'period'),
      playsReceived: parseRequiredNumber(row, 'plays_received'),
      playsPlaced: parseRequiredNumber(row, 'plays_placed'),
      volume: parseRequiredNumber(row, 'volume'),
      pnl: parseRequiredNumber(row, 'pnl'),
      newSubAgents: parseRequiredNumber(row, 'new_sub_agents'),
      newAccounts: parseRequiredNumber(row, 'new_accounts'),
    };
  }

  // ── Growth & Promotion ──────────────────────────────────────────────

  async canPromote(nodeId: TreeNodeId): Promise<{ eligible: boolean; reason?: string }> {
    const node = this.getById(nodeId);
    if (!node) return { eligible: false, reason: 'Node not found' };
    if (node.type !== 'agent')
      return { eligible: false, reason: 'Only agents can become partners' };

    const metricsRow = this.db
      .query(
        "SELECT * FROM growth_metrics WHERE node_id = $id AND period = strftime('%Y-%m', 'now')"
      )
      .get({ $id: nodeId }) as Record<string, unknown> | null;

    if (!metricsRow) return { eligible: false, reason: 'No activity this month' };
    const metrics = this.parseGrowthMetricsRow(metricsRow);

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
    const rows = this.db
      .query<
        Record<string, unknown>,
        { $e: string }
      >("SELECT * FROM tree_nodes WHERE expert_id = $e AND status IN ('active', 'partner')")
      .all({ $e: expertId });
    return rows.map(row => this.parseTreeNodeRow(row));
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

  close(): void {
    this.db.close();
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async notify(telegramId: TelegramUserId, lines: string[]): Promise<void> {
    const { loadTelegramEnv } = await import('../telegram/telegram-config.ts');
    const token = loadTelegramEnv().effectiveToken;
    if (!token) return;
    await fetch(telegramBotApiUrl(token, 'sendMessage'), {
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
