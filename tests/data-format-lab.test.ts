import { describe, expect, test } from 'bun:test';
import { parseDataFormatAccessProof } from '../lib/data-format-access.ts';
import {
  assertDataFormatReport,
  buildDataFormatReport,
  loadDataFormatManifest,
  parseDataFormatManifest,
} from '../lib/data-format-lab.ts';

const manifestPath = `${import.meta.dir}/../config/data-format-lab.json`;
const surfacesPath = `${import.meta.dir}/../config/surfaces.toml`;
const accessPolicyPath = `${import.meta.dir}/../.cloudflare-access.yml`;
const doctorStatePath = `${import.meta.dir}/../public/registry/doctor-state.json`;

async function accessProof() {
  return parseDataFormatAccessProof(
    Bun.TOML.parse(await Bun.file(surfacesPath).text()),
    Bun.YAML.parse(await Bun.file(accessPolicyPath).text()),
    await Bun.file(doctorStatePath).json()
  );
}

function stripEphemeral(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEphemeral);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['generatedAt', 'durationNs', 'durationMs'].includes(key))
      .map(([key, item]) => [key, stripEphemeral(item)])
  );
}

describe('data-format lab contract', () => {
  test('proves current native format capabilities and gates future XML', async () => {
    const report = buildDataFormatReport(await loadDataFormatManifest(manifestPath), await accessProof());
    expect(report.mode).toBe('preview');
    expect(report.summary).toEqual({ total: 7, available: 6, gated: 1, drift: 0, proofFailures: 0 });
    expect(report.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.promotion).toEqual({
      ready: false,
      blockers: ['live-access-proof-required', '1-runtime-gated'],
    });
    for (const id of ['json', 'jsonc', 'json5', 'jsonl', 'yaml', 'toml']) {
      const format = report.formats.find(candidate => candidate.id === id);
      expect(format?.status).toBe('available');
      expect(format?.behaviorProof?.ok).toBe(true);
      expect(Object.values(format?.behaviorProof?.positive ?? {}).every(proof => proof.ok)).toBe(true);
      expect(Object.values(format?.behaviorProof?.negative ?? {}).every(proof => proof.ok)).toBe(true);
      expect(format?.fixtureSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(format?.negativeFixtureSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const jsonl = report.formats.find(format => format.id === 'jsonl');
    expect(Object.keys(jsonl?.behaviorProof?.positive ?? {})).toEqual(['parse', 'parseChunk']);
    expect(jsonl?.behaviorProof?.negative.parse?.behavior).toBe('threw');
    expect(jsonl?.behaviorProof?.negative.parseChunk?.behavior).toBe('error-result');
    const json = report.formats.find(format => format.id === 'json');
    expect(json?.behaviorProof?.roundTrip?.beforeSha256).toBe(
      json?.behaviorProof?.roundTrip?.afterSha256
    );
    const parseTiming = json?.behaviorProof?.positive.parse;
    expect(parseTiming?.durationNs).toBeGreaterThanOrEqual(0);
    expect(parseTiming?.durationMs).toBe((parseTiming?.durationNs ?? 0) / 1_000_000);
    const xml = report.formats.find(format => format.id === 'xml');
    expect(xml?.status).toBe('runtime-gated');
    expect(xml?.minimumBunVersion).toBe('1.4.0');
    expect(xml?.behaviorProof).toBeNull();
  });

  test('treats exposure and capability as separate controls', async () => {
    const manifest = await loadDataFormatManifest(manifestPath);
    const report = buildDataFormatReport({ ...manifest, mode: 'off' }, await accessProof());
    expect(report.formats.find(format => format.id === 'json')?.status).toBe('available');
    expect(report.formats.find(format => format.id === 'json')?.behaviorProof).toBeNull();
    expect(report.promotion).toEqual({
      ready: false,
      blockers: ['exposure-off', 'live-access-proof-required', '1-runtime-gated'],
    });
  });

  test('fails closed on duplicate ids and XML entity declarations', async () => {
    const manifest = await Bun.file(manifestPath).json();
    expect(() => parseDataFormatManifest({ ...manifest, formats: [...manifest.formats, manifest.formats[0]] })).toThrow(
      'duplicate format id'
    );
    const formats = manifest.formats.map((format: Record<string, unknown>) =>
      format.id === 'xml' ? { ...format, fixture: '<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><x>&y;</x>' } : format
    );
    expect(() => parseDataFormatManifest({ ...manifest, formats })).toThrow('cannot declare a doctype or entity');
  });

  test('marks an expected missing API as contract drift', async () => {
    const manifest = await loadDataFormatManifest(manifestPath);
    const report = buildDataFormatReport(
      {
        ...manifest,
        formats: [
          {
            id: 'missing',
            label: 'Missing',
            api: 'Bun.NotARealApi',
            minimumBunVersion: null,
            requiredOperations: ['parse'],
            fixture: 'value',
            negativeFixture: 'invalid',
          },
        ],
      },
      await accessProof(),
      Bun.version
    );
    expect(report.formats[0]?.status).toBe('contract-drift');
    expect(() => assertDataFormatReport(report)).toThrow('contract-drift');
  });

  test('fails proof when native output exceeds its reviewed byte cap', async () => {
    const manifest = await loadDataFormatManifest(manifestPath);
    const report = buildDataFormatReport(
      { ...manifest, security: { ...manifest.security, maxOutputBytes: 1 } },
      await accessProof()
    );
    expect(report.summary.proofFailures).toBe(6);
    expect(() => assertDataFormatReport(report)).toThrow('proof-failed');
  });

  test('does not allow enabled exposure while XML remains gated', async () => {
    const manifest = await loadDataFormatManifest(manifestPath);
    const report = buildDataFormatReport({ ...manifest, mode: 'enabled' }, await accessProof());
    expect(report.promotion.ready).toBe(false);
    expect(() => assertDataFormatReport(report)).toThrow('not promotion-ready');
  });

  test('requires Access on both Pages hosts', () => {
    expect(() =>
      parseDataFormatAccessProof({
        surfaces: { score: { accessSubpaths: [{ path: '/portal', access: 'applied' }] } },
      }, {})
    ).toThrow('surfaces.pages_dev is missing');
  });

  test('accepts only fresh live Access evidence for promotion', async () => {
    const surfaces = Bun.TOML.parse(await Bun.file(surfacesPath).text());
    const policy = Bun.YAML.parse(await Bun.file(accessPolicyPath).text());
    const now = Date.parse('2026-08-16T12:00:00.000Z');
    const proof = parseDataFormatAccessProof(
      surfaces,
      policy,
      {
        generatedAt: '2026-08-16T11:00:00.000Z',
        checks: [
          {
            id: 'infra-portal-access',
            ok: true,
            message: 'portal · Access · score Access · pages.dev Access',
          },
        ],
      },
      now
    );
    expect(proof.live.verified).toBe(true);
    expect(parseDataFormatAccessProof(surfaces, policy, null, now).live.verified).toBe(false);
  });

  test('ships a baked artifact for the reviewed manifest state', async () => {
    const artifact = await Bun.file(`${import.meta.dir}/../public/portal/registry/data-format-lab.json`).json();
    const expected = buildDataFormatReport(
      await loadDataFormatManifest(manifestPath),
      await accessProof()
    );
    expect(artifact.mode).toBe('preview');
    expect(artifact.runtime.version).toBe(Bun.version);
    expect(artifact.schemaVersion).toBe(3);
    expect(artifact.summary).toEqual({ total: 7, available: 6, gated: 1, drift: 0, proofFailures: 0 });
    expect(artifact.surface.accessProof.protectedHosts).toHaveLength(2);
    expect(stripEphemeral(artifact)).toEqual(stripEphemeral(expected));
  });
});
