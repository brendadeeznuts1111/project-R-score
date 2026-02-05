#!/usr/bin/env bun

// Demonstration of Bun v1.3.6 WebSocket and security improvements
console.log("🌐 Bun v1.3.6 WebSocket & Security Improvements");
console.log("=".repeat(55));

// Test 1: HTTP/HTTPS Proxy Support for WebSocket
console.log("\n1️⃣ WebSocket Proxy Support:");

function demonstrateWebSocketProxySupport() {
  console.log("✅ WebSocket now supports HTTP/HTTPS proxies:");

  const examples = [
    {
      name: "Simple HTTP proxy",
      code: `new WebSocket("wss://example.com", {
    proxy: "http://proxy:8080"
  })`,
    },
    {
      name: "Proxy with authentication",
      code: `new WebSocket("wss://example.com", {
    proxy: "http://user:pass@proxy:8080"
  })`,
    },
    {
      name: "Object format with custom headers",
      code: `new WebSocket("wss://example.com", {
    proxy: {
      url: "http://proxy:8080",
      headers: { "Proxy-Authorization": "Bearer token" }
    }
  })`,
    },
    {
      name: "HTTPS proxy with TLS options",
      code: `new WebSocket("wss://example.com", {
    proxy: "https://proxy:8443",
    tls: { rejectUnauthorized: false }
  })`,
    },
  ];

  examples.forEach((example) => {
    console.log(`   ${example.name}:`);
    console.log(`   ${example.code}`);
  });

  console.log(
    "\n   🚀 Enables WebSocket connections in corporate environments",
  );
  console.log("   🔒 Supports ws:// and wss:// through HTTP/HTTPS proxies");
  console.log(
    "   🔐 Full TLS configuration support (ca, cert, key, passphrase)",
  );
}

// Test 2: WebSocket Security - Decompression Bomb Protection
console.log("\n2️⃣ WebSocket Security - Decompression Bomb Protection:");

function demonstrateWebSocketSecurity() {
  console.log("✅ WebSocket now enforces 128MB decompression limit:");
  console.log("   🛡️  Prevents memory exhaustion attacks");
  console.log("   💥 Blocks decompression bombs");
  console.log("   🔒 Configurable limit for custom requirements");

  // Example of secure WebSocket usage
  const secureWebSocketExample = `
// Secure WebSocket with compression limits
const ws = new WebSocket("wss://api.example.com", {
  // Built-in protection: 128MB decompression limit
  // Prevents attacks like: maliciously compressed 1GB -> 128MB decompressed

  headers: {
    "Sec-WebSocket-Extensions": "permessage-deflate" // Compression enabled but protected
  }
});

ws.onmessage = (event) => {
  // Messages larger than 128MB decompressed will be rejected
  console.log("Received safe message:", event.data);
};
  `;

  console.log(secureWebSocketExample);
}

// Test 3: File I/O Security - Null Byte Prevention
console.log("\n3️⃣ Security: Null Byte Injection Prevention:");

function demonstrateNullBytePrevention() {
  console.log("✅ Bun now prevents null byte injection attacks (CWE-158):");

  const dangerousInputs = [
    "filename\\x00.txt",
    "command\\x00--arg",
    "env_value\\x00malicious",
    "shell\\x00command",
  ];

  console.log("   🚫 Blocked in:");
  console.log("     - Bun.spawn() arguments");
  console.log("     - Bun.spawnSync() arguments");
  console.log("     - Environment variables");
  console.log("     - Shell template literals");

  dangerousInputs.forEach((input, index) => {
    const hasNullByte = input.includes("\\x00") || input.includes("\x00");
    console.log(
      `   ${index + 1}. "${input}" -> ${hasNullByte ? "🚫 REJECTED" : "✅ ALLOWED"}`,
    );
  });

  console.log("\n   🔒 Prevents command injection and path traversal");
  console.log("   🛡️  Follows security best practices");
}

// Test 4: TLS/SSL Security Improvements
console.log("\n4️⃣ TLS/SSL Security Improvements:");

function demonstrateTLSImprovements() {
  console.log("✅ Stricter wildcard certificate matching (RFC 6125):");

  const certificateTests = [
    { pattern: "*.example.com", domain: "foo.example.com", valid: true },
    { pattern: "*.example.com", domain: "bar.example.com", valid: true },
    { pattern: "*.example.com", domain: "foo.bar.example.com", valid: false },
    { pattern: "*.*.example.com", domain: "foo.bar.example.com", valid: false },
    { pattern: "example.com", domain: "example.com", valid: true },
    { pattern: "example.com", domain: "foo.example.com", valid: false },
  ];

  console.log("   📋 Certificate validation examples:");
  certificateTests.forEach((test) => {
    const status = test.valid ? "✅ VALID" : "❌ INVALID";
    console.log(`     "${test.pattern}" vs "${test.domain}" -> ${status}`);
  });

  console.log("\n   🔒 Improved security against certificate spoofing");
  console.log("   📚 Follows RFC 6125 Section 6.4.3 standards");
}

// Test 5: Archive Security - Path Traversal Prevention
console.log("\n5️⃣ Archive Security - Path Traversal Prevention:");

function demonstrateArchiveSecurity() {
  console.log("✅ Path traversal prevention in tarball extraction:");

  const maliciousPaths = [
    "/etc/passwd", // Absolute path - blocked
    "../../../etc/passwd", // Relative traversal - blocked
    "../../config.json", // Relative traversal - blocked
    "folder/../../../etc/passwd", // Mixed traversal - blocked
    "normal/file.txt", // Normal path - allowed
    "folder/subfolder/file.txt", // Normal nested path - allowed
  ];

  console.log("   📁 Path validation examples:");
  maliciousPaths.forEach((path) => {
    const isAbsolute = path.startsWith("/");
    const hasTraversal = path.includes("../");
    const isBlocked = isAbsolute || hasTraversal;

    const reason = isAbsolute
      ? "absolute path"
      : hasTraversal
        ? "relative traversal"
        : "normal path";

    console.log(
      `     "${path}" -> ${isBlocked ? "🚫 BLOCKED" : "✅ ALLOWED"} (${reason})`,
    );
  });

  console.log("\n   🛡️  Prevents escaping extraction directory");
  console.log("   🔒 Blocks symlink attacks");
  console.log("   📦 Secures bun install and archive extraction");
}

// Test 6: Memory Leak Fixes
console.log("\n6️⃣ Memory Leak Fixes:");

function demonstrateMemoryLeakFixes() {
  console.log("✅ Fixed memory leaks in node:zlib compression streams:");

  const leakFixes = [
    {
      component: "Brotli compression",
      issue: "reset() repeatedly allocated new states without freeing old ones",
      fix: "Now properly frees previous encoder/decoder states",
    },
    {
      component: "Zstd compression",
      issue: "Memory leak on repeated reset() calls",
      fix: "Proper state cleanup implemented",
    },
    {
      component: "Zlib compression",
      issue: "Accumulating memory on stream resets",
      fix: "Memory management improved",
    },
    {
      component: "fetch() ReadableStream",
      issue: "Streams not properly released after request completion",
      fix: "Proper stream cleanup in rare edge cases",
    },
  ];

  leakFixes.forEach((fix) => {
    console.log(`   🔧 ${fix.component}:`);
    console.log(`      Issue: ${fix.issue}`);
    console.log(`      Fix: ${fix.fix}`);
  });

  console.log("\n   📈 Improved stability for long-running applications");
  console.log("   🚀 Better memory efficiency");
}

// Test 7: File I/O Improvements
console.log("\n7️⃣ File I/O Improvements:");

function demonstrateFileIOImprovements() {
  console.log("✅ Bun.write() mode option fix:");

  const fileIOExample = `
// Bun v1.3.6 now properly respects file mode
await Bun.write("output.txt", "content", {
  mode: 0o644  // Read/write for owner, read for group/others
});

// Before: Mode was ignored, inherited from source
// After: Mode is properly applied to the created file
  `;

  console.log(fileIOExample);

  console.log("✅ Fixed data corruption in files > 2GB:");
  console.log("   🔧 Large file writes now work correctly");
  console.log("   📊 Improved reliability for big data processing");

  console.log("✅ Better temp directory resolution:");
  console.log("   📁 Now checks TMPDIR, TMP, TEMP in order");
  console.log("   🔄 Matches Node.js os.tmpdir() behavior");
}

// Test 8: Network and Proxy Improvements
console.log("\n8️⃣ Network and Proxy Improvements:");

function demonstrateNetworkImprovements() {
  console.log("✅ HTTP client proxy authentication fix:");
  console.log("   🔧 Fixed hanging on 407 proxy auth failures");
  console.log(
    "   🌐 Now falls back to direct connections when proxy auth fails",
  );

  console.log("✅ NO_PROXY environment variable fix:");
  console.log("   🔧 Fixed parsing with empty entries");
  console.log("   🚫 Better proxy bypass handling");

  console.log("✅ WebSocket proxy support:");
  console.log("   🌐 Enables corporate network connectivity");
  console.log("   🔐 Full authentication and TLS support");
}

// Main demonstration function
async function main() {
  try {
    demonstrateWebSocketProxySupport();
    demonstrateWebSocketSecurity();
    demonstrateNullBytePrevention();
    demonstrateTLSImprovements();
    demonstrateArchiveSecurity();
    demonstrateMemoryLeakFixes();
    demonstrateFileIOImprovements();
    demonstrateNetworkImprovements();

    console.log(
      "\n🎯 Summary of Bun v1.3.6 Security & Stability Improvements:",
    );
    console.log(
      "   🌐 WebSocket: HTTP/HTTPS proxy support + 128MB decompression limit",
    );
    console.log(
      "   🔒 Security: Null byte prevention + stricter certificate matching",
    );
    console.log(
      "   📦 Archive: Path traversal prevention in tarball extraction",
    );
    console.log("   🧠 Memory: Fixed leaks in zlib + fetch() stream cleanup");
    console.log("   📁 File I/O: Proper mode handling + >2GB file support");
    console.log("   🌐 Network: Proxy auth fixes + NO_PROXY parsing");
    console.log("   🔧 TLS: RFC 6125 compliant wildcard matching");

    console.log(
      "\n🚀 These improvements make Bun more secure, stable, and enterprise-ready!",
    );
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

if (import.meta.main) {
  main();
}

export {
  demonstrateNullBytePrevention,
  main as demonstrateSecurityImprovements,
  demonstrateWebSocketProxySupport,
  demonstrateWebSocketSecurity,
};
