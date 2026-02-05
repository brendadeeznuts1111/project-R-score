// bun-inspect-options-demo.ts - Complete BunInspectOptions demonstration

console.log("🎯 BunInspectOptions Complete Demo");
console.log("==================================");

// Test data for demonstrating all options
const complexObj = {
  name: "Test Object",
  value: 42,
  nested: {
    deep: "value",
    number: 3.14159,
    boolean: true,
    null: null,
    undefined: undefined,
    date: new Date("2024-01-09T02:22:00.000Z"),
    array: [1, 2, 3, { nested: "deep" }],
    regex: /test/gi,
  },
  array: [1, 2, 3, 4, 5],
  function: function () {
    return "test";
  },
  symbol: Symbol("test"),
  zProperty: "last property",
  aProperty: "first property",
  mProperty: "middle property",
};

// 1. Default Bun.inspect() (no options)
console.log("\n📋 1. Default Bun.inspect() (no options):");
console.log(Bun.inspect(complexObj));

// 2. colors: true (default)
console.log("\n🎨 2. colors: true (default):");
console.log(Bun.inspect(complexObj, { colors: true }));

// 3. colors: false
console.log("\n⚫ 3. colors: false:");
console.log(Bun.inspect(complexObj, { colors: false }));

// 4. compact: true
console.log("\n📦 4. compact: true:");
console.log(Bun.inspect(complexObj, { compact: true }));

// 5. compact: false (default)
console.log("\n📖 5. compact: false (default):");
console.log(Bun.inspect(complexObj, { compact: false }));

// 6. depth: 0 (no nesting)
console.log("\n🔍 6. depth: 0 (no nesting):");
console.log(Bun.inspect(complexObj, { depth: 0 }));

// 7. depth: 1 (one level of nesting)
console.log("\n📊 7. depth: 1 (one level of nesting):");
console.log(Bun.inspect(complexObj, { depth: 1 }));

// 8. depth: 2 (two levels of nesting)
console.log("\n📈 8. depth: 2 (two levels of nesting):");
console.log(Bun.inspect(complexObj, { depth: 2 }));

// 9. depth: 3 (three levels of nesting)
console.log("\n📉 9. depth: 3 (three levels of nesting):");
console.log(Bun.inspect(complexObj, { depth: 3 }));

// 10. sorted: true
console.log("\n🔤 10. sorted: true:");
console.log(Bun.inspect(complexObj, { sorted: true }));

// 11. sorted: false (default)
console.log("\n📝 11. sorted: false (default):");
console.log(Bun.inspect(complexObj, { sorted: false }));

// 12. Combined options: colors: false, compact: true, sorted: true
console.log("\n🎯 12. Combined: colors: false, compact: true, sorted: true:");
console.log(
  Bun.inspect(complexObj, {
    colors: false,
    compact: true,
    sorted: true,
  })
);

// 13. Combined options: colors: true, compact: false, depth: 2, sorted: true
console.log(
  "\n🌈 13. Combined: colors: true, compact: false, depth: 2, sorted: true:"
);
console.log(
  Bun.inspect(complexObj, {
    colors: true,
    compact: false,
    depth: 2,
    sorted: true,
  })
);

// 14. Combined options: colors: false, compact: true, depth: 1, sorted: false
console.log(
  "\n⚡ 14. Combined: colors: false, compact: true, depth: 1, sorted: false:"
);
console.log(
  Bun.inspect(complexObj, {
    colors: false,
    compact: true,
    depth: 1,
    sorted: false,
  })
);

// 15. Test with array data
console.log("\n📋 15. Array Data with Options:");
const arrayData = [
  { id: 3, name: "Charlie", score: 85 },
  { id: 1, name: "Alice", score: 95 },
  { id: 2, name: "Bob", score: 88 },
];

console.log("Default array:");
console.log(Bun.inspect(arrayData));

console.log("\nSorted array:");
console.log(Bun.inspect(arrayData, { sorted: true }));

console.log("\nCompact array:");
console.log(Bun.inspect(arrayData, { compact: true }));

// 16. Test with deeply nested object
console.log("\n🏗️ 16. Deeply Nested Object:");
const deepNested = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            value: "deep value",
            array: [1, 2, 3, 4, 5],
          },
        },
      },
    },
  },
};

console.log("Default deep nested:");
console.log(Bun.inspect(deepNested));

console.log("\nDepth 2:");
console.log(Bun.inspect(deepNested, { depth: 2 }));

console.log("\nDepth 4:");
console.log(Bun.inspect(deepNested, { depth: 4 }));

// 17. Test with circular references
console.log("\n🔄 17. Circular References:");
const circularObj: any = { name: "circular" };
circularObj.self = circularObj;
circularObj.nested = { parent: circularObj };

console.log("Default circular:");
console.log(Bun.inspect(circularObj));

console.log("\nCircular with depth 1:");
console.log(Bun.inspect(circularObj, { depth: 1 }));

console.log("\nCircular with compact:");
console.log(Bun.inspect(circularObj, { compact: true }));

// 18. Test with large object
console.log("\n📊 18. Large Object:");
const largeObj = {};
for (let i = 0; i < 20; i++) {
  largeObj[`property${i}`] = {
    id: i,
    value: Math.random() * 100,
    nested: {
      deep: `value${i}`,
      array: Array.from({ length: 5 }, (_, j) => `item-${i}-${j}`),
    },
  };
}

console.log("Default large object:");
console.log(Bun.inspect(largeObj));

console.log("\nLarge object with compact:");
console.log(Bun.inspect(largeObj, { compact: true }));

console.log("\nLarge object with depth 1:");
console.log(Bun.inspect(largeObj, { depth: 1 }));

// 19. Test with different data types
console.log("\n🎨 19. Different Data Types:");
const mixedTypes = {
  string: "Hello World",
  number: 42,
  float: 3.14159,
  boolean: true,
  null: null,
  undefined: undefined,
  date: new Date(),
  array: [1, 2, 3, "four", { five: 5 }],
  object: { key: "value", nested: { deep: "value" } },
  function: function () {
    return "test";
  },
  regex: /test/gi,
  symbol: Symbol("test"),
  map: new Map([
    ["key1", "value1"],
    ["key2", "value2"],
  ]),
  set: new Set([1, 2, 3, 4, 5]),
  error: new Error("Test error"),
  buffer: Buffer.from("hello"),
};

console.log("Default mixed types:");
console.log(Bun.inspect(mixedTypes));

console.log("\nMixed types with compact:");
console.log(Bun.inspect(mixedTypes, { compact: true }));

console.log("\nMixed types with depth 1:");
console.log(Bun.inspect(mixedTypes, { depth: 1 }));

// 20. Performance comparison
console.log("\n⚡ 20. Performance Comparison:");
const perfObj = {
  data: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    value: Math.random() * 100,
  })),
};

console.time("Default inspection");
const defaultResult = Bun.inspect(perfObj);
console.timeEnd("Default inspection");

console.time("Compact inspection");
const compactResult = Bun.inspect(perfObj, { compact: true });
console.timeEnd("Compact inspection");

console.time("Sorted inspection");
const sortedResult = Bun.inspect(perfObj, { sorted: true });
console.timeEnd("Sorted inspection");

console.time("Depth limited inspection");
const depthResult = Bun.inspect(perfObj, { depth: 1 });
console.timeEnd("Depth limited inspection");

// 21. Table options demonstration
console.log("\n📊 21. Bun.inspect.table() with Options:");
const tableData = [
  { z: 3, a: 1, m: 2 },
  { z: 6, a: 4, m: 5 },
  { z: 9, a: 7, m: 8 },
];

console.log("Default table:");
console.log(Bun.inspect.table(tableData));

console.log("\nTable with colors: false:");
console.log(Bun.inspect.table(tableData, null, { colors: false }));

// 22. Custom class with options
console.log("\n🎨 22. Custom Class with Options:");
class CustomWithOptions {
  constructor(data) {
    this.data = data;
    this.timestamp = new Date();
    this.id = Math.random();
  }

  [Bun.inspect.custom]() {
    return `CustomWithOptions(${Object.keys(this.data).length} properties)`;
  }
}

const customInstance = new CustomWithOptions({ name: "test", value: 42 });

console.log("Default custom class:");
console.log(Bun.inspect(customInstance));

console.log("\nCustom class with colors: false:");
console.log(Bun.inspect(customInstance, { colors: false }));

console.log("\nCustom class with compact:");
console.log(Bun.inspect(customInstance, { compact: true }));

console.log("\n✅ BunInspectOptions demo completed!");
console.log("\n📋 Options Demonstrated:");
console.log("   • colors: boolean - Enable/disable ANSI colors");
console.log("   • compact: boolean - Compact vs verbose output");
console.log("   • depth: number - Control nesting depth");
console.log("   • sorted: boolean - Sort object properties");
console.log("   • Combined options - Multiple options together");
console.log("   • Performance impact - Different option combinations");
console.log("   • Edge cases - Circular refs, large objects, mixed types");
