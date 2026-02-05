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

console.log("=== --smol Flag Demonstration ===");
console.log("Memory-intensive data created with:");
console.log(
	`- Large dataset: ${memoryIntensiveData.largeDataset.length} items`,
);
console.log(
	`- ML models: ${memoryIntensiveData.fraudDetectionModels.ensemble.models.length} models`,
);
console.log(
	`- Network metrics: ${memoryIntensiveData.networkMetrics.connections.length} connections`,
);

console.log("\n📊 Memory Usage Information:");
console.log("- Process ID:", process.pid);
console.log("- Platform:", process.platform);
console.log("- Node version:", process.version);
console.log("- Memory usage (approximate):");

// Simulate some processing
console.log("\n🔄 Processing data...");
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

console.log(
	`✅ Processed ${processedData.filteredModels.length} high-accuracy models`,
);
console.log(
	`✅ Average network latency: ${processedData.avgLatency.toFixed(2)}ms`,
);
console.log(`✅ Found ${processedData.highRiskItems.length} high-risk items`);

console.log("\n🎯 --smol Flag Benefits:");
console.log("- Reduced memory footprint");
console.log("- More frequent garbage collection");
console.log("- Better performance on memory-constrained systems");
console.log("- Ideal for CI/CD and testing environments");

console.log("\n💡 Usage Examples:");
console.log("bun --smol run index.tsx          # Memory-optimized execution");
console.log("bun --smol run build.tsx          # Memory-optimized builds");
console.log("bun --smol run test.tsx           # Memory-optimized testing");

console.log("\n✅ --smol demonstration complete!");

// Trigger garbage collection if available
if (global.gc) {
	console.log("\n🗑️ Triggering garbage collection...");
	global.gc();
	console.log("✅ Garbage collection completed");
}
