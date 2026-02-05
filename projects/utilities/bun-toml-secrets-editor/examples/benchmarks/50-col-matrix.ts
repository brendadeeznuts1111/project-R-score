// examples/50-col-matrix.ts
// Performance-optimized matrix data generation with hoisting and response buffering

// ============================================================================
// VERSION A: Standard (Non-optimized) Implementation
// ============================================================================

export function generateStandardMatrix(rowCount: number = 1000): string {
	const data = Array.from({ length: rowCount }).map((_, i) => ({
		id: i,
		pid: process.pid, // System call in loop
		random: Math.random(), // Function call in loop
		uptime: process.uptime(), // System call in loop
		timestamp: Date.now(), // System call in loop
		status: "active",
		col1: `value_${i}`,
		col2: `data_${i}`,
		col3: i * 2,
		col4: i % 10,
		col5: `item_${i % 100}`,
		// ... 45 more columns (simplified for brevity)
		col50: `final_${i}`,
	}));
	return JSON.stringify(data);
}

// ============================================================================
// VERSION B: Optimized (Hoisted & Pre-formatted) Implementation
// ============================================================================

// Hoisted constants (computed once, reused)
const STATIC_PID = process.pid;
const STATIC_STATUS = "active";
const STATIC_TIMESTAMP = Date.now();
const STATIC_UPTIME = process.uptime();

// Aliased functions (avoid property lookups)
const _random = Math.random;
const _now = Date.now;

// Pre-allocated arrays for common values
const _STATUS_VALUES = ["active", "pending", "completed"];
const _COL_PREFIXES = Array.from({ length: 50 }, (_, i) => `col${i + 1}_`);

export function generateOptimizedMatrix(rowCount: number = 1000): string {
	// Pre-allocate array with known size
	const data = new Array(rowCount);

	for (let i = 0; i < rowCount; i++) {
		const r = _random(); // Aliased function call
		const mod10 = i % 10;
		const mod100 = i % 100;

		data[i] = {
			id: i,
			pid: STATIC_PID, // Hoisted constant
			random: r, // Aliased function
			uptime: STATIC_UPTIME, // Hoisted constant
			timestamp: STATIC_TIMESTAMP, // Hoisted constant
			status: STATIC_STATUS, // Hoisted constant
			col1: `value_${i}`,
			col2: `data_${i}`,
			col3: i * 2,
			col4: mod10, // Pre-computed modulo
			col5: `item_${mod100}`, // Pre-computed modulo
			// ... 45 more columns
			col50: `final_${i}`,
		};
	}

	return JSON.stringify(data);
}

// ============================================================================
// VERSION C: Ultra-Optimized (Response Buffer) Implementation
// ============================================================================

export function generateBufferedMatrix(rowCount: number = 1000): Uint8Array {
	// Pre-compute all static values
	const STATIC_PID_STR = String(STATIC_PID);
	const STATIC_UPTIME_STR = String(STATIC_UPTIME);
	const STATIC_TIMESTAMP_STR = String(STATIC_TIMESTAMP);

	// Estimate buffer size (rough approximation)
	const avgRowSize = 500; // bytes per row (estimate)
	const buffer = new Uint8Array(rowCount * avgRowSize);
	const encoder = new TextEncoder();
	let offset = 0;

	// Write opening bracket
	const openBracket = encoder.encode("[");
	buffer.set(openBracket, offset);
	offset += openBracket.length;

	for (let i = 0; i < rowCount; i++) {
		if (i > 0) {
			const comma = encoder.encode(",");
			buffer.set(comma, offset);
			offset += comma.length;
		}

		// Build row JSON string
		const rowJson = `{"id":${i},"pid":${STATIC_PID_STR},"random":${_random()},"uptime":${STATIC_UPTIME_STR},"timestamp":${STATIC_TIMESTAMP_STR},"status":"${STATIC_STATUS}","col1":"value_${i}","col2":"data_${i}","col3":${i * 2},"col4":${i % 10},"col5":"item_${i % 100}","col50":"final_${i}"}`;
		const rowBytes = encoder.encode(rowJson);

		// Check if we need to resize buffer
		if (offset + rowBytes.length > buffer.length) {
			// In production, use a growable buffer or pre-calculate exact size
			break;
		}

		buffer.set(rowBytes, offset);
		offset += rowBytes.length;
	}

	// Write closing bracket
	const closeBracket = encoder.encode("]");
	buffer.set(closeBracket, offset);
	offset += closeBracket.length;

	// Return only the used portion
	return buffer.subarray(0, offset);
}

// ============================================================================
// HTTP Server Handlers (for benchmarking)
// ============================================================================

export function handleStandardRequest(): Response {
	const data = generateStandardMatrix(1000);
	return new Response(data, {
		headers: {
			"Content-Type": "application/json",
			"Content-Length": String(data.length),
		},
	});
}

export function handleOptimizedRequest(): Response {
	const data = generateOptimizedMatrix(1000);
	return new Response(data, {
		headers: {
			"Content-Type": "application/json",
			"Content-Length": String(data.length),
		},
	});
}

export function handleBufferedRequest(): Response {
	const buffer = generateBufferedMatrix(1000);
	return new Response(buffer, {
		headers: {
			"Content-Type": "application/json",
			"Content-Length": String(buffer.length),
		},
	});
}

// ============================================================================
// DNS Preconnect Simulation
// ============================================================================

export interface PreconnectConfig {
	domains: string[];
	preconnectDelay: number;
}

export class DNSPreconnectManager {
	private connections: Map<string, Date> = new Map();

	constructor(private config: PreconnectConfig) {
		this.preconnectDomains();
	}

	private async preconnectDomains(): Promise<void> {
		for (const domain of this.config.domains) {
			// Simulate DNS lookup and connection pre-warming
			try {
				// In production, this would use fetch with preconnect hints
				// or actual TCP connection establishment
				const start = performance.now();

				// Simulate DNS lookup + TCP handshake
				await this.simulateConnection(domain);

				const duration = performance.now() - start;
				this.connections.set(domain, new Date());

				console.log(`✅ Preconnected to ${domain} in ${duration.toFixed(2)}ms`);
			} catch (error) {
				console.warn(`⚠️  Failed to preconnect to ${domain}:`, error);
			}
		}
	}

	async simulateConnection(_domain: string): Promise<void> {
		// Simulate DNS lookup (40ms) + TCP handshake (60ms) + SSL (50ms)
		// With preconnect, this should be ~0ms (already connected)
		return new Promise((resolve) => {
			setTimeout(resolve, this.config.preconnectDelay);
		});
	}

	isPreconnected(domain: string): boolean {
		return this.connections.has(domain);
	}

	getConnectionAge(domain: string): number {
		const connectedAt = this.connections.get(domain);
		if (!connectedAt) return Infinity;
		return Date.now() - connectedAt.getTime();
	}
}

// Simulate API call with/without preconnect
export async function fetchWithPreconnect(
	url: string,
	preconnectManager?: DNSPreconnectManager,
): Promise<Response> {
	const domain = new URL(url).hostname;

	if (preconnectManager && !preconnectManager.isPreconnected(domain)) {
		// Without preconnect: DNS + TCP + SSL = ~150ms
		await preconnectManager.simulateConnection(domain);
	}
	// With preconnect: Already connected = ~0ms

	// Simulate fetch without making actual network request
	// In production, this would be a real fetch() call
	return new Promise((resolve) => {
		setTimeout(
			() => {
				resolve(
					new Response(JSON.stringify({ data: "simulated" }), {
						headers: { "Content-Type": "application/json" },
					}),
				);
			},
			preconnectManager?.isPreconnected(domain) ? 5 : 150,
		);
	});
}
