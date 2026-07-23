// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.sh/docs/runtime/sqlite — bun:sqlite
// @see https://bun.sh/docs/runtime/networking/fetch#sending-an-http-request — fetch
/**
 * Operations Telegram bot — tree-aware commands for agents and sub-agents.
 *
 * Commands:
 *   /start          — welcome + registration check
 *   /status         — accounts, plays placed, P&L
 *   /accounts       — list sportsbook accounts with balances
 *   /plays          — today's pending plays
 *   /tree           — downstream tree (partners/agents only)
 *   /register <ref> <name> — register as sub-agent
 *
 * Each node is identified by their Telegram user ID stored in
 * tree_nodes.telegram_id.
 */

import { Database } from 'bun:sqlite';

const COMMANDS = ['/start', '/status', '/accounts', '/plays', '/tree', '/register'] as const;

type BotCommand = (typeof COMMANDS)[number] | null;

export interface BotConfig {
  token: string;
  dbPath: string;
}

export interface TreeNode {
  id: string; // brand-ok — opaque UUID
  type: 'partner' | 'agent' | 'sub_agent';
  parent_id: string | null; // brand-ok
  expert_id: string | null; // brand-ok
  name: string;
  telegram_id: string; // brand-ok — external Telegram user ID
}

export class OpsTelegramBot {
  private db: Database;
  private token: string;
  private polling = false;

  constructor(config: BotConfig) {
    this.token = config.token || Bun.env.TELEGRAM_BOT_TOKEN || '';
    this.db = new Database(config.dbPath);
    this.db.run('PRAGMA journal_mode=WAL');
  }

  /** Start long-polling for updates. */
  async start(): Promise<void> {
    let offset = 0;
    this.polling = true;
    while (this.polling) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${offset}&timeout=30`
        );
        if (!res.ok) {
          await Bun.sleep(5000);
          continue;
        }
        const data = await res.json();
        for (const update of data.result) {
          offset = Math.max(offset, update.update_id + 1);
          await this.handleUpdate(update);
        }
      } catch {
        await Bun.sleep(3000);
      }
    }
  }

  stop(): void {
    this.polling = false;
  }

  /** Handle a raw Telegram update — wire boundary. */

  async handleUpdate(update: Record<string, unknown>): Promise<void> {
    const msg = update.message as Record<string, unknown> | undefined;
    if (!msg?.text) return;

    const text = (msg.text as string).trim();
    const [cmd, ...args] = text.split(/\s+/);
    const userId = String(msg.from && (msg.from as Record<string, unknown>).id);
    const chatId = Number(msg.chat && (msg.chat as Record<string, unknown>).id);

    const node = this.db
      .query('SELECT * FROM tree_nodes WHERE telegram_id = $t AND active = 1')
      .get({ $t: userId }) as TreeNode | null;

    switch (cmd) {
      case '/start':
        await this.handleStart(chatId, node);
        break;
      case '/status':
        await this.handleStatus(chatId, node);
        break;
      case '/accounts':
        await this.handleAccounts(chatId, node);
        break;
      case '/plays':
        await this.handlePlays(chatId, node);
        break;
      case '/tree':
        await this.handleTree(chatId, node);
        break;
      case '/register':
        await this.handleRegister(chatId, userId, node, args);
        break;
    }
  }

  // ── Command handlers ──────────────────────────────────────────────

  private async handleStart(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node) {
      const experts = this.db
        .query('SELECT name, sport, market FROM experts WHERE active = 1')
        .all() as { name: string; sport: string; market: string }[];

      const list = experts.length
        ? experts.map(e => `• ${e.name} (${e.sport} ${e.market})`).join('\n')
        : 'No experts available.';

      await this.send(chatId, [
        '👋 *Operations Platform*',
        '',
        'You are not registered. Contact your referrer or use:',
        '`/register <referral-id> <your-name>`',
        '',
        '*Available experts:*',
        list,
      ]);
      return;
    }

    await this.send(chatId, [
      `👋 ${node.name}`,
      '',
      `Type: *${node.type.toUpperCase()}*`,
      '',
      '/status — Your status',
      '/accounts — Sportsbook accounts',
      "/plays — Today's plays",
      '/tree — Your down-tree',
    ]);
  }

  private async handleStatus(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node) {
      await this.send(chatId, ['❌ Not registered']);
      return;
    }

    const accts = this.db
      .query('SELECT COUNT(*) as c FROM sb_accounts WHERE agent_id = $a')
      .get({ $a: node.id }) as { c: number };

    const placed = this.db
      .query("SELECT COUNT(*) as c FROM play_distribution WHERE node_id = $n AND status = 'placed'")
      .get({ $n: node.id }) as { c: number };

    const pnl = this.db
      .query(
        `
      SELECT COALESCE(SUM(p.pnl), 0) as total
      FROM plays p
      JOIN play_distribution d ON p.id = d.play_id
      WHERE d.node_id = $n AND p.result IN ('win', 'loss')
    `
      )
      .get({ $n: node.id }) as { total: number };

    await this.send(chatId, [
      '📊 *Status*',
      `Accounts: ${accts.c}`,
      `Placed: ${placed.c}`,
      `P&L: $${pnl.total.toFixed(2)}`,
    ]);
  }

  private async handleAccounts(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node) {
      await this.send(chatId, ['❌ Not registered']);
      return;
    }

    const accounts = this.db
      .query(
        'SELECT book, username, balance, status FROM sb_accounts WHERE agent_id = $a ORDER BY book'
      )
      .all({ $a: node.id }) as {
      book: string;
      username: string;
      balance: number;
      status: string;
    }[];

    if (!accounts.length) {
      await this.send(chatId, ['📋 No accounts. Contact your referrer to get funded.']);
      return;
    }

    const rows = accounts.map(
      a => `${a.book}: **${a.username || '—'}** — $${a.balance.toFixed(0)} (${a.status})`
    );

    await this.send(chatId, ['📋 *Your Accounts*', '', ...rows]);
  }

  private async handlePlays(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node) {
      await this.send(chatId, ['❌ Not registered']);
      return;
    }

    const plays = this.db
      .query(
        `
      SELECT p.sport, p.market, p.event, p.selection, p.odds, p.confidence, p.sent_at
      FROM plays p
      JOIN play_distribution d ON p.id = d.play_id
      WHERE d.node_id = $n AND p.result = 'pending'
      ORDER BY p.sent_at DESC
      LIMIT 5
    `
      )
      .all({ $n: node.id }) as {
      sport: string;
      market: string;
      event: string;
      selection: string;
      odds: number;
      confidence: number;
      sent_at: string;
    }[];

    if (!plays.length) {
      await this.send(chatId, ['📋 No pending plays.']);
      return;
    }

    const rows = plays
      .map(p => [
        `🎯 *${p.sport} ${p.market}*`,
        `${p.event}: ${p.selection} @ ${p.odds > 0 ? '+' : ''}${p.odds}`,
        `   Confidence: ${p.confidence}% · ${p.sent_at.slice(11, 16)}`,
        '',
      ])
      .flat();

    await this.send(chatId, ['📋 *Pending Plays*', '', ...rows]);
  }

  private async handleTree(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node || node.type === 'sub_agent') {
      await this.send(chatId, ['❌ Tree view available for partners and agents only.']);
      return;
    }

    const children = this.db
      .query(
        'SELECT type, COUNT(*) as c FROM tree_nodes WHERE parent_id = $p AND active = 1 GROUP BY type'
      )
      .all({ $p: node.id }) as { type: string; c: number }[];

    const downstream = this.db
      .query(
        `
      WITH RECURSIVE down_tree AS (
        SELECT id FROM tree_nodes WHERE parent_id = $p AND active = 1
        UNION ALL
        SELECT n.id FROM tree_nodes n JOIN down_tree t ON n.parent_id = t.id
      )
      SELECT COALESCE(SUM(a.balance), 0) as total
      FROM sb_accounts a
      JOIN down_tree d ON a.agent_id = d.id
      WHERE a.status = 'active'
    `
      )
      .get({ $p: node.id }) as { total: number };

    const rows = children.map(r => `${r.type}: ${r.c}`);

    await this.send(chatId, [
      '🌳 *Your Tree*',
      '',
      ...rows,
      '',
      `Downstream liquidity: $${downstream.total.toLocaleString()}`,
    ]);
  }

  private async handleRegister(
    chatId: number,
    userId: string, // brand-ok — external Telegram user ID
    node: TreeNode | null,
    args: string[]
  ): Promise<void> {
    if (node) {
      await this.send(chatId, ['✅ Already registered.']);
      return;
    }

    const [refId, ...nameParts] = args;
    if (!refId || !nameParts.length) {
      await this.send(chatId, ['Usage: `/register <referral-id> <your-name>`']);
      return;
    }

    const name = nameParts.join(' ');
    const parent = this.db
      .query('SELECT * FROM tree_nodes WHERE id = $r AND active = 1')
      .get({ $r: refId }) as TreeNode | null;

    if (!parent) {
      await this.send(chatId, ['❌ Invalid referral ID.']);
      return;
    }

    const newId = Bun.randomUUIDv7();
    const now = new Date().toISOString();

    this.db.run(
      `
      INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, created_at)
      VALUES ($id, 'sub_agent', $pid, $eid, $name, $tg, $now)
    `,
      {
        $id: newId,
        $pid: parent.id,
        $eid: parent.expert_id,
        $name: name,
        $tg: userId,
        $now: now,
      }
    );

    await this.send(chatId, [
      `✅ Registered as sub-agent of *${parent.name}*`,
      `Your ID: \`${newId}\``,
    ]);

    if (parent.telegram_id) {
      await this.sendToUser(parent.telegram_id, `📢 New sub-agent: ${name}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async send(chatId: number, lines: string[]): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  }

  private async sendToUser(telegramId: string /* brand-ok */, text: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'Markdown',
      }),
    });
  }
}
