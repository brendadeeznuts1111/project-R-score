// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — fetch
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
 *   /dod <type> [book] — submit photo proof (caption on photo)
 *   /dodstatus      — recent DOD submissions for this agent
 *   /coverage       — platform coverage %
 *   /platforms      — active platforms + account counts
 *   /myaccounts     — this agent's platform accounts
 *
 * Each node is identified by their Telegram user ID stored in
 * tree_nodes.telegram_id.
 */

import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../operations/db.ts';
import {
  getAgentPlatformAccounts,
  listPlatforms,
  recordCoverageSnapshot,
} from '../operations/platform-coverage.ts';
import { DODVerifier, type DODSubmission } from '../dod/verifier.ts';

const DOD_TYPES = ['balance', 'slip', 'receipt', 'location', 'device', 'other'] as const;
type DodBotType = (typeof DOD_TYPES)[number];

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
  private db: ReturnType<typeof openOperationsDb>;
  private dbPath: string;
  private token: string;
  private polling = false;
  private dod: DODVerifier | null = null;

  constructor(config: BotConfig) {
    this.token = config.token || Bun.env.TELEGRAM_BOT_TOKEN || '';
    this.dbPath = config.dbPath || DEFAULT_OPS_DB_PATH;
    this.db = openOperationsDb({ path: this.dbPath });
  }

  private dodVerifier(): DODVerifier {
    if (!this.dod) {
      this.dod = new DODVerifier(this.dbPath);
    }
    return this.dod;
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
    if (!msg) return;

    const caption = typeof msg.caption === 'string' ? msg.caption.trim() : '';
    const body = typeof msg.text === 'string' ? msg.text.trim() : caption;
    if (!body && !Array.isArray(msg.photo)) return;

    const text = body || '';
    const [cmdRaw, ...args] = text.split(/\s+/);
    const cmd = (cmdRaw || '').split('@')[0] || ''; // strip /dod@BotName
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
      case '/dod':
        await this.handleDod(chatId, node, args, msg);
        break;
      case '/dodstatus':
        await this.handleDodStatus(chatId, node);
        break;
      case '/coverage':
        await this.handleCoverage(chatId);
        break;
      case '/platforms':
        await this.handlePlatforms(chatId);
        break;
      case '/myaccounts':
        await this.handleMyAccounts(chatId, node);
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
      '/dod `<type>` `[book]` — submit photo proof',
      '/dodstatus — recent DOD submissions',
      '/coverage — platform coverage',
      '/platforms — catalog + account counts',
      '/myaccounts — your platform accounts',
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

  private parseDodType(raw: string | undefined): DodBotType | null {
    if (!raw) return null;
    const t = raw.toLowerCase() as DodBotType;
    return (DOD_TYPES as readonly string[]).includes(t) ? t : null;
  }

  private async handleDod(
    chatId: number,
    node: TreeNode | null,
    args: string[],
    msg: Record<string, unknown>
  ): Promise<void> {
    if (!node) {
      await this.send(chatId, ['❌ Not registered — `/register` first']);
      return;
    }

    const kind = this.parseDodType(args[0]);
    if (!kind) {
      await this.send(chatId, [
        'Usage: send a *photo* with caption:',
        '`/dod <type> [book]`',
        '',
        `Types: ${DOD_TYPES.join(' · ')}`,
        'Book example: `draftkings` · `fanduel`',
      ]);
      return;
    }

    const platformHint = args[1]?.toLowerCase();
    const photos = msg.photo as { file_id: string; file_size?: number }[] | undefined;
    if (!photos?.length) {
      await this.send(chatId, [
        `Attach a photo with caption \`/dod ${kind}${platformHint ? ` ${platformHint}` : ''}\`.`,
      ]);
      return;
    }

    const best = photos[photos.length - 1]!;
    try {
      const rawImage = await this.downloadTelegramFile(best.file_id);
      const submission: DODSubmission = {
        id: Bun.randomUUIDv7(),
        agentId: node.id,
        type: kind,
        rawImage,
        submittedAt: new Date().toISOString(),
        telegramMessageId: typeof msg.message_id === 'number' ? msg.message_id : undefined,
        platformHint,
      };

      const ver = await this.dodVerifier().process(submission);
      await this.send(chatId, [
        '✅ *DOD received*',
        `Type: \`${kind}\``,
        ver.platformId ? `Platform: \`${ver.platformId}\`` : '',
        `Status: *${ver.status}*`,
        ver.flagReason ? `Flag: ${ver.flagReason}` : '',
        `Tamper: ${ver.tamperScore}/100`,
        `Hash: \`${ver.visualHash}\``,
        `ID: \`${ver.dodId.slice(0, 8)}\``,
      ].filter(Boolean));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.send(chatId, [`❌ DOD failed: ${message}`]);
    }
  }

  private async handleCoverage(chatId: number): Promise<void> {
    const summary = recordCoverageSnapshot(this.db);
    const lines = summary.byCategory.map(
      c => `• ${c.category}: ${c.covered}/${c.total}`
    );
    await this.send(chatId, [
      '📊 *Platform Coverage*',
      `Overall: ${summary.covered}/${summary.total} (${summary.pct}%)`,
      '',
      'By category:',
      ...(lines.length ? lines : ['• (no platforms seeded)']),
      '',
      'Use /platforms for the full list.',
    ]);
  }

  private async handlePlatforms(chatId: number): Promise<void> {
    const platforms = listPlatforms(this.db).slice(0, 25);
    if (!platforms.length) {
      await this.send(chatId, ['No platforms in catalog. Run `bun scripts/seed-platforms.ts`.']);
      return;
    }
    await this.send(chatId, [
      '🏢 *Active Platforms*',
      '',
      ...platforms.map(
        p =>
          `${p.account_count > 0 ? '✅' : '○'} ${p.name} (\`${p.id}\`) · ${p.category}` +
          `\n   ${p.api_available ? 'API' : 'Manual'} · Accounts: ${p.account_count}`
      ),
    ]);
  }

  private async handleMyAccounts(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node) {
      await this.send(chatId, ['❌ Not registered']);
      return;
    }
    const accounts = getAgentPlatformAccounts(this.db, node.id);
    if (!accounts.length) {
      await this.send(chatId, [
        'No platform accounts on file.',
        'Submit balance DOD: `/dod balance draftkings`',
      ]);
      return;
    }
    await this.send(chatId, [
      '💳 *Your Accounts*',
      '',
      ...accounts.map(a => {
        const when = a.lastVerifiedAt
          ? new Date(a.lastVerifiedAt).toLocaleDateString()
          : 'Never';
        return (
          `${a.status === 'active' ? '✅' : '⚠️'} ${a.name} (\`${a.platformId}\`)` +
          `\n   $${(a.balance ?? 0).toLocaleString()} · verified ${when}`
        );
      }),
      '',
      'Submit balance DOD: `/dod balance <book>`',
    ]);
  }

  private async handleDodStatus(chatId: number, node: TreeNode | null): Promise<void> {
    if (!node) {
      await this.send(chatId, ['❌ Not registered']);
      return;
    }

    const rows = this.dodVerifier()
      .list()
      .filter((r: { agent_id?: string }) => r.agent_id === node.id)
      .slice(0, 10) as {
      id: string;
      type: string;
      status: string;
      tamper_score: number;
      submitted_at: string;
    }[];

    if (!rows.length) {
      await this.send(chatId, ['No DOD submissions yet. Send a photo with `/dod balance`.']);
      return;
    }

    await this.send(chatId, [
      '*Recent DODs*',
      '',
      ...rows.map(
        r =>
          `• \`${r.id.slice(0, 8)}\` ${r.type} — *${r.status}* (tamper ${r.tamper_score ?? 0})`
      ),
    ]);
  }

  private async downloadTelegramFile(fileId: string): Promise<Uint8Array> {
    const metaRes = await fetch(
      `https://api.telegram.org/bot${this.token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    if (!metaRes.ok) throw new Error(`Telegram getFile failed (${metaRes.status})`);
    const meta = (await metaRes.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
    };
    const path = meta.result?.file_path;
    if (!meta.ok || !path) throw new Error('Telegram getFile: missing file_path');

    const fileRes = await fetch(`https://api.telegram.org/file/bot${this.token}/${path}`);
    if (!fileRes.ok) throw new Error(`Telegram file download failed (${fileRes.status})`);
    return new Uint8Array(await fileRes.arrayBuffer());
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
