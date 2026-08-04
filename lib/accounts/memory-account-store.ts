/**
 * In-memory account store for local tests (no R2).
 */

import {
  asPortalAccountId,
  asPortalTenantId,
  type PortalAccountId,
  type PortalTenantId,
  type TelegramUserId,
} from '../types/branded/portal.ts';
import type { AccountRole, CreateAccountInput, PortalAccount } from './account-types.ts';

export class MemoryAccountStore {
  private accounts = new Map<string, PortalAccount>();
  private oidc = new Map<string, { tenantId: PortalTenantId; accountId: PortalAccountId }>();
  private telegram = new Map<string, { tenantId: PortalTenantId; accountId: PortalAccountId }>();

  async create(input: CreateAccountInput): Promise<PortalAccount> {
    const id = asPortalAccountId(crypto.randomUUID());
    const now = new Date().toISOString();
    const account: PortalAccount = {
      id,
      email: input.email,
      tenantId: input.tenantId,
      role: input.role,
      oidcSubject: input.oidcSubject,
      createdAt: now,
      lastLogin: now,
      preferences: {
        notifications: input.preferences?.notifications ?? true,
        defaultPage: input.preferences?.defaultPage ?? 'dashboard',
      },
    };
    const key = `${account.tenantId as string}/${account.id as string}`;
    this.accounts.set(key, account);
    this.oidc.set(account.oidcSubject, { tenantId: account.tenantId, accountId: account.id });
    return account;
  }

  async getByOidc(oidcSubject: string): Promise<PortalAccount | null> {
    const idx = this.oidc.get(oidcSubject);
    if (!idx) return null;
    return this.accounts.get(`${idx.tenantId as string}/${idx.accountId as string}`) ?? null;
  }

  async getByTelegram(telegramId: TelegramUserId): Promise<PortalAccount | null> {
    const idx = this.telegram.get(telegramId as string);
    if (!idx) return null;
    return this.accounts.get(`${idx.tenantId as string}/${idx.accountId as string}`) ?? null;
  }

  async linkTelegram(
    tenantId: PortalTenantId,
    accountId: PortalAccountId,
    telegramId: TelegramUserId
  ): Promise<PortalAccount | null> {
    const account = this.accounts.get(`${tenantId as string}/${accountId as string}`);
    if (!account) return null;
    account.telegramId = telegramId;
    this.telegram.set(telegramId as string, { tenantId, accountId });
    return account;
  }
}

export type { CreateAccountInput };
