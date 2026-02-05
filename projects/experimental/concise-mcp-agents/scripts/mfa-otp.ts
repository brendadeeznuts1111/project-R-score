#!/usr/bin/env bun

// [MFA][OTP][TELEGRAM][MFA-OTP-001][v2.11][ACTIVE]

import { TelegramBot } from "./telegram-bot.ts";
import { AccessControlSystem, User } from "./access-control.ts";
import crypto from "crypto";

interface MFASession {
  userId: string;
  code: string;
  expires: number;
  action: string;
  used: boolean;
}

export class MFASystem {
  private sessions: Map<string, MFASession> = new Map();
  private telegram: TelegramBot;
  private access: AccessControlSystem;

  constructor() {
    this.telegram = new TelegramBot();
    this.access = new AccessControlSystem();
  }

  async generateOTP(userId: string, action: string = 'auth'): Promise<string> {
    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();

    const session: MFASession = {
      userId,
      code,
      expires: Date.now() + (5 * 60 * 1000), // 5 minutes
      action,
      used: false
    };

    this.sessions.set(userId, session);

    // Send via Telegram
    const user = await this.access.getUser(userId);
    if (user) {
      const message = `🔐 *MFA Code*\n\nAction: ${action}\nCode: \`${code}\`\n\nExpires in 5 minutes.`;
      await this.telegram.sendMessage(message, userId);
    }

    return code;
  }

  async verifyOTP(userId: string, code: string): Promise<{ valid: boolean; reason?: string }> {
    const session = this.sessions.get(userId);

    if (!session) {
      return { valid: false, reason: 'No active MFA session' };
    }

    if (session.used) {
      return { valid: false, reason: 'Code already used' };
    }

    if (Date.now() > session.expires) {
      this.sessions.delete(userId);
      return { valid: false, reason: 'Code expired' };
    }

    if (session.code !== code) {
      return { valid: false, reason: 'Invalid code' };
    }

    // Mark as used
    session.used = true;
    return { valid: true };
  }

  async requestMFAForAction(userId: string, action: string): Promise<string> {
    const code = await this.generateOTP(userId, action);
    return code;
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now > session.expires) {
        this.sessions.delete(userId);
      }
    }
  }

  getActiveSessionsCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const mfa = new MFASystem();

  if (args.length === 0) {
    console.log(`🔐 MFA/OTP System v2.11

USAGE:
  bun mfa:generate <user> [action]    # Generate OTP code
  bun mfa:verify <user> <code>         # Verify OTP code
  bun mfa:status                       # Show active sessions

EXAMPLES:
  bun mfa:generate user123 auth        # Generate auth code
  bun mfa:generate user123 /deploy     # Generate action code
  bun mfa:verify user123 123456        # Verify code
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'generate':
        if (args.length < 2) {
          console.error('Usage: bun mfa:generate <user> [action]');
          process.exit(1);
        }
        const user = args[1];
        const action = args[2] || 'auth';
        const code = await mfa.requestMFAForAction(user, action);
        console.log(`✅ OTP generated for ${user} (${action})`);
        console.log(`📱 Code sent via Telegram`);
        break;

      case 'verify':
        if (args.length < 3) {
          console.error('Usage: bun mfa:verify <user> <code>');
          process.exit(1);
        }
        const verifyUser = args[1];
        const verifyCode = args[2];
        const result = await mfa.verifyOTP(verifyUser, verifyCode);
        if (result.valid) {
          console.log(`✅ MFA verification successful`);
        } else {
          console.log(`❌ MFA verification failed: ${result.reason}`);
          process.exit(1);
        }
        break;

      case 'status':
        const count = mfa.getActiveSessionsCount();
        console.log(`🔐 Active MFA sessions: ${count}`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun mfa --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
