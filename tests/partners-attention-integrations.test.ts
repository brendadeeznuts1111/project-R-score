// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  ATTENTION_REASON_CATALOG,
  attentionActionPresentation,
  attentionFamilyCounts,
  attentionOutsDeepLink,
  attentionReasonMeta,
  dashboardAttentionRows,
  dashboardConflictRows,
  dashboardConnectorRows,
  dashboardPartnerIntegrationRows,
  filterAttentionRowsByFamily,
  parseOutsDeepLink,
} from '../public/portal/partners/partners-board.js';

const BOARD = 'public/portal/partners/index.html';

describe('partners attention + integrations regions', () => {
  test('projects attention, conflicts, connectors, and tennis rows from baked dashboard', async () => {
    const dashboard = await Bun.file('public/registry/partners-dashboard.json').json();

    const attention = dashboardAttentionRows(dashboard);
    expect(Array.isArray(attention)).toBe(true);
    expect(attention.length).toBeGreaterThan(0);
    for (const row of attention) {
      expect(row.partnerCode).toMatch(/^[A-Z]{3,6}$/);
      expect(['info', 'warn', 'block']).toContain(row.severity);
      expect(row.reasonCode.length).toBeGreaterThan(0);
      expect(row.family.length).toBeGreaterThan(0);
      expect(row.title.length).toBeGreaterThan(0);
    }
    expect(attention.some(r => r.family === 'limits' || r.family === 'bookmakers')).toBe(true);

    const conflicts = dashboardConflictRows(dashboard);
    expect(Array.isArray(conflicts)).toBe(true);

    const connectors = dashboardConnectorRows(dashboard);
    expect(connectors.length).toBeGreaterThanOrEqual(6);
    expect(connectors.some(c => c.connector === 'profiles')).toBe(true);
    expect(connectors.some(c => c.connector === 'tennis')).toBe(true);
    expect(connectors.some(c => c.connector === 'sportsTerminal')).toBe(true);
    expect(connectors.find(c => c.connector === 'tennis')?.dataStatus).toBe('ok');

    const partners = dashboardPartnerIntegrationRows(dashboard);
    expect(partners.map(p => p.partnerCode)).toEqual(['ASH', 'BIL', 'NOV', 'SPEN']);
    expect(partners.every(p => p.tennisStatus === 'ok' || p.tennisStatus === 'n/a')).toBe(true);
    expect(
      partners.every(
        p =>
          p.sportsTerminalStatus === 'ok' ||
          p.sportsTerminalStatus === 'stale' ||
          p.sportsTerminalStatus === 'unavailable' ||
          p.sportsTerminalStatus === 'n/a' ||
          p.sportsTerminalStatus === 'error'
      )
    ).toBe(true);
  });

  test('board HTML mounts visible attention and integrations sections', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain('id="partner-attention"');
    expect(html).toContain('id="partner-integrations"');
    expect(html).toContain('id="attention-tbody"');
    expect(html).toContain('id="attention-family-filters"');
    expect(html).toContain('id="conflicts-tbody"');
    expect(html).toContain('id="integrations-connectors-tbody"');
    expect(html).toContain('id="integrations-partners-tbody"');
    expect(html).toContain('renderAttention(dashboard)');
    expect(html).toContain('renderIntegrations(dashboard)');
    expect(html).toContain('dashboardAttentionRows');
    expect(html).toContain('filterAttentionRowsByFamily');
    expect(html).toContain('dashboardConnectorRows');
    expect(html).toContain('Sports Terminal');
    expect(html).toContain('data-glossary-concept="section.partnersAttention"');
    expect(html).toContain('data-glossary-concept="section.partnersIntegrations"');
    // no longer hidden shells only
    expect(html).not.toMatch(
      /id="partner-attention"[^>]*hidden[^>]*>\s*<h2 class="sr-only">Attention<\/h2>/
    );
  });

  test('attention severity ordering prefers block then warn then info', () => {
    const rows = dashboardAttentionRows({
      partners: [
        {
          partnerCode: 'ASH',
          callSign: 'ASH-001',
          attention: [
            { severity: 'info', reasonCode: 'a.info', label: 'info' },
            { severity: 'block', reasonCode: 'a.block', label: 'block' },
            { severity: 'warn', reasonCode: 'a.warn', label: 'warn' },
          ],
        },
      ],
    });
    expect(rows.map(r => r.severity)).toEqual(['block', 'warn', 'info']);
  });

  test('catalog maps known reason codes and filters by family', () => {
    expect(attentionReasonMeta('partner.limits.coverage_gap')).toMatchObject({
      family: 'limits',
      title: 'Limit evidence gap',
    });
    expect(ATTENTION_REASON_CATALOG['partner.bookmakers.unregistered_sportsbook']?.family).toBe(
      'bookmakers'
    );
    const rows = dashboardAttentionRows({
      partners: [
        {
          partnerCode: 'ASH',
          attention: [
            {
              severity: 'info',
              reasonCode: 'partner.limits.raise_observed',
              label: 'raise',
              actionHref: '/portal/limits/',
            },
            {
              severity: 'info',
              reasonCode: 'partner.bookmakers.unregistered_sportsbook',
              label: 'book',
              actionHref: '/portal/bookmakers/',
            },
          ],
        },
      ],
    });
    expect(attentionFamilyCounts(rows).map(c => c.family).sort()).toEqual([
      'bookmakers',
      'limits',
    ]);
    expect(filterAttentionRowsByFamily(rows, 'limits')).toHaveLength(1);
    expect(attentionActionPresentation(rows[0]).kind).toBe('href');
    expect(attentionActionPresentation(rows[0]).label).toMatch(
      /limits|bookmakers|Open|Filter outs|evidence|external/i
    );
    const gap = attentionActionPresentation({
      partnerCode: 'NOV',
      reasonCode: 'partner.limits.coverage_gap',
    });
    expect(gap.href).toContain('missingLimit=1');
    expect(attentionOutsDeepLink({ partnerCode: 'ASH', reasonCode: 'partner.bookmakers.unregistered_sportsbook' })).toContain(
      'noExternalRef=1'
    );
    expect(parseOutsDeepLink('#outs?missingLimit=1&partner=SPEN')).toMatchObject({
      type: 'outs',
      partnerCode: 'SPEN',
      missingLimit: true,
      noExternalRef: false,
    });
  });
});
