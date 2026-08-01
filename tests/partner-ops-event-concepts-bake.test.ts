// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  bakePartnerOpsEventConcepts,
  renderPartnerOpsEventConceptsModule,
} from '../tools/bake-partner-ops-event-concepts.ts';
import { PARTNER_OPS_EVENT_CODE_CONCEPTS } from '../public/portal/components/partner-ops-event-concepts.js';
import {
  PARTNER_OPS_EVENT_CODES,
  PARTNER_OPS_EVENT_GLOSSARY,
} from '../lib/telegram/partner-ops-events.ts';

describe('partner-ops event concepts bake', () => {
  test('committed portal module matches TS glossary render', async () => {
    await bakePartnerOpsEventConcepts({ check: true });
    const committed = await Bun.file(
      'public/portal/components/partner-ops-event-concepts.js'
    ).text();
    expect(committed).toBe(renderPartnerOpsEventConceptsModule());
  });

  test('runtime map stays aligned with PARTNER_OPS_EVENT_GLOSSARY', () => {
    expect(Object.keys(PARTNER_OPS_EVENT_CODE_CONCEPTS).sort()).toEqual(
      [...PARTNER_OPS_EVENT_CODES].sort()
    );
    for (const code of PARTNER_OPS_EVENT_CODES) {
      expect(PARTNER_OPS_EVENT_CODE_CONCEPTS[code]).toBe(PARTNER_OPS_EVENT_GLOSSARY[code]);
    }
  });
});
