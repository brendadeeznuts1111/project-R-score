// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Registry artifact integrity verification against index checksums.
 */

import { type ArtifactRelease, type RegistryIndex } from './artifact';
import { type RegistryClient } from './registry';

export type IntegrityFailure = {
  name: string;
  version: string;
  reason: 'missing' | 'size' | 'checksum' | 'error';
  detail?: string;
};

export type IntegrityReport = {
  checkedAt: string;
  total: number;
  ok: number;
  failures: IntegrityFailure[];
};

function collectReleases(index: RegistryIndex): ArtifactRelease[] {
  const out: ArtifactRelease[] = [];
  for (const pkg of Object.values(index.packages)) {
    for (const release of Object.values(pkg.releases)) {
      out.push(release);
    }
  }
  return out;
}

/** Verify every indexed release blob matches its SHA-256 checksum in R2. */
export async function runIntegrityCheck(client: RegistryClient): Promise<IntegrityReport> {
  const { index } = await client.fetchIndex({ required: true });
  const releases = collectReleases(index);
  const failures: IntegrityFailure[] = [];
  let ok = 0;

  for (const release of releases) {
    const name = String(release.name);
    const version = String(release.version);
    try {
      const data = await client.fetchObjectBytes(release.storage.r2Key);
      if (!data) {
        failures.push({
          name,
          version,
          reason: 'missing',
          detail: `Missing object ${release.storage.r2Key}`,
        });
        continue;
      }

      if (data.byteLength !== release.storage.size) {
        failures.push({
          name,
          version,
          reason: 'size',
          detail: `Expected ${release.storage.size} bytes, received ${data.byteLength}`,
        });
        continue;
      }

      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(data);
      const checksum = hasher.digest('hex');
      if (checksum !== release.storage.checksum) {
        failures.push({
          name,
          version,
          reason: 'checksum',
          detail: `Expected ${release.storage.checksum}, received ${checksum}`,
        });
        continue;
      }

      ok += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/missing|404|not found|failed to download/i.test(msg)) {
        failures.push({ name, version, reason: 'missing', detail: msg });
      } else {
        failures.push({ name, version, reason: 'error', detail: msg });
      }
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    total: releases.length,
    ok,
    failures,
  };
}
