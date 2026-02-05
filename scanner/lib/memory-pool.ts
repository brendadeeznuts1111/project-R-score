// Tier-1380 Memory Pool Module
// Manages pooled memory allocations for performance

export interface PoolStats {
	allocated: number;
	free: number;
	total: number;
	utilization: string;
}

class MemoryPool {
	private readonly allocations: Map<string, ArrayBuffer> = new Map();
	private readonly maxSize: number;

	constructor(maxSizeBytes: number = 128 * 1024 * 1024) {
		this.maxSize = maxSizeBytes;
	}

	allocate(id: string, size: number): ArrayBuffer {
		const buffer = new ArrayBuffer(size);
		this.allocations.set(id, buffer);
		return buffer;
	}

	free(id: string): boolean {
		return this.allocations.delete(id);
	}

	clear(): void {
		this.allocations.clear();
	}

	get stats(): PoolStats {
		const allocated = Array.from(this.allocations.values()).reduce((sum, buf) => sum + buf.byteLength, 0);
		const total = this.maxSize;
		const free = total - allocated;
		const utilization = ((allocated / total) * 100).toFixed(2) + '%';

		return {
			allocated,
			free,
			total,
			utilization,
		};
	}
}

export const globalPool = new MemoryPool();
