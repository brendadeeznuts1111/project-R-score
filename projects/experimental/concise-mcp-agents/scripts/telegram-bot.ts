#!/usr/bin/env bun

// [TELEGRAM][BOT][INTEGRATION][TG-BOT-001][v2.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-TG1][v2.0.0][ACTIVE]

import { TelegramCommandsHandler } from "./telegram-commands.ts";
import {
  type Fantasy402RouteKey,
  type Fantasy402SendOptions,
  getFantasy402ChatId,
  getFantasy402TopicEnvMap,
  resolveFantasy402ThreadId
} from "./fantasy402-telegram-routing.ts";

interface TelegramConfig {
  botToken: string;
  channelId: string;
  webhookUrl?: string;
  pollingInterval: number;
}

class TelegramBot {
  private config: TelegramConfig;
  private commands: TelegramCommandsHandler;
  private lastUpdateId: number = 0;
  private pendingClvChats: Set<string> = new Set();

  constructor(config?: Partial<TelegramConfig>) {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      channelId: process.env.TELEGRAM_CHANNEL_ID || '',
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      pollingInterval: 1000, // 1 second
      ...config
    };

    if (!this.config.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable required');
    }

    this.commands = new TelegramCommandsHandler();
  }

  async sendMessage(text: string, options: Fantasy402SendOptions = {}): Promise<boolean> {
    try {
      const targetChatId = options.chatId || getFantasy402ChatId() || this.config.channelId;
      if (!targetChatId) {
        console.error('No chat ID specified');
        return false;
      }

      const messageThreadId = options.threadId ?? resolveFantasy402ThreadId(options.route);
      if (options.route && !messageThreadId) {
        console.error(`No message_thread_id configured for route: ${options.route}`);
        return false;
      }

      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const payload: Record<string, string | number | boolean> = {
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      };

      if (messageThreadId) {
        payload.message_thread_id = messageThreadId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!result.ok) {
        console.error(`Telegram API error: ${result.description}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to send message: ${error.message}`);
      return false;
    }
  }

  async sendToChannel(text: string): Promise<boolean> {
    return this.sendMessage(text, { chatId: this.config.channelId });
  }

  async sendFantasy402AutoMessage(text: string, route: Fantasy402RouteKey): Promise<boolean> {
    return this.sendMessage(text, { route });
  }

  async getUpdates(): Promise<any[]> {
    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getUpdates`;
      const params = new URLSearchParams({
        offset: (this.lastUpdateId + 1).toString(),
        timeout: '30'
      });

      const response = await fetch(`${url}?${params}`);
      const result = await response.json();

      if (!result.ok) {
        console.error(`Telegram API error: ${result.description}`);
        return [];
      }

      const updates = result.result || [];

      // Update last update ID
      if (updates.length > 0) {
        this.lastUpdateId = updates[updates.length - 1].update_id;
      }

      return updates;
    } catch (error) {
      console.error(`Failed to get updates: ${error.message}`);
      return [];
    }
  }

  async processUpdates(): Promise<void> {
    const updates = await this.getUpdates();

    for (const update of updates) {
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id.toString();
        const text = this.normalizeIncomingText(chatId, update.message.text.trim());

        console.log(`📨 Received: ${text} from ${chatId}`);

        try {
          const response = await this.commands.handleCommand(text);
          this.updatePendingClvState(chatId, text, response);
          const route = getRouteForTelegramCommand(text, response);

          if (response) {
            await this.sendMessage(response, route ? { route } : { chatId });
            console.log(`📤 Sent response to ${chatId}`);
          }
        } catch (error) {
          console.error(`Error processing command: ${error.message}`);
          await this.sendMessage(`❌ Error: ${error.message}`, { chatId });
        }
      }
    }
  }

  async startPolling(): Promise<void> {
    console.log(`🤖 Telegram bot started - Polling every ${this.config.pollingInterval}ms`);

    while (true) {
      try {
        await this.processUpdates();
      } catch (error) {
        console.error(`Polling error: ${error.message}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.config.pollingInterval));
    }
  }

  async sendTopAgents(count: number = 3): Promise<boolean> {
    console.log('⏸️ Automatic top-agent broadcasts are paused in this chat.');
    return true;
  }

  async sendAlerts(): Promise<boolean> {
    console.log('⏸️ Automatic alert broadcasts are paused in this chat.');
    return true;
  }

  async sendReports(): Promise<boolean> {
    console.log('⏸️ Automatic report broadcasts are paused in this chat.');
    return true;
  }

  private normalizeIncomingText(chatId: string, text: string): string {
    if (text.startsWith('/clv')) {
      return text;
    }

    if (!this.pendingClvChats.has(chatId)) {
      return text;
    }

    const pair = extractPlainClvPair(text);
    if (!pair) {
      return text;
    }

    return `/clv ${pair.opening} ${pair.closing}`;
  }

  private updatePendingClvState(chatId: string, input: string, response: string): void {
    const normalizedInput = input.toLowerCase();
    const normalizedResponse = response.toLowerCase();

    if (normalizedInput.startsWith('/clv') && normalizedResponse.includes('clv review')) {
      this.pendingClvChats.delete(chatId);
      return;
    }

    if (
      normalizedResponse.includes('clv input required') ||
      normalizedResponse.includes('invalid clv input')
    ) {
      this.pendingClvChats.add(chatId);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`🤖 Telegram Bot v2.0

USAGE:
  bun telegram:bot start              # Start polling bot
  bun telegram:bot send <message>      # Send message to channel
  bun telegram:bot top [count]         # Send top agents to channel
  bun telegram:bot alerts              # Send risk alerts to channel
  bun telegram:bot reports             # Send reports to channel

ENVIRONMENT VARIABLES:
  TELEGRAM_BOT_TOKEN     # Bot token from @BotFather
  TELEGRAM_CHANNEL_ID    # Channel/chat ID (with @ or -)

EXAMPLES:
  bun telegram:bot start              # Start the bot
  bun telegram:bot send "Hello world" # Send message
  bun telegram:bot top 5              # Send top 5 agents
  bun telegram:bot alerts             # Send alerts

SETUP:
  1. Create bot with @BotFather
  2. Add bot to channel as admin
  3. Set TELEGRAM_BOT_TOKEN
  4. Get channel ID: /getChat in bot chat
  5. Set TELEGRAM_CHANNEL_ID
`);
    return;
  }

  try {
    const bot = new TelegramBot();
    const command = args[0];

    switch (command) {
      case 'start':
        await bot.startPolling();
        break;

      case 'send':
        if (args.length < 2) {
          console.error('Usage: bun telegram:bot send <message>');
          process.exit(1);
        }
        const parsed = parseSendArgs(args.slice(1));
        const sent = await bot.sendMessage(parsed.message, parsed.options);
        if (sent) {
          console.log('✅ Message sent');
        } else {
          console.error('❌ Failed to send message');
          process.exit(1);
        }
        break;

      case 'top':
        const count = args[1] ? parseInt(args[1]) : 3;
        const topSent = await bot.sendTopAgents(count);
        if (topSent) {
          console.log(`✅ Top ${count} agents sent`);
        } else {
          console.error('❌ Failed to send top agents');
          process.exit(1);
        }
        break;

      case 'alerts':
        const alertsSent = await bot.sendAlerts();
        if (alertsSent) {
          console.log('✅ Alerts sent (or no alerts to send)');
        } else {
          console.error('❌ Failed to send alerts');
          process.exit(1);
        }
        break;

      case 'reports':
        const reportsSent = await bot.sendReports();
        if (reportsSent) {
          console.log('✅ Reports sent');
        } else {
          console.error('❌ Failed to send reports');
          process.exit(1);
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun telegram:bot --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

function parseSendArgs(args: string[]): { message: string; options: Fantasy402SendOptions } {
  const options: Fantasy402SendOptions = {};
  const messageParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--route' && args[i + 1]) {
      options.route = args[++i] as Fantasy402RouteKey;
      continue;
    }

    if (arg.startsWith('--route=')) {
      options.route = arg.slice('--route='.length) as Fantasy402RouteKey;
      continue;
    }

    if (arg === '--thread-id' && args[i + 1]) {
      options.threadId = parseInt(args[++i], 10);
      continue;
    }

    if (arg.startsWith('--thread-id=')) {
      options.threadId = parseInt(arg.slice('--thread-id='.length), 10);
      continue;
    }

    if (arg === '--chat-id' && args[i + 1]) {
      options.chatId = args[++i];
      continue;
    }

    if (arg.startsWith('--chat-id=')) {
      options.chatId = arg.slice('--chat-id='.length);
      continue;
    }

    messageParts.push(arg);
  }

  return {
    message: messageParts.join(' ').trim(),
    options
  };
}

function getRouteForTelegramCommand(
  text: string,
  response: string
): Fantasy402RouteKey | undefined {
  const command = text.trim().split(/\s+/)[0].toLowerCase();

  if (command === '/player') {
    return 'player-tracking';
  }

  if (command === '/reports') {
    return 'daily-pattern-reports';
  }

  if (command === '/top') {
    return 'agent-heatmap';
  }

  if (command === '/alerts') {
    return response.includes('All Clear') ? 'general-updates' : 'urgent-alerts';
  }

  if (command === '/clv') {
    return getRouteForFantasy402Text(response);
  }

  return getRouteForFantasy402Text(response);
}

function getRouteForFantasy402Text(text: string): Fantasy402RouteKey | undefined {
  const normalized = text.toLowerCase();
  const risk = extractRiskValue(text);

  if (
    normalized.includes('clv input required') ||
    normalized.includes('clv beater') ||
    normalized.includes('beat closing') ||
    normalized.includes('/clv ')
  ) {
    if (risk !== undefined && risk > 1000) {
      return 'urgent-alerts';
    }

    return 'troublesome-accounts';
  }

  if (risk !== undefined && risk > 1000) {
    return 'urgent-alerts';
  }

  if (normalized.includes('pattern report') || normalized.includes('end-of-day')) {
    return 'daily-pattern-reports';
  }

  if (normalized.includes('agent heatmap') || normalized.includes('top agents by risk')) {
    return 'agent-heatmap';
  }

  if (normalized.includes('player tracking') || normalized.includes('/player ')) {
    return 'player-tracking';
  }

  if (normalized.includes('scraper status') || normalized.includes('general updates')) {
    return 'general-updates';
  }

  return undefined;
}

function extractRiskValue(text: string): number | undefined {
  const match = text.match(/Risk:\s*\$?([\d,]+(?:\.\d+)?)/i);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractPlainClvPair(text: string): { opening: string; closing: string } | undefined {
  const matches = text.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return undefined;
  }

  return {
    opening: matches[0],
    closing: matches[1]
  };
}

export function getFantasy402RoutingStatusMessage(): string {
  const missing = Object.values(getFantasy402TopicEnvMap()).filter((name) => !process.env[name]);
  return missing.length === 0
    ? 'Fantasy402 topic routing is fully configured.'
    : `Missing Fantasy402 topic IDs: ${missing.join(', ')}`;
}

// Export for use in other scripts
export { TelegramBot };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
