// Demo of BunHeadersOverride.toJSON method with Headers.entries()

// Create headers with various types
const headers = new Headers({
  "Content-Type": "application/json",
  Authorization: "Bearer token123",
  "X-Custom-Header": "custom-value",
  "USER-AGENT": "Bun-Demo/1.0",
  "Set-Cookie": "session=abc123; HttpOnly",
});

console.log("Original Headers object:", headers);

// Using toJSON directly (Bun's optimized method)
console.log("\nUsing toJSON():");
const jsonResult = headers.toJSON();
console.log(jsonResult);

// Using JSON.stringify (automatically calls toJSON)
console.log("\nUsing JSON.stringify():");
const stringified = JSON.stringify(headers, null, 2);
console.log(stringified);

// Practical use case: Filter headers using entries()
console.log("\n Practical use cases with Headers.entries():");

// 1. Filter authorization headers
console.log("\n1. Filter authorization headers:");
const authHeaders = Object.fromEntries(
  Array.from(headers.entries()).filter(
    ([key]) =>
      key.toLowerCase().includes("auth") ||
      key.toLowerCase().includes("authorization")
  )
);
console.log(authHeaders);

// 2. Transform headers to different format
console.log("\n2. Transform to HTTP request format:");
const httpRequestFormat = Array.from(headers.entries())
  .map(
    ([key, value]) =>
      `${key}: ${Array.isArray(value) ? value.join("; ") : value}`
  )
  .join("\n");
console.log(httpRequestFormat);

// 3. Count header values
console.log("\n3. Header statistics:");
const headerStats = {
  totalHeaders: 0,
  totalValues: 0,
  multiValueHeaders: 0,
};
for (const [key, value] of headers.entries()) {
  headerStats.totalHeaders++;
  if (Array.isArray(value)) {
    headerStats.totalValues += value.length;
    headerStats.multiValueHeaders++;
  } else {
    headerStats.totalValues++;
  }
}
console.log(headerStats);

// 4. Create header lookup map
console.log("\n4. Fast header lookup map:");
const headerMap = new Map(
  Array.from(headers.entries()).map(([key, value]) => [
    key.toLowerCase(),
    value,
  ])
);
console.log("Content-Type lookup:", headerMap.get("content-type"));
console.log("User-Agent lookup:", headerMap.get("user-agent"));

// Performance comparison (Bun's toJSON vs standard Object.fromEntries)
console.log("\n Performance comparison:");
const iterations = 100000;

// Bun's toJSON method
console.time("Bun toJSON()");
for (let i = 0; i < iterations; i++) {
  headers.toJSON();
}
console.timeEnd("Bun toJSON()");

// Standard Object.fromEntries with Headers.entries()
console.time("Object.fromEntries(headers.entries())");
for (let i = 0; i < iterations; i++) {
  Object.fromEntries(headers.entries());
}
console.timeEnd("Object.fromEntries(headers.entries())");

// Performance of common operations with entries()
console.time("Headers.entries() iteration");
for (let i = 0; i < iterations / 10; i++) {
  for (const [key, value] of headers.entries()) {
    // Simulate processing
    key.toLowerCase();
  }
}
console.timeEnd("Headers.entries() iteration");

// Note: Well-known headers are lowercased, custom headers preserve case
console.log("\n Header name handling:");
console.log(
  "Content-Type becomes:",
  Object.keys(jsonResult).find((k) => k.toLowerCase() === "content-type")
);
console.log(
  "USER-AGENT becomes:",
  Object.keys(jsonResult).find((k) => k.toLowerCase() === "user-agent")
);
console.log(
  "X-Custom-Header becomes:",
  Object.keys(jsonResult).find((k) => k.toLowerCase() === "x-custom-header")
);
