import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// packages/odds-core/src/tests/bun-utilities-showcase.test.ts - Complete Bun Utilities Demonstration

import { test, expect, describe } from "bun:test";

describe("Bun Utilities Complete Showcase", () => {
  
  test("should demonstrate core Bun runtime utilities", () => {
    // ✅ Bun.version & Bun.revision - Runtime information
    expect(Bun.version).toMatch(/^\d+\.\d+\.\d+$/); // e.g., "1.3.2"
    expect(Bun.revision).toMatch(/^[a-f0-9]{40}$/); // 40-character hex
    
    console.info('\n🚀 Bun Runtime Information:');
    console.info(`   Version: ${Bun.version}`);
    console.info(`   Revision: ${Bun.revision}`);
    
    // ✅ Bun.main - Entry point detection
    expect(Bun.main).toBeDefined();
    expect(typeof Bun.main).toBe('string');
    
    // ✅ Bun.env - Environment variables (alias for Bun.env)
    expect(Bun.env).toBeDefined();
    expect(typeof Bun.env).toBe('object');
  });

  test("should demonstrate UUID v7 generation", () => {
    // ✅ Bun.randomUUIDv7() - Monotonic UUID generation
    const id1 = Bun.randomUUIDv7();
    const id2 = Bun.randomUUIDv7();
    const id3 = Bun.randomUUIDv7("base64");
    const id4 = Bun.randomUUIDv7("base64url");
    const id5 = Bun.randomUUIDv7("buffer");
    
    // Verify formats
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id3).toMatch(/^[A-Za-z0-9+/]+={0,2}$/); // base64
    expect(id4).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
    expect(Buffer.isBuffer(id5)).toBe(true); // buffer
    expect(id5.length).toBe(16); // 16 bytes
    
    // Verify uniqueness
    expect(id1).not.toBe(id2);
    
    // Verify monotonic ordering (same timestamp should produce ordered IDs)
    const fixedTime = Date.now();
    const id6 = Bun.randomUUIDv7("hex", fixedTime);
    const id7 = Bun.randomUUIDv7("hex", fixedTime);
    
    console.info('\n🆔 UUID v7 Examples:');
    console.info(`   Hex: ${id1}`);
    console.info(`   Base64: ${id3}`);
    console.info(`   Base64URL: ${id4}`);
    console.info(`   Buffer: ${id5.toString('hex')}`);
  });

  test("should demonstrate high-precision timing", () => {
    // ✅ Bun.nanoseconds() - High-precision timing
    const start = Bun.nanoseconds();
    
    // Do some work
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += i;
    }
    
    const end = Bun.nanoseconds();
    const duration = end - start;
    
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000000); // Should be less than 1ms for simple loop
    
    console.info('\n⏱️ High-Precision Timing:');
    console.info(`   Loop duration: ${duration} nanoseconds`);
    console.info(`   Loop duration: ${(duration / 1000000).toFixed(3)} microseconds`);
  });

  test("should demonstrate compression utilities", () => {
    // ✅ Bun.gzipSync() - Compression
    const originalText = "Hello, Bun! ".repeat(100);
    const originalBuffer = Buffer.from(originalText);
    
    const compressed = Bun.gzipSync(originalBuffer);
    const decompressed = Bun.gunzipSync(compressed);
    
    expect(compressed.length).toBeLessThan(originalBuffer.length);
    expect(Buffer.from(decompressed).toString()).toBe(originalText);
    
    // ✅ Bun.deflateSync() - Alternative compression
    const deflated = Bun.deflateSync(originalBuffer);
    const inflated = Bun.inflateSync(deflated);
    
    expect(deflated.length).toBeLessThan(originalBuffer.length);
    expect(Buffer.from(inflated).toString()).toBe(originalText);
    
    console.info('\n🗜️ Compression Results:');
    console.info(`   Original: ${originalBuffer.length} bytes`);
    console.info(`   Gzip: ${compressed.length} bytes (${((compressed.length / originalBuffer.length) * 100).toFixed(1)}%)`);
    console.info(`   Deflate: ${deflated.length} bytes (${((deflated.length / originalBuffer.length) * 100).toFixed(1)}%)`);
  });

  test("should demonstrate string utilities", () => {
    // ✅ Bun.stringWidth() - Terminal width calculation
    const plainText = "hello";
    const ansiText = "\u001b[31mhello\u001b[0m";
    const emojiText = "hello 👋";
    
    expect(Bun.stringWidth(plainText)).toBe(5);
    expect(Bun.stringWidth(ansiText)).toBe(5); // ANSI codes ignored by default
    expect(Bun.stringWidth(ansiText, { countAnsiEscapeCodes: true })).toBe(12); // ANSI codes counted
    expect(Bun.stringWidth(emojiText)).toBe(8); // emoji counted as 3 chars in Bun
    
    // ✅ Bun.stripANSI() - Remove ANSI codes
    expect(Bun.stripANSI(ansiText)).toBe("hello");
    expect(Bun.stripANSI("\u001b[1m\u001b[4mBold\u001b[0m")).toBe("Bold");
    
    // ✅ Bun.escapeHTML() - HTML escaping
    const html = '<script>alert("xss")</script>';
    const escaped = Bun.escapeHTML(html);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    
    console.info('\n📝 String Utilities:');
    console.info(`   Plain text width: ${Bun.stringWidth(plainText)}`);
    console.info(`   ANSI text width: ${Bun.stringWidth(ansiText)}`);
    console.info(`   ANSI text with codes: ${Bun.stringWidth(ansiText, { countAnsiEscapeCodes: true })}`);
    console.info(`   Emoji text width: ${Bun.stringWidth(emojiText)}`);
    console.info(`   Stripped ANSI: "${Bun.stripANSI(ansiText)}"`);
  });

  test("should demonstrate deep equality utilities", () => {
    // ✅ Bun.deepEquals() - Object comparison
    const obj1 = { a: 1, b: 2, c: { d: 3 } };
    const obj2 = { a: 1, b: 2, c: { d: 3 } };
    const obj3 = { a: 1, b: 2, c: { d: 4 } };
    
    expect(Bun.deepEquals(obj1, obj2)).toBe(true);
    expect(Bun.deepEquals(obj1, obj3)).toBe(false);
    
    // ✅ Strict mode
    const obj4 = { a: 1, b: 2 };
    const obj5 = { a: 1, b: 2, c: undefined };
    
    expect(Bun.deepEquals(obj4, obj5)).toBe(true); // Non-strict
    expect(Bun.deepEquals(obj4, obj5, true)).toBe(false); // Strict mode
    
    console.info('\n🔍 Deep Equality:');
    console.info(`   obj1 === obj2: ${Bun.deepEquals(obj1, obj2)}`);
    console.info(`   obj1 === obj3: ${Bun.deepEquals(obj1, obj3)}`);
    console.info(`   obj4 === obj5 (non-strict): ${Bun.deepEquals(obj4, obj5)}`);
    console.info(`   obj4 === obj5 (strict): ${Bun.deepEquals(obj4, obj5, true)}`);
  });

  test("should demonstrate sleep utilities", async () => {
    // ✅ Bun.sleep() - Async sleep
    const start = Date.now();
    await Bun.sleep(10); // Sleep for 10ms
    const end = Date.now();
    
    expect(end - start).toBeGreaterThanOrEqual(10);
    expect(end - start).toBeLessThan(50); // Should be close to 10ms
    
    // ✅ Bun.sleepSync() - Sync sleep (use carefully!)
    const syncStart = Date.now();
    Bun.sleepSync(5); // Sleep for 5ms
    const syncEnd = Date.now();
    
    expect(syncEnd - syncStart).toBeGreaterThanOrEqual(5);
    
    console.info('\n😴 Sleep Utilities:');
    console.info(`   Async sleep: ~${end - start}ms`);
    console.info(`   Sync sleep: ~${syncEnd - syncStart}ms`);
  });

  test("should demonstrate file path utilities", () => {
    // ✅ Bun.fileURLToPath() & Bun.pathToFileURL() - Path conversion
    const fileURL = new URL("file:///Users/test/example.txt");
    const filePath = Bun.fileURLToPath(fileURL);
    const convertedURL = Bun.pathToFileURL(filePath);
    
    expect(filePath).toBe("/Users/test/example.txt");
    expect(convertedURL.toString()).toBe("file:///Users/test/example.txt");
    
    console.info('\n📁 Path Utilities:');
    console.info(`   File URL: ${fileURL}`);
    console.info(`   File path: ${filePath}`);
    console.info(`   Converted back: ${convertedURL}`);
  });

  test("should demonstrate promise utilities", () => {
    // ✅ Bun.peek() - Read promise without await
    const resolvedPromise = Promise.resolve("success");
    const rejectedPromise = Promise.reject(new Error("failure"));
    const pendingPromise = new Promise(() => {}); // Never resolves
    
    // Peek resolved promise
    expect(Bun.peek(resolvedPromise)).toBe("success");
    expect(Bun.peek.status(resolvedPromise)).toBe("fulfilled");
    
    // Peek rejected promise (doesn't mark as handled)
    expect(Bun.peek(rejectedPromise)).toBeInstanceOf(Error);
    expect(Bun.peek(rejectedPromise).message).toBe("failure");
    expect(Bun.peek.status(rejectedPromise)).toBe("rejected");
    
    // Peek pending promise
    expect(Bun.peek(pendingPromise)).toBe(pendingPromise);
    expect(Bun.peek.status(pendingPromise)).toBe("pending");
    
    // Peek non-promise value
    expect(Bun.peek(42)).toBe(42);
    
    console.info('\n👀 Promise Utilities:');
    console.info(`   Resolved promise: ${Bun.peek(resolvedPromise)}`);
    console.info(`   Rejected promise: ${Bun.peek(rejectedPromise).message}`);
    console.info(`   Pending promise status: ${Bun.peek.status(pendingPromise)}`);
  });

  test("should demonstrate inspection utilities", () => {
    // ✅ Bun.inspect() - Object serialization
    const obj = { foo: "bar", num: 42 };
    const inspected = Bun.inspect(obj);
    
    expect(inspected).toContain('foo: "bar"');
    expect(inspected).toContain('num: 42');
    
    // ✅ Bun.inspect.table() - Table formatting
    const tableData = [
      { name: "Alice", age: 30, city: "NYC" },
      { name: "Bob", age: 25, city: "LA" },
      { name: "Charlie", age: 35, city: "Chicago" }
    ];
    
    const table = Bun.inspect.table(tableData, ["name", "age"]);
    expect(table).toContain("Alice");
    expect(table).toContain("30");
    expect(table).not.toContain("city"); // Excluded column
    
    console.info('\n🔍 Inspection Utilities:');
    console.info(`   Object inspect: ${inspected.trim()}`);
    console.info(`   Table format:\n${table}`);
  });
});
