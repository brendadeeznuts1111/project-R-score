// lib/r2-cookie-stream.ts — R2-backed cookie persistence with zstd compression

export const BUN_R2_COOKIE_FORMAT_VERSION = 1;
export const BUN_R2_COOKIE_COMPRESS_THRESHOLD = 1024;

// --- Types ---

export interface R2CookieError {
	code:
		| 'R2_CONFIG_MISSING'
		| 'R2_NOT_FOUND'
		| 'R2_FETCH_FAILED'
		| 'DECOMPRESS_FAILED'
		| 'INVALID_PAYLOAD'
		| 'CHECKSUM_MISMATCH'
		| 'EXPIRED';
	message: string;
	cause?: unknown;
}

export type R2CookieResult<T> = {ok: true; data: T} | {ok: false; error: R2CookieError};

export interface R2CookiePayload {
	version: number;
	cookies: Array<[string, string]>;
	timestamp: number;
	checksum: string;
}

export interface R2CookieMeta {
	decompressed: boolean;
	size: number;
	latencyNs: number;
	ageMs: number;
}

export interface R2CookieConfig {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
}

// --- Wire format prefix bytes ---

const PREFIX_RAW = 0x00;
const PREFIX_ZSTD = 0x01;

// --- Configuration ---

export function getR2CookieConfig(): R2CookieConfig | null {
	const accountId = Bun.env.R2_ACCOUNT_ID ?? '';
	const accessKeyId = Bun.env.R2_ACCESS_KEY_ID ?? '';
	const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY ?? '';
	const bucket = Bun.env.R2_BUCKET_NAME ?? '';
	if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
	return {accountId, accessKeyId, secretAccessKey, bucket};
}

function createS3Client(config: R2CookieConfig): Bun.S3Client {
	return new Bun.S3Client({
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		bucket: config.bucket,
	});
}

// --- Checksum ---

function computeChecksum(payload: Omit<R2CookiePayload, 'checksum'>): string {
	return Bun.hash.crc32(JSON.stringify(payload)).toString(16).padStart(8, '0');
}

// --- Load ---

export async function loadCookiesFromR2(
	r2Key: string,
	config?: R2CookieConfig,
	maxAgeMs?: number,
): Promise<R2CookieResult<{cookies: Bun.CookieMap; meta: R2CookieMeta}>> {
	const resolved = config ?? getR2CookieConfig();
	if (!resolved) {
		return {ok: false, error: {code: 'R2_CONFIG_MISSING', message: 'R2 credentials not configured'}};
	}

	const start = Bun.nanoseconds();
	const client = createS3Client(resolved);

	let buf: ArrayBuffer;
	try {
		buf = await client.file(r2Key).arrayBuffer();
	} catch (err) {
		const isNotFound =
			(err instanceof Error && 'code' in err && (err as {code: string}).code === 'NoSuchKey') ||
			(err instanceof Error && 'status' in err && (err as {status: number}).status === 404) ||
			(err instanceof Error && (err.name === 'NoSuchKey' || err.message.includes('NoSuchKey')));
		if (isNotFound) {
			return {ok: false, error: {code: 'R2_NOT_FOUND', message: `Key not found: ${r2Key}`, cause: err}};
		}
		return {ok: false, error: {code: 'R2_FETCH_FAILED', message: `Failed to fetch ${r2Key}`, cause: err}};
	}

	if (buf.byteLength < 2) {
		return {ok: false, error: {code: 'INVALID_PAYLOAD', message: 'Payload too small'}};
	}

	const bytes = new Uint8Array(buf);
	const prefix = bytes[0]!; // Safe: checked buf.byteLength >= 2 above
	const data = bytes.subarray(1);
	let json: string;
	let decompressed = false;

	if (prefix === PREFIX_ZSTD) {
		try {
			const decompressedBuf = Bun.zstdDecompressSync(data);
			json = new TextDecoder().decode(decompressedBuf);
			decompressed = true;
		} catch (err) {
			return {ok: false, error: {code: 'DECOMPRESS_FAILED', message: 'zstd decompression failed', cause: err}};
		}
	} else if (prefix === PREFIX_RAW) {
		json = new TextDecoder().decode(data);
	} else {
		return {
			ok: false,
			error: {code: 'INVALID_PAYLOAD', message: `Unknown prefix byte: 0x${prefix.toString(16).padStart(2, '0')}`},
		};
	}

	let payload: R2CookiePayload;
	try {
		payload = JSON.parse(json);
	} catch (err) {
		return {ok: false, error: {code: 'INVALID_PAYLOAD', message: 'Invalid JSON payload', cause: err}};
	}

	if (
		typeof payload.version !== 'number' ||
		!Array.isArray(payload.cookies) ||
		typeof payload.timestamp !== 'number' ||
		typeof payload.checksum !== 'string'
	) {
		return {ok: false, error: {code: 'INVALID_PAYLOAD', message: 'Payload missing required fields'}};
	}

	// Verify checksum: extract checksum, rebuild without it, compare
	const {checksum, ...rest} = payload;
	const expected = computeChecksum(rest);
	if (checksum !== expected) {
		return {
			ok: false,
			error: {code: 'CHECKSUM_MISMATCH', message: `Checksum mismatch: got ${checksum}, expected ${expected}`},
		};
	}

	const ageMs = Date.now() - payload.timestamp;
	if (maxAgeMs !== undefined && ageMs > maxAgeMs) {
		return {ok: false, error: {code: 'EXPIRED', message: `Payload age ${ageMs}ms exceeds max ${maxAgeMs}ms`}};
	}

	const cookies = new Bun.CookieMap(payload.cookies);
	const latencyNs = Bun.nanoseconds() - start;

	return {
		ok: true,
		data: {
			cookies,
			meta: {decompressed, size: buf.byteLength, latencyNs, ageMs},
		},
	};
}

// --- Save ---

export async function saveCookiesToR2(
	cookies: Bun.CookieMap,
	r2Key: string,
	config?: R2CookieConfig,
	compress?: boolean,
): Promise<R2CookieResult<{bytesWritten: number; compressed: boolean}>> {
	const resolved = config ?? getR2CookieConfig();
	if (!resolved) {
		return {ok: false, error: {code: 'R2_CONFIG_MISSING', message: 'R2 credentials not configured'}};
	}

	const client = createS3Client(resolved);
	const entries: Array<[string, string]> = [];
	for (const [name, value] of cookies) {
		entries.push([name, value]);
	}

	// Build payload without checksum, compute checksum, then add it
	const payloadBase = {
		version: BUN_R2_COOKIE_FORMAT_VERSION,
		cookies: entries,
		timestamp: Date.now(),
	};
	const checksum = computeChecksum(payloadBase);
	const payload: R2CookiePayload = {...payloadBase, checksum};
	const jsonStr = JSON.stringify(payload);
	const jsonBytes = new TextEncoder().encode(jsonStr);

	const shouldCompress = compress ?? jsonBytes.byteLength > BUN_R2_COOKIE_COMPRESS_THRESHOLD;
	let body: Uint8Array;

	if (shouldCompress) {
		const compressed = Bun.zstdCompressSync(jsonBytes);
		body = new Uint8Array(1 + compressed.byteLength);
		body[0] = PREFIX_ZSTD;
		body.set(compressed, 1);
	} else {
		body = new Uint8Array(1 + jsonBytes.byteLength);
		body[0] = PREFIX_RAW;
		body.set(jsonBytes, 1);
	}

	try {
		await client.write(r2Key, body);
	} catch (err) {
		return {ok: false, error: {code: 'R2_FETCH_FAILED', message: `Failed to write ${r2Key}`, cause: err}};
	}

	return {ok: true, data: {bytesWritten: body.byteLength, compressed: shouldCompress}};
}

// --- Batch Operations ---

export async function loadManyFromR2(
	r2Keys: string[],
	config?: R2CookieConfig,
	maxAgeMs?: number,
): Promise<Map<string, R2CookieResult<{cookies: Bun.CookieMap; meta: R2CookieMeta}>>> {
	const resolved = config ?? getR2CookieConfig();
	if (!resolved) {
		const error: R2CookieError = {code: 'R2_CONFIG_MISSING', message: 'R2 credentials not configured'};
		return new Map(r2Keys.map(key => [key, {ok: false, error}]));
	}

	const results = await Promise.all(r2Keys.map(async key => loadCookiesFromR2(key, resolved, maxAgeMs)));
	return new Map(r2Keys.map((key, i) => [key, results[i]!]));
}

export async function saveManyToR2(
	entries: Array<{cookies: Bun.CookieMap; r2Key: string}>,
	config?: R2CookieConfig,
	compress?: boolean,
): Promise<Map<string, R2CookieResult<{bytesWritten: number; compressed: boolean}>>> {
	const resolved = config ?? getR2CookieConfig();
	if (!resolved) {
		const error: R2CookieError = {code: 'R2_CONFIG_MISSING', message: 'R2 credentials not configured'};
		return new Map(entries.map(e => [e.r2Key, {ok: false, error}]));
	}

	const results = await Promise.all(entries.map(async e => saveCookiesToR2(e.cookies, e.r2Key, resolved, compress)));
	return new Map(entries.map((e, i) => [e.r2Key, results[i]!]));
}
