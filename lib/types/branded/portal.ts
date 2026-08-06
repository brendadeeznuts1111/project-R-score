/**
 * @domain portal
 * @module lib/types/branded/portal.ts
 *
 * Multi-tenant Pages portal identity brands and owned DOM mount identities.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type PortalTenantId = BrandedString<'PortalTenantId'>;
export type TelegramUserId = BrandedString<'TelegramUserId'>;
export type TelegramChatId = BrandedString<'TelegramChatId'>;
export type PortalAccountId = BrandedString<'PortalAccountId'>;
export type LinkNonceId = BrandedString<'LinkNonceId'>;
export type DomId = BrandedString<'DomId'>;

const portalTenant = defineBrandConstructors('PortalTenantId');
const telegramUser = defineBrandConstructors('TelegramUserId');
const telegramChat = defineBrandConstructors('TelegramChatId');
const portalAccount = defineBrandConstructors('PortalAccountId');
const linkNonce = defineBrandConstructors('LinkNonceId');
const dom = defineBrandConstructors('DomId');

export const asPortalTenantId = portalTenant.as;
export const tryPortalTenantId = portalTenant.try;
export const parsePortalTenantId = portalTenant.parse;

export const asTelegramUserId = telegramUser.as;
export const tryTelegramUserId = telegramUser.try;
export const parseTelegramUserId = telegramUser.parse;

export const asTelegramChatId = telegramChat.as;
export const tryTelegramChatId = telegramChat.try;
export const parseTelegramChatId = telegramChat.parse;

export const asPortalAccountId = portalAccount.as;
export const tryPortalAccountId = portalAccount.try;
export const parsePortalAccountId = portalAccount.parse;

export const asLinkNonceId = linkNonce.as;
export const tryLinkNonceId = linkNonce.try;
export const parseLinkNonceId = linkNonce.parse;

export const asDomId = dom.as;
export const tryDomId = dom.try;
export const parseDomId = dom.parse;

export const PORTAL_BRAND_SPECS = [
  {
    name: 'PortalTenantId',
    domain: 'portal',
    tiers: ['as', 'try', 'parse'],
    mint: ['user-input', 'wire-input'],
    description: 'Multi-tenant portal tenant key (factory | science | tennis)',
  },
  {
    name: 'TelegramUserId',
    domain: 'portal',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input'],
    description: 'Telegram user id from Bot API',
  },
  {
    name: 'TelegramChatId',
    domain: 'portal',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input'],
    description: 'Telegram chat_id from Bot API (msg.chat.id / callback query)',
  },
  {
    name: 'PortalAccountId',
    domain: 'portal',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Portal user account primary key (UUID v7)',
  },
  {
    name: 'LinkNonceId',
    domain: 'portal',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Telegram link nonce for account binding',
  },
  {
    name: 'DomId',
    domain: 'portal',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Owned portal DOM mount id used by glossary section routing',
  },
] as const satisfies readonly BrandSpec[];
