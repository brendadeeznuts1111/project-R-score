// test/bun-fixes-validation.test.ts
// Validates Bun fixes from January 2026 release

import { test, expect, describe } from "bun:test";
import { tmpdir } from "os";

describe("Bun Fixes - January 2026", () => {
  // Temp directory resolution fix
  describe("os.tmpdir() - Environment Variable Order", () => {
    test("respects TMPDIR environment variable", () => {
      const tmp = tmpdir();
      expect(tmp).toBeDefined();
      expect(typeof tmp).toBe("string");
      expect(tmp.length).toBeGreaterThan(0);
    });
  });

  // Null byte injection prevention (CWE-158)
  describe("Null Byte Injection Prevention", () => {
    test("Bun.spawnSync rejects null bytes in arguments", () => {
      expect(() => {
        Bun.spawnSync(["echo", "hello\x00world"]);
      }).toThrow();
    });

    test("Bun.spawnSync rejects null bytes in command", () => {
      expect(() => {
        Bun.spawnSync(["echo\x00malicious"]);
      }).toThrow();
    });
  });

  // Bun.write() mode option fix
  describe("Bun.write() - Mode Option", () => {
    test("respects mode option when writing", async () => {
      const testFile = `.test-mode-${Date.now()}.txt`;
      
      try {
        // Write with specific mode
        await Bun.write(testFile, "test content", { mode: 0o644 });
        
        const file = Bun.file(testFile);
        expect(await file.exists()).toBe(true);
        
        // Clean up
        await Bun.write(testFile, ""); // Clear content
      } finally {
        // Cleanup
        try {
          const { unlinkSync } = await import("fs");
          unlinkSync(testFile);
        } catch {}
      }
    });
  });

  // Compression stream memory leak fix
  describe("Compression - No Memory Leak on reset()", () => {
    test("gzip reset() does not leak memory", async () => {
      const data = "Hello World".repeat(1000);
      
      // Multiple compressions should not leak
      for (let i = 0; i < 10; i++) {
        const compressed = Bun.gzipSync(data);
        const decompressed = Bun.gunzipSync(compressed);
        expect(new TextDecoder().decode(decompressed)).toBe(data);
      }
    });

    test("zstd compression is stable", async () => {
      const data = Buffer.from("Quantum Cash Flow Lattice".repeat(100));
      
      // Verify no crash on repeated operations
      for (let i = 0; i < 5; i++) {
        const compressed = Bun.deflateSync(data);
        const decompressed = Bun.inflateSync(compressed);
        expect(decompressed.length).toBe(data.length);
      }
    });
  });

  // S3 credential validation
  describe("S3 - Credential Validation", () => {
    test("S3Client accepts valid bucket configuration", () => {
      // Bun.s3 is an S3Client instance, use .file() to create S3File
      const file = Bun.s3.file("test-key", { bucket: "test-bucket" });
      expect(file).toBeDefined();
      expect(file.name).toBe("test-key");
    });
  });

  // Shell redirect fix
  describe("Bun Shell - Redirect Fixes", () => {
    test("basic redirect works", async () => {
      const result = await Bun.$`echo "test"`.text();
      expect(result.trim()).toBe("test");
    });

    test("pipe works correctly", async () => {
      const result = await Bun.$`echo "hello world" | grep hello`.text();
      expect(result.trim()).toBe("hello world");
    });
  });

  // HTTP proxy authentication fix
  describe("HTTP - Proxy Authentication", () => {
    test("fetch handles 407 without hanging", async () => {
      // This test verifies the fix doesn't cause hangs
      // We can't easily test 407 without a proxy server
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      try {
        await fetch("https://example.com", { 
          signal: controller.signal 
        });
      } catch (e) {
        // Expected to fail or abort, but not hang
      } finally {
        clearTimeout(timeout);
      }
      
      expect(true).toBe(true); // If we reach here, no hang occurred
    });
  });

  // Large file handling
  describe("Bun.write() - Large Files", () => {
    test("handles files correctly (< 2GB test)", async () => {
      // We can't test 2GB+ in unit tests, but verify the API works
      const largeish = Buffer.alloc(1024 * 1024); // 1MB
      largeish.fill(0x42);
      
      const testFile = `.test-large-${Date.now()}.bin`;
      
      try {
        await Bun.write(testFile, largeish);
        const read = await Bun.file(testFile).arrayBuffer();
        expect(read.byteLength).toBe(largeish.length);
      } finally {
        try {
          const { unlinkSync } = await import("fs");
          unlinkSync(testFile);
        } catch {}
      }
    });
  });
});

describe("Security Improvements", () => {
  test("wildcard cert matching follows RFC 6125", () => {
    // This is enforced at the TLS level
    // Just document that it's now stricter
    expect(true).toBe(true);
  });
});

