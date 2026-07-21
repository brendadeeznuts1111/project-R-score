#!/usr/bin/env bun

// Demonstration of Bun v1.3.6 WebSocket and security improvements
console.info("🌐 Bun v1.3.6 WebSocket & Security Improvements");
console.info("=".repeat(55));

// Test 1: HTTP/HTTPS Proxy Support for WebSocket
console.info("\n1️⃣ WebSocket Proxy Support:");

function demonstrateWebSocketProxySupport() {
  console.info("✅ WebSocket now supports HTTP/HTTPS proxies:");

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
    console.info(`   ${example.name}:`);
    console.info(`   ${example.code}`);
  });

  console.info(
    "\n   🚀 Enables WebSocket connections in corporate environments",
  );
  console.info("   🔒 Supports ws:// and wss:// through HTTP/HTTPS proxies");
  console.info(
    "   🔐 Full TLS configuration support (ca, cert, key, passphrase)",
  );
}

// Test 2: WebSocket Security - Decompression Bomb Protection
console.info("\n2️⃣ WebSocket Security - Decompression Bomb Protection:");

function demonstrateWebSocketSecurity() {
  console.info("✅ WebSocket now enforces 128MB decompression limit:");
  console.info("   🛡️  Prevents memory exhaustion attacks");
  console.info("   💥 Blocks decompression bombs");
  console.info("   🔒 Configurable limit for custom requirements");

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
  console.info("Received safe message:", event.data);
};
  `;

  console.info(secureWebSocketExample);
}

// Test 3: File I/O Security - Null Byte Prevention
console.info("\n3️⃣ Security: Null Byte Injection Prevention:");

function demonstrateNullBytePrevention() {
  console.info("✅ Bun now prevents null byte injection attacks (CWE-158):");

  const dangerousInputs = [
    "filename\\x00.txt",
    "command\\x00--arg",
    "env_value\\x00malicious",
    "shell\\x00command",
  ];

  console.info("   🚫 Blocked in:");
  console.info("     - Bun.spawn() arguments");
  console.info("     - Bun.spawnSync() arguments");
  console.info("     - Environment variables");
  console.info("     - Shell template literals");

  dangerousInputs.forEach((input, index) => {
    const hasNullByte = input.includes("\\x00") || input.includes("\x00");
    console.info(
      `   ${index + 1}. "${input}" -> ${hasNullByte ? "🚫 REJECTED" : "✅ ALLOWED"}`,
    );
  });

  console.info("\n   🔒 Prevents command injection and path traversal");
  console.info("   🛡️  Follows security best practices");
}

// Test 4: TLS/SSL Security Improvements
console.info("\n4️⃣ TLS/SSL Security Improvements:");

function demonstrateTLSImprovements() {
  console.info("✅ Stricter wildcard certificate matching (RFC 6125):");

  const certificateTests = [
    { pattern: "*.example.com", domain: "foo.example.com", valid: true },
    { pattern: "*.example.com", domain: "bar.example.com", valid: true },
    { pattern: "*.example.com", domain: "foo.bar.example.com", valid: false },
    { pattern: "*.*.example.com", domain: "foo.bar.example.com", valid: false },
    { pattern: "example.com", domain: "example.com", valid: true },
    { pattern: "example.com", domain: "foo.example.com", valid: false },
  ];

  console.info("   📋 Certificate validation examples:");
  certificateTests.forEach((test) => {
    const status = test.valid ? "✅ VALID" : "❌ INVALID";
    console.info(`     "${test.pattern}" vs "${test.domain}" -> ${status}`);
  });

  console.info("\n   🔒 Improved security against certificate spoofing");
  console.info("   📚 Follows RFC 6125 Section 6.4.3 standards");
}

// Test 5: Archive Security - Path Traversal Prevention
console.info("\n5️⃣ Archive Security - Path Traversal Prevention:");

function demonstrateArchiveSecurity() {
  console.info("✅ Path traversal prevention in tarball extraction:");

  const maliciousPaths = [
    "/etc/passwd", // Absolute path - blocked
    "../../../etc/passwd", // Relative traversal - blocked
    "../../config.json", // Relative traversal - blocked
    "folder/../../../etc/passwd", // Mixed traversal - blocked
    "normal/file.txt", // Normal path - allowed
    "folder/subfolder/file.txt", // Normal nested path - allowed
  ];

  console.info("   📁 Path validation examples:");
  maliciousPaths.forEach((path) => {
    const isAbsolute = path.startsWith("/");
    const hasTraversal = path.includes("../");
    const isBlocked = isAbsolute || hasTraversal;

    const reason = isAbsolute
      ? "absolute path"
      : hasTraversal
        ? "relative traversal"
        : "normal path";

    console.info(
      `     "${path}" -> ${isBlocked ? "🚫 BLOCKED" : "✅ ALLOWED"} (${reason})`,
    );
  });

  console.info("\n   🛡️  Prevents escaping extraction directory");
  console.info("   🔒 Blocks symlink attacks");
  console.info("   📦 Secures bun install and archive extraction");
}

// Test 6: Memory Leak Fixes
console.info("\n6️⃣ Memory Leak Fixes:");

function demonstrateMemoryLeakFixes() {
  console.info("✅ Fixed memory leaks in node:zlib compression streams:");

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
    console.info(`   🔧 ${fix.component}:`);
    console.info(`      Issue: ${fix.issue}`);
    console.info(`      Fix: ${fix.fix}`);
  });

  console.info("\n   📈 Improved stability for long-running applications");
  console.info("   🚀 Better memory efficiency");
}

// Test 7: File I/O Improvements
console.info("\n7️⃣ File I/O Improvements:");

function demonstrateFileIOImprovements() {
  console.info("✅ Bun.write() mode option fix:");

  const fileIOExample = `
// Bun v1.3.6 now properly respects file mode
await Bun.write("output.txt", "content", {
  mode: 0o644  // Read/write for owner, read for group/others
});

// Before: Mode was ignored, inherited from source
// After: Mode is properly applied to the created file
  `;

  console.info(fileIOExample);

  console.info("✅ Fixed data corruption in files > 2GB:");
  console.info("   🔧 Large file writes now work correctly");
  console.info("   📊 Improved reliability for big data processing");

  console.info("✅ Better temp directory resolution:");
  console.info("   📁 Now checks TMPDIR, TMP, TEMP in order");
  console.info("   🔄 Matches Node.js os.tmpdir() behavior");
}

// Test 8: Network and Proxy Improvements
console.info("\n8️⃣ Network and Proxy Improvements:");

function demonstrateNetworkImprovements() {
  console.info("✅ HTTP client proxy authentication fix:");
  console.info("   🔧 Fixed hanging on 407 proxy auth failures");
  console.info(
    "   🌐 Now falls back to direct connections when proxy auth fails",
  );

  console.info("✅ NO_PROXY environment variable fix:");
  console.info("   🔧 Fixed parsing with empty entries");
  console.info("   🚫 Better proxy bypass handling");

  console.info("✅ WebSocket proxy support:");
  console.info("   🌐 Enables corporate network connectivity");
  console.info("   🔐 Full authentication and TLS support");
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

    console.info(
      "\n🎯 Summary of Bun v1.3.6 Security & Stability Improvements:",
    );
    console.info(
      "   🌐 WebSocket: HTTP/HTTPS proxy support + 128MB decompression limit",
    );
    console.info(
      "   🔒 Security: Null byte prevention + stricter certificate matching",
    );
    console.info(
      "   📦 Archive: Path traversal prevention in tarball extraction",
    );
    console.info("   🧠 Memory: Fixed leaks in zlib + fetch() stream cleanup");
    console.info("   📁 File I/O: Proper mode handling + >2GB file support");
    console.info("   🌐 Network: Proxy auth fixes + NO_PROXY parsing");
    console.info("   🔧 TLS: RFC 6125 compliant wildcard matching");

    console.info(
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
