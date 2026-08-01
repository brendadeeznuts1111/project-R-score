/**
 * Telegram / package-group domain glossary — handshake, forums, seat desk, deposits.
 *
 * Merged into portal domain-glossary bake via tools/domain-glossary.ts.
 *
 * @see docs/harness/tenants/partner-package-group-handshake.md
 * @see docs/harness/tenants/seat-capital-desk.md
 * @see docs/harness/tenants/telegram-factory.md
 */

import { ALL_ACCOUNTING_FORUM_TOPICS, TOC_OPS_SURFACES } from './surfaces.ts';
import {
  PACKAGE_GROUP_FORUM_TOPIC_KEYS,
  PACKAGE_GROUP_FORUM_TOPICS,
  PARTNER_PACKAGE_FORUM_TOPIC_PLAN,
} from './package-group-forum.ts';
import { HANDSHAKE_MEMBERSHIP_STATUSES, HANDSHAKE_READINESS_PHASES } from './handshake-catalog.ts';

const SOURCE = 'lib/telegram/telegram-glossary.ts';

export type TelegramGlossaryConcept = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string;
  category: 'pipeline' | 'trading' | 'warehouse' | 'ui';
  kind: 'evidence' | 'registry' | 'composite' | 'ui';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: typeof SOURCE;
  semanticType: 'classification' | 'resource' | 'state' | 'presentation';
  uiRole: 'badge' | 'chip' | 'code' | 'heading' | 'link' | 'token';
};

const TOPIC_VALUES = [...PACKAGE_GROUP_FORUM_TOPICS];
const TOPIC_MAP_KEYS = Object.values(PACKAGE_GROUP_FORUM_TOPIC_KEYS);
const SURFACE_SLUGS = TOC_OPS_SURFACES.map(s => s.slug);

/** Glossary concepts for portal / domain-glossary bake. */
export function telegramGlossaryConcepts(): TelegramGlossaryConcept[] {
  return [
    {
      id: 'telegram.wire',
      label: 'Telegram ops wire',
      description:
        'Factory Telegram plane for package forums, house surfaces, seat capital desks, and handshake readiness. Soft ledger mutations stay in toc-ops-repo ct.',
      category: 'pipeline',
      kind: 'evidence',
      synonyms: ['telegram factory', 'package telegram', 'TOC Ops telegram'],
      values: null,
      seeAlso: [
        'telegram.package_group',
        'telegram.handshake',
        'telegram.seat_desk',
        'telegram.surface',
        'scrape.book',
        'page.partners',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'telegram.package_group',
      label: 'Partner package group',
      description:
        'One Telegram forum per partner CODE (title grammar TOC Ops · {CODE} · {DisplayName}). Linked via package_group_registry + TELEGRAM_SURFACES pkg-{code}.',
      category: 'pipeline',
      kind: 'registry',
      synonyms: ['package forum', 'partner forum', 'pkg group'],
      values: null,
      seeAlso: [
        'telegram.wire',
        'telegram.forum.topic',
        'telegram.handshake',
        'telegram.membership',
        'page.partners',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'badge',
    },
    {
      id: 'telegram.forum.topic',
      label: 'Package forum topic',
      description:
        'Identical topic plan on every partner package forum. Map keys are title.toLowerCase() (Liquidity/Outs → liquidity/outs).',
      category: 'pipeline',
      kind: 'composite',
      synonyms: ['forum topic', 'topicsThreadMap', 'package topic plan'],
      values: TOPIC_VALUES,
      seeAlso: [
        'telegram.package_group',
        'telegram.forum.topic.accounting',
        'telegram.forum.topic.liquidity_outs',
        'telegram.topic_map',
        'telegram.topic.general',
        'telegram.topic.ops',
        'telegram.topic.alerts',
        'telegram.topic.liquidity',
        'telegram.topic.accounting',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'telegram.topic_map',
      label: 'Forum topic map keys',
      description:
        'Canonical topicsThreadMap keys for partner package forums (general · ops · alerts · liquidity/outs · accounting).',
      category: 'warehouse',
      kind: 'registry',
      synonyms: ['topicsThreadMap', 'mapKey', 'topic key'],
      values: TOPIC_MAP_KEYS,
      seeAlso: ['telegram.forum.topic', 'telegram.package_group'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'telegram.forum.topic.accounting',
      label: 'Accounting topic',
      description:
        'Partner forum topic for deposit/withdraw proof. House rollup mirrors in all-accounting · Deposits/Withdrawals/Reconcile.',
      category: 'trading',
      kind: 'evidence',
      synonyms: ['accounting thread', 'deposit proof topic'],
      values: ['Accounting', ...ALL_ACCOUNTING_FORUM_TOPICS],
      seeAlso: [
        'telegram.forum.topic',
        'telegram.deposit_rail',
        'telegram.surface.all_accounting',
        'telegram.seat_desk',
        'section.partnersAccounting',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'badge',
    },
    {
      id: 'telegram.forum.topic.liquidity_outs',
      label: 'Liquidity/Outs topic',
      description:
        'Partner forum topic hosting the pinned seat capital desk (deposit rails, max bet, freeplay %, Fill keyboard).',
      category: 'trading',
      kind: 'evidence',
      synonyms: ['liquidity outs', 'seat desk topic', 'outs thread'],
      values: ['Liquidity/Outs'],
      seeAlso: [
        'telegram.forum.topic',
        'telegram.seat_desk',
        'telegram.deposit_rail',
        'section.partnersDeposits',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'badge',
    },
    {
      id: 'telegram.surface',
      label: 'House Telegram surface',
      description:
        'Concern-separated house groups (hq · ash-staging · all-accounting · sandbox). Not partner package forums.',
      category: 'pipeline',
      kind: 'registry',
      synonyms: ['TOC Ops surface', 'TELEGRAM_SURFACES', 'house group'],
      values: SURFACE_SLUGS,
      seeAlso: ['telegram.wire', 'telegram.surface.all_accounting', 'telegram.package_group'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'telegram.surface.all_accounting',
      label: 'All-accounting surface',
      description:
        'Cross-partner accounting rollup supergroup (TOC Ops · Accounting) with Deposits · Withdrawals · Reconcile topics.',
      category: 'trading',
      kind: 'registry',
      synonyms: ['all-accounting', 'TELEGRAM_ACCOUNTING_CHAT_ID'],
      values: [...ALL_ACCOUNTING_FORUM_TOPICS],
      seeAlso: ['telegram.surface', 'telegram.forum.topic.accounting', 'telegram.deposit_rail'],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'badge',
    },
    {
      id: 'telegram.seat_desk',
      label: 'Seat capital desk',
      description:
        'Pinned Liquidity/Outs message per call-sign: book · username · deposit method · send-to · max bet · freeplay %.',
      category: 'trading',
      kind: 'evidence',
      synonyms: ['seat desk', 'capital desk', 'pinned outs table'],
      values: null,
      seeAlso: [
        'telegram.forum.topic.liquidity_outs',
        'telegram.deposit_rail',
        'scrape.book',
        'section.partnersDeposits',
        'page.partners',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'resource',
      uiRole: 'heading',
    },
    {
      id: 'telegram.deposit_rail',
      label: 'Betting deposit rail',
      description:
        'Per-out deposit method + send-to on the seat capital desk (Venmo, CashApp, …). Book passwords stay off the desk and portal board.',
      category: 'trading',
      kind: 'evidence',
      synonyms: ['deposit method', 'send to', 'funding rail'],
      values: null,
      seeAlso: [
        'telegram.seat_desk',
        'telegram.forum.topic.accounting',
        'scrape.book',
        'section.partnersDeposits',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'token',
    },
    {
      id: 'telegram.handshake',
      label: 'Package-group handshake',
      description:
        'Factory ↔ Soft readiness for a partner CODE: registry, forum metadata, invite, DM seat, verify lanes.',
      category: 'pipeline',
      kind: 'composite',
      synonyms: ['handshake readiness', 'package group verify'],
      values: [...HANDSHAKE_READINESS_PHASES],
      seeAlso: [
        'telegram.package_group',
        'telegram.membership',
        'section.partnersTelegram',
        'page.partners',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'telegram.membership',
      label: 'Forum membership tell',
      description:
        'Member-count cell for package forums (2·house · 2·house! · 3·OK · N·ext) — partner-in-forum signal.',
      category: 'pipeline',
      kind: 'evidence',
      synonyms: ['membershipCell', '2·house', '3·OK'],
      values: [...HANDSHAKE_MEMBERSHIP_STATUSES],
      seeAlso: ['telegram.handshake', 'telegram.package_group'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'code',
    },
    {
      id: 'telegram.topic_plan_row',
      label: 'Topic plan row',
      description:
        'One row of PARTNER_PACKAGE_FORUM_TOPIC_PLAN: title · mapKey · role · botCreated.',
      category: 'warehouse',
      kind: 'registry',
      synonyms: ['forum topic plan row'],
      values: PARTNER_PACKAGE_FORUM_TOPIC_PLAN.map(r => r.mapKey),
      seeAlso: ['telegram.forum.topic', 'telegram.topic_map'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },

    // Message-level chrome (MVP). Deferred: telegram.status.read (no wire yet).
    {
      id: 'telegram.message.incoming',
      label: 'Incoming',
      description: 'Partner → seat message on the package forum or DM.',
      category: 'ui',
      kind: 'ui',
      synonyms: ['inbound message', 'partner message in'],
      values: null,
      seeAlso: ['telegram.wire', 'telegram.message.outgoing', 'section.partnersTelegram'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'telegram.message.outgoing',
      label: 'Outgoing',
      description: 'Seat / bot → partner message (outbox projector or desk reply).',
      category: 'ui',
      kind: 'ui',
      synonyms: ['outbound message', 'bot reply'],
      values: null,
      seeAlso: ['telegram.wire', 'telegram.message.incoming', 'telegram.status.delivered'],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'telegram.message.alert',
      label: 'Alert',
      description: 'System-generated Telegram alert (handshake, invite, ops notify).',
      category: 'ui',
      kind: 'ui',
      synonyms: ['system alert', 'ops alert message'],
      values: null,
      seeAlso: [
        'telegram.handshake',
        'telegram.message.command',
        'event.telegram.invite_sent',
        'telegram.topic.alerts',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'badge',
    },
    {
      id: 'telegram.message.command',
      label: 'Command',
      description: 'Bot command received (/dossier, /limits, /status, …).',
      category: 'ui',
      kind: 'ui',
      synonyms: ['bot command', '/dossier'],
      values: null,
      seeAlso: [
        'telegram.wire',
        'telegram.message.outgoing',
        'page.accountDossier',
        'ops.view.per_account',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
    {
      id: 'telegram.message.receipt',
      label: 'Receipt',
      description: 'Deposit / withdrawal confirmation posted to Accounting topic.',
      category: 'ui',
      kind: 'ui',
      synonyms: ['deposit receipt', 'withdraw proof'],
      values: null,
      seeAlso: [
        'telegram.forum.topic.accounting',
        'accounting.deposit',
        'event.deposit.received',
        'ops.view.account_deposits',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'chip',
    },
    {
      id: 'telegram.status.delivered',
      label: 'Delivered',
      description: 'Telegram delivery acknowledgement for an outgoing message.',
      category: 'ui',
      kind: 'ui',
      synonyms: ['delivery checkmark', 'sent ok'],
      values: null,
      seeAlso: ['telegram.message.outgoing', 'telegram.status.failed', 'telegram.wire'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'telegram.status.failed',
      label: 'Failed',
      description: 'Outgoing Telegram send failed (rate limit, chat missing, projector error).',
      category: 'ui',
      kind: 'ui',
      synonyms: ['send failed', 'delivery error'],
      values: null,
      seeAlso: ['telegram.message.outgoing', 'telegram.status.delivered', 'telegram.wire'],
      status: 'active',
      source: SOURCE,
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'telegram.action.reply',
      label: 'Reply',
      description: 'Thread reply action in a package forum topic or DM.',
      category: 'ui',
      kind: 'ui',
      synonyms: ['thread reply', 'reply in topic'],
      values: null,
      seeAlso: ['telegram.action.forward', 'telegram.forum.topic', 'telegram.wire'],
      status: 'active',
      source: SOURCE,
      semanticType: 'presentation',
      uiRole: 'link',
    },
    {
      id: 'telegram.action.forward',
      label: 'Forward to topic',
      description: 'Move or forward a message into another package forum topic.',
      category: 'ui',
      kind: 'ui',
      synonyms: ['forward message', 'move to topic'],
      values: null,
      seeAlso: ['telegram.action.reply', 'telegram.forum.topic', 'telegram.topic_map'],
      status: 'active',
      source: SOURCE,
      semanticType: 'presentation',
      uiRole: 'link',
    },
    {
      id: 'telegram.action.pin',
      label: 'Pin',
      description: 'Pin a message in a package forum topic (seat capital desk home).',
      category: 'ui',
      kind: 'ui',
      synonyms: ['pin message', 'desk pin'],
      values: null,
      seeAlso: [
        'telegram.seat_desk',
        'event.telegram.message_pinned',
        'telegram.forum.topic.liquidity_outs',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'presentation',
      uiRole: 'link',
    },
  ];
}
