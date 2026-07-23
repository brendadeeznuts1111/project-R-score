/**
 * Portal accounts — R2 JSON persistence.
 */

import type { R2PutBucket } from '../pages/r2-types.ts';
import { r2GetJson, r2PutJson } from '../pages/r2-types.ts';
import {
  asPortalAccountId,
  asPortalTenantId,
  asTelegramUserId,
  type PortalAccountId,
  type PortalTenantId,
  type TelegramUserId,
} from '../types/branded/portal.ts';
import type {
  CreateAccountInput,
  OidcSubjectIndexEntry,
  PortalAccount,
  TelegramIndexEntry,
} from './account-types.ts';
import {
  accountObjectKey,
  oidcIndexKey,
  telegramIndexKey,
} from './account-types.ts';

export type { CreateAccountInput };

export class AccountR2Store {
  constructor(private readonly bucket: R2PutBucket) {}

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

    await r2PutJson(this.bucket, accountObjectKey(account.tenantId, account.id), account);
    const idx: OidcSubjectIndexEntry = { tenantId: account.tenantId, accountId: account.id };
    await r2PutJson(this.bucket, oidcIndexKey(account.oidcSubject), idx);
    return account;
  }

  async get(tenantId: PortalTenantId, accountId: PortalAccountId): Promise<PortalAccount | null> {
    return r2GetJson<PortalAccount>(this.bucket, accountObjectKey(tenantId, accountId));
  }

  async getByOidc(oidcSubject: string): Promise<PortalAccount | null> {
    const idx = await r2GetJson<OidcSubjectIndexEntry>(this.bucket, oidcIndexKey(oidcSubject));
    if (!idx) return null;
    return this.get(asPortalTenantId(idx.tenantId as string), asPortalAccountId(idx.accountId as string));
  }

  async getByTelegram(telegramId: TelegramUserId): Promise<PortalAccount | null> {
    const idx = await r2GetJson<TelegramIndexEntry>(
      this.bucket,
      telegramIndexKey(telegramId)
    );
    if (!idx) return null;
    return this.get(asPortalTenantId(idx.tenantId as string), asPortalAccountId(idx.accountId as string));
  }

  async linkTelegram(
    tenantId: PortalTenantId,
    accountId: PortalAccountId,
    telegramId: TelegramUserId
  ): Promise<PortalAccount | null> {
    const account = await this.get(tenantId, accountId);
    if (!account) return null;
    account.telegramId = telegramId;
    account.lastLogin = new Date().toISOString();
    await r2PutJson(this.bucket, accountObjectKey(tenantId, accountId), account);
    const idx: TelegramIndexEntry = { tenantId, accountId };
    await r2PutJson(this.bucket, telegramIndexKey(telegramId), idx);
    return account;
  }

  async touchLogin(tenantId: PortalTenantId, accountId: PortalAccountId): Promise<void> {
    const account = await this.get(tenantId, accountId);
    if (!account) return;
    account.lastLogin = new Date().toISOString();
    await r2PutJson(this.bucket, accountObjectKey(tenantId, accountId), account);
  }
}

export { asTelegramUserId };
