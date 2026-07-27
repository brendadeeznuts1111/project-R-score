import { describe, expect, test } from 'bun:test';
import { parseSeatDeskPipeLine } from '../lib/telegram/seat-desk-reply.ts';
import { SEAT_DESK_PIPE_FORMAT_LINES } from '../lib/telegram/seat-capital-desk.ts';
import {
  buildSeatDeskAccountingTopicPrompt,
  buildSeatDeskPartnerMessage,
  buildSeatDeskTopicPrompt,
  SEAT_DESK_FIELD_MANIFEST,
  SEAT_DESK_PARTNER_MESSAGE_TEMPLATES,
  summarizeSeatDeskPartnerView,
  type SeatIntakeRecord,
} from '../lib/telegram/seat-desk-partner-message.ts';

const spen001: SeatIntakeRecord = {
  partnerCode: 'SPEN',
  callSign: 'SPEN-001',
  outs: [
    {
      book: 'www.parlay21.com',
      bookLogin: 'vc2013',
      primary: true,
      outId: 'SPEN-1',
    },
    {
      book: 'www.lonestarwagering.com',
      bookLogin: 'Yungg1',
      outId: 'SPEN-2',
    },
    {
      book: 'action92.com',
      outId: 'SPEN-3',
    },
    {
      book: 'betvegas23.com',
      bookLogin: 'Henry019',
      outId: 'SPEN-4',
    },
    {
      book: 'Orange777',
      bookLogin: 'dmk1064',
      deskStatus: 'deferred',
      outId: 'SPEN-5',
    },
  ],
};

describe('SEAT_DESK_PARTNER_MESSAGE_TEMPLATES', () => {
  test('manifest keys match SeatDeskPartnerMessageTemplate union', () => {
    const keys = Object.keys(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES).sort();
    expect(keys).toEqual([
      'confirm-active',
      'reply-hint',
      'todo',
      'topic-accounting',
      'topic-intake',
      'topic-rails',
    ]);
  });

  test('each spec id matches its record key and has a working builder', () => {
    const withDesk = { ...spen001, desk: { messageId: 31, chatId: '-1', messageThreadId: 26 } };
    for (const [key, spec] of Object.entries(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES)) {
      expect(spec.id).toBe(key);
      expect(spec.cli.length).toBeGreaterThan(10);
      const msg = buildSeatDeskPartnerMessage(withDesk, {
        template: key as keyof typeof SEAT_DESK_PARTNER_MESSAGE_TEMPLATES,
      });
      expect(msg.trim().length).toBeGreaterThan(20);
    }
  });

  test('postable topic templates are marked postable', () => {
    expect(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES['topic-intake'].postable).toBe(true);
    expect(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES['topic-rails'].postable).toBe(true);
    expect(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES['topic-accounting'].postable).toBe(true);
    expect(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES['confirm-active'].postable).toBe(false);
  });
});

describe('SEAT_DESK_FIELD_MANIFEST', () => {
  test('password is internal-only', () => {
    expect(SEAT_DESK_FIELD_MANIFEST.password?.internal).toBe(true);
    expect(SEAT_DESK_FIELD_MANIFEST.password?.partnerVisible).toBe(false);
  });

  test('maxBet and freeplay are partner-visible but not fund gates', () => {
    expect(SEAT_DESK_FIELD_MANIFEST.maxBet?.fundGate).toBe(false);
    expect(SEAT_DESK_FIELD_MANIFEST.freeplay?.partnerVisible).toBe(true);
  });
});

describe('summarizeSeatDeskPartnerView', () => {
  test('splits active vs deferred outs', () => {
    const view = summarizeSeatDeskPartnerView(spen001);
    expect(view.activeOuts).toHaveLength(4);
    expect(view.deferredOuts).toHaveLength(1);
    expect(view.deferredOuts[0]?.book).toBe('Orange777');
  });

  test('finds common and out-specific missing labels', () => {
    const view = summarizeSeatDeskPartnerView(spen001);
    expect(view.commonMissing).toEqual(
      expect.arrayContaining(['deposit method', 'send-to', 'max bet', 'freeplay % on deposit'])
    );
    expect(view.outSpecificMissing).toEqual([
      { num: '3', book: 'action92.com', labels: ['book login'] },
    ]);
  });
});

describe('buildSeatDeskPartnerMessage', () => {
  test('confirm-active template matches consolidated partner copy shape', () => {
    const msg = buildSeatDeskPartnerMessage(spen001, { template: 'confirm-active' });
    expect(msg).toContain('4 outs');
    expect(msg).toContain('Orange777 (out 5)');
    expect(msg).toContain('deferred');
    expect(msg).toContain('parlay21.com (vc2013)');
    expect(msg).toContain('Still need on each active out');
    expect(msg).toContain('Out 3 only (action92.com)');
    expect(msg).toContain('book login');
    expect(msg).not.toContain('| # | Book |');
  });

  test('todo template lists active outs only', () => {
    const msg = buildSeatDeskPartnerMessage(spen001, { template: 'todo' });
    expect(msg).toContain('out 1 need');
    expect(msg).toContain('out 5 deferred');
  });
});

describe('buildSeatDeskTopicPrompt', () => {
  const withDesk = { ...spen001, desk: { messageId: 31, chatId: '-1', messageThreadId: 26 } };

  test('topic-intake is short and names active range + deferred skip', () => {
    const msg = buildSeatDeskTopicPrompt(withDesk, 'topic-intake');
    expect(msg).toContain('SPEN · deposit rails · desk #31');
    expect(msg).toContain('Out 5 deferred — skip.');
    expect(msg).toContain('outs 1–4');
    expect(msg).toContain('1 | Venmo | @handle');
    expect(msg).toContain('DEFAULT | CashApp | $sign');
    expect(msg).not.toContain('SPEN-1');
    expect(msg.split('\n').length).toBeLessThan(12);
  });

  test('topic-rails is a minimal nudge on pinned desk', () => {
    const msg = buildSeatDeskTopicPrompt(withDesk, 'topic-rails');
    expect(msg).toContain('SPEN · pay rails · desk #31');
    expect(msg).toContain('Still need deposit method + send-to');
    expect(msg).not.toContain('book passwords');
    expect(msg.split('\n').length).toBeLessThan(10);
  });

  test('partner-message templates delegate to topic prompts', () => {
    expect(buildSeatDeskPartnerMessage(withDesk, { template: 'topic-intake' })).toBe(
      buildSeatDeskTopicPrompt(withDesk, 'topic-intake')
    );
    expect(buildSeatDeskPartnerMessage(withDesk, { template: 'topic-rails' })).toBe(
      buildSeatDeskTopicPrompt(withDesk, 'topic-rails')
    );
  });

  test('topic prompts use pipe format lines accepted by intake parser', () => {
    for (const line of SEAT_DESK_PIPE_FORMAT_LINES) {
      expect(parseSeatDeskPipeLine(line, spen001)).not.toBeNull();
    }
  });

  test('active out range skips gaps when middle out is deferred', () => {
    const gapIntake: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        { book: 'a.com', outId: 'SPEN-1' },
        { book: 'b.com', outId: 'SPEN-2' },
        { book: 'c.com', outId: 'SPEN-3', deskStatus: 'deferred' },
        { book: 'd.com', outId: 'SPEN-4' },
      ],
    };
    const msg = buildSeatDeskTopicPrompt(gapIntake, 'topic-intake');
    expect(msg).toContain('outs 1–2, 4');
    expect(msg).not.toContain('outs 1–4');
    expect(msg).toContain('Out 3 deferred — skip.');
  });

  test('topic-intake without desk messageId falls back to pinned desk label', () => {
    const msg = buildSeatDeskTopicPrompt(spen001, 'topic-intake');
    expect(msg).toContain('desk pinned desk');
    expect(msg).not.toContain('#undefined');
  });

  test('no deferred line when all outs active', () => {
    const allActive: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [{ book: 'a.com', outId: 'SPEN-1' }],
    };
    const msg = buildSeatDeskTopicPrompt(allActive, 'topic-intake');
    expect(msg).not.toContain('deferred');
    expect(msg).toContain('out 1');
  });
});

describe('buildSeatDeskAccountingTopicPrompt', () => {
  const withDesk = { ...spen001, desk: { messageId: 31, chatId: '-1', messageThreadId: 26 } };

  test('routes proof to accounting thread copy', () => {
    const msg = buildSeatDeskAccountingTopicPrompt(withDesk);
    expect(msg).toContain('SPEN · accounting');
    expect(msg).toContain('Deposit + withdraw screenshots');
    expect(msg).toContain('Out 5 deferred — skip.');
    expect(msg).toContain('outs 1–4');
    expect(msg).toContain('Liquidity/Outs desk #31');
    expect(msg).not.toContain('1 | Venmo | @handle');
  });

  test('partner-message topic-accounting template matches builder', () => {
    expect(buildSeatDeskPartnerMessage(withDesk, { template: 'topic-accounting' })).toBe(
      buildSeatDeskAccountingTopicPrompt(withDesk)
    );
  });
});
