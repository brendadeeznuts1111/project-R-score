import type { AssetDraft, AssetRecord } from './types.ts';

export type RangeProbe = {
  request: 'bytes=0-0';
  result: 'supported' | 'ignored';
  totalBytes: number;
};

export type FetchedAsset = {
  asset: AssetDraft;
  bytes: Uint8Array | null;
  mimeType: string | null;
  byteSize: number | null;
  sha256: string | null;
  format: string | null;
  metadataSource: AssetRecord['metadataSource'];
  rangeProbe: RangeProbe | null;
};
