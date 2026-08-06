import { describe, expect, test } from 'bun:test';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import {
  PARTNER_SURFACE_GENERATED_DOC_REL,
  formatPartnerSurfaceGeneratedMarkdown,
  liveOutIdsFromPartnersOps,
  livePartnerCodesFromPartnersOps,
  partnerDeskHrefs,
} from '../lib/docs/partner-surface-docs.ts';
import { main as bakeDocsMain } from '../scripts/bake-partner-surface-docs.ts';

describe('partner-surface-docs', () => {
  test('partnerDeskHrefs normalizes PartnerCode', () => {
    expect(partnerDeskHrefs('spen')).toEqual({
      partnersHref: '/portal/partners/#partner/SPEN',
      accountingHref: '/portal/partners/#partner/SPEN/accounting',
      accountHref: '/portal/account/?account=SPEN',
      historyHref: '/portal/partner-history/?account=SPEN',
    });
  });

  test('generated markdown includes brand linking columns', () => {
    const live = [
      { code: 'ASH', phase: 'operator_ready', callSign: 'ASH-001' },
      { code: 'SPEN', phase: 'operator_ready', callSign: 'SPEN-001' },
    ];
    const outs = [
      { outId: 'out-ASH-1', partnerCode: 'ASH', status: 'ready' },
      { outId: 'out-SPEN-1', partnerCode: 'SPEN', status: 'ready' },
    ];
    const md = formatPartnerSurfaceGeneratedMarkdown(
      buildPartnerSurfaceInventory('—', { livePartnerCodes: live, liveOutIds: outs }),
      live
    );
    expect(md).toContain('## Brands');
    expect(md).toContain('| `PartnerCode` | `operations` | `partners-ops` | yes | `identity` |');
    expect(md).toContain('| `ExternalPartnerId` | `cross-domain` | — | yes | `external` |');
    expect(md).toContain('## Brand status');
    expect(md).toContain('| Brand | Active | Deprecated | Reason | Replaced by |');
    expect(md).toContain('| `PartnerCode` | yes | — | — | — |');
    expect(md).toContain('## Brand health');
    expect(md).toContain('| `PartnerCode` | 4 | yes | yes | `identity` |');
    expect(md).toContain('## Partner codes');
    expect(md).toContain('| `SPEN` | `PartnerCode` | `partners-ops` |');
    expect(md).toContain('## OutIds');
    expect(md).toContain('| `out-SPEN-1` | `OutId` | `SPEN` | `ready` |');
    expect(md).toContain('## Domains');
    expect(md).toContain('## Partner boards');
    expect(md).toContain('## Live PartnerCodes');
    expect(md).toContain('## Documentation authority');
    expect(md).toContain('`0.1.partner-dashboard-mvp`');
    expect(md).toContain('`partners`, `accounting`, `telegram`');
    expect(md).toContain('`/portal/partners/#partner/SPEN`');
    expect(PARTNER_SURFACE_GENERATED_DOC_REL).toBe(
      'docs/design/partner-surface-inventory.generated.md'
    );
  });

  test('livePartnerCodesFromPartnersOps reads code + phase + callSign', () => {
    const codes = livePartnerCodesFromPartnersOps({
      partners: [
        { code: 'ash', phase: 'onboarding', callSign: 'ash-001' },
        { partnerCode: 'BIL' },
        { nope: true },
      ],
    });
    expect(codes).toEqual([
      { code: 'ASH', phase: 'onboarding', callSign: 'ASH-001' },
      { code: 'BIL', phase: undefined },
    ]);
  });

  test('liveOutIdsFromPartnersOps reads outs[].id + status', () => {
    const outs = liveOutIdsFromPartnersOps({
      partners: [
        {
          code: 'ash',
          outs: [
            { id: 'out-ASH-1', status: 'ready' },
            { id: 'bad-id', status: 'ready' },
            { id: 'out-ASH-2' },
          ],
        },
        { code: 'BIL', outs: 'nope' },
      ],
    });
    expect(outs).toEqual([
      { outId: 'out-ASH-1', partnerCode: 'ASH', status: 'ready' },
      { outId: 'out-ASH-2', partnerCode: 'ASH' },
    ]);
  });

  test('docs bake --check exits 0 after write', async () => {
    expect(await bakeDocsMain(['bun', 'scripts/bake-partner-surface-docs.ts'])).toBe(0);
    expect(await bakeDocsMain(['bun', 'scripts/bake-partner-surface-docs.ts', '--check'])).toBe(0);
  });
});
