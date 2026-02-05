// runtime-optimizations.ts — JSC/Bun runtime-level patterns for scanner
// Lazy stats, batched syscalls, monomorphic shapes, TypedArray risk, GC/JIT hints.
//
// Note: Parallel subtree forking uses Bun.spawn + ipc (see scan.ts). SharedArrayBuffer
// + Atomics is for in-process Workers; spawn uses processes, so IPC is used.

import {readdir} from 'node:fs/promises';

// ── 1. Lazy stat: Bun.file() + exists() + size (no eager stat()) ─────────────────
export function lazyFile(path: string): Bun.File {
	return Bun.file(path);
}

export async function existsLazy(path: string): Promise<boolean> {
	return Bun.file(path).exists();
}

export const BUN_MAX_SAFE_SIZE = Number.MAX_SAFE_INTEGER;

// ── 2. Batched existence checks ───────────────────────────────────────────────
export async function batchedExists(paths: string[]): Promise<boolean[]> {
	const checks = paths.map(async p => Bun.file(p).exists());
	return Promise.all(checks);
}

// ── 3. Monomorphic node shape ───────────────────────────────────────────────────
export interface RuntimeNode {
	path: string;
	name: string;
	type: 'file' | 'dir';
	size: number;
	modified: number;
	riskScore: number;
	depth: number;
	children: RuntimeNode[] | null;
	parent: null;
}

export function createRuntimeNode(
	path: string,
	name: string,
	type: 'file' | 'dir',
	size: number,
	modified: number,
	depth: number,
	riskScore: number = 1.0,
): RuntimeNode {
	return {
		path,
		name,
		type,
		size,
		modified,
		riskScore,
		depth,
		children: null,
		parent: null,
	};
}

// ── 4. TypedArray risk accumulation ────────────────────────────────────────────
const DEFAULT_RISK_CAPACITY = 1024;

export class RiskAccumulator {
	private buffer: Float64Array;
	private idx = 0;

	constructor(capacity: number = DEFAULT_RISK_CAPACITY) {
		this.buffer = new Float64Array(capacity);
	}

	accumulate(risk: number): void {
		if (this.idx >= this.buffer.length) {
			const next = new Float64Array(this.buffer.length * 2);
			next.set(this.buffer);
			this.buffer = next;
		}
		this.buffer[this.idx++] = risk;
	}

	total(): number {
		let sum = 0;
		for (let i = 0; i < this.idx; i++) sum += this.buffer[i]!;
		return sum;
	}

	reset(): void {
		this.idx = 0;
	}
}

// ── 5. Generator-based backpressure ────────────────────────────────────────────
export interface RuntimeScanOptions {
	yieldEveryLevels?: number;
}

export async function* scanRuntimeGenerator(
	path: string,
	depth: number = 0,
	opts: RuntimeScanOptions = {},
): AsyncGenerator<RuntimeNode> {
	const name = path.split('/').pop() ?? path;
	try {
		const entries = await readdir(path, {withFileTypes: true});
		const node = createRuntimeNode(path, name, 'dir', 0, 0, depth, 1.0);
		yield node;
		if (opts.yieldEveryLevels && depth > 0 && depth % opts.yieldEveryLevels === 0) await Bun.sleep(0);
		for (const e of entries) {
			if (e.name.startsWith('.')) continue;
			yield* scanRuntimeGenerator(`${path}/${e.name}`, depth + 1, opts);
		}
	} catch (err) {
		const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
		if (code === 'ENOENT') return;
		if (code === 'ENOTDIR') {
			const size = Bun.file(path).size ?? 0;
			const node = createRuntimeNode(path, name, 'file', size, 0, depth, 1.0);
			yield node;
		}
	}
}

// ── 6. CRC32 ───────────────────────────────────────────────────────────────────
export function checksumCrc32(buffer: Uint8Array, seed?: number): number {
	return Bun.hash.crc32(buffer, seed);
}

// ── 7. Zstd streaming ──────────────────────────────────────────────────────────
export function createZstdCompressionStream(): CompressionStream<Uint8Array, Uint8Array> {
	return new CompressionStream('zstd');
}

// ── 8. GC hint ─────────────────────────────────────────────────────────────────
export function gcHint(): void {
	if (typeof (globalThis as any).Bun !== 'undefined' && typeof (globalThis as any).Bun.gc === 'function') {
		(globalThis as any).Bun.gc(true);
	}
}

// ── 9. JIT warmup ─────────────────────────────────────────────────────────────
export async function warmupScanner(warmupPath: string = '/tmp'): Promise<void> {
	let count = 0;
	for await (const _ of scanRuntimeGenerator(warmupPath, 0, {yieldEveryLevels: 2})) {
		count++;
		if (count >= 50) break;
	}
}
