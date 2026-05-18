// bun-inspect-complete-demo.ts - Complete Bun.inspect() and Bun.inspect.table() demonstration

console.info("🎯 Bun.inspect() and Bun.inspect.table() Complete Demo");
console.info("================================================");

// 1. Basic Bun.inspect() usage
console.info("\n📋 1. Basic Bun.inspect():");
const basicObj = { foo: "bar", number: 42, boolean: true, null: null };
console.info("Object:", basicObj);
console.info("String representation:");
console.info(Bun.inspect(basicObj));

// 2. Array inspection
console.info("\n📦 2. Array Inspection:");
const basicArray = new Uint8Array([1, 2, 3]);
console.info("Uint8Array:", basicArray);
console.info("String representation:");
console.info(Bun.inspect(basicArray));

// 3. Complex object inspection
console.info("\n🏗️ 3. Complex Object Inspection:");
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

console.info("Complex object:", complexObj);
console.info("String representation:");
console.info(Bun.inspect(complexObj));

// 4. Custom Bun.inspect.custom implementation
console.info("\n🎨 4. Custom Bun.inspect.custom:");

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
console.info("Custom class instance:");
console.info(customInstance);
console.info("Direct console.log output:");
// console.info(customInstance);

// 5. Nested custom inspection
console.info("\n🔧 5. Nested Custom Inspection:");
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

console.info("Nested class instance:");
console.info(nestedInstance);

// 6. Bun.inspect.table() - Basic usage
console.info("\n📊 6. Bun.inspect.table() - Basic Usage:");
const tableData = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 },
];

console.info("Full table (all properties):");
console.info(Bun.inspect.table(tableData));

// 7. Bun.inspect.table() - Custom properties
console.info("\n🎯 7. Bun.inspect.table() - Custom Properties:");
console.info("Only 'a' and 'c' columns:");
console.info(Bun.inspect.table(tableData, ["a", "c"]));

// 8. Bun.inspect.table() - Colors option
console.info("\n🎨 8. Bun.inspect.table() - Colors Option:");
console.info("With colors enabled (default):");
console.info(Bun.inspect.table(tableData, null, { colors: true }));

console.info("\nWith colors disabled:");
console.info(Bun.inspect.table(tableData, null, { colors: false }));

// 9. Bun.inspect.table() - Complex data
console.info("\n🔧 9. Bun.inspect.table() - Complex Data:");
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

console.info("Complex data table:");
console.info(
  Bun.inspect.table(complexTableData, [
    "id",
    "name",
    "profile.age",
    "orders.length",
  ])
);

// 10. Bun.inspect.table() - Arrays as values
console.info("\n📋 10. Bun.inspect.table() - Arrays as Values:");
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

console.info("Arrays as values:");
console.info(
  Bun.inspect.table(arrayTableData, ["project", "tasks", "technologies"])
);

// 11. Bun.inspect.table() - Mixed data types
console.info("\n🎨 11. Bun.inspect.table() - Mixed Data Types:");
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

console.info("Mixed data types:");
console.info(Bun.inspect.table(mixedTableData));

// 12. Bun.inspect.table() - Performance metrics
console.info("\n⚡ 12. Bun.inspect.table() - Performance Metrics:");
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

console.info("Performance metrics:");
console.info(
  Bun.inspect.table(performanceTableData, ["operation", "time", "status"])
);

// 13. Bun.inspect.table() - Unicode and special characters
console.info("\n🌍 13. Bun.inspect.table() - Unicode and Special Characters:");
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

console.info("Unicode and special characters:");
console.info(Bun.inspect.table(unicodeTableData));

// 14. Bun.inspect.table() - Error objects
console.info("\n❌ 14. Bun.inspect.table() - Error Objects:");
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

console.info("Error objects:");
console.info(Bun.inspect.table(errorTableData));

// 15. Bun.inspect.table() - Configuration display
console.info("\n⚙️ 15. Bun.inspect.table() - Configuration Display:");
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

console.info("Configuration display:");
console.info(Bun.inspect.table(configTableData));

// 16. Bun.inspect.table() - Function results
console.info("\n🔧 16. Bun.inspect.table() - Function Results:");
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

console.info("Function results:");
console.info(Bun.inspect.table(functionTableData));

// 17. Bun.inspect.table() - Edge cases
console.info("\n🔍 17. Bun.inspect.table() - Edge Cases:");

// Empty array
console.info("Empty array:");
console.info(Bun.inspect.table([]));

// Single object
console.info("\nSingle object:");
console.info(Bun.inspect.table([{ only: "field", value: 42 }]));

// Object with no properties
console.info("\nObjects with no properties:");
console.info(Bun.inspect.table([{}, {}]));

// Mixed object shapes
console.info("\nMixed object shapes:");
const mixedShapesData = [
  { name: "Alice", age: 30 },
  { name: "Bob", email: "bob@example.com" }, // missing age
  { city: "Chicago", country: "USA" }, // different properties
];
console.info(Bun.inspect.table(mixedShapesData));

// Non-existent properties
console.info("\nNon-existent properties:");
console.info(Bun.inspect.table(basicData, ["name", "nonexistent", "missing"]));

// 18. Bun.inspect.table() - Large dataset
console.info("\n📈 18. Bun.inspect.table() - Large Dataset:");
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

console.info("Large dataset (first 10 rows):");
console.info(
  Bun.inspect.table(largeTableData.slice(0, 10), [
    "id",
    "name",
    "score",
    "department",
  ])
);

// 19. Bun.inspect() vs console.info() comparison
console.info("\n🔄 19. Bun.inspect() vs console.info() Comparison:");
const comparisonObj = {
  name: "Test Object",
  value: 42,
  nested: { deep: "value" },
  array: [1, 2, 3],
};

console.info("console.info() output:");
console.info(comparisonObj);

console.info("\nBun.inspect() string representation:");
const inspectString = Bun.inspect(comparisonObj);
console.info(inspectString);

// 20. Bun.inspect() - Circular references
console.info("\n🔄 20. Bun.inspect() - Circular References:");
const circularObj: any = { name: "circular" };
circularObj.self = circularObj;

console.info("Object with circular reference:");
console.info(Bun.inspect(circularObj));

// 21. Bun.inspect() - Date objects
console.info("\n📅 21. Bun.inspect() - Date Objects:");
const dateObj = new Date("2024-01-09T02:19:00.000Z");
console.info("Date object:");
console.info(dateObj);
console.info("String representation:");
console.info(Bun.inspect(dateObj));

// 22. Bun.inspect() - Regular expressions
console.info("\n🔍 22. Bun.inspect() - Regular Expressions:");
const regexObj = /test/gi;
console.info("Regular expression:");
console.info(regexObj);
console.info("String representation:");
console.info(Bun.inspect(regexObj));

console.info(
  "\n✅ Complete Bun.inspect() and Bun.inspect.table() demo completed!"
);
console.info("\n📋 Features Demonstrated:");
console.info("   • Basic object and array inspection");
console.info("   • Custom Bun.inspect.custom implementation");
console.info("   • Nested custom inspection");
console.info("   • Bun.inspect.table() with all options");
console.info("   • Custom property selection");
console.info("   • Color control (enabled/disabled)");
console.info("   • Complex data handling");
console.info("   • Arrays as values");
console.info("   • Mixed data types");
console.info("   • Performance metrics display");
console.info("   • Unicode and special characters");
console.info("   • Error object handling");
console.info("   • Configuration display");
console.info("   • Function results");
console.info("   • Edge cases and error handling");
console.info("   • Large dataset performance");
console.info("   • Comparison with console.info()");
console.info("   • Circular reference handling");
console.info("   • Date and regex inspection");
