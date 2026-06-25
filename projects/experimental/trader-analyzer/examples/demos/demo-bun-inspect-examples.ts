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
console.info("=".repeat(60));
console.info("Example 1: Inspecting Typed Arrays");
console.info("=".repeat(60));

const uint8Array = new Uint8Array([1, 2, 3, 255]);
const uint16Array = new Uint16Array([1000, 2000, 3000]);
const int32Array = new Int32Array([-100, 0, 100]);
const float64Array = new Float64Array([3.14159, 2.71828]);

console.info("Uint8Array:", Bun.inspect(uint8Array));
console.info("Uint16Array:", Bun.inspect(uint16Array));
console.info("Int32Array:", Bun.inspect(int32Array));
console.info("Float64Array:", Bun.inspect(float64Array));
console.info();

// ============================================================================
// Example 2: Inspecting Complex Nested Objects
// ============================================================================
console.info("=".repeat(60));
console.info("Example 2: Inspecting Complex Nested Objects");
console.info("=".repeat(60));

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

console.info(Bun.inspect(complexCmms, { depth: 3, colors: true }));
console.info();

// ============================================================================
// Example 3: Inspecting with Different Depth Levels
// ============================================================================
console.info("=".repeat(60));
console.info("Example 3: Different Depth Levels");
console.info("=".repeat(60));

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

console.info("Depth 1:");
console.info(Bun.inspect(deepObject, { depth: 1, colors: true }));
console.info();

console.info("Depth 3:");
console.info(Bun.inspect(deepObject, { depth: 3, colors: true }));
console.info();

console.info("Depth 5:");
console.info(Bun.inspect(deepObject, { depth: 5, colors: true }));
console.info();

console.info("Depth Infinity (default):");
console.info(Bun.inspect(deepObject, { depth: Infinity, colors: true }));
console.info();

// ============================================================================
// Example 4: Inspecting Collections (Map, Set, WeakMap, WeakSet)
// ============================================================================
console.info("=".repeat(60));
console.info("Example 4: Collections (Map, Set, WeakMap, WeakSet)");
console.info("=".repeat(60));

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

console.info("Map:");
console.info(Bun.inspect(map, { colors: true, depth: 3 }));
console.info();

console.info("Set:");
console.info(Bun.inspect(set, { colors: true, depth: 2 }));
console.info();

console.info("WeakMap (note: WeakMap/WeakSet contents are not inspectable):");
console.info(Bun.inspect(weakMap, { colors: true }));
console.info();

console.info("WeakSet:");
console.info(Bun.inspect(weakSet, { colors: true }));
console.info();

// ============================================================================
// Example 5: Inspecting with Custom Options
// ============================================================================
console.info("=".repeat(60));
console.info("Example 5: Custom Options");
console.info("=".repeat(60));

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

console.info("With colors (default):");
console.info(Bun.inspect(data, { depth: 3, colors: true }));
console.info();

console.info("Without colors:");
console.info(Bun.inspect(data, { depth: 3, colors: false }));
console.info();

console.info("Compact mode:");
console.info(Bun.inspect(data, { depth: 3, compact: true }));
console.info();

console.info("Sorted keys:");
console.info(Bun.inspect(data, { depth: 3, sortedKeys: true, colors: true }));
console.info();

// ============================================================================
// Example 6: Classes and Instances
// ============================================================================
console.info("=".repeat(60));
console.info("Example 6: Classes and Instances");
console.info("=".repeat(60));

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

console.info("Class instance:");
console.info(Bun.inspect(node, { colors: true, depth: 2 }));
console.info();

// ============================================================================
// Example 7: Functions and Methods
// ============================================================================
console.info("=".repeat(60));
console.info("Example 7: Functions and Methods");
console.info("=".repeat(60));

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

console.info("Object with methods:");
console.info(Bun.inspect(objWithMethods, { colors: true }));
console.info();

// ============================================================================
// Example 8: Errors and Stack Traces
// ============================================================================
console.info("=".repeat(60));
console.info("Example 8: Errors and Stack Traces");
console.info("=".repeat(60));

try {
	throw new Error('Test error message');
} catch (error) {
	console.info("Error object:");
	console.info(Bun.inspect(error, { colors: true }));
	console.info();
}

const customError = new TypeError('Custom type error');
customError.stack = 'Custom stack trace';

console.info("Custom error:");
console.info(Bun.inspect(customError, { colors: true }));
console.info();

// ============================================================================
// Example 9: Promises and Async Values
// ============================================================================
console.info("=".repeat(60));
console.info("Example 9: Promises and Async Values");
console.info("=".repeat(60));

const pendingPromise = new Promise((resolve) => {
	setTimeout(() => resolve('resolved'), 1000);
});

const resolvedPromise = Promise.resolve({ data: 'success', code: 200 });
const rejectedPromise = Promise.reject(new Error('rejection test'));

console.info("Pending Promise:");
console.info(Bun.inspect(pendingPromise, { colors: true }));
console.info();

console.info("Resolved Promise:");
console.info(Bun.inspect(resolvedPromise, { colors: true }));
console.info();

console.info("Rejected Promise:");
console.info(Bun.inspect(rejectedPromise, { colors: true }));
console.info();

// ============================================================================
// Example 10: Buffers and Binary Data
// ============================================================================
console.info("=".repeat(60));
console.info("Example 10: Buffers and Binary Data");
console.info("=".repeat(60));

const buffer = Buffer.from('Hello, Bun!', 'utf8');
const bufferHex = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

console.info("Buffer (UTF-8):");
console.info(Bun.inspect(buffer, { colors: true }));
console.info();

console.info("Buffer (Hex):");
console.info(Bun.inspect(bufferHex, { colors: true }));
console.info();

// ============================================================================
// Example 11: Circular References
// ============================================================================
console.info("=".repeat(60));
console.info("Example 11: Circular References");
console.info("=".repeat(60));

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

console.info("Circular reference (handled automatically):");
console.info(Bun.inspect(node1, { depth: 5, colors: true }));
console.info();

// ============================================================================
// Example 12: Symbols and Private Properties
// ============================================================================
console.info("=".repeat(60));
console.info("Example 12: Symbols and Private Properties");
console.info("=".repeat(60));

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

console.info("Object with symbols:");
console.info(Bun.inspect(objWithSymbols, { colors: true, showHidden: false }));
console.info();

console.info("With showHidden: true");
console.info(Bun.inspect(objWithSymbols, { colors: true, showHidden: true }));
console.info();

// ============================================================================
// Example 13: Dates and RegExp
// ============================================================================
console.info("=".repeat(60));
console.info("Example 13: Dates and RegExp");
console.info("=".repeat(60));

const date = new Date();
const dateString = date.toISOString();
const regex = /test-\d+/gi;
const regexWithFlags = new RegExp('pattern', 'gim');

console.info("Date:");
console.info(Bun.inspect(date, { colors: true }));
console.info();

console.info("RegExp:");
console.info(Bun.inspect(regex, { colors: true }));
console.info();

console.info("RegExp with flags:");
console.info(Bun.inspect(regexWithFlags, { colors: true }));
console.info();

// ============================================================================
// Example 14: Large Arrays and Truncation
// ============================================================================
console.info("=".repeat(60));
console.info("Example 14: Large Arrays and Truncation");
console.info("=".repeat(60));

const largeArray = Array.from({ length: 1000 }, (_, i) => ({
	id: i,
	name: `Item ${i}`,
	value: Math.random() * 100,
}));

console.info("Large array (first 100 items shown):");
console.info(Bun.inspect(largeArray.slice(0, 100), { colors: true, depth: 2 }));
console.info();

// ============================================================================
// Example 15: Comparison with console.log
// ============================================================================
console.info("=".repeat(60));
console.info("Example 15: Comparison with console.log");
console.info("=".repeat(60));

const testObj = {
	nested: {
		deep: {
			value: 42,
			array: [1, 2, 3],
			date: new Date(),
		},
	},
};

console.info("console.log (default):");
console.info(testObj);
console.info();

console.info("Bun.inspect (formatted):");
console.info(Bun.inspect(testObj, { depth: 3, colors: true }));
console.info();

// ============================================================================
// Example 16: Performance Comparison
// ============================================================================
console.info("=".repeat(60));
console.info("Example 16: Performance Comparison");
console.info("=".repeat(60));

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

console.info(`console.log simulation: ${(consoleLogTime / 1_000_000).toFixed(2)}ms`);
console.info(`Bun.inspect: ${(inspectTime / 1_000_000).toFixed(2)}ms`);
console.info(`Ratio: ${(consoleLogTime / inspectTime).toFixed(2)}x`);
console.info();

// ============================================================================
// Example 17: Custom Inspect Symbol (if supported)
// ============================================================================
console.info("=".repeat(60));
console.info("Example 17: Custom Inspect Behavior");
console.info("=".repeat(60));

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
console.info("Custom object with toJSON:");
console.info(Bun.inspect(customObj, { colors: true }));
console.info();

// ============================================================================
// Example 18: Mixed Complex Types
// ============================================================================
console.info("=".repeat(60));
console.info("Example 18: Mixed Complex Types");
console.info("=".repeat(60));

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

console.info("Mixed complex types:");
console.info(Bun.inspect(complexMixed, { depth: 3, colors: true }));
console.info();

// ============================================================================
// Summary
// ============================================================================
console.info("=".repeat(60));
console.info("✅ All Bun.inspect() examples completed!");
console.info("=".repeat(60));
console.info();
console.info("Key Takeaways:");
console.info("  • Bun.inspect() provides rich formatting for all JavaScript types");
console.info("  • Supports depth control, colors, compact mode, and more");
console.info("  • Handles circular references automatically");
console.info("  • Works with classes, functions, promises, errors, and more");
console.info("  • More control than console.info() for debugging");
console.info("=".repeat(60));



