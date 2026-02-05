#!/usr/bin/env bun

import {parseArgs} from 'node:util';
import {createHmac, createHash} from 'node:crypto';

type R2Config = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
};

type Cmd =
	| 'list'
	| 'get'
	| 'put'
	| 'delete'
	| 'put-json'
	| 'get-json'
	| 'bench'
	| 'rss:list'
	| 'rss:get'
	| 'rss:put'
	| 'rss:delete'
	| 'rss:publish-scan';

const DEFAULT_SERVICE = 'com.factory-wager.r2';
const DEFAULT_RSS_PREFIX = 'rss/';

const {values: flags, positionals} = parseArgs({
	allowPositionals: true,
	args: Bun.argv.slice(2),
	options: {
		help: {type: 'boolean', short: 'h', default: false},
		service: {type: 'string', default: DEFAULT_SERVICE},
		'key': {type: 'string'},
		'bucket': {type: 'string'},
		'prefix': {type: 'string'},
		'content-type': {type: 'string'},
		'metadata': {type: 'string'},
		'cache-control': {type: 'string'},
		'json': {type: 'boolean', default: false},
		'profile': {type: 'boolean', default: false},
		'bench-iter': {type: 'string'},
		'env-fallback': {type: 'boolean', default: true},
	},
	strict: true,
});

function usage(): void {
	console.log(`
  bun r2-cli.ts <command> [args] [flags]

  Commands:
    list [--prefix <p>]                  List objects
    get <key> [--json]                   Download object to stdout
    put <key> <file>                     Upload file
    delete <key>                         Delete object
    get-json <key>                       Download JSON to stdout (pretty)
    put-json <key> <file|->              Upload JSON
    rss:list [--prefix <p>]              List RSS objects
    rss:get <key>                        Download RSS object
    rss:put <key> <file>                 Upload RSS object
    rss:delete <key>                     Delete RSS object
    rss:publish-scan                     Run scan.ts --rss then upload RSS artifacts
    bench [--bench-iter N]               Benchmark signing (no network)

  Flags:
    --service <uti>                      Bun.secrets service (default: ${DEFAULT_SERVICE})
    --bucket <name>                      Override bucket name
    --key <key>                          Object key (if not positional)
    --prefix <p>                         Prefix for list
    --content-type <type>                Upload Content-Type
    --metadata <k=v,...>                 Upload x-amz-meta-* pairs
    --cache-control <value>              Upload Cache-Control
    --json                               JSON output
    --profile                            Print timing
    --env-fallback                       Allow env vars if secrets missing
`);
}

function parseMetadata(raw?: string): Record<string, string> {
	if (!raw) return {};
	const out: Record<string, string> = {};
	for (const pair of raw.split(',')) {
		const [k, v] = pair.split('=');
		if (!k || v === undefined) continue;
		out[k.trim()] = v.trim();
	}
	return out;
}

function getSecret(name: string, service: string): Promise<string | null> {
	const secrets = (Bun as unknown as {secrets?: {get: (opts: {service: string; name: string}) => Promise<string | null>}}).secrets;
	if (secrets) return secrets.get({service, name});
	return Promise.resolve(null);
}

async function loadConfig(): Promise<R2Config> {
	const service = flags.service || DEFAULT_SERVICE;
	const envFallback = !!flags['env-fallback'];
	const [accountId, accessKeyId, secretAccessKey, bucketName] = await Promise.all([
		getSecret('R2_ACCOUNT_ID', service),
		getSecret('R2_ACCESS_KEY_ID', service),
		getSecret('R2_SECRET_ACCESS_KEY', service),
		getSecret('R2_BUCKET_NAME', service),
	]);

	const cfg: R2Config = {
		accountId: accountId ?? (envFallback ? Bun.env.R2_ACCOUNT_ID ?? '' : ''),
		accessKeyId: accessKeyId ?? (envFallback ? Bun.env.R2_ACCESS_KEY_ID ?? '' : ''),
		secretAccessKey: secretAccessKey ?? (envFallback ? Bun.env.R2_SECRET_ACCESS_KEY ?? '' : ''),
		bucketName: (flags.bucket ?? bucketName ?? (envFallback ? Bun.env.R2_BUCKET_NAME : '')) || '',
	};

	if (!cfg.accountId || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucketName) {
		throw new Error('Missing R2 configuration. Provide Bun.secrets or env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).');
	}
	return cfg;
}

function toAmzDate(d = new Date()): {amz: string; date: string} {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	const ss = String(d.getUTCSeconds()).padStart(2, '0');
	return {amz: `${y}${m}${day}T${hh}${mm}${ss}Z`, date: `${y}${m}${day}`};
}

function hashSha256Hex(data: string | Uint8Array): string {
	return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
	return createHmac('sha256', key).update(data).digest();
}

function encodeKey(key: string): string {
	return key.split('/').map(encodeURIComponent).join('/');
}

function withPrefix(key: string, prefix: string): string {
	if (!prefix) return key;
	if (key.startsWith(prefix)) return key;
	return `${prefix}${key}`;
}

async function r2Fetch(
	cfg: R2Config,
	method: 'GET' | 'PUT' | 'DELETE',
	key: string,
	body?: Uint8Array | string,
	headersExtra: Record<string, string> = {},
): Promise<Response> {
	const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
	const canonicalUri = `/${cfg.bucketName}/${encodeKey(key)}`;
	const {amz, date} = toAmzDate();
	const payload = body ?? '';
	const payloadHash = hashSha256Hex(payload);
	const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
	const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
	const canonicalRequest = `${method}\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
	const scope = `${date}/auto/s3/aws4_request`;
	const stringToSign = `AWS4-HMAC-SHA256\n${amz}\n${scope}\n${hashSha256Hex(canonicalRequest)}`;
	const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, date);
	const kRegion = hmacSha256(kDate, 'auto');
	const kService = hmacSha256(kRegion, 's3');
	const kSigning = hmacSha256(kService, 'aws4_request');
	const signature = hmacSha256(kSigning, stringToSign).toString('hex');
	const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

	const url = `https://${host}/${cfg.bucketName}/${encodeKey(key)}`;
	const headers: Record<string, string> = {
		'Authorization': authorization,
		'x-amz-date': amz,
		'x-amz-content-sha256': payloadHash,
		...headersExtra,
	};

	return fetch(url, {
		method,
		headers,
		body: method === 'PUT' ? payload : undefined,
	});
}

async function listObjects(cfg: R2Config, prefix = ''): Promise<void> {
	const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/r2/buckets/${cfg.bucketName}/objects`);
	url.searchParams.set('prefix', prefix);
	const res = await fetch(url.toString(), {
		headers: {
			'Authorization': `Bearer ${cfg.secretAccessKey}`,
		},
	});
	if (!res.ok) throw new Error(`R2 list failed: ${res.status} ${res.statusText}`);
	const data = await res.json();
	if (flags.json) {
		console.log(JSON.stringify(data, null, 2));
		return;
	}
	const rows = (data.objects ?? []).map((o: any, idx: number) => ({
		'#': idx,
		Key: o.key,
		Size: o.size,
		ETag: o.etag,
	}));
	console.log(Bun.inspect.table(rows, ['#', 'Key', 'Size', 'ETag']));
}

async function uploadFile(
	cfg: R2Config,
	key: string,
	filePath: string,
	contentType = 'application/octet-stream',
): Promise<void> {
	const data = await Bun.file(filePath).arrayBuffer();
	const res = await r2Fetch(cfg, 'PUT', key, new Uint8Array(data), {
		'Content-Type': contentType,
	});
	if (!res.ok) throw new Error(`R2 put failed: ${res.status} ${res.statusText}`);
	console.log(`uploaded: ${key}`);
}

async function main(): Promise<void> {
	if (flags.help || positionals.length === 0) {
		usage();
		return;
	}

	const cmd = positionals[0] as Cmd;
	const t0 = flags.profile ? Bun.nanoseconds() : 0;
	if (cmd === 'bench') {
		const iter = Math.max(1, Number(flags['bench-iter'] ?? 1000));
		const cfg: R2Config = {
			accountId: 'bench',
			accessKeyId: 'bench',
			secretAccessKey: 'bench',
			bucketName: 'bench',
		};
		const start = Bun.nanoseconds();
		for (let i = 0; i < iter; i++) {
			await r2Fetch(cfg, 'GET', `bench/${i}`);
		}
		const ms = (Bun.nanoseconds() - start) / 1e6;
		console.log(`bench: ${iter} signed requests in ${ms.toFixed(1)}ms`);
		return;
	}

	const cfg = await loadConfig();
	const key = flags.key ?? positionals[1];
	const rssPrefix = flags.prefix ?? DEFAULT_RSS_PREFIX;

	switch (cmd) {
		case 'list': {
			await listObjects(cfg, flags.prefix ?? '');
			break;
		}
		case 'get': {
			if (!key) throw new Error('Missing key');
			const res = await r2Fetch(cfg, 'GET', key);
			if (!res.ok) throw new Error(`R2 get failed: ${res.status} ${res.statusText}`);
			const buf = new Uint8Array(await res.arrayBuffer());
			if (flags.json) {
				const json = JSON.parse(new TextDecoder().decode(buf));
				console.log(JSON.stringify(json, null, 2));
			} else {
				await Bun.write(Bun.stdout, buf);
			}
			break;
		}
		case 'get-json': {
			if (!key) throw new Error('Missing key');
			const res = await r2Fetch(cfg, 'GET', key);
			if (!res.ok) throw new Error(`R2 get failed: ${res.status} ${res.statusText}`);
			const json = await res.json();
			console.log(JSON.stringify(json, null, 2));
			break;
		}
		case 'put': {
			if (!key) throw new Error('Missing key');
			const filePath = positionals[2];
			if (!filePath) throw new Error('Missing file');
			const data = await Bun.file(filePath).arrayBuffer();
			const headers: Record<string, string> = {
				'Content-Type': flags['content-type'] ?? 'application/octet-stream',
			};
			const cacheControl = flags['cache-control'];
			if (cacheControl) headers['Cache-Control'] = cacheControl;
			const metadata = parseMetadata(flags.metadata);
			for (const [k, v] of Object.entries(metadata)) {
				headers[`x-amz-meta-${k}`] = v;
			}
			const res = await r2Fetch(cfg, 'PUT', key, new Uint8Array(data), headers);
			if (!res.ok) throw new Error(`R2 put failed: ${res.status} ${res.statusText}`);
			console.log(`uploaded: ${key}`);
			break;
		}
		case 'put-json': {
			if (!key) throw new Error('Missing key');
			const filePath = positionals[2];
			if (!filePath) throw new Error('Missing file');
			const raw = filePath === '-' ? await Bun.stdin.text() : await Bun.file(filePath).text();
			const res = await r2Fetch(cfg, 'PUT', key, raw, {'Content-Type': 'application/json'});
			if (!res.ok) throw new Error(`R2 put failed: ${res.status} ${res.statusText}`);
			console.log(`uploaded: ${key}`);
			break;
		}
		case 'delete': {
			if (!key) throw new Error('Missing key');
			const res = await r2Fetch(cfg, 'DELETE', key);
			if (!res.ok) throw new Error(`R2 delete failed: ${res.status} ${res.statusText}`);
			console.log(`deleted: ${key}`);
			break;
		}
		case 'rss:list': {
			await listObjects(cfg, rssPrefix);
			break;
		}
		case 'rss:get': {
			if (!key) throw new Error('Missing key');
			const rssKey = withPrefix(key, rssPrefix);
			const res = await r2Fetch(cfg, 'GET', rssKey);
			if (!res.ok) throw new Error(`R2 get failed: ${res.status} ${res.statusText}`);
			const buf = new Uint8Array(await res.arrayBuffer());
			await Bun.write(Bun.stdout, buf);
			break;
		}
		case 'rss:put': {
			if (!key) throw new Error('Missing key');
			const filePath = positionals[2];
			if (!filePath) throw new Error('Missing file');
			const rssKey = withPrefix(key, rssPrefix);
			await uploadFile(cfg, rssKey, filePath, 'application/rss+xml');
			break;
		}
		case 'rss:delete': {
			if (!key) throw new Error('Missing key');
			const rssKey = withPrefix(key, rssPrefix);
			const res = await r2Fetch(cfg, 'DELETE', rssKey);
			if (!res.ok) throw new Error(`R2 delete failed: ${res.status} ${res.statusText}`);
			console.log(`deleted: ${rssKey}`);
			break;
		}
		case 'rss:publish-scan': {
			const run = Bun.spawnSync(['bun', 'scanner/scan.ts', '--rss'], {
				stdout: 'inherit',
				stderr: 'inherit',
			});
			if (!run.success) throw new Error('scan.ts --rss failed');
			const rssFiles = [
				'scanner/.audit/token-events.rss.xml',
				'scanner/.audit/scan-results.rss.xml',
			];
			for (const filePath of rssFiles) {
				const file = Bun.file(filePath);
				if (!(await file.exists())) continue;
				const keyName = filePath.split('/').pop()!;
				const rssKey = withPrefix(keyName, rssPrefix);
				await uploadFile(cfg, rssKey, filePath, 'application/rss+xml');
			}
			break;
		}
		default:
			throw new Error(`Unknown command: ${cmd}`);
	}

	if (flags.profile) {
		const ms = (Bun.nanoseconds() - t0) / 1e6;
		console.log(`elapsed: ${ms.toFixed(1)}ms`);
	}
}

main().catch(err => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
