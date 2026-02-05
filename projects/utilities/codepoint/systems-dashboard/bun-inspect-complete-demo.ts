// bun-inspect-complete-demo.ts - Complete Bun.inspect() and Bun.inspect.table() demonstration

console.log("🎯 Bun.inspect() and Bun.inspect.table() Complete Demo");
console.log("================================================");

// 1. Basic Bun.inspect() usage
console.log("\n📋 1. Basic Bun.inspect():");
const basicObj = { foo: "bar", number: 42, boolean: true, null: null };
console.log("Object:", basicObj);
console.log("String representation:");
console.log(Bun.inspect(basicObj));

// 2. Array inspection
console.log("\n📦 2. Array Inspection:");
const basicArray = new Uint8Array([1, 2, 3]);
console.log("Uint8Array:", basicArray);
console.log("String representation:");
console.log(Bun.inspect(basicArray));

// 3. Complex object inspection
console.log("\n🏗️ 3. Complex Object Inspection:");
const complexObj = {
  string: "Hello World",
  number: 3.14159,
  boolean: false,
  null: null,
  undefined: undefined,
  date: new Date(),
  array: [1, 2, 3, { nested: "value" }],
  object: { key: "value", nested: { deep: "value" } },
  function: function () {
    return "test";
  },
  regex: /test/gi,
  symbol: Symbol("test"),
};

console.log("Complex object:", complexObj);
console.log("String representation:");
console.log(Bun.inspect(complexObj));

// 4. Custom Bun.inspect.custom implementation
console.log("\n🎨 4. Custom Bun.inspect.custom:");

class CustomClass {
  public name: string;
  public value: number;

  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }

  [Bun.inspect.custom]() {
    return `CustomClass(${this.name}, value=${this.value})`;
  }
}

const customInstance = new CustomClass("test", 42);
console.log("Custom class instance:");
console.log(customInstance);
console.log("Direct console.log output:");
// console.log(customInstance);

// 5. Nested custom inspection
console.log("\n🔧 5. Nested Custom Inspection:");
class NestedClass {
  public data: any;

  constructor(data: any) {
    this.data = data;
  }

  [Bun.inspect.custom]() {
    return `NestedClass(${Object.keys(this.data).length} properties)`;
  }
}

const nestedInstance = new NestedClass({
  id: 1,
  name: "test",
  items: [1, 2, 3],
  config: { enabled: true, timeout: 5000 },
});

console.log("Nested class instance:");
console.log(nestedInstance);

// 6. Bun.inspect.table() - Basic usage
console.log("\n📊 6. Bun.inspect.table() - Basic Usage:");
const tableData = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 },
];

console.log("Full table (all properties):");
console.log(Bun.inspect.table(tableData));

// 7. Bun.inspect.table() - Custom properties
console.log("\n🎯 7. Bun.inspect.table() - Custom Properties:");
console.log("Only 'a' and 'c' columns:");
console.log(Bun.inspect.table(tableData, ["a", "c"]));

// 8. Bun.inspect.table() - Colors option
console.log("\n🎨 8. Bun.inspect.table() - Colors Option:");
console.log("With colors enabled (default):");
console.log(Bun.inspect.table(tableData, null, { colors: true }));

console.log("\nWith colors disabled:");
console.log(Bun.inspect.table(tableData, null, { colors: false }));

// 9. Bun.inspect.table() - Complex data
console.log("\n🔧 9. Bun.inspect.table() - Complex Data:");
const complexTableData = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    profile: { age: 30, city: "New York", country: "USA" },
    orders: [
      { id: 101, total: 150.0, items: 3 },
      { id: 102, total: 75.5, items: 2 },
    ],
    metadata: {
      created: new Date(),
      updated: new Date(),
      tags: ["vip", "premium", "active"],
    },
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
    profile: { age: 25, city: "San Francisco", country: "USA" },
    orders: [
      { id: 201, total: 200.0, items: 4 },
      { id: 202, total: 100.0, items: 1 },
    ],
    metadata: {
      created: new Date(),
      updated: new Date(),
      tags: ["standard", "active"],
    },
  },
];

console.log("Complex data table:");
console.log(
  Bun.inspect.table(complexTableData, [
    "id",
    "name",
    "profile.age",
    "orders.length",
  ])
);

// 10. Bun.inspect.table() - Arrays as values
console.log("\n📋 10. Bun.inspect.table() - Arrays as Values:");
const arrayTableData = [
  {
    project: "Website Redesign",
    tasks: ["Design", "Development", "Testing", "Deployment"],
    team: ["Alice", "Bob", "Charlie"],
    technologies: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    timeline: ["2024-01", "2024-02", "2024-03", "2024-04"],
  },
  {
    project: "Mobile App",
    tasks: ["UI/UX", "Backend", "Frontend", "Testing"],
    team: ["David", "Eve", "Frank"],
    technologies: ["React Native", "Node.js", "MongoDB", "Redis"],
    timeline: ["2024-02", "2024-03", "2024-04", "2024-05"],
  },
];

console.log("Arrays as values:");
console.log(
  Bun.inspect.table(arrayTableData, ["project", "tasks", "technologies"])
);

// 11. Bun.inspect.table() - Mixed data types
console.log("\n🎨 11. Bun.inspect.table() - Mixed Data Types:");
const mixedTableData = [
  {
    string: "Hello World",
    number: 42,
    boolean: true,
    null: null,
    undefined: undefined,
    date: new Date(),
    array: [1, 2, 3],
    object: { key: "value" },
    function: function () {
      return "test";
    },
    regex: /test/gi,
    symbol: Symbol("test"),
  },
];

console.log("Mixed data types:");
console.log(Bun.inspect.table(mixedTableData));

// 12. Bun.inspect.table() - Performance metrics
console.log("\n⚡ 12. Bun.inspect.table() - Performance Metrics:");
const performanceTableData = [
  {
    operation: "Database Query",
    endpoint: "/api/users",
    time: "23.5ms",
    memory: "1.2MB",
    cpu: "15%",
    status: "✅ Success",
    code: 200,
  },
  {
    operation: "API Call",
    endpoint: "/api/posts",
    time: "145ms",
    memory: "856KB",
    cpu: "8%",
    status: "✅ Success",
    code: 200,
  },
  {
    operation: "Cache Miss",
    endpoint: "/cache/user:123",
    time: "0.8ms",
    memory: "128KB",
    cpu: "2%",
    status: "⚠️ Warning",
    code: 404,
  },
];

console.log("Performance metrics:");
console.log(
  Bun.inspect.table(performanceTableData, ["operation", "time", "status"])
);

// 13. Bun.inspect.table() - Unicode and special characters
console.log("\n🌍 13. Bun.inspect.table() - Unicode and Special Characters:");
const unicodeTableData = [
  {
    emoji: "🚀 🎯 🏆 ⚡ 🎨 📊",
    currency: "$100.50 €75.25 £50.00 ¥1000",
    symbols: "© ® ™ ℠ † ‡ • … ‰",
    international: "Café naïve résumé señor niño él",
    math: "∑ ∏ ∫ ∆ ∇ ∂ α β γ δ ε ζ",
    arrows: "← → ↑ ↓ ↔ ↕ ↖ ↗",
    bullets: "• ◦ ◆ ◇ ◈ ◉ ◊ ○ ◌ ◍ ◎ ●",
  },
];

console.log("Unicode and special characters:");
console.log(Bun.inspect.table(unicodeTableData));

// 14. Bun.inspect.table() - Error objects
console.log("\n❌ 14. Bun.inspect.table() - Error Objects:");
const errorTableData = [
  {
    type: "ReferenceError",
    message: "Cannot access property 'undefined' of undefined",
    stack: "at Object.<anonymous> (file.js:1:1)",
    code: "ERR_UNDEFINED_PROPERTY",
    line: 1,
    column: 15,
  },
  {
    type: "TypeError",
    message: "Cannot read property 'length' of undefined",
    stack: "at Object.<anonymous> (file.js:2:1)",
    code: "ERR_UNDEFINED_LENGTH",
    line: 2,
    column: 25,
  },
];

console.log("Error objects:");
console.log(Bun.inspect.table(errorTableData));

// 15. Bun.inspect.table() - Configuration display
console.log("\n⚙️ 15. Bun.inspect.table() - Configuration Display:");
const configTableData = [
  {
    setting: "database.url",
    value: "localhost:5432",
    type: "string",
    env: "DATABASE_URL",
  },
  { setting: "database.pool", value: 20, type: "number", env: "DATABASE_POOL" },
  { setting: "cache.ttl", value: 3600, type: "number", env: "CACHE_TTL" },
  { setting: "api.timeout", value: 5000, type: "number", env: "API_TIMEOUT" },
  {
    setting: "debug.enabled",
    value: true,
    type: "boolean",
    env: "DEBUG_ENABLED",
  },
  { setting: "log.level", value: "info", type: "string", env: "LOG_LEVEL" },
];

console.log("Configuration display:");
console.log(Bun.inspect.table(configTableData));

// 16. Bun.inspect.table() - Function results
console.log("\n🔧 16. Bun.inspect.table() - Function Results:");
const functionTableData = [
  {
    name: "Math.sqrt",
    input: 16,
    result: Math.sqrt(16),
    type: typeof Math.sqrt(16),
    description: "Square root function",
  },
  {
    name: "String.toUpperCase",
    input: "hello world",
    result: "hello world".toUpperCase(),
    type: typeof "hello world".toUpperCase(),
    description: "Convert to uppercase",
  },
  {
    name: "Array.join",
    input: ["a", "b", "c"],
    result: ["a", "b", "c"].join(","),
    type: typeof ["a", "b", "c"].join(","),
    description: "Join array elements",
  },
];

console.log("Function results:");
console.log(Bun.inspect.table(functionTableData));

// 17. Bun.inspect.table() - Edge cases
console.log("\n🔍 17. Bun.inspect.table() - Edge Cases:");

// Empty array
console.log("Empty array:");
console.log(Bun.inspect.table([]));

// Single object
console.log("\nSingle object:");
console.log(Bun.inspect.table([{ only: "field", value: 42 }]));

// Object with no properties
console.log("\nObjects with no properties:");
console.log(Bun.inspect.table([{}, {}]));

// Mixed object shapes
console.log("\nMixed object shapes:");
const mixedShapesData = [
  { name: "Alice", age: 30 },
  { name: "Bob", email: "bob@example.com" }, // missing age
  { city: "Chicago", country: "USA" }, // different properties
];
console.log(Bun.inspect.table(mixedShapesData));

// Non-existent properties
console.log("\nNon-existent properties:");
console.log(Bun.inspect.table(basicData, ["name", "nonexistent", "missing"]));

// 18. Bun.inspect.table() - Large dataset
console.log("\n📈 18. Bun.inspect.table() - Large Dataset:");
const largeTableData = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  score: Math.floor(Math.random() * 100),
  active: i % 2 === 0,
  department: ["Engineering", "Sales", "Marketing", "HR", "Finance"][i % 5],
  salary: 50000 + i * 2500,
  joinDate: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
}));

console.log("Large dataset (first 10 rows):");
console.log(
  Bun.inspect.table(largeTableData.slice(0, 10), [
    "id",
    "name",
    "score",
    "department",
  ])
);

// 19. Bun.inspect() vs console.log() comparison
console.log("\n🔄 19. Bun.inspect() vs console.log() Comparison:");
const comparisonObj = {
  name: "Test Object",
  value: 42,
  nested: { deep: "value" },
  array: [1, 2, 3],
};

console.log("console.log() output:");
console.log(comparisonObj);

console.log("\nBun.inspect() string representation:");
const inspectString = Bun.inspect(comparisonObj);
console.log(inspectString);

// 20. Bun.inspect() - Circular references
console.log("\n🔄 20. Bun.inspect() - Circular References:");
const circularObj: any = { name: "circular" };
circularObj.self = circularObj;

console.log("Object with circular reference:");
console.log(Bun.inspect(circularObj));

// 21. Bun.inspect() - Date objects
console.log("\n📅 21. Bun.inspect() - Date Objects:");
const dateObj = new Date("2024-01-09T02:19:00.000Z");
console.log("Date object:");
console.log(dateObj);
console.log("String representation:");
console.log(Bun.inspect(dateObj));

// 22. Bun.inspect() - Regular expressions
console.log("\n🔍 22. Bun.inspect() - Regular Expressions:");
const regexObj = /test/gi;
console.log("Regular expression:");
console.log(regexObj);
console.log("String representation:");
console.log(Bun.inspect(regexObj));

console.log(
  "\n✅ Complete Bun.inspect() and Bun.inspect.table() demo completed!"
);
console.log("\n📋 Features Demonstrated:");
console.log("   • Basic object and array inspection");
console.log("   • Custom Bun.inspect.custom implementation");
console.log("   • Nested custom inspection");
console.log("   • Bun.inspect.table() with all options");
console.log("   • Custom property selection");
console.log("   • Color control (enabled/disabled)");
console.log("   • Complex data handling");
console.log("   • Arrays as values");
console.log("   • Mixed data types");
console.log("   • Performance metrics display");
console.log("   • Unicode and special characters");
console.log("   • Error object handling");
console.log("   • Configuration display");
console.log("   • Function results");
console.log("   • Edge cases and error handling");
console.log("   • Large dataset performance");
console.log("   • Comparison with console.log()");
console.log("   • Circular reference handling");
console.log("   • Date and regex inspection");
