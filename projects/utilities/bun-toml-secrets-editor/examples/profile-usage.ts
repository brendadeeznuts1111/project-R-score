// examples/profile-usage.ts
// @profile decorator usage examples

import {
	profile,
	startProfiling,
	stopProfiling,
	withProfile,
} from "../src/utils/bun137-features";

// Example 1: Using @profile decorator on class methods
class APIService {
	@profile
	async fetchUser(
		id: number,
	): Promise<{ id: number; name: string; email: string }> {
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 150));
		return { id, name: `User ${id}`, email: `user${id}@example.com` };
	}

	@profile
	async saveUser(user: any): Promise<any> {
		// Simulate database save
		await new Promise((resolve) => setTimeout(resolve, 80));
		return { ...user, saved: true, timestamp: Date.now() };
	}

	@profile
	async processUsers(users: any[]): Promise<any[]> {
		// Simulate data processing
		await new Promise((resolve) => setTimeout(resolve, 200));
		return users.map((user) => ({ ...user, processed: true }));
	}
}

// Example 2: Using profile wrapper for standalone functions
const expensiveComputation = withProfile(async (data: number[]) => {
	// Simulate expensive computation
	await new Promise((resolve) => setTimeout(resolve, 300));
	return data.reduce((sum, num) => sum + num, 0);
}, "sum-computation");

const dataTransformation = withProfile(async (text: string) => {
	// Simulate text processing
	await new Promise((resolve) => setTimeout(resolve, 120));
	return text.toUpperCase().split("").reverse().join("");
}, "text-transform");

// Example 3: Manual profiling for custom scenarios
async function complexOperation() {
	const sessionId = startProfiling("complex-operation");

	try {
		// Step 1
		await new Promise((resolve) => setTimeout(resolve, 100));
		console.log("   Step 1 complete");

		// Step 2
		await new Promise((resolve) => setTimeout(resolve, 150));
		console.log("   Step 2 complete");

		// Step 3
		await new Promise((resolve) => setTimeout(resolve, 80));
		console.log("   Step 3 complete");

		return "Operation completed successfully";
	} finally {
		stopProfiling(sessionId);
	}
}

// Usage examples
async function demonstrateProfiling() {
	console.log("🎯 @profile Integration Examples\n");

	const api = new APIService();

	// Using decorator methods
	console.log("1. @profile decorator methods:");
	const user = await api.fetchUser(1);
	const saved = await api.saveUser(user);
	const processed = await api.processUsers([user, saved]);

	// Using wrapper functions
	console.log("\n2. Profile wrapper functions:");
	const sum = await expensiveComputation([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	console.log(`   Sum result: ${sum}`);

	const transformed = await dataTransformation("Hello World");
	console.log(`   Transformed: ${transformed}`);

	// Using manual profiling
	console.log("\n3. Manual profiling:");
	const result = await complexOperation();
	console.log(`   Result: ${result}`);

	console.log("\n✅ All profiling examples completed!");
}

// Export for use in other files
export {
	APIService,
	expensiveComputation,
	dataTransformation,
	complexOperation,
	demonstrateProfiling,
};

// Run if executed directly
if (import.meta.main) {
	demonstrateProfiling();
}
