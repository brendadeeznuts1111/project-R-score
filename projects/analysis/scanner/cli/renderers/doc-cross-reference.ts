// doc-cross-reference.ts
// Documentation navigation: related APIs, search keywords, provenance, and enriched doc links

import {BUN_API_CATALOG, type BunApiEntry, type BunApiCategory} from './bun-api-matrix';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PerfAnnotation {
	version: string;
	change: string;
	impact: string;
	contributor?: string;
	ref?: string;
}

export interface DocLink {
	api: string;
	docUrl: string;
	related: readonly string[];
	keywords: readonly string[];
	since: string;
	category: BunApiCategory;
	topic: string;
	perf: readonly PerfAnnotation[];
}

export interface DocSearchResult {
	api: string;
	score: number;
	matchedOn: ('api' | 'keyword' | 'topic' | 'category')[];
	docUrl: string;
}

export interface DocCoverageReport {
	file: string;
	apisUsed: string[];
	documented: string[];
	undocumented: string[];
	coveragePercent: number;
}

/** API has full cross-reference coverage: provenance, related APIs, and search keywords */
export function isWellDocumented(api: string): boolean {
	return (
		BUN_API_PROVENANCE[api] !== undefined &&
		BUN_RELATED_APIS[api] !== undefined &&
		BUN_SEARCH_KEYWORDS[api] !== undefined
	);
}

/** Append #well-documented fragment when API has full coverage and URL has no fragment */
export function withWellDocumentedFragment(docUrl: string, api: string): string {
	if (!docUrl.includes('#') && isWellDocumented(api)) {
		return `${docUrl}#well-documented`;
	}
	return docUrl;
}

// ═══════════════════════════════════════════════════════════════
// API PROVENANCE — version that introduced each API
// ═══════════════════════════════════════════════════════════════

export const BUN_API_PROVENANCE: Readonly<Record<string, string>> = {
	// pre-1.2 (core)
	'Bun.serve': '<1.2',
	'Bun.fetch': '<1.2',
	'Bun.listen': '<1.2',
	'Bun.connect': '<1.2',
	'WebSocket': '<1.2',
	'Bun.dns.lookup': '<1.2',
	'Bun.dns.prefetch': '<1.2',
	'Bun.dns.getCacheStats': '<1.2',
	'$ (shell)': '<1.2',
	'$.braces': '<1.2',
	'$.escape': '<1.2',
	'Bun.spawn': '<1.2',
	'Bun.spawnSync': '<1.2',
	'Bun.file': '<1.2',
	'Bun.write': '<1.2',
	'Bun.stdin': '<1.2',
	'Bun.stdout': '<1.2',
	'Bun.stderr': '<1.2',
	'Bun.build': '<1.2',
	'Bun.Transpiler': '<1.2',
	'Bun.FileSystemRouter': '<1.2',
	'Bun.plugin': '<1.2',
	'Bun.password': '<1.2',
	'Bun.hash': '<1.2',
	'Bun.CryptoHasher': '<1.2',
	'bun:sqlite': '<1.2',
	'Bun.gzipSync': '<1.2',
	'Bun.gunzipSync': '<1.2',
	'Bun.deflateSync': '<1.2',
	'Bun.inflateSync': '<1.2',
	'Bun.version': '<1.2',
	'Bun.revision': '<1.2',
	'Bun.env': '<1.2',
	'Bun.main': '<1.2',
	'Bun.sleep': '<1.2',
	'Bun.nanoseconds': '<1.2',
	'Bun.which': '<1.2',
	'Bun.peek': '<1.2',
	'Bun.deepEquals': '<1.2',
	'Bun.inspect': '<1.2',
	'Bun.inspect.table': '<1.2',
	'Bun.escapeHTML': '<1.2',
	'Bun.stringWidth': '<1.2',
	'Bun.resolveSync': '<1.2',
	'Bun.resolve': '<1.2',
	'ResolveMessage': '1.2.0',
	'Bun.fileURLToPath': '<1.2',
	'Bun.pathToFileURL': '<1.2',
	'Bun.Glob': '<1.2',
	'HTMLRewriter': '<1.2',
	'Bun.readableStreamToText': '<1.2',
	'Bun.readableStreamToJSON': '<1.2',
	'Bun.readableStreamToArray': '<1.2',
	'Bun.readableStreamToArrayBuffer': '<1.2',
	'Bun.readableStreamToBytes': '<1.2',
	'Bun.readableStreamToBlob': '<1.2',
	'Bun.readableStreamToFormData': '<1.2',
	'bun:ffi': '<1.2',
	'bun:test': '<1.2',
	'Worker': '<1.2',
	'Bun.gc': '<1.2',
	'Bun.generateHeapSnapshot': '<1.2',
	'bun:jsc': '<1.2',
	'Node-API': '<1.2',
	'import.meta': '<1.2',
	'import.meta.resolve': '<1.2',
	'Bun.semver': '<1.2',
	// 1.2.0
	'Bun.sql': '1.2.0',
	'Bun.postgres': '1.2.0',
	'Bun.SQL': '1.2.0',
	'Bun.S3Client': '1.2.0',
	'Bun.s3': '1.2.0',
	'Bun.color': '1.2.0',
	// 1.3.0
	'Bun.redis': '1.3.0',
	'Bun.RedisClient': '1.3.0',
	// 1.3.4
	'URLPattern': '1.3.4',
	'URLPattern.test': '1.3.4',
	'URLPattern.exec': '1.3.4',
	'URLPattern.hasRegExpGroups': '1.3.4',
	'FormData.from': '1.3.4',
	'Bun.FFI.CString': '1.3.4',
	'Bun.FFI.linkSymbols': '1.3.4',
	// 1.3.5
	'Bun.Terminal': '1.3.5',
	'bun:bundle': '1.3.5',
	// 1.3.6
	'Bun.Archive': '1.3.6',
	'Bun.JSONC': '1.3.6',
	// 1.3.7
	'Bun.wrapAnsi': '1.3.7',
	// 1.3.8
	'Bun.JSON5': '1.3.8',
	'Bun.JSONL': '1.3.8',
	'Bun.YAML': '1.3.8',
	'Bun.TOML.parse': '1.3.8',
	'Bun.markdown': '1.3.8',
	// pre-existing (provenance backfill)
	'Bun.udpSocket': '<1.2',
	'Bun.mmap': '<1.2',
	'Bun.indexOfLine': '<1.2',
	'FileSink.write': '<1.2',
};

// ═══════════════════════════════════════════════════════════════
// PERF ANNOTATIONS — version-specific performance changes
// ═══════════════════════════════════════════════════════════════

export const BUN_PERF_ANNOTATIONS: Readonly<Record<string, readonly PerfAnnotation[]>> = {
	'Bun.spawnSync': [
		{
			version: '1.3.6',
			change: 'close_range() syscall fix on Linux ARM64',
			impact: '~30x faster (13ms → 0.4ms) on high-FD-limit systems',
			contributor: '@sqdshguy',
			ref: 'https://bun.com/blog/bun-v1.3.6#faster-bun-spawnsync-on-linux-arm64',
		},
	],
	'Bun.spawn': [
		{
			version: '1.3.6',
			change: 'close_range() syscall fix on Linux ARM64',
			impact: '~30x faster spawn on high-FD-limit systems',
			contributor: '@sqdshguy',
			ref: 'https://bun.com/blog/bun-v1.3.6#faster-bun-spawnsync-on-linux-arm64',
		},
	],
	'Bun.hash': [
		{
			version: '1.3.6',
			change: 'Bun.hash.crc32 SIMD optimization',
			impact: '20x faster crc32',
			ref: 'https://bun.com/blog/bun-v1.3.6',
		},
	],
	'Bun.readableStreamToText': [
		{
			version: '<1.2',
			change: 'Native C++ stream consumer replaces Response wrapper',
			impact: '7.1x faster than new Response(stream).text()',
		},
	],
	'Bun.readableStreamToJSON': [
		{
			version: '<1.2',
			change: 'Native C++ stream consumer replaces Response wrapper',
			impact: '10.2x faster than new Response(stream).json()',
		},
	],
	'Bun.markdown': [
		{
			version: '1.3.8',
			change: 'CommonMark/GFM parser with React renderer',
			impact: 'Native C implementation, zero-copy parsing',
			ref: 'https://bun.com/blog/bun-v1.3.8',
		},
	],
};

// ═══════════════════════════════════════════════════════════════
// RELATED APIS — semantically linked APIs for navigation
// ═══════════════════════════════════════════════════════════════

export const BUN_RELATED_APIS: Readonly<Record<string, readonly string[]>> = {
	// HTTP & Networking
	'Bun.serve': ['Bun.fetch', 'WebSocket', 'Bun.listen', 'URLPattern'],
	'Bun.fetch': ['Bun.serve', 'Bun.readableStreamToJSON', 'Bun.readableStreamToText'],
	'Bun.listen': ['Bun.connect', 'Bun.serve', 'Bun.udpSocket'],
	'Bun.connect': ['Bun.listen', 'Bun.udpSocket'],
	'Bun.udpSocket': ['Bun.listen', 'Bun.connect'],
	'WebSocket': ['Bun.serve', 'Bun.listen'],
	'Bun.dns.lookup': ['Bun.dns.prefetch', 'Bun.dns.getCacheStats'],
	'Bun.dns.prefetch': ['Bun.dns.lookup', 'Bun.dns.getCacheStats'],
	'Bun.dns.getCacheStats': ['Bun.dns.lookup', 'Bun.dns.prefetch'],

	// Shell & Process
	'$ (shell)': ['$.braces', '$.escape', 'Bun.spawn'],
	'$.braces': ['$ (shell)', '$.escape'],
	'$.escape': ['$ (shell)', '$.braces'],
	'Bun.spawn': ['Bun.spawnSync', '$ (shell)', 'Bun.readableStreamToText'],
	'Bun.spawnSync': ['Bun.spawn', '$ (shell)'],

	// File I/O
	'Bun.file': ['Bun.write', 'Bun.stdin', 'Bun.mmap', 'FileSink.write'],
	'Bun.write': ['Bun.file', 'Bun.stdout', 'FileSink.write'],
	'Bun.stdin': ['Bun.stdout', 'Bun.stderr', 'Bun.file'],
	'Bun.stdout': ['Bun.stdin', 'Bun.stderr', 'Bun.write'],
	'Bun.stderr': ['Bun.stdin', 'Bun.stdout'],
	'Bun.mmap': ['Bun.file', 'Bun.allocUnsafe'],

	// Build & Bundling
	'Bun.build': ['Bun.Transpiler', 'Bun.plugin', 'bun:bundle'],
	'Bun.Transpiler': ['Bun.build', 'Bun.plugin'],
	'Bun.FileSystemRouter': ['URLPattern', 'Bun.serve'],
	'Bun.plugin': ['Bun.build', 'Bun.Transpiler', 'Bun.resolve', 'ResolveMessage'],
	'bun:bundle': ['Bun.build', 'Bun.Transpiler'],

	// Hashing & Security
	'Bun.password': ['Bun.hash', 'Bun.CryptoHasher'],
	'Bun.hash': ['Bun.CryptoHasher', 'Bun.password', 'Bun.sha'],
	'Bun.CryptoHasher': ['Bun.hash', 'Bun.sha', 'Bun.password'],
	'Bun.sha': ['Bun.hash', 'Bun.CryptoHasher'],

	// Databases
	'bun:sqlite': ['Bun.sql', 'Bun.file'],
	'Bun.sql': ['Bun.postgres', 'Bun.SQL', 'bun:sqlite'],
	'Bun.postgres': ['Bun.sql', 'Bun.SQL'],
	'Bun.SQL': ['Bun.sql', 'Bun.postgres'],
	'Bun.redis': ['Bun.RedisClient'],
	'Bun.RedisClient': ['Bun.redis'],
	'Bun.S3Client': ['Bun.s3', 'Bun.file'],
	'Bun.s3': ['Bun.S3Client', 'Bun.file'],

	// Compression
	'Bun.gzipSync': ['Bun.gunzipSync', 'Bun.deflateSync'],
	'Bun.gunzipSync': ['Bun.gzipSync', 'Bun.inflateSync'],
	'Bun.deflateSync': ['Bun.inflateSync', 'Bun.gzipSync'],
	'Bun.inflateSync': ['Bun.deflateSync', 'Bun.gunzipSync'],
	'Bun.zstdCompressSync': ['Bun.zstdDecompressSync', 'Bun.zstdCompress'],
	'Bun.zstdDecompressSync': ['Bun.zstdCompressSync', 'Bun.zstdDecompress'],
	'Bun.zstdCompress': ['Bun.zstdDecompress', 'Bun.zstdCompressSync'],
	'Bun.zstdDecompress': ['Bun.zstdCompress', 'Bun.zstdDecompressSync'],
	'Bun.Archive': ['Bun.gzipSync', 'Bun.zstdCompressSync'],

	// Streaming
	'HTMLRewriter': ['Bun.readableStreamToText', 'Bun.serve'],
	'Bun.readableStreamToText': ['Bun.readableStreamToJSON', 'Bun.readableStreamToBytes'],
	'Bun.readableStreamToJSON': ['Bun.readableStreamToText', 'Bun.fetch'],
	'Bun.readableStreamToArray': ['Bun.readableStreamToBytes', 'Bun.readableStreamToText'],
	'Bun.readableStreamToArrayBuffer': ['Bun.readableStreamToBytes', 'Bun.readableStreamToBlob'],
	'Bun.readableStreamToBytes': ['Bun.readableStreamToArrayBuffer', 'Bun.readableStreamToArray'],
	'Bun.readableStreamToBlob': ['Bun.readableStreamToArrayBuffer', 'Bun.readableStreamToText'],
	'Bun.readableStreamToFormData': ['Bun.readableStreamToText', 'FormData.from'],
	'FormData.from': ['Bun.readableStreamToFormData'],

	// Routing
	'URLPattern': ['URLPattern.test', 'URLPattern.exec', 'Bun.serve', 'Bun.FileSystemRouter'],
	'URLPattern.test': ['URLPattern', 'URLPattern.exec'],
	'URLPattern.exec': ['URLPattern', 'URLPattern.test', 'URLPattern.hasRegExpGroups'],
	'URLPattern.hasRegExpGroups': ['URLPattern', 'URLPattern.exec'],

	// Utilities — parsing cluster
	'Bun.markdown': ['Bun.JSONC', 'Bun.TOML.parse', 'HTMLRewriter'],
	'Bun.JSONC': ['Bun.JSON5', 'Bun.JSONL', 'Bun.TOML.parse'],
	'Bun.JSON5': ['Bun.JSONC', 'Bun.JSONL'],
	'Bun.JSONL': ['Bun.JSONC', 'Bun.JSON5'],
	'Bun.YAML': ['Bun.TOML.parse', 'Bun.JSONC'],
	'Bun.TOML.parse': ['Bun.JSONC', 'Bun.YAML'],
	'Bun.color': ['Bun.stripANSI', 'Bun.wrapAnsi'],

	// Utilities — string cluster
	'Bun.escapeHTML': ['Bun.stringWidth', 'HTMLRewriter'],
	'Bun.stringWidth': ['Bun.wrapAnsi', 'Bun.stripANSI'],
	'Bun.stripANSI': ['Bun.stringWidth', 'Bun.wrapAnsi', 'Bun.color'],
	'Bun.wrapAnsi': ['Bun.stringWidth', 'Bun.stripANSI'],

	// Utilities — module resolution
	'Bun.resolveSync': ['Bun.resolve', 'Bun.fileURLToPath', 'ResolveMessage', 'import.meta.resolve'],
	'Bun.resolve': ['Bun.resolveSync', 'Bun.fileURLToPath', 'ResolveMessage', 'import.meta.resolve'],
	'ResolveMessage': ['Bun.resolve', 'Bun.resolveSync', 'Bun.plugin', 'import.meta.resolve'],
	'import.meta.resolve': ['Bun.resolve', 'Bun.resolveSync', 'import.meta', 'ResolveMessage'],
	'import.meta': ['import.meta.resolve', 'Bun.fileURLToPath', 'Bun.pathToFileURL', 'Bun.main'],
	'Bun.fileURLToPath': ['Bun.pathToFileURL', 'Bun.resolveSync', 'import.meta'],
	'Bun.pathToFileURL': ['Bun.fileURLToPath', 'Bun.resolve', 'import.meta'],

	// Utilities — memory
	'Bun.allocUnsafe': ['Bun.concatArrayBuffers', 'Bun.shrink'],
	'Bun.concatArrayBuffers': ['Bun.allocUnsafe', 'Bun.ArrayBufferSink'],
	'Bun.shrink': ['Bun.allocUnsafe', 'Bun.gc'],
	'Bun.ArrayBufferSink': ['Bun.concatArrayBuffers', 'Bun.allocUnsafe'],

	// Advanced
	'bun:ffi': ['Bun.FFI.CString', 'Bun.FFI.linkSymbols'],
	'Bun.FFI.CString': ['bun:ffi', 'Bun.FFI.linkSymbols'],
	'Bun.FFI.linkSymbols': ['bun:ffi', 'Bun.FFI.CString'],
	'bun:test': ['Bun.jest', 'Worker', 'Bun.inspect'],
	'Worker': ['bun:test', 'Bun.spawn', 'Bun.stdin'],
	'Bun.gc': ['Bun.generateHeapSnapshot', 'Bun.shrink'],
	'Bun.generateHeapSnapshot': ['Bun.gc', 'bun:jsc'],
	'Bun.Terminal': ['Bun.spawn', 'Bun.stdin'],

	// File I/O — sinks
	'FileSink.write': ['Bun.file', 'Bun.write', 'Bun.stdout'],

	// Utilities — string (additional)
	'Bun.indexOfLine': ['Bun.stringWidth', 'Bun.stripANSI'],
};

// ═══════════════════════════════════════════════════════════════
// SEARCH KEYWORDS — discovery terms for each API
// ═══════════════════════════════════════════════════════════════

export const BUN_SEARCH_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
	// HTTP & Networking
	'Bun.serve': ['http', 'server', 'listen', 'port', 'fetch', 'request', 'response', 'tls', 'https'],
	'Bun.fetch': ['http', 'request', 'get', 'post', 'fetch', 'api', 'client'],
	'Bun.listen': ['tcp', 'socket', 'server', 'port', 'connection'],
	'Bun.connect': ['tcp', 'socket', 'client', 'connection'],
	'Bun.udpSocket': ['udp', 'socket', 'datagram', 'dgram'],
	'WebSocket': ['ws', 'websocket', 'realtime', 'socket', 'pubsub'],
	'Bun.dns.lookup': ['dns', 'resolve', 'hostname', 'ip', 'address'],
	'Bun.dns.prefetch': ['dns', 'prefetch', 'cache', 'warmup'],
	'Bun.dns.getCacheStats': ['dns', 'cache', 'stats', 'metrics'],

	// Shell & Process
	'$ (shell)': ['shell', 'bash', 'exec', 'command', 'script', 'pipe'],
	'$.braces': ['shell', 'brace', 'expansion', 'glob'],
	'$.escape': ['shell', 'escape', 'sanitize', 'injection'],
	'Bun.spawn': ['process', 'child', 'exec', 'subprocess', 'fork', 'pipe', 'stdout'],
	'Bun.spawnSync': ['process', 'child', 'exec', 'sync', 'blocking', 'posix_spawn', 'close_range', 'arm64'],

	// File I/O
	'Bun.file': ['file', 'read', 'open', 'path', 'blob', 'stream'],
	'Bun.write': ['file', 'write', 'save', 'output', 'create'],
	'Bun.stdin': ['stdin', 'input', 'pipe', 'interactive'],
	'Bun.stdout': ['stdout', 'output', 'print', 'console'],
	'Bun.stderr': ['stderr', 'error', 'log', 'diagnostic'],
	'Bun.mmap': ['mmap', 'memory', 'mapped', 'file', 'buffer', 'low-level'],

	// Build & Bundling
	'Bun.build': ['bundle', 'build', 'esbuild', 'entrypoint', 'output', 'minify', 'metafile'],
	'Bun.Transpiler': ['transpile', 'transform', 'jsx', 'tsx', 'typescript', 'loader'],
	'Bun.FileSystemRouter': ['router', 'filesystem', 'pages', 'routes', 'nextjs'],
	'Bun.plugin': ['plugin', 'loader', 'module', 'resolve', 'import', 'transform', 'bundle', 'preprocessor'],
	'bun:bundle': ['bundle', 'feature', 'flag', 'conditional', 'compile-time'],

	// Hashing & Security
	'Bun.password': ['password', 'hash', 'bcrypt', 'argon2', 'verify', 'auth'],
	'Bun.hash': ['hash', 'checksum', 'wyhash', 'murmur', 'crc32', 'fingerprint'],
	'Bun.CryptoHasher': ['hash', 'sha256', 'sha512', 'md5', 'digest', 'hmac', 'crypto'],
	'Bun.sha': ['sha', 'hash', 'digest', 'checksum'],

	// Databases
	'bun:sqlite': ['sqlite', 'database', 'sql', 'query', 'local', 'embedded'],
	'Bun.sql': ['sql', 'postgres', 'postgresql', 'database', 'query', 'tagged-template'],
	'Bun.postgres': ['postgres', 'postgresql', 'database', 'pg'],
	'Bun.SQL': ['sql', 'postgres', 'class', 'connection', 'pool'],
	'Bun.redis': ['redis', 'valkey', 'cache', 'pubsub', 'key-value'],
	'Bun.RedisClient': ['redis', 'valkey', 'client', 'connection'],
	'Bun.S3Client': ['s3', 'aws', 'storage', 'bucket', 'object', 'upload', 'download'],
	'Bun.s3': ['s3', 'aws', 'storage', 'default', 'client'],

	// Compression
	'Bun.gzipSync': ['gzip', 'compress', 'deflate', 'zlib'],
	'Bun.gunzipSync': ['gunzip', 'decompress', 'inflate', 'zlib'],
	'Bun.deflateSync': ['deflate', 'compress', 'zlib', 'raw'],
	'Bun.inflateSync': ['inflate', 'decompress', 'zlib', 'raw'],
	'Bun.zstdCompressSync': ['zstd', 'zstandard', 'compress', 'fast'],
	'Bun.zstdDecompressSync': ['zstd', 'zstandard', 'decompress'],
	'Bun.zstdCompress': ['zstd', 'zstandard', 'compress', 'async'],
	'Bun.zstdDecompress': ['zstd', 'zstandard', 'decompress', 'async'],
	'Bun.Archive': ['archive', 'tar', 'zip', 'extract', 'pack'],

	// Streaming
	'HTMLRewriter': ['html', 'rewrite', 'transform', 'parse', 'selector', 'element'],
	'Bun.readableStreamToText': ['stream', 'text', 'convert', 'read', 'string'],
	'Bun.readableStreamToJSON': ['stream', 'json', 'parse', 'convert', 'read'],
	'Bun.readableStreamToArray': ['stream', 'array', 'chunks', 'collect', 'read'],
	'Bun.readableStreamToArrayBuffer': ['stream', 'arraybuffer', 'binary', 'buffer', 'read'],
	'Bun.readableStreamToBytes': ['stream', 'bytes', 'uint8array', 'binary', 'read'],
	'Bun.readableStreamToBlob': ['stream', 'blob', 'binary', 'convert', 'read'],
	'Bun.readableStreamToFormData': ['stream', 'formdata', 'multipart', 'upload', 'form'],
	'FormData.from': ['formdata', 'create', 'convert', 'urlsearchparams'],

	// Routing
	'URLPattern': ['urlpattern', 'route', 'match', 'pattern', 'path', 'url'],
	'URLPattern.test': ['urlpattern', 'test', 'match', 'boolean', 'route'],
	'URLPattern.exec': ['urlpattern', 'exec', 'match', 'params', 'groups', 'capture'],
	'URLPattern.hasRegExpGroups': ['urlpattern', 'regex', 'groups', 'inspect'],

	// Utilities — parsing
	'Bun.markdown': ['markdown', 'md', 'commonmark', 'gfm', 'react', 'parse', 'render'],
	'Bun.TOML.parse': ['toml', 'config', 'parse', 'configuration'],
	'Bun.JSONC': ['json', 'jsonc', 'comments', 'parse', 'config'],
	'Bun.JSON5': ['json5', 'parse', 'relaxed', 'config'],
	'Bun.JSONL': ['jsonl', 'ndjson', 'lines', 'parse', 'log'],
	'Bun.YAML': ['yaml', 'yml', 'parse', 'config', 'stringify'],
	'Bun.color': ['color', 'ansi', 'rgb', 'hsl', 'hex', 'terminal'],

	// Utilities — string
	'Bun.escapeHTML': ['escape', 'html', 'xss', 'sanitize', 'entities'],
	'Bun.stringWidth': ['string', 'width', 'terminal', 'columns', 'ansi', 'cjk'],
	'Bun.stripANSI': ['strip', 'ansi', 'escape', 'clean', 'plain'],
	'Bun.wrapAnsi': ['wrap', 'ansi', 'terminal', 'columns', 'word-wrap'],
	'Bun.indexOfLine': ['line', 'index', 'newline', 'offset', 'search'],

	// Utilities — module resolution
	'Bun.resolveSync': ['resolve', 'module', 'import', 'path', 'sync', 'require', 'specifier'],
	'Bun.resolve': ['resolve', 'module', 'import', 'path', 'async', 'specifier', 'dynamic import'],
	'ResolveMessage': [
		'module',
		'not found',
		'resolve',
		'import',
		'require',
		'error',
		'resolvemessage',
		'circular',
		'missing',
	],
	'import.meta.resolve': ['resolve', 'module', 'import', 'esm', 'specifier', 'dynamic import', 'lazy loading'],
	'import.meta': ['import', 'meta', 'url', 'dirname', 'filename', 'resolve', 'esm'],
	'Bun.fileURLToPath': ['file', 'url', 'path', 'convert', 'file://'],
	'Bun.pathToFileURL': ['path', 'url', 'file', 'convert', 'file://'],

	// Utilities — memory
	'Bun.allocUnsafe': ['alloc', 'buffer', 'memory', 'unsafe', 'performance'],
	'Bun.concatArrayBuffers': ['concat', 'arraybuffer', 'merge', 'join', 'buffer'],
	'Bun.shrink': ['shrink', 'memory', 'buffer', 'compact', 'gc'],
	'Bun.ArrayBufferSink': ['sink', 'arraybuffer', 'stream', 'write', 'buffer'],

	// Advanced
	'bun:ffi': ['ffi', 'native', 'c', 'shared-library', 'dlopen', 'foreign'],
	'Bun.FFI.CString': ['ffi', 'cstring', 'pointer', 'native', 'c-string'],
	'Bun.FFI.linkSymbols': ['ffi', 'link', 'symbols', 'native', 'dynamic'],
	'bun:test': ['test', 'expect', 'describe', 'it', 'mock', 'jest'],
	'Worker': ['worker', 'thread', 'parallel', 'background', 'multithreading'],
	'Bun.gc': ['gc', 'garbage', 'collect', 'memory', 'force'],
	'Bun.generateHeapSnapshot': ['heap', 'snapshot', 'memory', 'profile', 'debug'],
	'bun:jsc': ['jsc', 'javascriptcore', 'internals', 'debug', 'profile'],
	'Bun.Terminal': ['terminal', 'pty', 'tty', 'interactive', 'shell'],
	'FileSink.write': ['file', 'write', 'sink', 'stream', 'incremental', 'append'],
};

// ═══════════════════════════════════════════════════════════════
// DocLinkGenerator
// ═══════════════════════════════════════════════════════════════

// Pre-index catalog by api name for O(1) lookup
const catalogIndex = new Map<string, BunApiEntry>();
for (const entry of BUN_API_CATALOG) {
	catalogIndex.set(entry.api, entry);
}

export class DocLinkGenerator {
	/** Generate an enriched doc link for a given API name */
	getDocLink(api: string): DocLink | null {
		const entry = catalogIndex.get(api);
		if (!entry) return null;
		return {
			api: entry.api,
			docUrl: withWellDocumentedFragment(entry.docUrl, api),
			related: BUN_RELATED_APIS[api] ?? [],
			keywords: BUN_SEARCH_KEYWORDS[api] ?? [],
			since: BUN_API_PROVENANCE[api] ?? 'unknown',
			category: entry.category,
			topic: entry.topic,
			perf: BUN_PERF_ANNOTATIONS[api] ?? [],
		};
	}

	/** Search the catalog by keyword, returning scored results */
	search(query: string): DocSearchResult[] {
		const q = query.toLowerCase().trim();
		if (!q) return [];
		const terms = q.split(/\s+/);
		const results: DocSearchResult[] = [];

		for (const entry of BUN_API_CATALOG) {
			let score = 0;
			const matchedOn: DocSearchResult['matchedOn'] = [];

			// Exact API name match (highest weight)
			if (entry.api.toLowerCase().includes(q)) {
				score += 10;
				matchedOn.push('api');
			}

			// Keyword match
			const keywords = BUN_SEARCH_KEYWORDS[entry.api];
			if (keywords) {
				for (const term of terms) {
					if (keywords.some(k => k.includes(term))) {
						score += 3;
						if (!matchedOn.includes('keyword')) matchedOn.push('keyword');
					}
				}
			}

			// Topic match
			if (entry.topic.toLowerCase().includes(q)) {
				score += 5;
				matchedOn.push('topic');
			}

			// Category match
			if (entry.category.toLowerCase().includes(q)) {
				score += 2;
				matchedOn.push('category');
			}

			if (score > 0) {
				results.push({
					api: entry.api,
					score,
					matchedOn,
					docUrl: withWellDocumentedFragment(entry.docUrl, entry.api),
				});
			}
		}

		return results.sort((a, b) => b.score - a.score);
	}

	/** Get all APIs related to the given API (1-hop graph traversal) */
	getRelated(api: string): BunApiEntry[] {
		const related = BUN_RELATED_APIS[api];
		if (!related) return [];
		return related.map(name => catalogIndex.get(name)).filter((e): e is BunApiEntry => e !== undefined);
	}

	/** Get APIs introduced in a specific version */
	getByVersion(version: string): BunApiEntry[] {
		const apis: BunApiEntry[] = [];
		for (const [api, v] of Object.entries(BUN_API_PROVENANCE)) {
			if (v === version) {
				const entry = catalogIndex.get(api);
				if (entry) apis.push(entry);
			}
		}
		return apis;
	}

	/** Render a table of enriched doc links */
	render(options?: {query?: string; version?: string}): void {
		let entries: BunApiEntry[];
		if (options?.query) {
			const results = this.search(options.query);
			entries = results
				.slice(0, 20)
				.map(r => catalogIndex.get(r.api))
				.filter((e): e is BunApiEntry => e !== undefined);
		} else if (options?.version) {
			entries = this.getByVersion(options.version);
		} else {
			entries = BUN_API_CATALOG;
		}

		const rows = entries.map(e => ({
			'API': e.api,
			'Since': BUN_API_PROVENANCE[e.api] ?? 'unknown',
			'Related': (BUN_RELATED_APIS[e.api] ?? []).slice(0, 3).join(', ') || '-',
			'Keywords': (BUN_SEARCH_KEYWORDS[e.api] ?? []).slice(0, 4).join(', ') || '-',
			'Doc URL': withWellDocumentedFragment(e.docUrl, e.api),
		}));

		// @ts-expect-error
		console.log(Bun.inspect.table(rows, ['API', 'Since', 'Related', 'Keywords', 'Doc URL'], {colors: true}));
	}
}

// ═══════════════════════════════════════════════════════════════
// DocumentationScanner — scan source for undocumented API usage
// ═══════════════════════════════════════════════════════════════

// Regex patterns to detect Bun API usage in source code
const USAGE_PATTERNS: {pattern: RegExp; extract: (match: RegExpExecArray) => string}[] = [
	{pattern: /\bBun\.([\w.]+)\s*\(/g, extract: m => `Bun.${m[1]}`},
	{pattern: /\bBun\.([\w.]+)\b/g, extract: m => `Bun.${m[1]}`},
	{pattern: /\bimport\s.*from\s+["'](bun:\w+)["']/g, extract: m => m[1]},
	{pattern: /\bnew\s+HTMLRewriter\b/g, extract: () => 'HTMLRewriter'},
	{pattern: /\bnew\s+Worker\b/g, extract: () => 'Worker'},
	{pattern: /\bnew\s+WebSocket\b/g, extract: () => 'WebSocket'},
	{pattern: /\bnew\s+URLPattern\b/g, extract: () => 'URLPattern'},
	{pattern: /\bURLPattern\.(test|exec|hasRegExpGroups)\b/g, extract: m => `URLPattern.${m[1]}`},
	{pattern: /\bFormData\.from\b/g, extract: () => 'FormData.from'},
];

export class DocumentationScanner {
	/** Scan source code and return all Bun APIs found */
	scanCode(code: string): string[] {
		const found = new Set<string>();
		for (const {pattern, extract} of USAGE_PATTERNS) {
			pattern.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(code)) !== null) {
				const api = extract(match);
				// Only include if it's a known catalog entry
				if (catalogIndex.has(api)) {
					found.add(api);
				}
			}
		}
		return [...found].sort();
	}

	/** Generate a coverage report for a file */
	report(file: string, code: string): DocCoverageReport {
		const apisUsed = this.scanCode(code);
		const documented: string[] = [];
		const undocumented: string[] = [];

		for (const api of apisUsed) {
			const hasKeywords = BUN_SEARCH_KEYWORDS[api] !== undefined;
			const hasRelated = BUN_RELATED_APIS[api] !== undefined;
			if (hasKeywords && hasRelated) {
				documented.push(api);
			} else {
				undocumented.push(api);
			}
		}

		return {
			file,
			apisUsed,
			documented,
			undocumented,
			coveragePercent: apisUsed.length > 0 ? Math.round((documented.length / apisUsed.length) * 100) : 100,
		};
	}
}
