// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  SSOT_FLOW_SOFT_ARTIFACT_ID,
  SSOT_FLOW_SOFT_ARTIFACT_NAME,
  SSOT_FLOW_SOFT_REPORT_PATH,
  SSOT_FLOW_SOFT_SCHEMA,
  SSOT_CONTRACT_DOMAINS,
  SSOT_CONTRACT_MANIFEST_ENTRY,
  SSOT_CONTRACT_SET,
  canonicalTennisHqCheckoutLabel,
  resolveTennisHqRoot,
} from '../lib/verification/ssot-flow-soft.ts';
import {
  buildPmProofReport,
  PM_PROOF_ARTIFACT_ID,
  PM_PROOF_ARTIFACT_NAME,
  type PmProbeRow,
} from '../lib/verification/pm-registry-probes.ts';
import { joinPath } from '../lib/path-bun.ts';

describe('ssot-flow-soft resolve', () => {
  test('schema + report path pins', () => {
    expect(SSOT_FLOW_SOFT_SCHEMA).toBe('factorywager.ssot-flow-soft.v1');
    expect(SSOT_FLOW_SOFT_REPORT_PATH).toBe('/registry/ssot-flow-soft.json');
  });

  test('artifactId and artifactName stay distinct', () => {
    expect(SSOT_FLOW_SOFT_ARTIFACT_ID).toBe('ssot-flow-soft');
    expect(SSOT_FLOW_SOFT_ARTIFACT_NAME).toBe('SSOT soft-pass');
    expect(SSOT_FLOW_SOFT_ARTIFACT_ID).not.toBe(SSOT_FLOW_SOFT_ARTIFACT_NAME);
    expect(PM_PROOF_ARTIFACT_ID).toBe('pm-proof');
    expect(PM_PROOF_ARTIFACT_NAME).toBe('PM publish-plane proof');
    expect(PM_PROOF_ARTIFACT_ID).not.toBe(PM_PROOF_ARTIFACT_NAME);
  });

  test('v1 contract package pins exactly five domains', () => {
    expect(SSOT_CONTRACT_MANIFEST_ENTRY).toBe(
      'package/registry/contracts/v1/manifest.json'
    );
    expect(SSOT_CONTRACT_SET).toBe('tennis-hq/v1');
    expect(SSOT_CONTRACT_DOMAINS).toEqual([
      'marketdata',
      'research',
      'trading',
      'partners',
      'accounting',
    ]);
  });

  test('worktree paths bake the canonical checkout label', () => {
    expect(
      canonicalTennisHqCheckoutLabel(
        '/Users/operator/Projects/king-zippy-umbra-acre-plum-integration'
      )
    ).toBe('king-zippy-umbra-acre');
    expect(canonicalTennisHqCheckoutLabel('/tmp/another-tennis-provider')).toBe(
      'another-tennis-provider'
    );
  });

  test('baked soft-pass proof carries enhance keys', async () => {
    const proof = (await Bun.file('public/registry/ssot-flow-soft.json').json()) as Record<
      string,
      unknown
    >;
    expect(proof.artifactId).toBe('ssot-flow-soft');
    expect(proof.artifactName).toBe('SSOT soft-pass');
    expect(proof.plane).toBe('publish');
    expect(proof.purpose).toBe('audit');
    expect(proof.cli).toBe('bun run ssot:flow:soft');
    expect(proof.conceptId).toBe('publish.ssot_flow_soft');
    const color = proof.color as { colorKey?: string; hex?: string; token?: string };
    expect(color.colorKey).toBe('tennis');
    expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
    expect(color.token).toBe('--partner-ops-tennis');
    const modeColor = proof.modeColor as {
      conceptId?: string; // brand-ok — partner-ops color concept key
      colorKey?: string;
    };
    expect(modeColor.conceptId).toBe('publish.mode.soft');
    expect(modeColor.colorKey).toBe('middleware');
    expect(proof.links).toEqual({
      json: '/registry/ssot-flow-soft.json',
      board: '/portal/packages/',
      weave: '/registry/portal-weave.json',
    });
    expect(proof.summary && typeof proof.summary === 'object').toBe(true);
  });

  test('resolveTennisHqRoot finds a sibling checkout without machine paths', async () => {
    const scratch = joinPath(
      import.meta.dir,
      `../.tmp/ssot-root-${Bun.randomUUIDv7()}`
    );
    const tennisRoot = joinPath(scratch, 'king-zippy-umbra-acre');
    try {
      await Bun.write(joinPath(tennisRoot, 'package.json'), '{}\n');
      await Bun.write(
        joinPath(tennisRoot, 'packages/tennis-hq-ssot/package.json'),
        '{"name":"@tennis-hq/ssot","version":"1.5.0"}\n'
      );
      expect(await resolveTennisHqRoot(scratch)).toBe(tennisRoot);
    } finally {
      await Bun.$`rm -rf ${scratch}`.quiet();
    }
  });
});

describe('pm-proof report', () => {
  test('buildPmProofReport soft-pass keeps skips green', () => {
    const probes: PmProbeRow[] = [
      { name: 'a', ok: true, skipped: false, detail: 'ok' },
      { name: 'b', ok: true, skipped: true, detail: 'skipped — offline' },
    ];
    const soft = buildPmProofReport(probes, { strict: false, bunVersion: '1.4.0' });
    expect(soft.mode).toBe('soft');
    expect(soft.summary.status).toBe('pass');
    expect(soft.summary.skipped).toBe(1);
    expect(soft.summary.failed).toBe(0);

    const strict = buildPmProofReport(probes, { strict: true, bunVersion: '1.4.0' });
    expect(strict.mode).toBe('strict');
    expect(strict.summary.status).toBe('fail');
    expect(strict.summary.failed).toBe(1);
  });
});
