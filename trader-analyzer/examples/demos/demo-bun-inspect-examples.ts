#!/usr/bin/env bun
/**
 * @fileoverview Bun.inspect() Examples Demo
 * @description Comprehensive demonstration of Bun.inspect() usage for various data types and scenarios
 * @module examples/demos/demo-bun-inspect-examples
 * @version 2.0.0
 * @see {@link https://docs.bun.sh/runtime/bun-inspect Bun.inspect Documentation}
 */

// ============================================================================
// Example 1: Basic Typed Arrays
// ============================================================================
console.log("=".repeat(60));
console.log("Example 1: Inspecting Typed Arrays");
console.log("=".repeat(60));

const uint8Array = new Uint8Array([1, 2, 3, 255]);
const uint16Array = new Uint16Array([1000, 2000, 3000]);
const int32Array = new Int32Array([-100, 0, 100]);
const float64Array = new Float64Array([3.14159, 2.71828]);

console.log("Uint8Array:", Bun.inspect(uint8Array));
console.log("Uint16Array:", Bun.inspect(uint16Array));
console.log("Int32Array:", Bun.inspect(int32Array));
console.log("Float64Array:", Bun.inspect(float64Array));
console.log();

// ============================================================================
// Example 2: Inspecting Complex Nested Objects
// ============================================================================
console.log("=".repeat(60));
console.log("Example 2: Inspecting Complex Nested Objects");
console.log("=".repeat(60));

interface CmmsState {
	nodeId: string;
	timestamp: number;
	tickMetrics: {
		totalTicks: number;
		avgLatency: number;
		correlations: {
			[key: string]: number;
		};
	};
	status: 'active' | 'inactive' | 'pending';
}

const complexCmms: CmmsState = {
	nodeId: 'dk-nfl-spread-47.5',
	timestamp: Date.now(),
	tickMetrics: {
		totalTicks: 1234,
		avgLatency: 45.67,
		correlations: {
			'betfair-nfl-spread-47.5': 0.89,
			'pinnacle-nfl-spread-47.5': 0.92,
			'draftkings-nfl-total-52.5': 0.76,
		},
	},
	status: 'active',
};

console.log(Bun.inspect(complexCmms, { depth: 3, colors: true }));
console.log();

// ============================================================================
// Example 3: Inspecting with Different Depth Levels
// ============================================================================
console.log("=".repeat(60));
console.log("Example 3: Different Depth Levels");
console.log("=".repeat(60));

const deepObject = {
	level1: {
		level2: {
			level3: {
				level4: {
					level5: {
						value: 'deep value',
						array: [1, 2, 3],
					},
				},
			},
		},
	},
};

console.log("Depth 1:");
console.log(Bun.inspect(deepObject, { depth: 1, colors: true }));
console.log();

console.log("Depth 3:");
console.log(Bun.inspect(deepObject, { depth: 3, colors: true }));
console.log();

console.log("Depth 5:");
console.log(Bun.inspect(deepObject, { depth: 5, colors: true }));
console.log();

console.log("Depth Infinity (default):");
console.log(Bun.inspect(deepObject, { depth: Infinity, colors: true }));
console.log();

// ============================================================================
// Example 4: Inspecting Collections (Map, Set, WeakMap, WeakSet)
// ============================================================================
console.log("=".repeat(60));
console.log("Example 4: Collections (Map, Set, WeakMap, WeakSet)");
console.log("=".repeat(60));

const map = new Map([
	['key1', 'value1'],
	['key2', { nested: 'value2' }],
	['key3', [1, 2, 3]],
	['key4', new Date()],
]);

const set = new Set([1, 2, 3, 4, 5, 'string', { obj: 'value' }]);

const weakMap = new WeakMap();
const obj1 = { id: 1 };
const obj2 = { id: 2 };
weakMap.set(obj1, 'private data 1');
weakMap.set(obj2, 'private data 2');

const weakSet = new WeakSet();
weakSet.add(obj1);
weakSet.add(obj2);

console.log("Map:");
console.log(Bun.inspect(map, { colors: true, depth: 3 }));
console.log();

console.log("Set:");
console.log(Bun.inspect(set, { colors: true, depth: 2 }));
console.log();

console.log("WeakMap (note: WeakMap/WeakSet contents are not inspectable):");
console.log(Bun.inspect(weakMap, { colors: true }));
console.log();

console.log("WeakSet:");
console.log(Bun.inspect(weakSet, { colors: true }));
console.log();

// ============================================================================
// Example 5: Inspecting with Custom Options
// ============================================================================
console.log("=".repeat(60));
console.log("Example 5: Custom Options");
console.log("=".repeat(60));

const data = {
	name: 'Test Object',
	values: Array.from({ length: 20 }, (_, i) => i),
	metadata: {
		created: new Date(),
		tags: ['test', 'demo', 'bun'],
		nested: {
			deep: {
				value: 42,
			},
		},
	},
};

console.log("With colors (default):");
console.log(Bun.inspect(data, { depth: 3, colors: true }));
console.log();

console.log("Without colors:");
console.log(Bun.inspect(data, { depth: 3, colors: false }));
console.log();

console.log("Compact mode:");
console.log(Bun.inspect(data, { depth: 3, compact: true }));
console.log();

console.log("Sorted keys:");
console.log(Bun.inspect(data, { depth: 3, sortedKeys: true, colors: true }));
console.log();

// ============================================================================
// Example 6: Classes and Instances
// ============================================================================
console.log("=".repeat(60));
console.log("Example 6: Classes and Instances");
console.log("=".repeat(60));

class TradingNode {
	constructor(
		public nodeId: string,
		public exchange: string,
		private _status: 'active' | 'inactive',
	) {}

	get status() {
		return this._status;
	}

	activate() {
		this._status = 'active';
	}

	toJSON() {
		return {
			nodeId: this.nodeId,
			exchange: this.exchange,
			status: this.status,
		};
	}
}

const node = new TradingNode('btc-usd-001', 'binance', 'active');
node.activate();

console.log("Class instance:");
console.log(Bun.inspect(node, { colors: true, depth: 2 }));
console.log();

// ============================================================================
// Example 7: Functions and Methods
// ============================================================================
console.log("=".repeat(60));
console.log("Example 7: Functions and Methods");
console.log("=".repeat(60));

function regularFunction(a: number, b: number) {
	return a + b;
}

const arrowFunction = (x: number) => x * 2;

const asyncFunction = async (data: string) => {
	return Promise.resolve(data.toUpperCase());
};

const objWithMethods = {
	syncMethod: regularFunction,
	arrowMethod: arrowFunction,
	asyncMethod: asyncFunction,
	generator: function* () {
		yield 1;
		yield 2;
		yield 3;
	},
};

console.log("Object with methods:");
console.log(Bun.inspect(objWithMethods, { colors: true }));
console.log();

// ============================================================================
// Example 8: Errors and Stack Traces
// ============================================================================
console.log("=".repeat(60));
console.log("Example 8: Errors and Stack Traces");
console.log("=".repeat(60));

try {
	throw new Error('Test error message');
} catch (error) {
	console.log("Error object:");
	console.log(Bun.inspect(error, { colors: true }));
	console.log();
}

const customError = new TypeError('Custom type error');
customError.stack = 'Custom stack trace';

console.log("Custom error:");
console.log(Bun.inspect(customError, { colors: true }));
console.log();

// ============================================================================
// Example 9: Promises and Async Values
// ============================================================================
console.log("=".repeat(60));
console.log("Example 9: Promises and Async Values");
console.log("=".repeat(60));

const pendingPromise = new Promise((resolve) => {
	setTimeout(() => resolve('resolved'), 1000);
});

const resolvedPromise = Promise.resolve({ data: 'success', code: 200 });
const rejectedPromise = Promise.reject(new Error('rejection test'));

console.log("Pending Promise:");
console.log(Bun.inspect(pendingPromise, { colors: true }));
console.log();

console.log("Resolved Promise:");
console.log(Bun.inspect(resolvedPromise, { colors: true }));
console.log();

console.log("Rejected Promise:");
console.log(Bun.inspect(rejectedPromise, { colors: true }));
console.log();

// ============================================================================
// Example 10: Buffers and Binary Data
// ============================================================================
console.log("=".repeat(60));
console.log("Example 10: Buffers and Binary Data");
console.log("=".repeat(60));

const buffer = Buffer.from('Hello, Bun!', 'utf8');
const bufferHex = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

console.log("Buffer (UTF-8):");
console.log(Bun.inspect(buffer, { colors: true }));
console.log();

console.log("Buffer (Hex):");
console.log(Bun.inspect(bufferHex, { colors: true }));
console.log();

// ============================================================================
// Example 11: Circular References
// ============================================================================
console.log("=".repeat(60));
console.log("Example 11: Circular References");
console.log("=".repeat(60));

interface CircularNode {
	name: string;
	next?: CircularNode;
}

const node1: CircularNode = { name: 'Node 1' };
const node2: CircularNode = { name: 'Node 2' };
const node3: CircularNode = { name: 'Node 3' };

node1.next = node2;
node2.next = node3;
node3.next = node1; // Circular reference

console.log("Circular reference (handled automatically):");
console.log(Bun.inspect(node1, { depth: 5, colors: true }));
console.log();

// ============================================================================
// Example 12: Symbols and Private Properties
// ============================================================================
console.log("=".repeat(60));
console.log("Example 12: Symbols and Private Properties");
console.log("=".repeat(60));

const sym1 = Symbol('description1');
const sym2 = Symbol('description2');

const objWithSymbols = {
	regular: 'regular property',
	[sym1]: 'symbol property 1',
	[sym2]: 'symbol property 2',
	[Symbol.iterator]: function* () {
		yield 1;
		yield 2;
	},
};

console.log("Object with symbols:");
console.log(Bun.inspect(objWithSymbols, { colors: true, showHidden: false }));
console.log();

console.log("With showHidden: true");
console.log(Bun.inspect(objWithSymbols, { colors: true, showHidden: true }));
console.log();

// ============================================================================
// Example 13: Dates and RegExp
// ============================================================================
console.log("=".repeat(60));
console.log("Example 13: Dates and RegExp");
console.log("=".repeat(60));

const date = new Date();
const dateString = date.toISOString();
const regex = /test-\d+/gi;
const regexWithFlags = new RegExp('pattern', 'gim');

console.log("Date:");
console.log(Bun.inspect(date, { colors: true }));
console.log();

console.log("RegExp:");
console.log(Bun.inspect(regex, { colors: true }));
console.log();

console.log("RegExp with flags:");
console.log(Bun.inspect(regexWithFlags, { colors: true }));
console.log();

// ============================================================================
// Example 14: Large Arrays and Truncation
// ============================================================================
console.log("=".repeat(60));
console.log("Example 14: Large Arrays and Truncation");
console.log("=".repeat(60));

const largeArray = Array.from({ length: 1000 }, (_, i) => ({
	id: i,
	name: `Item ${i}`,
	value: Math.random() * 100,
}));

console.log("Large array (first 100 items shown):");
console.log(Bun.inspect(largeArray.slice(0, 100), { colors: true, depth: 2 }));
console.log();

// ============================================================================
// Example 15: Comparison with console.log
// ============================================================================
console.log("=".repeat(60));
console.log("Example 15: Comparison with console.log");
console.log("=".repeat(60));

const testObj = {
	nested: {
		deep: {
			value: 42,
			array: [1, 2, 3],
			date: new Date(),
		},
	},
};

console.log("console.log (default):");
console.log(testObj);
console.log();

console.log("Bun.inspect (formatted):");
console.log(Bun.inspect(testObj, { depth: 3, colors: true }));
console.log();

// ============================================================================
// Example 16: Performance Comparison
// ============================================================================
console.log("=".repeat(60));
console.log("Example 16: Performance Comparison");
console.log("=".repeat(60));

const perfTestObj = {
	data: Array.from({ length: 100 }, (_, i) => ({
		id: i,
		nested: { value: i * 2 },
	})),
};

const iterations = 1000;

// Test console.log performance
const start1 = Bun.nanoseconds();
for (let i = 0; i < iterations; i++) {
	// Simulating console.log (actual console.log would output)
	String(perfTestObj);
}
const consoleLogTime = Bun.nanoseconds() - start1;

// Test Bun.inspect performance
const start2 = Bun.nanoseconds();
for (let i = 0; i < iterations; i++) {
	Bun.inspect(perfTestObj, { depth: 2 });
}
const inspectTime = Bun.nanoseconds() - start2;

console.log(`console.log simulation: ${(consoleLogTime / 1_000_000).toFixed(2)}ms`);
console.log(`Bun.inspect: ${(inspectTime / 1_000_000).toFixed(2)}ms`);
console.log(`Ratio: ${(consoleLogTime / inspectTime).toFixed(2)}x`);
console.log();

// ============================================================================
// Example 17: Custom Inspect Symbol (if supported)
// ============================================================================
console.log("=".repeat(60));
console.log("Example 17: Custom Inspect Behavior");
console.log("=".repeat(60));

class CustomInspectable {
	constructor(
		public name: string,
		public value: number,
	) {}

	toJSON() {
		return {
			custom: true,
			name: this.name,
			value: this.value,
		};
	}
}

const customObj = new CustomInspectable('Custom', 123);
console.log("Custom object with toJSON:");
console.log(Bun.inspect(customObj, { colors: true }));
console.log();

// ============================================================================
// Example 18: Mixed Complex Types
// ============================================================================
console.log("=".repeat(60));
console.log("Example 18: Mixed Complex Types");
console.log("=".repeat(60));

const complexMixed = {
	string: 'text',
	number: 42,
	boolean: true,
	null: null,
	undefined: undefined,
	array: [1, 2, 3],
	object: { nested: 'value' },
	map: new Map([['key', 'value']]),
	set: new Set([1, 2, 3]),
	date: new Date(),
	regex: /test/gi,
	buffer: Buffer.from('test'),
	uint8Array: new Uint8Array([1, 2, 3]),
	promise: Promise.resolve('done'),
	error: new Error('test'),
	function: () => 'result',
	class: TradingNode,
	instance: new TradingNode('test', 'exchange', 'active'),
};

console.log("Mixed complex types:");
console.log(Bun.inspect(complexMixed, { depth: 3, colors: true }));
console.log();

// ============================================================================
// Summary
// ============================================================================
console.log("=".repeat(60));
console.log("✅ All Bun.inspect() examples completed!");
console.log("=".repeat(60));
console.log();
console.log("Key Takeaways:");
console.log("  • Bun.inspect() provides rich formatting for all JavaScript types");
console.log("  • Supports depth control, colors, compact mode, and more");
console.log("  • Handles circular references automatically");
console.log("  • Works with classes, functions, promises, errors, and more");
console.log("  • More control than console.log() for debugging");
console.log("=".repeat(60));



