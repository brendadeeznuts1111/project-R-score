import type { OutboundNetworkMode } from '../http/outbound-policy.ts';
import type { ContentDigest, ContentKey } from '../types/branded.ts';
import { contentKeyForDigest } from './content-contract.ts';
import {
  ContentStoreIntegrityError,
  type ContentStore,
  type ContentVerification,
} from './memory-content-store.ts';

export type OfflineContentMode = Exclude<OutboundNetworkMode, 'online'>;

export type OfflineContentObjectRef = {
  readonly digest: ContentDigest;
  readonly key: ContentKey;
  readonly byteLength: number;
};

/** Every external effect that must remain quiescent during an offline load. */
export type OfflineForbiddenEffects = {
  readonly fetch: () => unknown;
  readonly dns: () => unknown;
  readonly proxyOrPreconnect: () => unknown;
  readonly registry: () => unknown;
  readonly feedOrImage: () => unknown;
  readonly objectStore: () => unknown;
  readonly childProcess: () => unknown;
};

export type OfflineContentLoad = {
  readonly mode: OfflineContentMode;
  readonly ref: OfflineContentObjectRef;
  readonly store: ContentStore;
  /** Injected explicitly so an end-to-end composition can prove zero calls. */
  readonly forbiddenEffects: OfflineForbiddenEffects;
};

function integrityFailure(verification: ContentVerification): Error {
  if (verification.status === 'missing') {
    return new Error(`Offline content is not present locally: ${verification.expectedDigest}`);
  }
  if (verification.status === 'verified') {
    return new Error('Expected an offline content integrity failure');
  }
  return new ContentStoreIntegrityError(verification);
}

/**
 * Serve a cached object without entering any external-effect adapter. The local
 * store remains the byte-integrity authority; a key or length mismatch fails
 * closed even when the digest exists.
 */
export async function loadVerifiedOfflineContent(input: OfflineContentLoad): Promise<Uint8Array> {
  if (input.mode !== 'cached-only' && input.mode !== 'offline-no-socket') {
    throw new TypeError('Offline content loader requires cached-only or offline-no-socket mode');
  }
  // The adapters are intentionally part of the composition and intentionally
  // untouched on this branch. Tests inject throwing sentinels for every port.
  void input.forbiddenEffects;

  const expectedKey = contentKeyForDigest(input.ref.digest);
  if (input.ref.key !== expectedKey) {
    throw new Error(`Offline content key does not match digest: ${input.ref.digest}`);
  }
  const verification = await input.store.verify(input.ref.digest);
  if (verification.status !== 'verified') throw integrityFailure(verification);
  if (verification.byteLength !== input.ref.byteLength) {
    throw new Error(`Offline content byte length does not match reference: ${input.ref.digest}`);
  }
  const bytes = await input.store.get(input.ref.digest);
  if (bytes === undefined) {
    throw new Error(`Offline content disappeared after verification: ${input.ref.digest}`);
  }
  if (bytes.byteLength !== input.ref.byteLength) {
    throw new Error(`Offline content changed after verification: ${input.ref.digest}`);
  }
  return bytes;
}
