// bun-inspect-table-api-test.ts - Complete API reference test

console.log("🎯 Bun.inspect.table() API Reference Test");
console.log("====================================");

// Test 1: Basic usage with all properties
console.log("\n📊 1. Basic Usage (All Properties):");
const basicData = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 30, active: true },
  { id: 2, name: "Bob", email: "bob@example.com", age: 25, active: false },
];

console.log(Bun.inspect.table(basicData));

// Test 2: Custom property selection
console.log("\n🔧 2. Custom Property Selection:");
console.log(Bun.inspect.table(basicData, ["name", "email", "active"]));

// Test 3: Colors option - enabled (default)
console.log("\n🎨 3. Colors Enabled (Default):");
console.log(Bun.inspect.table(basicData, ["name", "status"], { colors: true }));

// Test 4: Colors option - disabled
console.log("\n⚫ 4. Colors Disabled:");
console.log(
  Bun.inspect.table(basicData, ["name", "status"], { colors: false })
);

// Test 5: Empty array
console.log("\n🔍 5. Empty Array:");
console.log(Bun.inspect.table([]));

// Test 6: Single object
console.log("\n📦 6. Single Object:");
console.log(Bun.inspect.table([{ only: "field", value: 42 }]));

// Test 7: Objects with no properties
console.log("\n📭 7. Objects with No Properties:");
console.log(Bun.inspect.table([{}, {}]));

// Test 8: Mixed object shapes
console.log("\n🎲 8. Mixed Object Shapes:");
const mixedShapes = [
  { name: "Alice", age: 30 },
  { name: "Bob", email: "bob@example.com" }, // missing age
  { city: "Chicago", country: "USA" }, // different properties
];
console.log(Bun.inspect.table(mixedShapes));

// Test 9: Non-existent properties
console.log("\n❌ 9. Non-existent Properties:");
console.log(Bun.inspect.table(basicData, ["name", "nonexistent", "missing"]));

// Test 10: Complex data types
console.log("\n🔧 10. Complex Data Types:");
const complexData = [
  {
    id: 1,
    string: "Hello World",
    number: 3.14159,
    boolean: true,
    null: null,
    undefined: undefined,
    date: new Date("2024-01-09"),
    array: [1, 2, 3],
    object: { key: "value" },
    func: function () {
      return "test";
    },
    regex: /test/gi,
  },
];
console.log(Bun.inspect.table(complexData));

// Test 11: Unicode and international characters
console.log("\n🌍 11. Unicode and International Characters:");
const unicodeData = [
  {
    emoji: "🚀 🎯 🏆 ⚡ 🎨 📊",
    currency: "$100.50 €75.25 £50.00 ¥1000 ₹500 ₩200",
    symbols: "© ® ™ ℠ † ‡ • … ‰",
    international: "Café naïve résumé señor niño él",
    math: "∑ ∏ ∫ ∆ ∇ ∂ α β γ δ ε ζ",
    arrows: "← → ↑ ↓ ↔ ↕ ↖ ↗",
    bullets: "• ◦ ◆ ◇ ◈ ◉ ◊ ○ ◌ ◍ ◎ ●",
  },
];
console.log(Bun.inspect.table(unicodeData));

// Test 12: Large dataset performance
console.log("\n📈 12. Large Dataset Performance:");
const largeData = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  score: Math.floor(Math.random() * 100),
  active: i % 2 === 0,
  department: ["Engineering", "Sales", "Marketing", "HR", "Finance"][i % 5],
  salary: 50000 + i * 2500,
  joinDate: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
}));

// Show only first 10 for readability
console.log(
  Bun.inspect.table(largeData.slice(0, 10), [
    "id",
    "name",
    "score",
    "department",
  ])
);

// Test 13: Performance metrics with status indicators
console.log("\n⚡ 13. Performance Metrics:");
const performanceData = [
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
    operation: "File Read",
    endpoint: "/static/config.json",
    time: "3.2ms",
    memory: "2.1MB",
    cpu: "5%",
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
  {
    operation: "Database Error",
    endpoint: "/api/orders",
    time: "500ms",
    memory: "3.5MB",
    cpu: "25%",
    status: "❌ Error",
    code: 500,
  },
];

console.log(Bun.inspect.table(performanceData));

// Test 14: Nested objects
console.log("\n📦 14. Nested Objects:");
const nestedData = [
  {
    user: {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      profile: {
        age: 30,
        city: "New York",
        country: "USA",
      },
    },
    order: {
      id: 1001,
      total: 150.0,
      items: 3,
      products: [
        { name: "Laptop", price: 999.99 },
        { name: "Mouse", price: 29.99 },
      ],
    },
    status: "completed",
    timestamp: new Date().toISOString(),
  },
];

console.log(Bun.inspect.table(nestedData));

// Test 15: Arrays as values
console.log("\n📋 15. Arrays as Values:");
const arrayData = [
  {
    project: "Website Redesign",
    tasks: ["Design", "Development", "Testing", "Deployment"],
    team: ["Alice", "Bob", "Charlie"],
    technologies: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    timeline: ["2024-01", "2024-02", "2024-03", "2024-04"],
    budget: [5000, 10000, 15000, 20000],
  },
  {
    project: "Mobile App",
    tasks: ["UI/UX", "Backend", "Frontend", "Testing"],
    team: ["David", "Eve", "Frank"],
    technologies: ["React Native", "Node.js", "MongoDB", "Redis"],
    timeline: ["2024-02", "2024-03", "2024-04", "2024-05"],
    budget: [8000, 12000, 18000, 25000],
  },
];

console.log(Bun.inspect.table(arrayData));

// Test 16: Function results
console.log("\n🔧 16. Function Results:");
const functionData = [
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
  {
    name: "JSON.stringify",
    input: { key: "value" },
    result: JSON.stringify({ key: "value" }),
    type: typeof JSON.stringify({ key: "value" }),
    description: "Convert to JSON string",
  },
];

console.log(Bun.inspect.table(functionData));

// Test 17: Error objects
console.log("\n❌ 17. Error Objects:");
const errorData = [
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
  {
    type: "SyntaxError",
    message: "Unexpected token < in JSON at position 0",
    stack: "at JSON.parse (<anonymous>)",
    code: "ERR_JSON_PARSE",
    line: 0,
    column: 0,
  },
];

console.log(Bun.inspect.table(errorData));

// Test 18: Configuration display
console.log("\n⚙️ 18. Configuration Display:");
const configData = [
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

console.log(Bun.inspect.table(configData));

console.log("\n✅ Bun.inspect.table() API reference test completed!");
console.log("\n📋 Features Tested:");
console.log("   • Basic tabular data display");
console.log("   • Custom property selection");
console.log("   • Colors option (enabled/disabled)");
console.log("   • Edge cases (empty, single, no properties)");
console.log("   • Mixed object shapes");
console.log("   • Non-existent property handling");
console.log("   • Complex data types");
console.log("   • Unicode and international support");
console.log("   • Large dataset performance");
console.log("   • Performance metrics with indicators");
console.log("   • Nested object structures");
console.log("   • Arrays as values");
console.log("   • Function results");
console.log("   • Error objects");
console.log("   • Configuration display");
