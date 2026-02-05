/**
 * @fileoverview Stress Test Benchmark Template
 * @description Template for creating large-scale performance benchmarks
 * @module benchmarks/stress-test-template
 */

/**
 * Stress test configuration for large graph construction
 */
export interface StressTestConfig {
	name: string;
	description: string;
	iterations: number;
	setup: () => Promise<any>;
	run: (data: any) => Promise<any>;
	teardown?: (result: any) => Promise<void>;
	thresholds: {
		duration: number; // Maximum duration in ms
		memory: number; // Maximum memory in MB
		cpu?: number; // Maximum CPU percentage (optional)
	};
}

/**
 * Example: 1M node stress test
 */
export const stressTest1MNodes: StressTestConfig = {
	name: "stress-test-1M-nodes",
	description: "Graph construction with 1,000,000 nodes",
	iterations: 10,
	setup: async () => {
		// Generate mock data for stress test
		return generateMockData({
			sports: 50,
			eventsPerSport: 1000,
			marketsPerEvent: 20,
			selectionsPerMarket: 10,
		});
	},
	run: async (data) => {
		// Import dynamically to avoid circular dependencies
		const { FullMultiLayerGraphAssembler } = await import(
			"../../src/graph/assembler"
		);
		const assembler = new FullMultiLayerGraphAssembler();
		return await assembler.assembleFromDataSource(data);
	},
	teardown: async (graph) => {
		if (graph && typeof graph.dispose === "function") {
			await graph.dispose();
		}
	},
	thresholds: {
		duration: 5000, // Must complete in <5s
		memory: 2048, // Must use <2GB
		cpu: 80, // Must use <80% CPU
	},
};

/**
 * Generate mock data for stress testing
 */
async function generateMockData(config: {
	sports: number;
	eventsPerSport: number;
	marketsPerEvent: number;
	selectionsPerMarket: number;
}): Promise<any> {
	const data = {
		sports: [],
		events: [],
		markets: [],
		selections: [],
	};

	for (let sportId = 0; sportId < config.sports; sportId++) {
		const sport = {
			id: `sport-${sportId}`,
			name: `Sport ${sportId}`,
			events: [],
		};

		for (let eventId = 0; eventId < config.eventsPerSport; eventId++) {
			const event = {
				id: `event-${sportId}-${eventId}`,
				sportId: sport.id,
				name: `Event ${eventId}`,
				markets: [],
			};

			for (let marketId = 0; marketId < config.marketsPerEvent; marketId++) {
				const market = {
					id: `market-${sportId}-${eventId}-${marketId}`,
					eventId: event.id,
					name: `Market ${marketId}`,
					selections: [],
				};

				for (
					let selectionId = 0;
					selectionId < config.selectionsPerMarket;
					selectionId++
				) {
					market.selections.push({
						id: `selection-${sportId}-${eventId}-${marketId}-${selectionId}`,
						marketId: market.id,
						name: `Selection ${selectionId}`,
						price: 1.5 + Math.random() * 10,
					});
				}

				event.markets.push(market);
				data.markets.push(market);
				data.selections.push(...market.selections);
			}

			sport.events.push(event);
			data.events.push(event);
		}

		data.sports.push(sport);
	}

	return data;
}

/**
 * Run stress test with profiling
 */
export async function runStressTest(
	config: StressTestConfig,
	options: {
		profile?: boolean;
		profileType?: "cpu" | "heap" | "both";
	} = {},
): Promise<{
	success: boolean;
	duration: number;
	memory: number;
	iterations: number;
	results: any[];
}> {
	const { profile = false, profileType = "cpu" } = options;
	const results: any[] = [];
	const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

	const data = await config.setup();

	for (let i = 0; i < config.iterations; i++) {
		const startTime = Bun.nanoseconds();

		if (profile && i === 0) {
			// Profile first iteration
			if (profileType === "cpu" || profileType === "both") {
				// CPU profiling would be enabled via --cpu-prof flag
				console.log(`📊 CPU profiling enabled for iteration ${i + 1}`);
			}
			if (profileType === "heap" || profileType === "both") {
				// Heap profiling would be enabled via --heap-prof flag
				console.log(`📊 Heap profiling enabled for iteration ${i + 1}`);
			}
		}

		const result = await config.run(data);
		results.push(result);

		const duration = (Bun.nanoseconds() - startTime) / 1_000_000; // ms

		if (duration > config.thresholds.duration) {
			throw new Error(
				`Stress test failed: duration ${duration.toFixed(2)}ms exceeds threshold ${config.thresholds.duration}ms`,
			);
		}
	}

	const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
	const peakMemory = endMemory - startMemory;

	if (peakMemory > config.thresholds.memory) {
		throw new Error(
			`Stress test failed: memory ${peakMemory.toFixed(2)}MB exceeds threshold ${config.thresholds.memory}MB`,
		);
	}

	if (config.teardown) {
		await config.teardown(results[results.length - 1]);
	}

	return {
		success: true,
		duration: (Bun.nanoseconds() - startTime) / 1_000_000,
		memory: peakMemory,
		iterations: config.iterations,
		results,
	};
}
