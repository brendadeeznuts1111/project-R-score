// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// lib/partner-profile/proof-upload.ts — proof upload to the R2 registry bucket.
//
// Uploads a proof (screenshot / document) under `proofs/<CODE>/<ts>-<name>` in
// the artifact-registry R2 bucket, served at:
//   https://registry.factory-wager.com/api/registry/proofs/<CODE>/<ts>-<name>
// (the same Pages function that serves artifact tarballs). The store is
// injectable for tests (createMemoryObjectStore); production uses
// createS3RegistryStore (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).
//
// @see docs/design/settlement-feed.md — proof references

import type { RegistryObjectStore } from '../factory/object-store';
import { createS3RegistryStore } from '../factory/object-store';

export const PROOF_BASE_URL = 'https://registry.factory-wager.com/api/registry/proofs';

/** Proof URLs must come from the registry proofs path (no external domains). */
export function validateProofUrl(url: string): boolean {
  return url.startsWith(`${PROOF_BASE_URL}/`);
}

export interface ProofUploadFile {
  name: string;
  data: Blob | Uint8Array | ArrayBuffer;
}

/**
 * Upload a proof for a partner and return its served URL. The R2 object key is
 * `proofs/<CODE>/<ts>-<sanitized-name>`; the name is sanitized to
 * [a-zA-Z0-9._-] so the served path is safe.
 */
export async function uploadProof(
  partnerCode: string,
  file: ProofUploadFile,
  store?: RegistryObjectStore
): Promise<string> {
  const s3 = store ?? createS3RegistryStore();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `proofs/${partnerCode}/${Date.now()}-${safeName}`;
  await s3.putBytes(key, file.data, { contentType: 'application/octet-stream' });
  return `${PROOF_BASE_URL}/${partnerCode}/${Date.now()}-${safeName}`;
}
