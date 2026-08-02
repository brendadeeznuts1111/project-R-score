// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildPortalWeavePayload,
  INTENTIONAL_ORPHAN_PURPOSES,
  isIntentionalOrphanPurpose,
  PORTAL_WEAVE_ARTIFACTS,
  PORTAL_WEAVE_SURFACES,
} from '../lib/http/portal-weave.ts';
import { PORTAL_WEAVE_WIKI } from '../lib/http/wiki-nav.ts';
import { PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_MD_SLUGS } from '../lib/http/llms-txt.ts';

describe('portal weave', () => {
  test('payload includes key surfaces and prediction report html path', () => {
    const p = buildPortalWeavePayload('2026-01-01T00:00:00.000Z');
    expect(p.generated).toBe('2026-01-01T00:00:00.000Z');
    expect(p.schemaVersion).toBe(2);
    expect(p.kind).toBe('portal-weave');
    expect(p.path).toBe('/registry/portal-weave.json');
    expect(p.summary.surfaces).toBe(p.surfaces.length);
    expect(p.related.monorepoHealth).toBe('/registry/monorepo-health.json');
    expect(p.related.chrome).toBe('/registry/portal-chrome.json');
    expect(p.surfaces.length).toBeGreaterThan(8);
    expect(p.surfaces.every(s => s.id)).toBe(true);
    expect(p.wiki.some(w => w.label === 'Wiki index')).toBe(true);
    expect(p.components.length).toBeGreaterThan(5);
    expect(p.scripts.some(s => s.cmd.includes('reference:discover'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('public:discover'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('public:audit:verify'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:seed:toc'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('portal:chrome:bake'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ssot:publish:r2'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('factory:health'))).toBe(true);
    const pred = p.surfaces.find(s => s.label === 'Prediction report');
    expect(pred?.href).toBe('/registry/prediction/report/');
    expect(pred?.id).toBe('prediction-report');
  });

  test('markdown slugs include dashboard and toc; llms parity', () => {
    expect(PORTAL_MARKDOWN_SLUGS).toContain('dashboard');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('toc');
    for (const slug of PORTAL_MD_SLUGS) {
      expect(PORTAL_MARKDOWN_SLUGS).toContain(slug);
    }
  });

  test('surfaces cover ops toc monitoring dod skills compliance', () => {
    const p = buildPortalWeavePayload();
    const hrefs = PORTAL_WEAVE_SURFACES.map(s => s.href);
    expect(hrefs).toContain('/portal/ops/');
    expect(hrefs).toContain('/portal/toc/');
    expect(hrefs).toContain('/monitoring/');
    expect(hrefs).toContain('/portal/dod/');
    expect(hrefs).toContain('/portal/skills/');
    expect(hrefs).toContain('/portal/compliance/');
    expect(hrefs).toContain('/portal/limits/');
    expect(hrefs).toContain('/portal/partners/');
    expect(hrefs).toContain('/portal/dashboard/');
    expect(hrefs).toContain('/portal/tools/');
    expect(hrefs).toContain('/portal/vault/');
    expect(hrefs).toContain('/portal/failures/');
    expect(hrefs).toContain('/portal/tennis/');
    // unique ids / no duplicate env
    const ids = PORTAL_WEAVE_SURFACES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === 'env')).toHaveLength(1);
    const vault = PORTAL_WEAVE_SURFACES.find(s => s.id === 'vault');
    expect(vault?.group).toBe('secrets');
    expect(vault?.cli).toContain('vault health');
    const arts = PORTAL_WEAVE_ARTIFACTS.map(a => a.href);
    expect(arts).toContain('/registry/toc-ops.json');
    expect(arts).toContain('/registry/telegram-handshake.json');
    expect(arts).toContain('/registry/telegram-handshake-catalog.json');
    expect(arts).toContain('/registry/toc-ops-bake-proof.json');
    expect(arts).toContain('/registry/content-type-matrix.json');
    expect(arts).toContain('/registry/formdata-proof.json');
    expect(arts).toContain('/registry/package-info.json');
    expect(arts).toContain('/registry/seat-capital-desk.json');
    expect(arts).toContain('/registry/partners-ops.json');
    expect(arts).toContain('/registry/tennis/agent-auth.json');
    expect(arts).toContain('/registry/compliance-board.json');
    expect(arts).toContain('/registry/compliance-enhancements.json');
    expect(arts).toContain('/registry/compliance-shadow.json');
    expect(arts).toContain('/registry/limit-raises.json');
    expect(arts).toContain('/registry/verification-index.json');
    expect(arts).toContain('/registry/doc-index.json');
    expect(arts).toContain('/registry/ssot-flow-soft.json');
    expect(arts).toContain('/registry/pm-proof.json');
    expect(p.related.ssotFlowSoft).toBe('/registry/ssot-flow-soft.json');
    expect(p.related.pmProof).toBe('/registry/pm-proof.json');
    expect(p.scripts.some(s => s.cmd.includes('docs:map:check'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('compliance:bake'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('compliance:verify'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:limits:demo'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:snapshot'))).toBe(true);
    expect(p.scripts.some(s => s.cmd === 'bun run ssot:flow:soft')).toBe(true);
    expect(p.scripts.some(s => s.cmd === 'bun run verify:pm:save')).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('verify:weave'))).toBe(true);
  });

  test('publish-plane weave artifacts carry name/id + color kernel keys', () => {
    const ssot = PORTAL_WEAVE_ARTIFACTS.find(a => a.id === 'ssot-flow-soft');
    const pm = PORTAL_WEAVE_ARTIFACTS.find(a => a.id === 'pm-proof');
    expect(ssot?.artifactId).toBe('ssot-flow-soft');
    expect(ssot?.artifactName).toBe('SSOT soft-pass');
    expect(ssot?.conceptId).toBe('publish.ssot_flow_soft');
    expect(ssot?.colorKey).toBe('tennis');
    expect(ssot?.purpose).toBe('ui');
    expect(pm?.artifactId).toBe('pm-proof');
    expect(pm?.artifactName).toBe('PM publish-plane proof');
    expect(pm?.conceptId).toBe('publish.pm_proof');
    expect(pm?.colorKey).toBe('kalshi');
    expect(pm?.purpose).toBe('ui');
    const packages = PORTAL_WEAVE_SURFACES.find(s => s.id === 'packages');
    expect(packages?.cli).toContain('ssot:flow:soft');
    expect(packages?.relatedArtifactIds).toEqual(['ssot-flow-soft', 'pm-proof']);
    const baked = buildPortalWeavePayload('2026-01-01T00:00:00.000Z');
    expect(baked.publishPlane.artifacts).toHaveLength(2);
    expect(baked.publishPlane.colorKernel).toBe('partner-ops');
    expect(baked.publishPlane.board).toBe('/portal/packages/');
    expect(baked.publishPlane.related.ssotFlowSoft).toBe('/registry/ssot-flow-soft.json');
    expect(baked.publishPlane.scripts.some(c => c.includes('ssot:flow:soft'))).toBe(true);
    expect(baked.publishPlane.artifacts.every(a => a.hex?.startsWith('#'))).toBe(true);
    expect(baked.publishPlane.artifacts.every(a => a.token?.startsWith('--partner-ops-'))).toBe(
      true
    );
  });

  test('every artifact carries a purpose; intentional purposes are non-ui', () => {
    expect(PORTAL_WEAVE_ARTIFACTS.every(a => a.purpose)).toBe(true);
    expect(INTENTIONAL_ORPHAN_PURPOSES.has('shared')).toBe(true);
    expect(INTENTIONAL_ORPHAN_PURPOSES.has('ui')).toBe(false);
    expect(isIntentionalOrphanPurpose('audit')).toBe(true);
    expect(isIntentionalOrphanPurpose('ui')).toBe(false);
    const baked = buildPortalWeavePayload('2026-01-01T00:00:00.000Z');
    expect(baked.artifacts.every(a => a.purpose)).toBe(true);
    expect(baked.artifacts.find(a => a.href === '/registry/portal-weave.json')?.purpose).toBe(
      'shared'
    );
  });
});
