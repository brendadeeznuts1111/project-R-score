import { describe, expect, test } from 'bun:test';
import {
  buildHandshakeCatalog,
  HANDSHAKE_HOUSE_FORUM_TOPICS,
  HANDSHAKE_JSONL_ACTIONS,
  HANDSHAKE_LANE_CATALOG,
  HANDSHAKE_PACKAGE_FORUM_TOPICS,
  HANDSHAKE_READINESS_PHASES,
  HANDSHAKE_SEAT_DESK_TEMPLATES,
  HANDSHAKE_VERIFY_CHECK_IDS,
} from '../lib/telegram/handshake-catalog.ts';
import { PARTNER_PACKAGE_FORUM_TOPIC_PLAN } from '../lib/telegram/package-group-forum.ts';
import { SEAT_DESK_PARTNER_MESSAGE_TEMPLATES } from '../lib/telegram/seat-desk-partner-message.ts';

describe('handshake-catalog', () => {
  test('builds v1 catalog with expected sections', () => {
    const c = buildHandshakeCatalog();
    expect(c.schema).toBe('factorywager.telegram-handshake-catalog.v1');
    expect(c.jsonlActions).toEqual([...HANDSHAKE_JSONL_ACTIONS]);
    expect(c.readinessPhases).toEqual([...HANDSHAKE_READINESS_PHASES]);
    expect(c.lanes.length).toBe(HANDSHAKE_LANE_CATALOG.length);
    expect(c.verifyChecks).toEqual([...HANDSHAKE_VERIFY_CHECK_IDS]);
    expect(c.docs.runbook).toContain('partner-package-group-handshake.md');
    expect(c.docs.seatCapitalDesk).toContain('seat-capital-desk.md');
    expect(c.packageForumTopics.kind).toBe('partner-package-forum');
    expect(c.packageForumTopics.rows).toBe(PARTNER_PACKAGE_FORUM_TOPIC_PLAN);
    expect(c.packageForumTopics.plan).toContain('Accounting');
    expect(c.packageForumTopics.deskTopicKey).toBe('liquidity/outs');
    expect(c.houseForumTopics.kind).toBe('house-surface');
    expect(c.houseForumTopics.surfaces.hq?.topicSlugs).toContain('alerts');
    expect(c.houseForumTopics.surfaces['all-accounting']?.topicSlugs).toEqual([
      'deposits',
      'withdrawals',
      'reconcile',
    ]);
    expect(c.seatDeskTemplates.partner).toBe(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES);
    expect(HANDSHAKE_SEAT_DESK_TEMPLATES.partner).toBe(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES);
    expect(HANDSHAKE_PACKAGE_FORUM_TOPICS.accountingTopicKey).toBe('accounting');
    expect(HANDSHAKE_HOUSE_FORUM_TOPICS.surfaces.sandbox?.topicSlugs).toEqual([
      'scratch',
      'experiments',
    ]);
    expect(c.colors.brand.hex).toMatch(/^#/);
    expect(c.glossary.conceptIds).toContain('telegram.package_group');
  });

  test('lane ids are unique', () => {
    const ids = HANDSHAKE_LANE_CATALOG.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
