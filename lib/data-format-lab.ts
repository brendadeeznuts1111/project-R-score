import type { DataFormatAccessProof } from './data-format-access.ts';
import type { DataFormatManifest, FormatOperation } from './data-format-manifest.ts';
import { runFormatBehaviorProof } from './data-format-operation-proof.ts';
import { bunVersionAtLeast } from './harness/skill-health-version.ts';

export { loadDataFormatManifest, parseDataFormatManifest } from './data-format-manifest.ts';
export type { DataFormatManifest } from './data-format-manifest.ts';

export type FormatStatus = 'available' | 'runtime-gated' | 'contract-drift' | 'proof-failed';
type ApiObject = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function parseCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(parseCanonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, parseCanonicalValue(value[key])])
  );
}

function parseCanonicalJson(value: unknown): string {
  return JSON.stringify(parseCanonicalValue(value));
}

function resolveApi(path: string): ApiObject | null {
  if (path === 'JSON') return JSON as unknown as ApiObject;
  const candidate = (Bun as unknown as ApiObject)[path.slice('Bun.'.length)];
  return isRecord(candidate) ? candidate : null;
}

export function buildDataFormatReport(
  manifest: DataFormatManifest,
  accessProof: DataFormatAccessProof,
  runtimeVersion = Bun.version
) {
  const formats = manifest.formats.map(format => {
    const api = resolveApi(format.api);
    const operations = Object.fromEntries(
      format.requiredOperations.map(operation => [
        operation,
        typeof api?.[operation] === 'function',
      ])
    ) as Record<FormatOperation, boolean>;
    const missing = format.requiredOperations.filter(operation => !operations[operation]);
    const gated =
      missing.length > 0 &&
      format.minimumBunVersion !== null &&
      !bunVersionAtLeast(runtimeVersion, format.minimumBunVersion);
    let status: FormatStatus =
      missing.length === 0 ? 'available' : gated ? 'runtime-gated' : 'contract-drift';
    const behaviorProof =
      manifest.mode !== 'off' && status === 'available' && api
        ? runFormatBehaviorProof(
            api,
            format.requiredOperations,
            format.fixture,
            format.negativeFixture,
            manifest.security.maxOutputBytes
          )
        : null;
    if (status === 'available' && manifest.mode !== 'off' && !behaviorProof?.ok) {
      status = 'proof-failed';
    }
    return {
      id: format.id,
      label: format.label,
      api: format.api,
      minimumBunVersion: format.minimumBunVersion,
      requiredOperations: format.requiredOperations,
      fixtureBytes: new TextEncoder().encode(format.fixture).byteLength,
      fixtureSha256: sha256(format.fixture),
      negativeFixtureBytes: new TextEncoder().encode(format.negativeFixture).byteLength,
      negativeFixtureSha256: sha256(format.negativeFixture),
      operations,
      missing,
      status,
      behaviorProof,
    };
  });
  const count = (status: FormatStatus) => formats.filter(format => format.status === status).length;
  const summary = {
    total: formats.length,
    available: count('available'),
    gated: count('runtime-gated'),
    drift: count('contract-drift'),
    proofFailures: count('proof-failed'),
  };
  const promotionReady =
    manifest.mode !== 'off' &&
    accessProof.live.verified &&
    summary.gated === 0 &&
    summary.drift === 0 &&
    summary.proofFailures === 0;
  return {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    manifestSha256: sha256(parseCanonicalJson(manifest)),
    mode: manifest.mode,
    promotion: {
      ready: promotionReady,
      blockers: [
        ...(manifest.mode === 'off' ? ['exposure-off'] : []),
        ...(!accessProof.live.verified ? ['live-access-proof-required'] : []),
        ...(summary.gated ? [`${summary.gated}-runtime-gated`] : []),
        ...(summary.drift ? [`${summary.drift}-contract-drift`] : []),
        ...(summary.proofFailures ? [`${summary.proofFailures}-proof-failed`] : []),
      ],
    },
    surface: { ...manifest.surface, accessProof },
    security: manifest.security,
    timing: {
      source: 'Bun.nanoseconds',
      durationNs: 'raw monotonic nanoseconds',
      durationMs: 'durationNs / 1,000,000',
    },
    runtime: { version: runtimeVersion, revision: Bun.revision },
    summary,
    formats,
  };
}

export function assertDataFormatReport(report: ReturnType<typeof buildDataFormatReport>): void {
  if (report.summary.drift || report.summary.proofFailures) {
    throw new Error(`data-format proof failed: ${report.promotion.blockers.join(', ')}`);
  }
  if (report.mode === 'enabled' && !report.promotion.ready) {
    throw new Error(
      `enabled data-format lab is not promotion-ready: ${report.promotion.blockers.join(', ')}`
    );
  }
}
