// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Account service — tree CRUD, growth metrics, promotion on unified operations schema.
 */
import { Database } from 'bun:sqlite';
import type { Database as DatabaseType } from 'bun:sqlite';
import { openOperationsDb } from './db.ts';
import { AccountLimitsRepository } from '../account-limits-repo.ts';
import { telegramBotApiUrl } from '../telegram/telegram-api-url.ts';

export interface TreeNode {
  id: string; // brand-ok — UUID v7
  type: 'partner' | 'agent' | 'sub_agent';
  parentId: string | null; // brand-ok
  expertId: string | null; // brand-ok
  name: string;
  callSign?: string;
  email?: string;
  telegramId: string; // brand-ok
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
  nodeId: string; // brand-ok
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

export type PortalSyncInput = {
  oidcSubject: string;
  email: string;
  name?: string;
  telegramId?: string; // brand-ok
  callSign?: string;
};

export class AccountService {
  private readonly db: DatabaseType;
  private readonly ownsDb: boolean;

  constructor(dbOrPath?: DatabaseType | string) {
    if (dbOrPath instanceof Database) {
      this.db = dbOrPath;
      this.ownsDb = false;
    } else {
      this.db = openOperationsDb({ path: dbOrPath });
      this.ownsDb = true;
    }
  }

  get database(): DatabaseType {
    return this.db;
  }

  close(): void {
    if (this.ownsDb) this.db.close();
  }

  create(
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
  ): TreeNode {
    const id = Bun.randomUUIDv7();
    const createdAt = new Date().toISOString();
    const status = node.status ?? 'prospect';
    const active = status === 'suspended' ? 0 : 1;

    this.db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, email, telegram_id, oidc_subject,
        rail_preference, cut_percentage, status, active, created_at, phone_id)
       VALUES ($id, $type, $parent, $expert, $name, $call, $email, $telegram, $oidc,
        $rail, $cut, $status, $active, $created, $phone)`,
      {
        $id: id,
        $type: node.type,
        $parent: node.parentId ?? null,
        $expert: node.expertId ?? null,
        $name: node.name,
        $call: node.callSign ?? null,
        $email: node.email ?? null,
        $telegram: node.telegramId,
        $oidc: node.oidcSubject ?? null,
        $rail: node.railPreference,
        $cut: node.cutPercentage,
        $status: status,
        $active: active,
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

  /** Upsert prospect from portal identity (OPS_TREE_SYNC on Bun hosts). */
  syncProspectFromPortal(input: PortalSyncInput): TreeNode {
    const existing = input.oidcSubject
      ? (this.db
          .query('SELECT * FROM tree_nodes WHERE oidc_subject = $oidc')
          .get({ $oidc: input.oidcSubject }) as Record<string, unknown> | null)
      : null;

    if (existing) {
      if (input.telegramId && existing.telegram_id !== input.telegramId) {
        this.db.run('UPDATE tree_nodes SET telegram_id = $tg WHERE id = $id', {
          $tg: input.telegramId,
          $id: existing.id as string,
        });
      }
      const row = this.db
        .query('SELECT * FROM tree_nodes WHERE oidc_subject = $oidc')
        .get({ $oidc: input.oidcSubject }) as Record<string, unknown>;
      return this.deserialize(row);
    }

    return this.create({
      type: 'agent',
      parentId: null,
      expertId: null,
      name: input.name ?? input.email.split('@')[0] ?? 'Portal User',
      email: input.email,
      callSign: input.callSign,
      telegramId: input.telegramId ?? `pending-${input.oidcSubject.slice(0, 12)}`,
      oidcSubject: input.oidcSubject,
      railPreference: 'paypal',
      cutPercentage: 0,
      status: 'prospect',
    });
  }

  getById(id: string): TreeNode | null {
    // brand-ok
    const row = this.db.query('SELECT * FROM tree_nodes WHERE id = $id').get({ $id: id }) as Record<
      string,
      unknown
    > | null;
    return row ? this.deserialize(row) : null;
  }

  getByTelegram(telegramId: string): TreeNode | null {
    // brand-ok
    const row = this.db
      .query('SELECT * FROM tree_nodes WHERE telegram_id = $t')
      .get({ $t: telegramId }) as Record<string, unknown> | null;
    return row ? this.deserialize(row) : null;
  }

  private deserialize(row: Record<string, unknown>): TreeNode {
    return {
      id: row.id as string,
      type: row.type as TreeNode['type'],
      parentId: (row.parent_id as string) ?? null,
      expertId: (row.expert_id as string) ?? null,
      name: row.name as string,
      callSign: (row.call_sign as string) ?? undefined,
      email: row.email as string | undefined,
      telegramId: row.telegram_id as string,
      oidcSubject: row.oidc_subject as string | undefined,
      railPreference: (row.rail_preference as string) || 'paypal',
      cutPercentage: row.cut_percentage as number,
      totalLiquidity: row.total_liquidity as number,
      totalAccounts: row.total_accounts as number,
      status: (row.status as TreeNode['status']) ?? 'active',
      promotedAt: (row.promoted_at as string) ?? null,
      createdAt: row.created_at as string,
      lastPlayAt: (row.last_play_at as string) ?? null,
      phoneId: (row.phone_id as string) ?? null,
    };
  }

  async canPromote(nodeId: string): Promise<{ eligible: boolean; reason?: string }> {
    // brand-ok
    const node = this.getById(nodeId);
    if (!node) return { eligible: false, reason: 'Node not found' };
    if (node.type !== 'agent')
      return { eligible: false, reason: 'Only agents can become partners' };

    const row = this.db
      .query(
        `SELECT plays_placed, volume, pnl
         FROM growth_metrics
         WHERE node_id = $id AND period = strftime('%Y-%m', 'now')`
      )
      .get({ $id: nodeId }) as { plays_placed: number; volume: number; pnl: number } | null;

    if (!row) return { eligible: false, reason: 'No activity this month' };

    const checks = {
      plays: row.plays_placed >= PROMOTION_THRESHOLDS.playsPlaced,
      volume: row.volume >= PROMOTION_THRESHOLDS.volume,
      pnl: row.pnl >= PROMOTION_THRESHOLDS.pnl,
    };

    if (checks.plays && checks.volume && checks.pnl) return { eligible: true };

    return {
      eligible: false,
      reason: [
        !checks.plays && `plays: ${row.plays_placed}/${PROMOTION_THRESHOLDS.playsPlaced}`,
        !checks.volume && `volume: $${row.volume}/${PROMOTION_THRESHOLDS.volume}`,
        !checks.pnl && `PnL: $${row.pnl}/${PROMOTION_THRESHOLDS.pnl}`,
      ]
        .filter(Boolean)
        .join(', '),
    };
  }

  async promoteToPartner(nodeId: string): Promise<void> {
    // brand-ok
    const node = this.getById(nodeId);
    if (!node) throw new Error('Node not found');
    if (node.type !== 'agent') throw new Error('Only agents can become partners');

    this.db.run(
      "UPDATE tree_nodes SET type = 'partner', promoted_at = $at, status = 'partner', active = 1 WHERE id = $id",
      { $id: nodeId, $at: new Date().toISOString() }
    );

    // Record initial limit baselines for each sportsbook account
    const accounts = this.db
      .query(`SELECT book FROM sb_accounts WHERE agent_id = ? AND status = 'active'`)
      .all(nodeId) as Array<{ book: string }>;
    const repo = new AccountLimitsRepository(this.db);
    for (const a of accounts) {
      repo.recordLimit({
        node_id: nodeId,
        sportsbook: a.book,
        sport_id: '_any',
        market_id: '_any',
        bet_type: 'straight',
        max_wager: 0,
      });
    }

    if (node.telegramId && !node.telegramId.startsWith('pending-')) {
      await sendTelegramMessage(node.telegramId, [
        '🎉 *PROMOTION*',
        '',
        'You are now a *Partner*!',
        'You can recruit your own agents and sub-agents.',
        `Your cut: ${node.cutPercentage}% from downstream.`,
        '',
        'Use /tree to see your network.',
        ...(accounts.length > 0
          ? ['', `📋 ${accounts.length} sportsbook account(s) — limit baselines recorded.`]
          : []),
      ]);
    }
  }

  getTree(nodeId: string, depth = 0): TreeNode[] {
    // brand-ok
    const nodes: TreeNode[] = [];
    const queue: { id: string; level: number }[] = [{ id: nodeId, level: 0 }]; // brand-ok x2 — opaque queue item, not domain ID
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
        .all({ $p: id }) as { id: string }[]; // brand-ok — opaque DB row, not domain ID
      for (const child of children) queue.push({ id: child.id, level: level + 1 });
    }
    return nodes;
  }

  getDownstreamLiquidity(nodeId: string): number {
    // brand-ok
    return this.getTree(nodeId).reduce((sum, n) => sum + n.totalLiquidity, 0);
  }

  getDownstreamAccounts(nodeId: string): number {
    // brand-ok
    return this.getTree(nodeId).reduce((sum, n) => sum + n.totalAccounts, 0);
  }

  recordPlayReceived(nodeId: string): void {
    // brand-ok
    const period = new Date().toISOString().slice(0, 7);
    this.db.run(
      `INSERT INTO growth_metrics (node_id, period, plays_received) VALUES ($id, $p, 1)
       ON CONFLICT(node_id, period) DO UPDATE SET plays_received = plays_received + 1`,
      { $id: nodeId, $p: period }
    );
    this.db.run('UPDATE tree_nodes SET last_play_at = $now WHERE id = $id', {
      $now: new Date().toISOString(),
      $id: nodeId,
    });
  }

  recordPlayPlaced(nodeId: string, stake: number, pnl: number): void {
    // brand-ok
    const period = new Date().toISOString().slice(0, 7);
    this.db.run(
      `INSERT INTO growth_metrics (node_id, period, plays_placed, volume, pnl) VALUES ($id, $p, 1, $vol, $pnl)
       ON CONFLICT(node_id, period) DO UPDATE SET
         plays_placed = plays_placed + 1, volume = volume + $vol, pnl = pnl + $pnl`,
      { $id: nodeId, $p: period, $vol: stake, $pnl: pnl }
    );
  }

  /** Roll up partner liquidity from downstream tree (automation cron). */
  rollupPartnerLiquidity(): number {
    const partners = this.db.query("SELECT id FROM tree_nodes WHERE type = 'partner'").all() as {
      id: string; // brand-ok — opaque DB primary key
    }[];
    for (const { id } of partners) {
      const liquidity = this.getDownstreamLiquidity(id);
      this.db.run('UPDATE tree_nodes SET total_liquidity = $l WHERE id = $id', {
        $l: liquidity,
        $id: id,
      });
    }
    return partners.length;
  }

  /** Run promotion check for all active agents. Returns promoted count. */
  async runPromotionCheck(): Promise<number> {
    const agents = this.db
      .query("SELECT id, name FROM tree_nodes WHERE type = 'agent' AND status = 'active'")
      .all() as { id: string; name: string }[]; // brand-ok — opaque DB row, not domain ID
    let promoted = 0;
    for (const agent of agents) {
      const check = await this.canPromote(agent.id);
      if (check.eligible) {
        await this.promoteToPartner(agent.id);
        promoted++;
      }
    }
    return promoted;
  }

  /** Assign phone from inventory to agent. */
  issuePhone(phoneId: string, agentId: string): void {
    // brand-ok x2
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE phones SET assigned_to = $aid, status = 'issued', issued_at = $now
       WHERE id = $pid AND status = 'inventory'`,
      { $aid: agentId, $now: now, $pid: phoneId }
    );
    this.db.run('UPDATE tree_nodes SET phone_id = $pid WHERE id = $aid', {
      $pid: phoneId,
      $aid: agentId,
    });
  }

  /** Return phone to inventory. */
  returnPhone(phoneId: string): void {
    // brand-ok
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE phones SET assigned_to = NULL, status = 'returned', returned_at = $now WHERE id = $pid`,
      { $now: now, $pid: phoneId }
    );
    this.db.run('UPDATE tree_nodes SET phone_id = NULL WHERE phone_id = $pid', { $pid: phoneId });
  }

  /** Mark phone lost (terminates assignment). */
  markPhoneLost(phoneId: string): void {
    // brand-ok
    this.db.run(`UPDATE phones SET status = 'lost', returned_at = $now WHERE id = $pid`, {
      $now: new Date().toISOString(),
      $pid: phoneId,
    });
    this.db.run('UPDATE tree_nodes SET phone_id = NULL WHERE phone_id = $pid', { $pid: phoneId });
  }
}

export async function sendTelegramMessage(
  chatId: string, // brand-ok
  lines: string[],
  token?: string
): Promise<boolean> {
  const botToken =
    token ?? Bun.env.TELEGRAM_BOT_FACTORY?.trim() ?? Bun.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken || chatId.startsWith('pending-')) return false;
  const res = await fetch(telegramBotApiUrl(botToken, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join('\n'),
      parse_mode: 'Markdown',
    }),
  });
  return res.ok;
}

/** @deprecated Use AccountService */
export const AccountSystem = AccountService;
