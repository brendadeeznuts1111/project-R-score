#!/usr/bin/env bun

// CLI tool for demonstrating Bun Headers functionality
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    demo: {
      type: "string",
      short: "d",
      description:
        "Demo type: basic, performance, filtering, transform, stats, lookup",
    },
    iterations: {
      type: "string",
      short: "i",
      description: "Number of iterations for performance tests",
    },
  },
  allowPositionals: true,
});

function showHelp() {
  console.log(`
🔧 Bun Headers CLI Tool

Usage:
  bun run headers-cli [options] [command]

Commands:
  basic                    - Show basic Headers.toJSON() demo
  performance              - Performance comparison demo
  filtering                - Header filtering examples
  transform                - Header transformation examples
  stats                    - Header statistics demo
  lookup                   - Fast header lookup demo
  all                      - Run all demos

Options:
  -h, --help              Show this help
  -d, --demo <type>       Run specific demo type
  -i, --iterations <num>  Set iteration count (default: 100000)

Examples:
  bun run headers-cli basic
  bun run headers-cli --demo performance --iterations 50000
  bun run headers-cli all
`);
}

function createSampleHeaders() {
  return new Headers({
    "Content-Type": "application/json",
    Authorization: "Bearer token123",
    "X-Custom-Header": "custom-value",
    "USER-AGENT": "Bun-Demo/1.0",
    "Set-Cookie": "session=abc123; HttpOnly",
    "X-Rate-Limit": "1000",
    "Cache-Control": "no-cache",
    Accept: "application/json, text/plain",
    "X-Request-ID": "req-789xyz",
  });
}

function basicDemo() {
  console.log("🎯 Basic Headers.toJSON() Demo\n");

  const headers = createSampleHeaders();
  console.log("Original Headers:", headers);

  console.log("\n📤 Using toJSON():");
  const jsonResult = headers.toJSON();
  console.log(jsonResult);

  console.log("\n📄 Using JSON.stringify():");
  console.log(JSON.stringify(headers, null, 2));
}

function performanceDemo(iterations: number = 100000) {
  console.log(
    `⚡ Performance Demo (${iterations.toLocaleString()} iterations)\n`
  );

  const headers = createSampleHeaders();

  console.time("Bun toJSON()");
  for (let i = 0; i < iterations; i++) {
    headers.toJSON();
  }
  console.timeEnd("Bun toJSON()");

  console.time("Object.fromEntries(headers.entries())");
  for (let i = 0; i < iterations; i++) {
    Object.fromEntries(headers.entries());
  }
  console.timeEnd("Object.fromEntries(headers.entries())");

  console.time("Headers.entries() iteration");
  for (let i = 0; i < iterations / 10; i++) {
    for (const [key, value] of headers.entries()) {
      key.toLowerCase();
    }
  }
  console.timeEnd("Headers.entries() iteration");
}

function filteringDemo() {
  console.log("🔍 Header Filtering Demo\n");

  const headers = createSampleHeaders();

  // Filter authorization headers
  console.log("1. Authorization headers:");
  const authHeaders = Object.fromEntries(
    Array.from(headers.entries()).filter(
      ([key]) =>
        key.toLowerCase().includes("auth") ||
        key.toLowerCase().includes("authorization")
    )
  );
  console.log(authHeaders);

  // Filter custom headers
  console.log("\n2. Custom headers (X-):");
  const customHeaders = Object.fromEntries(
    Array.from(headers.entries()).filter(([key]) =>
      key.toLowerCase().startsWith("x-")
    )
  );
  console.log(customHeaders);

  // Filter cache-related headers
  console.log("\n3. Cache-related headers:");
  const cacheHeaders = Object.fromEntries(
    Array.from(headers.entries()).filter(([key]) =>
      key.toLowerCase().includes("cache")
    )
  );
  console.log(cacheHeaders);
}

function transformDemo() {
  console.log("🔄 Header Transformation Demo\n");

  const headers = createSampleHeaders();

  // HTTP request format
  console.log("1. HTTP request format:");
  const httpRequestFormat = Array.from(headers.entries())
    .map(
      ([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join("; ") : value}`
    )
    .join("\n");
  console.log(httpRequestFormat);

  // cURL format
  console.log("\n2. cURL format:");
  const curlFormat = Array.from(headers.entries())
    .map(
      ([key, value]) =>
        `  -H "${key}: ${Array.isArray(value) ? value.join("; ") : value}"`
    )
    .join(" \\\n");
  console.log(`curl -X GET \\\n${curlFormat}`);

  // JavaScript object format
  console.log("\n3. JavaScript fetch format:");
  console.log("fetch(url, {");
  console.log("  headers: {");
  Array.from(headers.entries()).forEach(([key, value], index) => {
    const comma = index < Array.from(headers.entries()).length - 1 ? "," : "";
    console.log(
      `    "${key}": "${Array.isArray(value) ? value.join("; ") : value}"${comma}`
    );
  });
  console.log("  }");
  console.log("});");
}

function statsDemo() {
  console.log("📊 Header Statistics Demo\n");

  const headers = createSampleHeaders();

  const stats = {
    totalHeaders: 0,
    totalValues: 0,
    multiValueHeaders: 0,
    headerTypes: {} as Record<string, number>,
    averageLength: 0,
  };

  let totalLength = 0;
  for (const [key, value] of headers.entries()) {
    stats.totalHeaders++;
    totalLength += key.length;

    if (Array.isArray(value)) {
      stats.totalValues += value.length;
      stats.multiValueHeaders++;
    } else {
      stats.totalValues++;
    }

    // Count header types
    const type = Array.isArray(value) ? "array" : "string";
    stats.headerTypes[type] = (stats.headerTypes[type] || 0) + 1;
  }

  stats.averageLength = Math.round(totalLength / stats.totalHeaders);

  console.log("Header Statistics:");
  console.log(JSON.stringify(stats, null, 2));
}

function lookupDemo() {
  console.log("🔎 Fast Header Lookup Demo\n");

  const headers = createSampleHeaders();

  // Create case-insensitive lookup map
  const headerMap = new Map(
    Array.from(headers.entries()).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ])
  );

  console.log("Fast lookups (case-insensitive):");
  console.log("Content-Type:", headerMap.get("content-type"));
  console.log("content-type:", headerMap.get("content-type"));
  console.log("USER-AGENT:", headerMap.get("user-agent"));
  console.log("x-request-id:", headerMap.get("x-request-id"));

  // Demonstrate lookup performance
  const iterations = 100000;
  console.log(
    `\n🚀 Lookup Performance (${iterations.toLocaleString()} lookups):`
  );

  console.time("Map lookup");
  for (let i = 0; i < iterations; i++) {
    headerMap.get("content-type");
  }
  console.timeEnd("Map lookup");

  console.time("Array.find lookup");
  const headerArray = Array.from(headers.entries());
  for (let i = 0; i < iterations; i++) {
    headerArray.find(([key]) => key.toLowerCase() === "content-type");
  }
  console.timeEnd("Array.find lookup");
}

function runAllDemos(iterations: number = 100000) {
  console.log("🎪 Running All Headers Demos\n");
  console.log("=".repeat(50));

  basicDemo();
  console.log("\n" + "=".repeat(50));

  performanceDemo(iterations);
  console.log("\n" + "=".repeat(50));

  filteringDemo();
  console.log("\n" + "=".repeat(50));

  transformDemo();
  console.log("\n" + "=".repeat(50));

  statsDemo();
  console.log("\n" + "=".repeat(50));

  lookupDemo();
}

// Main CLI logic
if (values.help) {
  showHelp();
  process.exit(0);
}

const args = process.argv.slice(2);
const command =
  values.demo || args.find((arg) => !arg.startsWith("-")) || "help";
const iterations = values.iterations ? parseInt(values.iterations) : 100000;

if (!command || command === "help") {
  showHelp();
  process.exit(0);
}

switch (command) {
  case "basic":
    basicDemo();
    break;
  case "performance":
    performanceDemo(iterations);
    break;
  case "filtering":
    filteringDemo();
    break;
  case "transform":
    transformDemo();
    break;
  case "stats":
    statsDemo();
    break;
  case "lookup":
    lookupDemo();
    break;
  case "all":
    runAllDemos(iterations);
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
