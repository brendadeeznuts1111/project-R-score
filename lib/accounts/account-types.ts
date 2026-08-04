/**
 * Portal account domain types.
 */

import type { PortalAccountId, PortalTenantId, TelegramUserId } from '../types/branded/portal.ts';

export type AccountRole = 'admin' | 'operator' | 'viewer';

export type AccountPreferences = {
  notifications: boolean;
  defaultPage: string;
};

export type CreateAccountInput = {
  email: string;
  tenantId: PortalTenantId;
  role: AccountRole;
  oidcSubject: string;
  preferences?: Partial<AccountPreferences>;
};

export type PortalAccount = {
  id: PortalAccountId;
  email: string;
  tenantId: PortalTenantId;
  role: AccountRole;
  telegramId?: TelegramUserId;
  oidcSubject: string;
  createdAt: string;
  lastLogin: string;
  preferences: AccountPreferences;
};

export type TelegramIndexEntry = {
  tenantId: PortalTenantId;
  accountId: PortalAccountId;
};

export type OidcSubjectIndexEntry = {
  tenantId: PortalTenantId;
  accountId: PortalAccountId;
};

export function accountObjectKey(tenantId: PortalTenantId, accountId: PortalAccountId): string {
  return `accounts/${tenantId as string}/${accountId as string}.json`;
}

export function telegramIndexKey(telegramId: TelegramUserId): string {
  return `accounts/telegram/${telegramId as string}.json`;
}

export function oidcIndexKey(oidcSubject: string): string {
  const safe = encodeURIComponent(oidcSubject);
  return `accounts/oidc/${safe}.json`;
}

export function linkNonceKey(nonce: string): string {
  return `links/${nonce}.json`;
}
