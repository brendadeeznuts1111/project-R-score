// Demonstration of --console-depth flag functionality
const nested = {
	level1: {
		level2: {
			level3: {
				level4: {
					level5: "Deep nested value",
					array: [1, 2, { deep: "array object" }],
				},
				sibling: "Level 3 sibling",
			},
			anotherSibling: "Level 2 sibling",
		},
		topSibling: "Level 1 sibling",
	},
	rootValue: "Root level value",
};

console.info("=== Console Depth Demonstration ===");
console.info("\n📊 Default depth (2):");
console.info(nested);

console.info("\n📊 Depth 1 (shallow):");
console.info(JSON.stringify(nested, null, 2));

console.info("\n📊 Depth 3 (medium):");
console.info(JSON.stringify(nested, null, 2));

console.info("\n📊 Depth 5 (deep):");
console.info(JSON.stringify(nested, null, 2));

// Table demonstration
const features = [
	{
		name: "root_detected",
		config: {
			weight: 0.28,
			threshold: 1,
			metadata: {
				source: "device_api",
				reliability: 0.98,
				details: {
					collection_method: "system_call",
					validation: "strict",
				},
			},
		},
	},
	{
		name: "vpn_active",
		config: {
			weight: 0.22,
			threshold: 1,
			metadata: {
				source: "network_analysis",
				reliability: 0.95,
				details: {
					collection_method: "packet_inspection",
					validation: "moderate",
				},
			},
		},
	},
];

console.info("\n📋 Feature Configuration Table:");
console.table(
	features.map((f) => ({
		Feature: f.name,
		Weight: f.config.weight,
		Threshold: f.config.threshold,
		Source: f.config.metadata.source,
		Reliability: f.config.metadata.reliability,
		Collection: f.config.metadata.details.collection_method,
	})),
);

console.info("\n✅ Console depth demonstration complete!");
