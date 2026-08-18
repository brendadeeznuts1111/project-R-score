// stream-converters.ts
// Bun ReadableStream Converter Catalog & Utilities

// ═══════════════════════════════════════════════════════════════
// CONVERTER CATALOG
// ═══════════════════════════════════════════════════════════════

interface StreamConverter {
	function: string;
	input: 'ReadableStream<Uint8Array>';
	output: string;
	sites: number;
	useCase: string;
}

const BUN_CONVERTERS: readonly StreamConverter[] = [
	{
		function: 'Bun.readableStreamToArrayBuffer',
		input: 'ReadableStream<Uint8Array>',
		output: 'ArrayBuffer',
		sites: 0,
		useCase: 'Binary data for low-level processing',
	},
	{
		function: 'stream.bytes()',
		input: 'ReadableStream<Uint8Array>',
		output: 'Uint8Array',
		sites: 0,
		useCase: 'Typed array for byte manipulation',
	},
	{
		function: 'stream.blob()',
		input: 'ReadableStream<Uint8Array>',
		output: 'Blob',
		sites: 0,
		useCase: 'Browser/File API compatibility',
	},
	{
		function: 'stream.json()',
		input: 'ReadableStream<Uint8Array>',
		output: 'object',
		sites: 0,
		useCase: 'Parse JSON from stream',
	},
	{
		function: 'stream.text()',
		input: 'ReadableStream<Uint8Array>',
		output: 'string',
		sites: 0,
		useCase: 'Text output, logs, configuration',
	},
	{
		function: 'Bun.readableStreamToArray',
		input: 'ReadableStream<Uint8Array>',
		output: 'unknown[]',
		sites: 0,
		useCase: 'Chunk-based processing',
	},
	{
		function: 'Bun.readableStreamToFormData',
		input: 'ReadableStream<Uint8Array>',
		output: 'FormData',
		sites: 0,
		useCase: 'URL-encoded or multipart form data',
	},
] as const;

// ═══════════════════════════════════════════════════════════════
// SPAWN → STREAM → CONVERTER PIPELINE
// ═══════════════════════════════════════════════════════════════

type SpawnStreamProp = 'stdout' | 'stderr';

interface SpawnConverterRoute {
	spawnOption: `${SpawnStreamProp}: "pipe"`;
	streamProp: SpawnStreamProp;
	converter: string;
	output: string;
}

const BUN_SPAWN_CONVERTER_MATRIX: readonly SpawnConverterRoute[] = [
	{spawnOption: 'stdout: "pipe"', streamProp: 'stdout', converter: 'stream.text()', output: 'string'},
	{
		spawnOption: 'stdout: "pipe"',
		streamProp: 'stdout',
		converter: 'readableStreamToArrayBuffer',
		output: 'ArrayBuffer',
	},
	{spawnOption: 'stdout: "pipe"', streamProp: 'stdout', converter: 'stream.bytes()', output: 'Uint8Array'},
	{spawnOption: 'stdout: "pipe"', streamProp: 'stdout', converter: 'stream.json()', output: 'object'},
	{spawnOption: 'stderr: "pipe"', streamProp: 'stderr', converter: 'stream.text()', output: 'string'},
	{spawnOption: 'stderr: "pipe"', streamProp: 'stderr', converter: 'stream.text()', output: 'string'},
];

// ═══════════════════════════════════════════════════════════════
// STREAM SOURCE TYPES
// ═══════════════════════════════════════════════════════════════

// All valid stream sources for converters:
// - fetch().body              → Response body
// - Bun.spawn().stdout/stderr → Subprocess pipe
// - Bun.stdin.stream()        → Stdin stream
// - new Response().body       → Response body
// - new Request().body        → Request body
// - Blob.stream()             → Blob stream
// - Bun.file().stream()       → File stream
// - new ReadableStream(...)   → Custom stream

// ═══════════════════════════════════════════════════════════════
// FORMDATA ENCODING MODES
// ═══════════════════════════════════════════════════════════════

type FormDataEncoding =
	| {type: 'urlencoded'; args: [stream: ReadableStream<Uint8Array>]}
	| {type: 'multipart'; args: [stream: ReadableStream<Uint8Array>, boundary: string]};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function converterByOutput(output: string): StreamConverter | undefined {
	return BUN_CONVERTERS.find(c => c.output === output);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
	BUN_CONVERTERS,
	BUN_SPAWN_CONVERTER_MATRIX,
	converterByOutput,
	type StreamConverter,
	type SpawnConverterRoute,
	type FormDataEncoding,
};
