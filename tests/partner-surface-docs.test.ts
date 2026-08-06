import { describe, expect, test } from 'bun:test';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import {
  PARTNER_SURFACE_GENERATED_DOC_REL,
  formatPartnerSurfaceGeneratedMarkdown,
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
    const md = formatPartnerSurfaceGeneratedMarkdown(buildPartnerSurfaceInventory('—'), [
      { code: 'SPEN', phase: 'operator_ready' },
    ]);
    expect(md).toContain('## Brands');
    expect(md).toContain('| `PartnerCode` | `operations` | `partners-ops` | yes | `identity` |');
    expect(md).toContain('| `ExternalPartnerId` | `cross-domain` | — | yes | `external` |');
    expect(md).toContain('## Brand status');
    expect(md).toContain('| Brand | Active | Deprecated | Reason | Replaced by |');
    expect(md).toContain('| `PartnerCode` | yes | — | — | — |');
    expect(md).toContain('## Domains');
    expect(md).toContain('## Partner boards');
    expect(md).toContain('## Live PartnerCodes');
    expect(md).toContain('`/portal/partners/#partner/SPEN`');
    expect(PARTNER_SURFACE_GENERATED_DOC_REL).toBe(
      'docs/design/partner-surface-inventory.generated.md'
    );
  });

  test('livePartnerCodesFromPartnersOps reads code + phase', () => {
    const codes = livePartnerCodesFromPartnersOps({
      partners: [{ code: 'ash', phase: 'onboarding' }, { partnerCode: 'BIL' }, { nope: true }],
    });
    expect(codes).toEqual([
      { code: 'ASH', phase: 'onboarding' },
      { code: 'BIL', phase: undefined },
    ]);
  });

  test('docs bake --check exits 0 after write', async () => {
    expect(await bakeDocsMain(['bun', 'scripts/bake-partner-surface-docs.ts'])).toBe(0);
    expect(await bakeDocsMain(['bun', 'scripts/bake-partner-surface-docs.ts', '--check'])).toBe(0);
  });
});
