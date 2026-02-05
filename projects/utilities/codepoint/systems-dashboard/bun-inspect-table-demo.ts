// bun-inspect-table-demo.ts - Comprehensive Bun.inspect.table demonstration

console.log("🎯 Bun.inspect.table() Comprehensive Demo");
console.log("=====================================");

// 1. Basic table with simple array
console.log("\n📊 Basic Array Table:");
const basicArray = [
  { name: "Alice", age: 30, city: "New York" },
  { name: "Bob", age: 25, city: "San Francisco" },
  { name: "Charlie", age: 35, city: "Chicago" },
];

console.log(Bun.inspect.table(basicArray));

// 2. Table with custom properties
console.log("\n🔧 Custom Properties Table:");
const customData = [
  {
    id: 1,
    product: "Laptop",
    price: 999.99,
    inStock: true,
    category: "Electronics",
  },
  {
    id: 2,
    product: "Mouse",
    price: 29.99,
    inStock: false,
    category: "Accessories",
  },
  {
    id: 3,
    product: "Keyboard",
    price: 79.99,
    inStock: true,
    category: "Accessories",
  },
];

console.log(Bun.inspect.table(customData, ["product", "price", "inStock"]));

// 3. Table with nested objects
console.log("\n📦 Nested Objects Table:");
const nestedData = [
  {
    user: { name: "John", email: "john@example.com" },
    order: { id: 1001, total: 150.0, items: 3 },
    status: "completed",
  },
  {
    user: { name: "Jane", email: "jane@example.com" },
    order: { id: 1002, total: 75.5, items: 2 },
    status: "pending",
  },
];

console.log(Bun.inspect.table(nestedData));

// 4. Table with arrays as values
console.log("\n📋 Arrays as Values Table:");
const arrayData = [
  {
    project: "Website Redesign",
    tasks: ["Design", "Development", "Testing"],
    team: ["Alice", "Bob"],
    deadline: "2024-03-01",
  },
  {
    project: "Mobile App",
    tasks: ["UI/UX", "Backend", "Frontend"],
    team: ["Charlie", "David", "Eve"],
    deadline: "2024-04-15",
  },
];

console.log(Bun.inspect.table(arrayData));

// 5. Table with mixed data types
console.log("\n🎨 Mixed Data Types Table:");
const mixedData = [
  {
    string: "Hello World",
    number: 42,
    boolean: true,
    null: null,
    undefined: undefined,
    date: new Date(),
    regex: /test/gi,
    function: function () {
      return "test";
    },
  },
  {
    string: "Goodbye",
    number: 3.14159,
    boolean: false,
    null: null,
    undefined: undefined,
    date: new Date("2024-01-01"),
    regex: /pattern/,
    function: () => "arrow",
  },
];

console.log(Bun.inspect.table(mixedData));

// 6. Table with options - custom headers
console.log("\n🏷️ Custom Headers Table:");
const headerData = [
  { first_name: "John", last_name: "Doe", email: "john.doe@example.com" },
  { first_name: "Jane", last_name: "Smith", email: "jane.smith@example.com" },
];

console.log(
  Bun.inspect.table(headerData, ["first_name", "last_name", "email"])
);

// 7. Table with large dataset
console.log("\n📈 Large Dataset Table:");
const largeData = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  score: Math.floor(Math.random() * 100),
  active: i % 2 === 0,
  department: ["Engineering", "Sales", "Marketing", "HR"][i % 4],
  salary: 50000 + i * 5000,
}));

console.log(Bun.inspect.table(largeData));

// 8. Table with special characters and Unicode
console.log("\n🌍 Unicode and Special Characters Table:");
const unicodeData = [
  {
    emoji: "🚀 🎯 🏆",
    currency: "$100.50 €75.25 £50.00",
    symbols: "© ® ™ ℠",
    international: "Café naïve résumé",
    math: "∑ ∏ ∫ ∆ ∇ ∂",
  },
  {
    emoji: "⚡ 🎨 📊",
    currency: "¥1000 ₹500 ₩200",
    symbols: "† ‡ • … ‰",
    international: "Señor niño él",
    math: "α β γ δ ε ζ",
  },
];

console.log(Bun.inspect.table(unicodeData));

// 9. Table with performance metrics
console.log("\n⚡ Performance Metrics Table:");
const performanceData = [
  {
    operation: "Database Query",
    time: "23.5ms",
    memory: "1.2MB",
    cpu: "15%",
    status: "✅ Success",
  },
  {
    operation: "API Call",
    time: "145ms",
    memory: "856KB",
    cpu: "8%",
    status: "✅ Success",
  },
  {
    operation: "File Read",
    time: "3.2ms",
    memory: "2.1MB",
    cpu: "5%",
    status: "✅ Success",
  },
  {
    operation: "Cache Miss",
    time: "0.8ms",
    memory: "128KB",
    cpu: "2%",
    status: "⚠️ Warning",
  },
];

console.log(Bun.inspect.table(performanceData));

// 10. Empty and edge cases
console.log("\n🔍 Edge Cases Table:");
console.log("Empty array:");
console.log(Bun.inspect.table([]));

console.log("\nSingle object:");
console.log(Bun.inspect.table([{ only: "field", value: 42 }]));

console.log("\nObject with no properties:");
console.log(Bun.inspect.table([{}, {}]));

// 11. Table with function results
console.log("\n🔧 Function Results Table:");
const functionData = [
  {
    name: "Math.sqrt",
    input: 16,
    result: Math.sqrt(16),
    type: typeof Math.sqrt(16),
  },
  {
    name: "String.toUpperCase",
    input: "hello",
    result: "hello".toUpperCase(),
    type: typeof "hello".toUpperCase(),
  },
  {
    name: "Array.join",
    input: ["a", "b", "c"],
    result: ["a", "b", "c"].join(","),
    type: typeof ["a", "b", "c"].join(","),
  },
];

console.log(Bun.inspect.table(functionData));

// 12. Table with error objects
console.log("\n❌ Error Objects Table:");
const errorData = [
  {
    type: "ReferenceError",
    message: "Cannot access property",
    stack: "at Object.<anonymous> (file.js:1:1)",
    code: "ERR_UNDEFINED_PROPERTY",
  },
  {
    type: "TypeError",
    message: "Cannot read property 'length' of undefined",
    stack: "at Object.<anonymous> (file.js:2:1)",
    code: "ERR_UNDEFINED_LENGTH",
  },
];

console.log(Bun.inspect.table(errorData));

console.log("\n✅ Bun.inspect.table() demo completed!");
console.log("\n📋 Summary of demonstrated features:");
console.log("   • Basic array tabulation");
console.log("   • Custom property selection");
console.log("   • Nested object handling");
console.log("   • Array values display");
console.log("   • Mixed data types");
console.log("   • Custom headers");
console.log("   • Large datasets");
console.log("   • Unicode support");
console.log("   • Performance metrics");
console.log("   • Edge cases");
console.log("   • Function results");
console.log("   • Error objects");
