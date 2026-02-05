#!/usr/bin/env bun

// [TELEGRAM][BOT][INTEGRATION][TG-BOT-001][v2.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-TG1][v2.0.0][ACTIVE]

import { TelegramCommandsHandler } from "./telegram-commands.ts";

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

  async sendMessage(text: string, chatId?: string): Promise<boolean> {
    try {
      const targetChatId = chatId || this.config.channelId;
      if (!targetChatId) {
        console.error('No chat ID specified');
        return false;
      }

      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
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
    return this.sendMessage(text, this.config.channelId);
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
        const text = update.message.text.trim();

        console.log(`📨 Received: ${text} from ${chatId}`);

        try {
          const response = await this.commands.handleCommand(text);

          if (response) {
            await this.sendMessage(response, chatId);
            console.log(`📤 Sent response to ${chatId}`);
          }
        } catch (error) {
          console.error(`Error processing command: ${error.message}`);
          await this.sendMessage(`❌ Error: ${error.message}`, chatId);
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
    try {
      const summary = await this.commands.handleCommand(`/top ${count}`);
      return await this.sendToChannel(summary);
    } catch (error) {
      console.error(`Failed to send top agents: ${error.message}`);
      return false;
    }
  }

  async sendAlerts(): Promise<boolean> {
    try {
      const alerts = await this.commands.handleCommand('/alerts');
      if (alerts && !alerts.includes('All Clear')) {
        return await this.sendToChannel(`🚨 *Risk Alerts:*\n\n${alerts}`);
      }
      return true; // No alerts to send
    } catch (error) {
      console.error(`Failed to send alerts: ${error.message}`);
      return false;
    }
  }

  async sendReports(): Promise<boolean> {
    try {
      const reports = await this.commands.handleCommand('/reports');
      return await this.sendToChannel(reports);
    } catch (error) {
      console.error(`Failed to send reports: ${error.message}`);
      return false;
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
        const message = args.slice(1).join(' ');
        const sent = await bot.sendToChannel(message);
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

// Export for use in other scripts
export { TelegramBot };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
