// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import { buildPortalWeavePayload } from '../lib/http/portal-weave.ts';
import {
  buildPublishPlaneWeaveBlock,
  collectPublishPlaneParityIssues,
  formatPublishPlaneParityDetail,
  formatPublishPlaneRolloutSkip,
  isPublishPlaneRolloutPending,
} from '../lib/verification/publish-plane-weave.ts';

describe('publish-plane weave parity', () => {
  test('buildPublishPlaneWeaveBlock selects soft-pass rows + kernel hex', () => {
    const block = buildPublishPlaneWeaveBlock({
      artifacts: [
        {
          artifactId: 'ssot-flow-soft',
          artifactName: 'SSOT soft-pass',
          conceptId: 'publish.ssot_flow_soft',
          colorKey: 'tennis',
          href: '/registry/ssot-flow-soft.json',
          cli: 'bun run ssot:flow:soft',
          purpose: 'ui',
        },
        {
          artifactId: 'pm-proof',
          artifactName: 'PM publish-plane proof',
          conceptId: 'publish.pm_proof',
          colorKey: 'kalshi',
          href: '/registry/pm-proof.json',
          cli: 'bun run verify:pm:save',
          purpose: 'ui',
        },
        { artifactId: 'other', href: '/registry/other.json' },
      ],
      scripts: [
        { id: 'ssot-flow-soft', cmd: 'bun run ssot:flow:soft' },
        { id: 'verify-pm-save', cmd: 'bun run verify:pm:save' },
        { id: 'verify-weave', cmd: 'bun run verify:weave -- --summary' },
        { id: 'noise', cmd: 'bun run other' },
      ],
    });
    expect(block.artifacts).toHaveLength(2);
    expect(block.scripts).toHaveLength(3);
    expect(block.colorKernel).toBe('partner-ops');
    expect(block.artifacts[0]?.hex).toMatch(/^#/);
    expect(block.artifacts[0]?.token).toContain('tennis');
    expect(block.artifacts[1]?.hex).toMatch(/^#/);
    expect(isPublishPlaneRolloutPending(undefined)).toBe(true);
    expect(isPublishPlaneRolloutPending(block)).toBe(false);
    expect(formatPublishPlaneRolloutSkip()).toContain('pending on edge');
  });

  test('parity passes for live weave + baked proofs', async () => {
    const weave = buildPortalWeavePayload();
    const ssot = (await Bun.file('public/registry/ssot-flow-soft.json').json()) as Record<
      string,
      unknown
    >;
    const pm = (await Bun.file('public/registry/pm-proof.json').json()) as Record<string, unknown>;
    const issues = collectPublishPlaneParityIssues(weave.publishPlane, {
      ssot: ssot as never,
      pm: pm as never,
    });
    expect(issues, formatPublishPlaneParityDetail(issues)).toEqual([]);
    expect(formatPublishPlaneParityDetail([])).toContain('parity ok');
  });

  test('parity fails when conceptId drifts', () => {
    const block = buildPublishPlaneWeaveBlock({
      artifacts: [
        {
          artifactId: 'ssot-flow-soft',
          conceptId: 'wrong',
          colorKey: 'tennis',
          href: '/registry/ssot-flow-soft.json',
        },
        {
          artifactId: 'pm-proof',
          conceptId: 'publish.pm_proof',
          colorKey: 'kalshi',
          href: '/registry/pm-proof.json',
        },
      ],
      scripts: [],
    });
    const issues = collectPublishPlaneParityIssues(block, {
      ssot: {
        artifactId: 'ssot-flow-soft',
        conceptId: 'publish.ssot_flow_soft',
        color: { colorKey: 'tennis' },
        links: { weave: '/registry/portal-weave.json', board: '/portal/packages/' },
      },
      pm: {
        artifactId: 'pm-proof',
        conceptId: 'publish.pm_proof',
        color: { colorKey: 'kalshi' },
        links: { weave: '/registry/portal-weave.json', board: '/portal/packages/' },
      },
    });
    expect(issues.some(i => i.field === 'conceptId')).toBe(true);
  });
});
