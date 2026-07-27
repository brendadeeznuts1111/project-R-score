import { describe, expect, test } from 'bun:test';
import {
  richTableHtml,
  rtBold,
  rtConcat,
  rtMarked,
  type InputRichBlock,
  type InputRichBlockDetails,
  type InputRichBlockList,
  type InputRichBlockTable,
} from '../lib/telegram/rich-message.ts';
import {
  buildSeatCapitalDeskRichBlocks,
  buildSeatCapitalDeskRichMessage,
  buildSeatDeskReplyMarkup,
  formatSeatCapitalDeskRichHtml,
  type SeatIntakeRecord,
} from '../lib/telegram/seat-capital-desk.ts';

const fixture: SeatIntakeRecord = {
  partnerCode: 'SPEN',
  callSign: 'SPEN-001',
  outs: [
    {
      book: 'parlay21.com',
      bookLogin: 'vc2013',
      paymentRail: 'Venmo',
      sendTo: '@ash-demo',
      primary: true,
      outId: 'SPEN-1',
    },
    {
      book: 'lonestarwagering.com',
      bookLogin: 'Yungg1',
      outId: 'SPEN-2',
      note: 'same rail as primary',
      balance: '$150',
    },
  ],
};

function findBlocks<T extends InputRichBlock['type']>(
  blocks: InputRichBlock[],
  type: T
): Extract<InputRichBlock, { type: T }>[] {
  return blocks.filter((b): b is Extract<InputRichBlock, { type: T }> => b.type === type);
}

describe('rich-message RichText builders', () => {
  test('rtConcat produces a plain RichText[] wire array (textConcat equivalent)', () => {
    expect(rtConcat('FUND ', rtBold('ready'), ' — ok')).toEqual([
      'FUND ',
      { type: 'bold', text: 'ready' },
      ' — ok',
    ]);
  });

  test('rtMarked(rtBold(...)) nests textMarked over textBold', () => {
    expect(rtMarked(rtBold('blocked'))).toEqual({
      type: 'marked',
      text: { type: 'bold', text: 'blocked' },
    });
  });

  test('richTableHtml renders bordered striped table with escaped cells', () => {
    const html = richTableHtml([
      [
        { content: 'PARTNER', header: true },
        { content: '#', header: true },
      ],
      [{ content: 'SPEN' }, { content: '1' }],
    ]);
    expect(html).toContain('<table bordered striped>');
    expect(html).toContain('<th>PARTNER</th>');
  });
});

describe('buildSeatCapitalDeskRichBlocks', () => {
  const now = new Date('2026-07-27T02:30:00.000Z');
  const blocks = buildSeatCapitalDeskRichBlocks(fixture, now);

  test('starts with a heading block', () => {
    expect(blocks[0]?.type).toBe('heading');
    expect(blocks[0]).toMatchObject({
      type: 'heading',
      text: 'SPEN-001 · Capital desk',
      size: 2,
    });
  });

  test('includes divider blocks separating sections', () => {
    const dividers = findBlocks(blocks, 'divider');
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  test('FUND paragraph text is a RichText[] concat when status is emphasized', () => {
    const paragraphs = findBlocks(blocks, 'paragraph');
    const fundParagraph = paragraphs.find(p => Array.isArray(p.text) && p.text[0] === 'FUND ');
    expect(fundParagraph).toBeDefined();
    expect(Array.isArray(fundParagraph!.text)).toBe(true);
    // Fixture: lead ready, SPEN-2 incomplete → partial
    expect(fundParagraph!.text).toEqual(
      rtConcat('FUND ', rtBold('partial'), ' — ', 'lead ready — 1 book still need fields')
    );
  });

  test('table has MAX BET and FP% DEP columns before STATUS', () => {
    const [table] = findBlocks(blocks, 'table') as InputRichBlockTable[];
    expect(table).toBeDefined();
    const headerRow = table.cells[0]!;
    const headerTexts = headerRow.map(c => c.text);
    expect(headerTexts).toContain('STATUS');
    expect(headerTexts).toEqual([
      '#',
      'BOOK',
      'USERNAME',
      'DEPOSIT METHOD',
      'SEND TO',
      'MAX BET',
      'FP% DEP',
      'STATUS',
    ]);
    expect(headerRow.every(c => c.is_header)).toBe(true);
  });

  test('blocked status renders as nested marked→bold RichText', () => {
    const [table] = findBlocks(blocks, 'table') as InputRichBlockTable[];
    const statusCells = table.cells.slice(1).map(row => row[row.length - 1]!.text);
    const blockedCell = statusCells.find(
      text => typeof text === 'object' && !Array.isArray(text) && text?.type === 'marked'
    );
    expect(blockedCell).toEqual(rtMarked(rtBold('blocked')));
  });

  test('details blocks are emitted for outs carrying notes/balance', () => {
    const details = findBlocks(blocks, 'details') as InputRichBlockDetails[];
    expect(details.length).toBeGreaterThan(0);
    const out2Details = details.find(
      d => typeof d.summary === 'string' && d.summary.includes('Out 2')
    );
    expect(out2Details).toBeDefined();
    const inner = out2Details!.blocks.map(b => (b.type === 'paragraph' ? b.text : null));
    expect(inner).toEqual(
      expect.arrayContaining(['Balance: $150', 'Note: same rail as primary'])
    );
  });

  test('checklist list block has checkbox items with mixed checked state', () => {
    const [list] = findBlocks(blocks, 'list') as InputRichBlockList[];
    expect(list).toBeDefined();
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.items.every(item => item.has_checkbox)).toBe(true);
    expect(list.items.some(item => item.is_checked)).toBe(true);
    expect(list.items.some(item => !item.is_checked)).toBe(true);
  });
});

describe('buildSeatCapitalDeskRichMessage', () => {
  test('returns InputRichMessage.blocks (typed tree, not just html)', () => {
    const msg = buildSeatCapitalDeskRichMessage(fixture);
    expect(Array.isArray(msg.blocks)).toBe(true);
    expect(msg.blocks!.length).toBeGreaterThan(0);
    expect(msg.blocks![0]?.type).toBe('heading');
    expect(msg.html).toBeUndefined();
  });
});

describe('formatSeatCapitalDeskRichHtml (HTML fallback)', () => {
  const html = formatSeatCapitalDeskRichHtml(fixture, new Date('2026-07-27T02:30:00.000Z'));

  test('serializes the block tree to Bot API extended HTML', () => {
    expect(html).toContain('<h2>SPEN-001 · Capital desk</h2>');
    expect(html).toContain('<table bordered striped>');
    expect(html).toContain('<th>#</th>');
    expect(html).not.toContain('<th>PARTNER</th>');
    expect(html).toContain('DEPOSIT METHOD');
    expect(html).toContain('MAX BET');
    expect(html).toContain('FP% DEP');
    expect(html).toContain('STATUS');
    expect(html).toContain('vc2013');
    expect(html).not.toContain('★');
    expect(html).not.toContain('htown');
  });

  test('checklist / details markers survive HTML serialization', () => {
    const hasChecklistMarkers = /[☑☐]/.test(html);
    const hasDetails = html.includes('<details');
    expect(hasChecklistMarkers || hasDetails).toBe(true);
    expect(html).toContain('<details>');
  });
});

describe('buildSeatDeskReplyMarkup', () => {
  test('shows Fill per incomplete out + Refresh', () => {
    const kb = buildSeatDeskReplyMarkup(fixture) as {
      inline_keyboard: Array<Array<{ text: string }>>;
    };
    const labels = kb.inline_keyboard.flat().map(b => b.text);
    expect(labels).toContain('📋 Copy table');
    expect(labels).toContain('📋 Copy todo');
    expect(labels).toContain('2 · Fill');
    expect(labels).not.toContain('SPEN-1 · Fill');
    expect(labels).not.toContain('1 · Fill');
    expect(labels).toContain('↻ Refresh');
  });
});
