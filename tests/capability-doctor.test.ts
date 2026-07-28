// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
/**
 * Capability doctor — Bun.semver floors from baked capability-map-subset.
 */
import { describe, expect, test } from 'bun:test';
import {
  capabilityDoctorModulePath,
  doctorFromSubset,
  formatCapabilityDoctorHuman,
  parsePassCliVersion,
  satisfiesMin,
} from '../lib/portal/capability-doctor.ts';
import {
  buildCapabilityMapSubset,
  type CapabilityMapSubset,
} from '../lib/portal/capability-map-subset.ts';

const SAMPLE = `
## Grounded capability map

| Capability | Type | Version | Bun API | Proton CLI | Used in | Status | Source | Example (snippet) |
|---|---|---|---|---|---|---|---|---|
| **Vault inject** | secrets | pass‑cli ≥2.2 | — | \`pass-cli inject -i\` | portal-cli secret inject | Implemented | [docs](https://example.com/pass) | \`x\` |
| **Pack workspace** | pkg | Bun ≥1.4 | \`bun pm pack\` | — | portal-cli pm pack | Implemented | [pm](https://example.com/pm) | \`y\` |
| **Sleep** | runtime | Bun ≥1.0 | \`Bun.sleep(ms)\` | — | rate limiting | Available | [sleep](https://example.com/sleep) | \`z\` |

## Known technical debt
`;

describe('capability-doctor', () => {
  test('satisfiesMin uses Bun.semver >= range', () => {
    expect(satisfiesMin('1.4.0', '1.4.0')).toBe(true);
    expect(satisfiesMin('1.4.0', '1.0.0')).toBe(true);
    expect(satisfiesMin('1.3.0', '1.4.0')).toBe(false);
  });

  test('parsePassCliVersion extracts semver', () => {
    expect(parsePassCliVersion('pass-cli 2.2.0')).toBe('2.2.0');
    expect(parsePassCliVersion('2.2.1')).toBe('2.2.1');
    expect(parsePassCliVersion('')).toBeNull();
  });

  test('doctorFromSubset fails low Bun and missing pass-cli', () => {
    const subset = buildCapabilityMapSubset(SAMPLE, '2026-07-28T00:00:00.000Z');
    const low = doctorFromSubset(subset, {
      bunVersion: '1.2.0',
      passCliVersion: null,
      passCliAvailable: false,
      generatedAt: '2026-07-28T00:00:00.000Z',
    });
    expect(low.ok).toBe(false);
    expect(low.bunOk).toBe(false);
    expect(low.failing.some(f => f.field === 'minBun')).toBe(true);
    expect(low.failing.some(f => f.field === 'minPassCli')).toBe(true);
  });

  test('doctorFromSubset passes current Bun + pass-cli floor', () => {
    const subset = buildCapabilityMapSubset(SAMPLE, '2026-07-28T00:00:00.000Z');
    const ok = doctorFromSubset(subset, {
      bunVersion: '1.4.0',
      passCliVersion: '2.2.0',
      passCliAvailable: true,
      generatedAt: '2026-07-28T00:00:00.000Z',
    });
    expect(ok.ok).toBe(true);
    expect(ok.bunOk).toBe(true);
    expect(ok.passCliOk).toBe(true);
    expect(ok.failing).toHaveLength(0);
    expect(ok.checked.minBunRows).toBe(2);
    expect(ok.checked.minPassCliRows).toBe(1);
  });

  test('repo baked subset doctor is green for this Bun runtime', async () => {
    const baked = (await Bun.file(
      'public/registry/capability-map-subset.json'
    ).json()) as CapabilityMapSubset;
    const report = doctorFromSubset(baked, {
      bunVersion: Bun.version,
      // pass-cli optional in CI — only assert Bun floors when pass missing
      passCliVersion: '99.0.0',
      passCliAvailable: true,
      generatedAt: '2026-07-28T00:00:00.000Z',
    });
    expect(report.bunOk).toBe(true);
    expect(report.checked.minBunRows).toBeGreaterThan(30);
  });

  test('bunOnly skips pass-cli floors', () => {
    const subset = buildCapabilityMapSubset(SAMPLE, '2026-07-28T00:00:00.000Z');
    const report = doctorFromSubset(subset, {
      bunVersion: '1.4.0',
      passCliAvailable: false,
      passCliVersion: null,
      bunOnly: true,
      generatedAt: '2026-07-28T00:00:00.000Z',
    });
    expect(report.ok).toBe(true);
    expect(report.checked.minPassCliRows).toBe(0);
    expect(report.failing).toHaveLength(0);
  });

  test('formatCapabilityDoctorHuman uses framed inspect.table / stripANSI surfaces', () => {
    const subset = buildCapabilityMapSubset(SAMPLE, '2026-07-28T00:00:00.000Z');
    const bad = doctorFromSubset(subset, {
      bunVersion: '1.0.0',
      passCliVersion: '1.0.0',
      passCliAvailable: true,
      generatedAt: '2026-07-28T00:00:00.000Z',
    });
    const text = formatCapabilityDoctorHuman(bad, { columns: 80, elapsedNs: 1_500_000 });
    const plain = Bun.stripANSI(text);
    expect(plain).toContain('capability doctor');
    expect(plain).toContain('FAIL');
    expect(plain).toMatch(/elapsed/i);
    expect(plain).toMatch(/╭|╰|│/); // framed chrome
    expect(plain.toLowerCase()).toMatch(/minbun|minpass|pack workspace|vault inject|version floor/);
    expect(Bun.stringWidth(plain.split('\n')[0]!)).toBeGreaterThan(10);
  });

  test('capabilityDoctorModulePath is absolute via fileURLToPath', () => {
    const p = capabilityDoctorModulePath();
    expect(p.startsWith('/')).toBe(true);
    expect(p.endsWith('capability-doctor.ts')).toBe(true);
    // round-trip path ↔ file URL
    const url = Bun.pathToFileURL(p);
    expect(String(url)).toMatch(/^file:\/\//);
    expect(Bun.fileURLToPath(url)).toBe(p);
  });
});
