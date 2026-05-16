#!/usr/bin/env bun

// ['/'][COMMANDS][TELEGRAM][WORKFLOWS][SLASH-001][v2.8][ACTIVE]

// [DATAPIPE][CORE][DA-CO-DC2][v2.8.0][ACTIVE]

import { AgentRankingsSystem } from "./agent-rankings.ts";
import { GovernanceEngine } from "./gov-rules.ts";
import { MCPToolsRegistry } from "./mcp-tools.ts";
import { fetchData, aggregateAgents } from "./datapipe.ts";

interface TelegramCommand {
  command: string;
  description: string;
  handler: (args?: string[]) => Promise<string>;
  adminOnly?: boolean;
}

class TelegramCommandsHandler {
  private commands: Map<string, TelegramCommand> = new Map();

  constructor() {
    this.registerCommands();
  }

  private registerCommands(): void {
    // Core commands from documentation
    this.registerCommand({
      command: '/top',
      description: '🏆 Top 3 agents + ROI',
      handler: async (args) => {
        const count = args && args[0] ? parseInt(args[0]) : 3;
        const rankings = new AgentRankingsSystem();
        await rankings.generateRankings();
        const topAgents = rankings.getTopAgents(count);

        return `🏆 *Top ${count} Agents:*\n` +
          topAgents.map((agent, i) =>
            `${i + 1}. *${agent.agent}*: $${agent.profit.toLocaleString()} (${agent.roi}% ROI, ${agent.winRate}% win)`
          ).join('\n');
      }
    });

    this.registerCommand({
      command: '/reports',
      description: 'Full table + CSV link',
      handler: async () => {
        // Generate full report
        const rankings = new AgentRankingsSystem();
        await rankings.generateRankings();
        const content = await rankings.exportToMarkdown('telegram-report.md');

        return `📊 *Full Agent Report Generated*\n\n` +
          `📄 Saved to: \`dashboards/telegram-report.md\`\n\n` +
          `*Top 5:*\n` +
          rankings.getTopAgents(5).map((agent, i) =>
            `${i + 1}. ${agent.agent}: $${agent.profit.toLocaleString()}`
          ).join('\n');
      }
    });

    this.registerCommand({
      command: '/player',
      description: 'Player-specific deep dive',
      handler: async (args) => {
        if (!args || args.length === 0) {
          return `❌ *Usage:* /player <name>`;
        }

        try {
          const query = args.join(' ').toLowerCase();
          const data = await fetchData();
          const bets = (data.data || []).filter((bet: any) =>
            String(bet.player || '').toLowerCase().includes(query)
          );

          if (bets.length === 0) {
            return `🔎 *No player matches found for:* ${args.join(' ')}`;
          }

          const sample = bets.slice(0, 5);
          const totalRisk = sample.reduce((sum: number, bet: any) => sum + parseFloat(bet.bet || '0'), 0);

          return `🔎 *Player Tracking: ${args.join(' ')}*\n\n` +
            sample.map((bet: any, index: number) =>
              `${index + 1}. *${bet.agent || 'Unknown'}*: $${parseFloat(bet.bet || '0').toLocaleString()} ${bet.wager || bet.bet_type || ''} (${bet.odds || 'n/a'})`
            ).join('\n') +
            `\n\n*Matches:* ${bets.length}\n*Sample Risk:* $${totalRisk.toLocaleString()}`;
        } catch (error) {
          return `❌ *Player lookup error:* ${error.message}`;
        }
      }
    });

    this.registerCommand({
      command: '/clv',
      description: 'CLV parser and line movement review',
      handler: async (args) => {
        if (!args || args.length < 2) {
          return [
            `📊 *CLV Input Required*`,
            ``,
            `Usage: \`/clv <opening> <closing>\``,
            `Examples:`,
            `• \`/clv -110 -120\``,
            `• \`/clv +150 +140\``,
            `• \`/clv -7 -6.5\``,
            ``,
            `This returns both bettor CLV and book impact so the result is explicit.`
          ].join('\n');
        }

        const opening = parseLineValue(args[0]);
        const closing = parseLineValue(args[1]);

        if (opening === null || closing === null) {
          return `❌ *Invalid CLV input.* Use odds or spreads like \`-110\`, \`+140\`, \`-6.5\`.`;
        }

        const summary = buildClvSummary(opening, closing);
        return [
          `📊 *CLV Review*`,
          ``,
          `Opening: \`${args[0]}\``,
          `Closing: \`${args[1]}\``,
          `Market: *${summary.marketType}*`,
          `Bettor CLV: *${summary.bettorOutcome}*`,
          `Book Impact: *${summary.bookOutcome}*`,
          `Edge: *${summary.edgeText}*`,
          ``,
          summary.explainer
        ].join('\n');
      }
    });

    this.registerCommand({
      command: '/pending',
      description: 'High-vol pending bets',
      handler: async () => {
        try {
          const pendingData = await fetchData('0'); // State 0 = pending
          const bets = pendingData.data || [];

          // Filter high volume pending bets
          const highVolPending = bets
            .filter((bet: any) => parseFloat(bet.bet || '0') > 100)
            .sort((a: any, b: any) => parseFloat(b.bet || '0') - parseFloat(a.bet || '0'))
            .slice(0, 10);

          if (highVolPending.length === 0) {
            return `✅ *No high-volume pending bets* (> $100)`;
          }

          return `⏳ *High-Volume Pending Bets:*\n\n` +
            highVolPending.map((bet: any, i: number) =>
              `${i + 1}. *${bet.agent}*: $${bet.bet} on ${bet.player} (${bet.odds})`
            ).join('\n') +
            `\n\n*Total:* ${highVolPending.length} bets > $100`;
        } catch (error) {
          return `❌ *Error fetching pending bets:* ${error.message}`;
        }
      }
    });

    this.registerCommand({
      command: '/alerts',
      description: 'Risk (delay/loss) alerts',
      handler: async () => {
        try {
          const data = await fetchData();
          const bets = data.data || [];

          const alerts = [];

          // Large losses
          const bigLosses = bets
            .filter((bet: any) => bet.state === '2' && parseFloat(bet.result || '0') < -500)
            .slice(0, 5);

          if (bigLosses.length > 0) {
            alerts.push(`🚨 *Big Losses:*\n` +
              bigLosses.map((bet: any) =>
                `• ${bet.agent}: -$${Math.abs(parseFloat(bet.result))} (${bet.player})`
              ).join('\n')
            );
          }

          // High delay bets
          const highDelay = bets
            .filter((bet: any) => parseInt(bet.delay || '0') > 10)
            .slice(0, 5);

          if (highDelay.length > 0) {
            alerts.push(`⚠️ *High Delay Bets:*\n` +
              highDelay.map((bet: any) =>
                `• ${bet.agent}: ${bet.delay}s delay (${bet.player})`
              ).join('\n')
            );
          }

          if (alerts.length === 0) {
            return `✅ *All Clear - No risk alerts*`;
          }

          return alerts.join('\n\n');
        } catch (error) {
          return `❌ *Error checking alerts:* ${error.message}`;
        }
      }
    });

    this.registerCommand({
      command: '/grep',
      description: 'Vault search',
      handler: async (args) => {
        if (!args || args.length === 0) {
          return `❌ *Usage:* /grep <search_term>`;
        }

        const searchTerm = args.join(' ');

        // Use grep-assistant for searching
        try {
          const { spawn } = await import('child_process');
          const result = spawn('bun', ['run', 'grep-assistant.ts', searchTerm], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let output = '';
          let errorOutput = '';

          result.stdout.on('data', (data) => {
            output += data.toString();
          });

          result.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          return new Promise((resolve) => {
            result.on('close', (code) => {
              if (code === 0 && output) {
                const lines = output.split('\n').filter(line => line.trim()).slice(0, 10);
                resolve(`🔍 *Search: "${searchTerm}"*\n\n` + lines.map(line => `• ${line}`).join('\n'));
              } else {
                resolve(`❌ *No results for:* ${searchTerm}`);
              }
            });
          });
        } catch (error) {
          return `❌ *Search error:* ${error.message}`;
        }
      }
    });

    this.registerCommand({
      command: '/branch',
      description: 'Git branch + PR',
      handler: async (args) => {
        if (!args || args.length === 0) {
          return `❌ *Usage:* /branch <ID> [description]`;
        }

        const id = args[0];
        const description = args.slice(1).join(' ') || 'Auto-generated branch';

        try {
          // Create smart branch
          const { spawn } = await import('child_process');
          const result = spawn('bun', ['run', 'git-branch.ts', 'create', id, description], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let output = '';
          result.stdout.on('data', (data) => {
            output += data.toString();
          });

          return new Promise((resolve) => {
            result.on('close', (code) => {
              if (code === 0) {
                resolve(`🌿 *Branch Created:*\n\`${id}\`\n\n${description}\n\n✅ Ready for PR`);
              } else {
                resolve(`❌ *Branch creation failed*`);
              }
            });
          });
        } catch (error) {
          return `❌ *Branch error:* ${error.message}`;
        }
      }
    });

    this.registerCommand({
      command: '/live',
      description: 'WS status + dashboard',
      handler: async () => {
        try {
          // Check WS server status and get live data
          const data = await fetchData();
          const agents = aggregateAgents(data);
          const totalProfit = agents.reduce((sum, a) => sum + a.stats.profit, 0);

          return `🌐 *Live Status:*\n\n` +
            `📊 *${agents.length} active agents*\n` +
            `💰 *$${totalProfit.toLocaleString()} total profit*\n` +
            `🔄 *${data.data?.length || 0} recent bets*\n\n` +
            `📱 *Dashboard:* View \`analytics-v2.8.md\`\n` +
            `🌐 *WebSocket:* ${process.env.WS_PORT || '3001'}`;
        } catch (error) {
          return `❌ *Live status error:* ${error.message}`;
        }
      }
    });

    // Additional utility commands
    this.registerCommand({
      command: '/rules',
      description: 'GOV rules list',
      handler: async (args) => {
        const scanner = new GovernanceEngine();
        const query = args ? args.join(' ') : '';
        const rules = await scanner.listRules(query);

        return `📋 *GOV Rules ${query ? `(${query})` : ''}:*\n\n` +
          rules.slice(0, 5).map(rule =>
            `• ${rule.id}: ${rule.trigger} → ${rule.action}`
          ).join('\n') +
          `\n\n*Total: ${rules.length} rules*`;
      }
    });

    this.registerCommand({
      command: '/tools',
      description: 'MCP tools list',
      handler: async () => {
        const registry = new MCPToolsRegistry();
        const tools = await registry.scanTools();

        return `🛠️ *MCP Tools (${tools.length}):*\n\n` +
          tools.slice(0, 8).map(tool =>
            `• ${tool.name}: \`${tool.cli}\``
          ).join('\n') +
          `\n\n*Run:* \`bun mcp:list\` for full list`;
      }
    });

    this.registerCommand({
      command: '/help',
      description: 'Show all commands',
      handler: async () => {
        const commands = Array.from(this.commands.values());
        return `🤖 *Syndicate Bot Commands:*\n\n` +
          commands.map(cmd => `/${cmd.command.replace('/', '')} - ${cmd.description}`).join('\n') +
          `\n\n📖 *Use /command for details*`;
      }
    });
  }

  private registerCommand(command: TelegramCommand): void {
    const cmdName = command.command.replace('/', '');
    this.commands.set(cmdName, command);
  }

  async handleCommand(commandText: string): Promise<string> {
    // Parse command and arguments
    const parts = commandText.trim().split(/\s+/);
    const command = parts[0].replace('/', '');
    const args = parts.slice(1);

    const cmd = this.commands.get(command);
    if (!cmd) {
      return `❌ *Unknown command:* /${command}\n\n🤖 *Type /help for available commands*`;
    }

    try {
      return await cmd.handler(args);
    } catch (error) {
      return `❌ *Command error:* ${error.message}`;
    }
  }

  getAvailableCommands(): TelegramCommand[] {
    return Array.from(this.commands.values());
  }

  formatCommandsTable(): string {
    const commands = this.getAvailableCommands();
    const header = '| Command | Response |\n|-------------|--------------|';

    const rows = commands.map(cmd =>
      `| **${cmd.command}** | ${cmd.description} |`
    );

    return `${header}\n${rows.join('\n')}`;
  }
}

// CLI Interface for testing
async function main() {
  const handler = new TelegramCommandsHandler();
  const command = process.argv[2];

  if (!command) {
    console.log(`🚀 TELEGRAM /COMMANDS – 1-Click Ops

${handler.formatCommandsTable()}

USAGE:
  bun telegram:cmd <command> [args...]

EXAMPLES:
  bun telegram:cmd /top
  bun telegram:cmd /pending
  bun telegram:cmd /grep ESPORTS
  bun telegram:cmd /branch TEST-001 New feature
`);
    return;
  }

  const result = await handler.handleCommand(command + ' ' + process.argv.slice(3).join(' '));
  console.log(result);
}

// Export for use in other scripts
export { TelegramCommandsHandler, type TelegramCommand };

function parseLineValue(input: string): number | null {
  const normalized = input.replace(/[^0-9+-.]/g, '');
  if (!normalized || normalized === '+' || normalized === '-' || normalized === '.') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildClvSummary(opening: number, closing: number): {
  marketType: string;
  bettorOutcome: string;
  bookOutcome: string;
  edgeText: string;
  explainer: string;
} {
  if (isAmericanOdds(opening) && isAmericanOdds(closing)) {
    const openingImplied = americanToImpliedProbability(opening);
    const closingImplied = americanToImpliedProbability(closing);
    const bettorEdge = (closingImplied - openingImplied) * 100;
    const edgeText = `${formatSigned(bettorEdge.toFixed(2))} pts implied probability`;

    if (bettorEdge > 0) {
      return {
        marketType: 'American odds',
        bettorOutcome: 'Beat closing',
        bookOutcome: 'Line moved against the book',
        edgeText,
        explainer: `The closing price implies a stronger probability than the opening number. The bettor got the better ticket and the book gave up value.`
      };
    }

    if (bettorEdge < 0) {
      return {
        marketType: 'American odds',
        bettorOutcome: 'Missed closing',
        bookOutcome: 'Closing improved for the book',
        edgeText,
        explainer: `The closing price became more favorable for a later entry. The bettor did not beat the market and the book improved its position.`
      };
    }

    return {
      marketType: 'American odds',
      bettorOutcome: 'Flat',
      bookOutcome: 'No line value change',
      edgeText: '0.00 pts implied probability',
      explainer: `The market closed at the same implied price. There is no measurable CLV edge either way.`
    };
  }

  const bettorEdge = closing - opening;
  const edgeText = `${formatSigned(bettorEdge.toFixed(2))} points`;

  if (bettorEdge > 0) {
    return {
      marketType: 'Spread / total',
      bettorOutcome: 'Closing improved numerically',
      bookOutcome: 'Opening number was softer for the book',
      edgeText,
      explainer: `The line moved upward from the opening number. Treat this as a numeric move and confirm side context if you need favorite versus underdog interpretation.`
    };
  }

  if (bettorEdge < 0) {
    return {
      marketType: 'Spread / total',
      bettorOutcome: 'Closing worsened numerically',
      bookOutcome: 'Closing hardened versus the opener',
      edgeText,
      explainer: `The line moved downward from the opening number. Treat this as a numeric move and confirm side context if you need favorite versus underdog interpretation.`
    };
  }

  return {
    marketType: 'Spread / total',
    bettorOutcome: 'Flat',
    bookOutcome: 'No line value change',
    edgeText: '0.00 points',
    explainer: `The opening and closing numbers are identical, so there is no CLV movement to score.`
  };
}

function isAmericanOdds(value: number): boolean {
  return Math.abs(value) >= 100;
}

function americanToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  }

  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function formatSigned(value: string): string {
  return value.startsWith('-') ? value : `+${value}`;
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
