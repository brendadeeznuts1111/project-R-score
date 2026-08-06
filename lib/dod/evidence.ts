// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-inflatesync — Bun.inflateSync (zlib/raw via windowBits)
/**
 * DOD (Daily Operations Document) image evidence — Bun.Image pack/verify.
 *
 * Meta + content digest via {@link extractImageEvidenceMeta}; average-hash (aHash)
 * via 8×8 resize + PNG decode (Bun.Image has no raw-pixel terminal). Optional HMAC
 * when `DOD_PROOF_SECRET` is set.
 *
 * @see https://bun.com/docs/runtime/image#input — Bun.Image
 * @see https://bun.com/docs/runtime/image#resize — resize()
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 * @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
 * @see ../image-metadata.ts
 */
import {
  extractImageEvidenceMeta,
  type ImageDigestAlgorithm,
  type ImageEvidenceMeta,
} from '../image-metadata.ts';
import { mintEvidenceId } from '../time.ts';
import { asEvidenceId, unbrand, type EvidenceId } from '../types/branded.ts';

export const DOD_KINDS = ['balance', 'slip', 'receipt', 'location', 'device', 'other'] as const;

export type DodKind = (typeof DOD_KINDS)[number];

export type DodEvidencePackage = {
  id: EvidenceId;
  kind: DodKind;
  /** Opaque ops agent key when known. */
  agentId?: string; // brand-ok — opaque external agent key (not domain AgentId)
  submittedAt: string;
  bun: string;
  /** Content + dimensions digest (prefer sha3-256). */
  meta: ImageEvidenceMeta;
  /** 64-bit average hash hex (perceptual, not cryptographic). */
  averageHash: string;
  /** HMAC-SHA256 hex over canonical payload when secret present. */
  hmac?: string;
};

export type DodCheckId = 'digest' | 'averageHash' | 'hmac' | 'kind' | 'dimensions';

export type DodCheck = {
  id: DodCheckId;
  ok: boolean;
  expected?: string;
  actual?: string;
  message: string;
};

export type DodVerifyResult = {
  ok: boolean;
  checks: DodCheck[];
  recomputed: { meta: ImageEvidenceMeta; averageHash: string };
};

export type BuildDodEvidenceOpts = {
  bytes: Uint8Array | Buffer;
  kind: DodKind;
  agentId?: string; // brand-ok — opaque external agent key
  submittedAt?: string | Date;
  algorithm?: ImageDigestAlgorithm;
  /** Override env `DOD_PROOF_SECRET`. Pass `false` to skip HMAC. */
  secret?: string | false;
  id?: EvidenceId;
};

const KIND_SET = new Set<string>(DOD_KINDS);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toUint8(bytes: Uint8Array | Buffer | ArrayBuffer): Uint8Array {
  return bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
}

function readU32(buf: Uint8Array, o: number): number {
  return ((buf[o]! << 24) | (buf[o + 1]! << 16) | (buf[o + 2]! << 8) | buf[o + 3]!) >>> 0;
}

/** Minimal 8-bit RGB/RGBA PNG decode (non-interlaced) for aHash pixels. */
export function decodePngRgba(png: Uint8Array): {
  width: number;
  height: number;
  rgba: Uint8Array;
} {
  if (png.byteLength < 8 || png[0] !== 0x89 || png[1] !== 0x50) {
    throw new Error('decodePngRgba: not a PNG');
  }
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  const idat: Buffer[] = [];
  let o = 8;
  while (o + 8 <= png.byteLength) {
    const len = readU32(png, o);
    const type = String.fromCharCode(png[o + 4]!, png[o + 5]!, png[o + 6]!, png[o + 7]!);
    const data = png.subarray(o + 8, o + 8 + len);
    o += 12 + len;
    if (type === 'IHDR') {
      width = readU32(data, 0);
      height = readU32(data, 4);
      bitDepth = data[8]!;
      colorType = data[9]!;
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
  }
  if (!(width > 0) || !(height > 0) || bitDepth !== 8) {
    throw new Error('decodePngRgba: unsupported IHDR');
  }
  if (colorType !== 2 && colorType !== 6) {
    throw new Error(`decodePngRgba: unsupported colorType ${colorType}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  // PNG IDAT is zlib-wrapped DEFLATE (RFC 1950 header, e.g. 0x78 0xda).
  // Bun.inflateSync default does not always accept that stream; pin windowBits 15
  // (zlib header/footer range 9..15 per Bun ZlibCompressionOptions).
  const inflated = Bun.inflateSync(Buffer.concat(idat), { windowBits: 15 });
  const stride = width * bpp;
  const rgba = new Uint8Array(width * height * 4);
  let prev = Buffer.alloc(stride);
  let ip = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[ip++]!;
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) row[i] = inflated[ip++]!;
    const recon = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const x = row[i]!;
      const a = i >= bpp ? recon[i - bpp]! : 0;
      const b = prev[i]!;
      const c = i >= bpp ? prev[i - bpp]! : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 255;
      else if (filter === 2) val = (x + b) & 255;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (x + pr) & 255;
      } else if (filter !== 0) {
        throw new Error(`decodePngRgba: bad filter ${filter}`);
      }
      recon[i] = val;
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      rgba[di] = recon[si]!;
      rgba[di + 1] = recon[si + 1]!;
      rgba[di + 2] = recon[si + 2]!;
      rgba[di + 3] = bpp === 4 ? recon[si + 3]! : 255;
    }
    prev = recon;
  }
  return { width, height, rgba };
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Average hash (aHash): resize to 8×8, mean luminance threshold → 16 hex chars.
 * Not cryptographic — for similarity / duplicate detection only.
 */
export async function averageHash(bytes: Uint8Array | Buffer | ArrayBuffer): Promise<string> {
  const buf = toUint8(bytes);
  if (buf.byteLength === 0) throw new Error('averageHash: empty image bytes');
  const tinyPng = await new Bun.Image(buf).resize(8, 8, { fit: 'fill' }).png().bytes();
  const { width, height, rgba } = decodePngRgba(tinyPng);
  if (width !== 8 || height !== 8) {
    throw new Error(`averageHash: expected 8×8 got ${width}×${height}`);
  }
  const lum = new Float64Array(64);
  let sum = 0;
  for (let i = 0; i < 64; i++) {
    const o = i * 4;
    const v = luma(rgba[o]!, rgba[o + 1]!, rgba[o + 2]!);
    lum[i] = v;
    sum += v;
  }
  const mean = sum / 64;
  let bits = 0n;
  for (let i = 0; i < 64; i++) {
    if (lum[i]! >= mean) bits |= 1n << BigInt(63 - i);
  }
  return bits.toString(16).padStart(16, '0');
}

/** Hamming distance between two hex aHash strings (0–64). */
export function hammingDistance(a: string, b: string): number {
  const x = BigInt(`0x${a}`);
  const y = BigInt(`0x${b}`);
  let xor = x ^ y;
  let d = 0;
  while (xor > 0n) {
    d++;
    xor &= xor - 1n;
  }
  return d;
}

function canonicalSignPayload(pkg: {
  id: string; // brand-ok — opaque evidence package id
  kind: DodKind;
  submittedAt: string;
  digest: string;
  averageHash: string;
}): string {
  return `${pkg.id}|${pkg.kind}|${pkg.submittedAt}|${pkg.digest}|${pkg.averageHash}`;
}

export function signDodPayload(payload: string, secret: string): string {
  return new Bun.CryptoHasher('sha256', secret).update(payload).digest('hex');
}

function resolveSecret(secret?: string | false): string | undefined {
  if (secret === false) return undefined;
  if (typeof secret === 'string' && secret.length > 0) return secret;
  const env = Bun.env.DOD_PROOF_SECRET;
  return env && env.length > 0 ? env : undefined;
}

export async function buildDodEvidencePackage(
  opts: BuildDodEvidenceOpts
): Promise<DodEvidencePackage> {
  const bytes = toUint8(opts.bytes);
  const kind = opts.kind;
  if (!KIND_SET.has(kind)) throw new Error(`buildDodEvidencePackage: bad kind ${kind}`);

  const submittedAt =
    opts.submittedAt instanceof Date
      ? opts.submittedAt.toISOString()
      : (opts.submittedAt ?? new Date().toISOString());

  const id = opts.id ?? mintEvidenceId();
  const algorithm = opts.algorithm ?? 'sha3-256';
  const meta = await extractImageEvidenceMeta(bytes, { algorithm });
  const avg = await averageHash(bytes);

  const pkg: DodEvidencePackage = {
    id,
    kind,
    submittedAt,
    bun: Bun.version,
    meta,
    averageHash: avg,
  };
  if (opts.agentId) pkg.agentId = opts.agentId;

  const secret = resolveSecret(opts.secret);
  if (secret) {
    pkg.hmac = signDodPayload(
      canonicalSignPayload({
        id: unbrand(id),
        kind,
        submittedAt,
        digest: meta.digest,
        averageHash: avg,
      }),
      secret
    );
  }
  return pkg;
}

export async function verifyDodEvidence(
  pkg: DodEvidencePackage,
  bytes: Uint8Array | Buffer | ArrayBuffer,
  opts?: { secret?: string | false }
): Promise<DodVerifyResult> {
  const buf = toUint8(bytes);
  const meta = await extractImageEvidenceMeta(buf, { algorithm: pkg.meta.algorithm });
  const avg = await averageHash(buf);
  const checks: DodCheck[] = [];

  checks.push({
    id: 'digest',
    ok: meta.digest === pkg.meta.digest && meta.algorithm === pkg.meta.algorithm,
    expected: `${pkg.meta.algorithm}:${pkg.meta.digest}`,
    actual: `${meta.algorithm}:${meta.digest}`,
    message:
      meta.digest === pkg.meta.digest
        ? 'content digest matches'
        : 'content digest mismatch (image bytes changed)',
  });

  checks.push({
    id: 'averageHash',
    ok: avg === pkg.averageHash,
    expected: pkg.averageHash,
    actual: avg,
    message: avg === pkg.averageHash ? 'aHash matches' : 'aHash mismatch',
  });

  checks.push({
    id: 'dimensions',
    ok: meta.width === pkg.meta.width && meta.height === pkg.meta.height,
    expected: `${pkg.meta.width}x${pkg.meta.height}`,
    actual: `${meta.width}x${meta.height}`,
    message: 'dimension check',
  });

  checks.push({
    id: 'kind',
    ok: KIND_SET.has(pkg.kind),
    expected: DOD_KINDS.join('|'),
    actual: pkg.kind,
    message: KIND_SET.has(pkg.kind) ? 'kind ok' : 'invalid kind',
  });

  const secret = resolveSecret(opts?.secret);
  if (pkg.hmac) {
    if (!secret) {
      checks.push({
        id: 'hmac',
        ok: false,
        message: 'package has hmac but DOD_PROOF_SECRET not available',
      });
    } else {
      const expect = signDodPayload(
        canonicalSignPayload({
          id: unbrand(pkg.id),
          kind: pkg.kind,
          submittedAt: pkg.submittedAt,
          digest: pkg.meta.digest,
          averageHash: pkg.averageHash,
        }),
        secret
      );
      checks.push({
        id: 'hmac',
        ok: expect === pkg.hmac,
        expected: expect.slice(0, 16) + '…',
        actual: pkg.hmac.slice(0, 16) + '…',
        message: expect === pkg.hmac ? 'hmac ok' : 'hmac mismatch',
      });
    }
  }

  return {
    ok: checks.every(c => c.ok),
    checks,
    recomputed: { meta, averageHash: avg },
  };
}

/** Wire boundary: parse unknown → DodEvidencePackage. */
export function isDodEvidencePackage(value: unknown): value is DodEvidencePackage {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || !value.id) return false;
  if (typeof value.kind !== 'string' || !KIND_SET.has(value.kind)) return false;
  if (typeof value.submittedAt !== 'string' || !value.submittedAt) return false;
  if (typeof value.bun !== 'string') return false;
  if (typeof value.averageHash !== 'string' || !/^[0-9a-f]{16}$/.test(value.averageHash)) {
    return false;
  }
  if (!isRecord(value.meta)) return false;
  if (typeof value.meta.digest !== 'string' || value.meta.digest.length < 32) return false;
  if (typeof value.meta.algorithm !== 'string') return false;
  if (typeof value.meta.width !== 'number' || typeof value.meta.height !== 'number') return false;
  if (value.hmac !== undefined && typeof value.hmac !== 'string') return false;
  if (value.agentId !== undefined && typeof value.agentId !== 'string') return false;
  return true;
}

export function parseDodEvidencePackage(value: unknown): DodEvidencePackage {
  if (!isDodEvidencePackage(value)) {
    throw new Error('Invalid DodEvidencePackage: structural validation failed');
  }
  return {
    ...value,
    id: asEvidenceId(value.id),
    kind: value.kind as DodKind,
  };
}

/** JSON-safe export (unbrands EvidenceId). */
export function dodEvidenceToJson(pkg: DodEvidencePackage): Record<string, unknown> {
  return {
    id: unbrand(pkg.id),
    kind: pkg.kind,
    agentId: pkg.agentId,
    submittedAt: pkg.submittedAt,
    bun: pkg.bun,
    meta: pkg.meta,
    averageHash: pkg.averageHash,
    hmac: pkg.hmac,
  };
}

export type DodRegistryEntry = {
  id: string; // brand-ok — EvidenceId string form in registry JSON
  kind: DodKind;
  agentId?: string; // brand-ok — opaque agent key
  averageHash: string;
  digest: string;
  algorithm: string;
  submittedAt: string;
  registeredAt: string;
};

export async function appendDodRegistry(
  entry: DodRegistryEntry,
  registryPath: string
): Promise<void> {
  let registry: { schema: string; entries: DodRegistryEntry[] } = {
    schema: 'factorywager/dod-registry/v1',
    entries: [],
  };
  if (await Bun.file(registryPath).exists()) {
    const prev = (await Bun.file(registryPath).json()) as {
      entries?: DodRegistryEntry[];
    };
    registry = {
      schema: 'factorywager/dod-registry/v1',
      entries: Array.isArray(prev.entries) ? prev.entries : [],
    };
  }
  registry.entries.push(entry);
  await Bun.write(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

export async function findSimilarInRegistry(
  averageHash: string,
  registryPath: string,
  threshold = 5
): Promise<DodRegistryEntry[]> {
  if (!(await Bun.file(registryPath).exists())) return [];
  const registry = (await Bun.file(registryPath).json()) as {
    entries?: DodRegistryEntry[];
  };
  const out: DodRegistryEntry[] = [];
  for (const e of registry.entries ?? []) {
    if (typeof e.averageHash !== 'string') continue;
    if (hammingDistance(averageHash, e.averageHash) <= threshold) out.push(e);
  }
  return out;
}

/** Resize for storage (1024 inside WebP). */
export async function storePreviewWebp(
  bytes: Uint8Array | Buffer,
  max = 1024
): Promise<Uint8Array> {
  return new Bun.Image(toUint8(bytes))
    .resize(max, max, { fit: 'inside' })
    .webp({ quality: 85 })
    .bytes();
}
