import type { MulticastScope } from "./multicast-selector";

export interface PacketHeader {
  version: number;
  flags: number;
  scope: MulticastScope;
  sequenceId: number;
  sourceId: number;
  timestampUs: bigint;
}

export interface PacketEncodeOptions {
  flags?: number;
  scope?: MulticastScope;
  sourceId?: number;
  sequenceId?: number;
  timestampUs?: bigint;
}

export const PACKET_HEADER_SIZE = 16;
export const PACKET_VERSION = 3;

const SCOPE_TO_CODE: Record<string, number> = {
  "interface-local": 0x01,
  "link-local":      0x02,
  "site-local":      0x05,
  "organization":    0x08,
  "admin":           0x15,
  "global":          0x0e,
};

const CODE_TO_SCOPE: Record<number, MulticastScope> = {
  0x01: "interface-local",
  0x02: "link-local",
  0x05: "site-local",
  0x08: "organization",
  0x15: "admin",
  0x0e: "global",
  0x3e: "global", // SSM variant
};

export function encodePacketHeader(options: PacketEncodeOptions = {}): Buffer {
  const flags = normalizeNibble(options.flags ?? 0);
  const scope = options.scope ?? "site-local";
  const sequenceId = normalizeUint32(options.sequenceId ?? 0);
  const sourceId = normalizeUint16(options.sourceId ?? 0);
  const timestampUs = options.timestampUs ?? BigInt(Date.now()) * BigInt(1000);

  const out = Buffer.allocUnsafe(PACKET_HEADER_SIZE);
  out.writeUInt8((PACKET_VERSION << 4) | flags, 0);
  out.writeUInt8(SCOPE_TO_CODE[scope] ?? 0x05, 1);
  out.writeUInt16BE(sourceId, 2);
  out.writeUInt32BE(sequenceId, 4);
  out.writeBigUInt64BE(timestampUs, 8);
  return out;
}

export function decodePacketHeader(buf: Buffer): PacketHeader | null {
  if (!Buffer.isBuffer(buf) || buf.byteLength < PACKET_HEADER_SIZE) return null;
  const vf = buf.readUInt8(0);
  const version = (vf >> 4) & 0x0f;
  const flags = vf & 0x0f;
  const scopeCode = buf.readUInt8(1);
  const scope = CODE_TO_SCOPE[scopeCode];
  if (!scope || version !== PACKET_VERSION) return null;
  return {
    version,
    flags,
    scope,
    sourceId: buf.readUInt16BE(2),
    sequenceId: buf.readUInt32BE(4),
    timestampUs: buf.readBigUInt64BE(8),
  };
}

export function stripPacketHeader(buf: Buffer): Buffer {
  if (!Buffer.isBuffer(buf) || buf.byteLength <= PACKET_HEADER_SIZE) return Buffer.alloc(0);
  return buf.subarray(PACKET_HEADER_SIZE);
}

function normalizeNibble(value: number): number {
  const int = Number.isFinite(value) ? Math.trunc(value) : 0;
  if (int < 0) return 0;
  if (int > 0x0f) return 0x0f;
  return int;
}

function normalizeUint16(value: number): number {
  const int = Number.isFinite(value) ? Math.trunc(value) : 0;
  if (int < 0) return 0;
  if (int > 0xffff) return 0xffff;
  return int;
}

function normalizeUint32(value: number): number {
  const int = Number.isFinite(value) ? Math.trunc(value) : 0;
  return int >>> 0;
}
