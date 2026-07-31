// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
import { describe, expect, test } from 'bun:test';
import {
  TELEGRAM_COLORS,
  TELEGRAM_COLOR_ROLES,
  telegramColorWire,
  telegramForumIconColorHex,
  telegramTopicColorWire,
} from '../lib/telegram/telegram-color-kernel.ts';
import {
  buildHandshakeCatalog,
  TELEGRAM_GLOSSARY_CONCEPT_IDS,
} from '../lib/telegram/handshake-catalog.ts';
import { telegramGlossaryConcepts } from '../lib/telegram/telegram-glossary.ts';

describe('telegram color kernel', () => {
  test('palette keys convert via Bun.color', () => {
    for (const key of Object.keys(TELEGRAM_COLORS) as (keyof typeof TELEGRAM_COLORS)[]) {
      const wire = telegramColorWire(key);
      expect(wire.colorKey).toBe(key);
      expect(wire.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(wire.css).toMatch(/^#/);
    }
  });

  test('topic map keys resolve to wired colors', () => {
    for (const mapKey of Object.keys(TELEGRAM_COLOR_ROLES.topic)) {
      const wire = telegramTopicColorWire(mapKey);
      expect(wire.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(telegramTopicColorWire('unknown-topic').colorKey).toBe('unknown');
  });

  test('forum icon_color 0–6 map to hex', () => {
    for (let i = 0; i <= 6; i++) {
      expect(telegramForumIconColorHex(i)).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(telegramForumIconColorHex(99)).toBe(telegramColorWire('unknown').hex);
  });
});

describe('telegram glossary + handshake catalog colors', () => {
  test('catalog embeds color map and glossary concept ids', () => {
    const catalog = buildHandshakeCatalog();
    expect(catalog.colors.brand.colorKey).toBe('brand');
    expect(catalog.colors.packageTopics.accounting?.hex).toMatch(/^#/);
    expect(catalog.colors.packageTopics['liquidity/outs']?.conceptId).toBe(
      'telegram.forum.topic.liquidity_outs'
    );
    expect(catalog.colors.allAccountingTopics.Deposits?.hex).toMatch(/^#/);
    expect(catalog.colors.scrapeWireTaxonomyPath).toBe('/registry/scrape-wire-taxonomy.json');
    expect(catalog.glossary.boardPath).toBe('/portal/partners/');
    expect(catalog.glossary.conceptIds).toEqual([...TELEGRAM_GLOSSARY_CONCEPT_IDS]);
  });

  test('handshake glossary ids match telegramGlossaryConcepts()', () => {
    const fromModule = telegramGlossaryConcepts().map(c => c.id).sort();
    expect([...TELEGRAM_GLOSSARY_CONCEPT_IDS].sort()).toEqual(fromModule);
  });
});
