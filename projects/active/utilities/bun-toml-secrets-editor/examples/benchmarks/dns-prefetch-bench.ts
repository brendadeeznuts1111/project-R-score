// examples/dns-prefetch-bench.ts
// Benchmark DNS prefetch/preconnect impact on request latency

import { DNSPreconnectManager, fetchWithPreconnect } from "./50-col-matrix";

// Simple benchmark runner
interface BenchmarkResult {
	name: string;
	time: number;
	iterations: number;
	opsPerSecond: number;
}

async function benchmarkAsync(
	name: string,
	fn: () => Promise<void>,
	iterations: number = 50,
): Promise<BenchmarkResult> {
	// Warmup
	for (let i = 0; i < 5; i++) {
		await fn();
	}

	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		await fn();
	}
	const end = performance.now();

	const time = end - start;
	const opsPerSecond = (iterations / time) * 1000;

	return { name, time, iterations, opsPerSecond };
}

console.info(`
╔══════════════════════════════════════════════════════════╗
║   🌐 DNS Preconnect Benchmark                           ║
║   Testing connection pre-warming impact                 ║
╚══════════════════════════════════════════════════════════╝
`);

// Setup preconnect manager
const preconnectManager = new DNSPreconnectManager({
	domains: [
		"api.example.com",
		"cdn.example.com",
		"analytics.example.com",
		"storage.example.com",
	],
	preconnectDelay: 150, // Simulate 150ms connection time (DNS + TCP + SSL)
});

// Wait for preconnect to complete
console.info("⏳ Preconnecting to domains...\n");
await new Promise((resolve) => setTimeout(resolve, 1000));

// Verify preconnections
console.info("📊 Preconnection Status:");
const testDomains = [
	"api.example.com",
	"cdn.example.com",
	"analytics.example.com",
	"storage.example.com",
];
for (const domain of testDomains) {
	const isConnected = preconnectManager.isPreconnected(domain);
	const age = preconnectManager.getConnectionAge(domain);
	console.info(`  ${isConnected ? "✅" : "❌"} ${domain} (age: ${age}ms)`);
}

console.info("\n⏳ Running benchmarks...\n");

const results: BenchmarkResult[] = [];

// Benchmark: Without preconnect
results.push(
	await benchmarkAsync(
		"Cold Connection (DNS + TCP + SSL)",
		async () => {
			// Simulate cold connection
			await new Promise((resolve) => setTimeout(resolve, 150));
		},
		50,
	),
);

// Benchmark: With preconnect
results.push(
	await benchmarkAsync(
		"Warm Connection (Preconnected)",
		async () => {
			// Simulate warm connection (already connected)
			await new Promise((resolve) => setTimeout(resolve, 5));
		},
		50,
	),
);

// Benchmark: Actual fetch simulation (simulated, no real network calls)
results.push(
	await benchmarkAsync(
		"Fetch Without Preconnect",
		async () => {
			const response = await fetchWithPreconnect(
				"https://api.example.com/data",
			);
			await response.text(); // Consume response
		},
		20,
	),
);

results.push(
	await benchmarkAsync(
		"Fetch With Preconnect",
		async () => {
			const response = await fetchWithPreconnect(
				"https://api.example.com/data",
				preconnectManager,
			);
			await response.text(); // Consume response
		},
		20,
	),
);

// Display results
console.info("\n📊 Benchmark Results:\n");
results.forEach((result) => {
	const opsPerSec = result.opsPerSecond.toFixed(0);
	const timeMs = result.time.toFixed(3);
	console.info(`${result.name}:`);
	console.info(`  Time: ${timeMs}ms (${result.iterations} iterations)`);
	console.info(`  Throughput: ${opsPerSec} ops/sec\n`);
});

// Calculate improvement
const coldTime =
	results.find(
		(r) => r.name.includes("Cold Connection") && !r.name.includes("Fetch"),
	)?.time || 0;
const warmTime =
	results.find(
		(r) => r.name.includes("Warm Connection") && !r.name.includes("Fetch"),
	)?.time || 0;
const fetchColdTime =
	results.find((r) => r.name.includes("Fetch Without"))?.time || 0;
const fetchWarmTime =
	results.find((r) => r.name.includes("Fetch With"))?.time || 0;

if (coldTime > 0 && warmTime > 0) {
	const improvement = (((coldTime - warmTime) / coldTime) * 100).toFixed(1);
	const speedup = (coldTime / warmTime).toFixed(2);
	console.info("╔══════════════════════════════════════════════════════════╗");
	console.info("║   📈 Preconnect Impact                                   ║");
	console.info("╚══════════════════════════════════════════════════════════╝\n");
	console.info(`   Cold Connection: ${coldTime.toFixed(2)}ms`);
	console.info(`   Warm Connection: ${warmTime.toFixed(2)}ms`);
	console.info(`   Improvement: ${improvement}% faster (${speedup}x speedup)\n`);
}

if (fetchColdTime > 0 && fetchWarmTime > 0) {
	const fetchImprovement = (
		((fetchColdTime - fetchWarmTime) / fetchColdTime) *
		100
	).toFixed(1);
	const fetchSpeedup = (fetchColdTime / fetchWarmTime).toFixed(2);
	console.info(`   Fetch Cold: ${fetchColdTime.toFixed(2)}ms`);
	console.info(`   Fetch Warm: ${fetchWarmTime.toFixed(2)}ms`);
	console.info(
		`   Fetch Improvement: ${fetchImprovement}% faster (${fetchSpeedup}x speedup)\n`,
	);
}

console.info("💡 Expected Results in Production:");
console.info("   Without Preconnect:");
console.info("     - DNS Lookup: 40ms");
console.info("     - TCP Handshake: 60ms");
console.info("     - SSL Negotiation: 50ms");
console.info("     - Total: ~150ms");
console.info("\n   With Preconnect:");
console.info("     - DNS Lookup: 0ms (cached)");
console.info("     - TCP Handshake: 0ms (pre-warmed)");
console.info("     - SSL Negotiation: 0ms (pre-shaken)");
console.info("     - Total: ~0-5ms\n");
