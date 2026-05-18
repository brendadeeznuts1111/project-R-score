// Demonstration of --smol flag functionality
// Shows memory optimization and garbage collection behavior

// Create memory-intensive objects to demonstrate --smol effect
const memoryIntensiveData = {
	// Large arrays to consume memory
	largeDataset: new Array(10000).fill(0).map((_, i) => ({
		id: i,
		data: `item_${i}`,
		metadata: {
			timestamp: Date.now(),
			random: Math.random(),
			nested: {
				level1: { level2: { level3: `deep_value_${i}` } },
			},
		},
	})),

	// Complex nested objects
	fraudDetectionModels: {
		ensemble: {
			models: new Array(1000).fill(0).map((_, i) => ({
				id: `model_${i}`,
				type: ["gradient_boosting", "random_forest", "neural_network"][i % 3],
				accuracy: 0.8 + Math.random() * 0.2,
				features: new Array(50).fill(0).map((_, j) => ({
					name: `feature_${j}`,
					weight: Math.random(),
					importance: Math.random(),
				})),
			})),
		},
	},

	// Network performance data
	networkMetrics: {
		connections: new Array(5000).fill(0).map((_, i) => ({
			host: `host_${i % 100}.example.com`,
			port: 443,
			latency: Math.random() * 100,
			status: ["connected", "pending", "failed"][Math.floor(Math.random() * 3)],
			timestamp: Date.now() - Math.random() * 86400000,
		})),
	},
};

console.info("=== --smol Flag Demonstration ===");
console.info("Memory-intensive data created with:");
console.info(
	`- Large dataset: ${memoryIntensiveData.largeDataset.length} items`,
);
console.info(
	`- ML models: ${memoryIntensiveData.fraudDetectionModels.ensemble.models.length} models`,
);
console.info(
	`- Network metrics: ${memoryIntensiveData.networkMetrics.connections.length} connections`,
);

console.info("\n📊 Memory Usage Information:");
console.info("- Process ID:", process.pid);
console.info("- Platform:", process.platform);
console.info("- Node version:", process.version);
console.info("- Memory usage (approximate):");

// Simulate some processing
console.info("\n🔄 Processing data...");
const processedData = {
	filteredModels:
		memoryIntensiveData.fraudDetectionModels.ensemble.models.filter(
			(model) => model.accuracy > 0.9,
		),
	avgLatency:
		memoryIntensiveData.networkMetrics.connections.reduce(
			(sum, conn) => sum + conn.latency,
			0,
		) / memoryIntensiveData.networkMetrics.connections.length,
	highRiskItems: memoryIntensiveData.largeDataset.filter(
		(item) => item.metadata.random > 0.95,
	),
};

console.info(
	`✅ Processed ${processedData.filteredModels.length} high-accuracy models`,
);
console.info(
	`✅ Average network latency: ${processedData.avgLatency.toFixed(2)}ms`,
);
console.info(`✅ Found ${processedData.highRiskItems.length} high-risk items`);

console.info("\n🎯 --smol Flag Benefits:");
console.info("- Reduced memory footprint");
console.info("- More frequent garbage collection");
console.info("- Better performance on memory-constrained systems");
console.info("- Ideal for CI/CD and testing environments");

console.info("\n💡 Usage Examples:");
console.info("bun --smol run index.tsx          # Memory-optimized execution");
console.info("bun --smol run build.tsx          # Memory-optimized builds");
console.info("bun --smol run test.tsx           # Memory-optimized testing");

console.info("\n✅ --smol demonstration complete!");

// Trigger garbage collection if available
if (global.gc) {
	console.info("\n🗑️ Triggering garbage collection...");
	global.gc();
	console.info("✅ Garbage collection completed");
}
