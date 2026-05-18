/**
 * Example: Using V8 Type Checking APIs in Native Addons
 *
 * This demonstrates how native Node.js/Bun addons would use V8 type checking APIs
 * and how our TypeScript implementations match that behavior.
 *
 * Note: This is a TypeScript example. For actual C++ native addons,
 * you would use node-gyp or similar to compile C++ code.
 */

/**
 * V8 Type Checking Utilities
 * TypeScript equivalents of V8 C++ API methods
 */
class V8TypeChecker {
	static isMap(value: unknown): value is Map<unknown, unknown> {
		return value instanceof Map;
	}

	static isArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	}

	static isInt32(value: unknown): value is number {
		return (
			typeof value === "number" &&
			Number.isInteger(value) &&
			value >= -2147483648 &&
			value <= 2147483647
		);
	}

	static isBigInt(value: unknown): value is bigint {
		return typeof value === "bigint";
	}
}

/**
 * Simulated native addon interface
 * In a real native addon, these would be C++ functions exposed via N-API or V8
 */
interface NativeAddon {
	processMap(map: Map<string, unknown>): string;
	processArray(arr: unknown[]): number;
	processInt32(value: number): boolean;
	processBigInt(value: bigint): string;
}

/**
 * TypeScript wrapper that mimics native addon behavior
 * using V8 type checking APIs
 */
class NativeAddonWrapper {
	/**
	 * Process a Map (using V8 IsMap() equivalent)
	 * In C++: if (value->IsMap()) { ... }
	 */
	processMap(value: unknown): string {
		if (!V8TypeChecker.isMap(value)) {
			throw new Error(`Expected Map, got ${typeof value}`);
		}

		// Safe to use as Map after type check
		const map = value as Map<string, unknown>;
		const entries: string[] = [];
		map.forEach((val, key) => {
			entries.push(`${key}: ${typeof val}`);
		});

		return `Map with ${map.size} entries: ${entries.join(", ")}`;
	}

	/**
	 * Process an Array (using V8 IsArray() equivalent)
	 * In C++: if (value->IsArray()) { ... }
	 */
	processArray(value: unknown): number {
		if (!V8TypeChecker.isArray(value)) {
			throw new Error(`Expected Array, got ${typeof value}`);
		}

		// Safe to use as Array after type check
		const arr = value as unknown[];
		return arr.length;
	}

	/**
	 * Process a 32-bit integer (using V8 IsInt32() equivalent)
	 * In C++: if (value->IsInt32()) { return value->Int32Value(); }
	 */
	processInt32(value: unknown): boolean {
		if (!V8TypeChecker.isInt32(value)) {
			return false;
		}

		// Safe to use as 32-bit integer
		const int32 = value as number;
		return int32 >= -2147483648 && int32 <= 2147483647;
	}

	/**
	 * Process a BigInt (using V8 IsBigInt() equivalent)
	 * In C++: if (value->IsBigInt()) { ... }
	 */
	processBigInt(value: unknown): string {
		if (!V8TypeChecker.isBigInt(value)) {
			throw new Error(`Expected BigInt, got ${typeof value}`);
		}

		// Safe to use as BigInt
		const bigint = value as bigint;
		return `BigInt: ${bigint.toString()}`;
	}

	/**
	 * Combined processing (like a real native addon would do)
	 */
	process(value: unknown): string {
		if (V8TypeChecker.isMap(value)) {
			return this.processMap(value);
		} else if (V8TypeChecker.isArray(value)) {
			return `Array with ${this.processArray(value)} elements`;
		} else if (V8TypeChecker.isInt32(value)) {
			return `Int32: ${value}`;
		} else if (V8TypeChecker.isBigInt(value)) {
			return this.processBigInt(value);
		} else {
			return `Unknown type: ${typeof value}`;
		}
	}
}

/**
 * Example usage (simulating native addon calls)
 */
async function demonstrateNativeAddonUsage() {
	const addon = new NativeAddonWrapper();

	console.info("🧪 V8 Type Checking API Examples\n");

	// Example 1: Process Map (IsMap)
	const buildStats = new Map<string, { time: number; size: number }>();
	buildStats.set("linux-x64", { time: 100, size: 10.5 });
	buildStats.set("darwin-arm64", { time: 150, size: 12.3 });

	console.info("1. Processing Map (IsMap):");
	console.info(`   ${addon.processMap(buildStats)}\n`);

	// Example 2: Process Array (IsArray)
	const platforms = ["linux-x64", "darwin-arm64", "windows-x64"];
	console.info("2. Processing Array (IsArray):");
	console.info(`   ${addon.processArray(platforms)} elements\n`);

	// Example 3: Process Int32 (IsInt32)
	const buildTime = 1234;
	console.info("3. Processing Int32 (IsInt32):");
	console.info(`   Valid Int32: ${addon.processInt32(buildTime)}`);
	console.info(`   Value: ${buildTime}\n`);

	// Example 4: Process BigInt (IsBigInt)
	const largeSize = 9007199254740992n; // Beyond Number.MAX_SAFE_INTEGER
	console.info("4. Processing BigInt (IsBigInt):");
	console.info(`   ${addon.processBigInt(largeSize)}\n`);

	// Example 5: Combined processing
	console.info("5. Combined Processing:");
	console.info(`   Map: ${addon.process(buildStats)}`);
	console.info(`   Array: ${addon.process(platforms)}`);
	console.info(`   Int32: ${addon.process(buildTime)}`);
	console.info(`   BigInt: ${addon.process(largeSize)}\n`);

	// Example 6: Error handling (wrong types)
	console.info("6. Error Handling:");
	try {
		addon.processMap({}); // Not a Map
	} catch (error) {
		console.info(
			`   Error (expected): ${error instanceof Error ? error.message : error}`,
		);
	}
}

/**
 * Example: Database driver parameter binding
 * (simulating native SQLite driver)
 */
class DatabaseDriver {
	/**
	 * Bind parameters - uses IsArray() and IsMap()
	 * In C++: if (params->IsArray()) { ... } else if (params->IsMap()) { ... }
	 */
	bindParameters(params: unknown): string {
		if (V8TypeChecker.isArray(params)) {
			const arr = params as unknown[];
			return `Positional parameters: ${arr.length} values`;
		} else if (V8TypeChecker.isMap(params)) {
			const map = params as Map<string, unknown>;
			return `Named parameters: ${map.size} keys`;
		} else {
			throw new Error("Parameters must be Array or Map");
		}
	}
}

/**
 * Example: High-performance number processing
 * (simulating native computation library)
 */
class HighPerformanceProcessor {
	/**
	 * Process large numbers - uses IsArray(), IsInt32(), IsBigInt()
	 * In C++: Fast path for Int32, BigInt for large numbers
	 */
	processNumbers(numbers: unknown): {
		int32Count: number;
		bigIntCount: number;
		total: number;
	} {
		if (!V8TypeChecker.isArray(numbers)) {
			throw new Error("Numbers must be an array");
		}

		const arr = numbers as unknown[];
		let int32Count = 0;
		let bigIntCount = 0;
		let total = 0;

		for (const element of arr) {
			if (V8TypeChecker.isInt32(element)) {
				// Fast path for 32-bit integers
				int32Count++;
				total += element as number;
			} else if (V8TypeChecker.isBigInt(element)) {
				// Handle large integers
				bigIntCount++;
				total += Number(element as bigint);
			}
		}

		return { int32Count, bigIntCount, total };
	}
}

// Run examples if executed directly
if (import.meta.main) {
	demonstrateNativeAddonUsage().catch(console.error);

	// Database driver example
	const db = new DatabaseDriver();
	console.info("\n📊 Database Driver Example:");
	console.info(`   ${db.bindParameters(["value1", "value2"])}`);
	const namedParams = new Map([
		["name", "John"],
		["age", 30],
	]);
	console.info(`   ${db.bindParameters(namedParams)}\n`);

	// High-performance processor example
	const processor = new HighPerformanceProcessor();
	const numbers = [42, 100, 9007199254740992n, 200, 9007199254740993n];
	const result = processor.processNumbers(numbers);
	console.info("⚡ High-Performance Processor Example:");
	console.info(`   Int32 count: ${result.int32Count}`);
	console.info(`   BigInt count: ${result.bigIntCount}`);
	console.info(`   Total: ${result.total}\n`);
}

export { NativeAddonWrapper, DatabaseDriver, HighPerformanceProcessor };
