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

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
