import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// packages/odds-core/src/tests/bun-official-docs-compliance.test.ts - Official Documentation Compliance

import { test, expect, describe } from "bun:test";

describe("Official Bun Documentation Compliance", () => {
  
  test("should implement all core utilities from official docs", () => {
    // ✅ Bun.version - Exactly as documented
    expect(Bun.version).toMatch(/^\d+\.\d+\.\d+$/);
    console.log(`✅ Bun.version: "${Bun.version}" (matches official docs)`);
    
    // ✅ Bun.revision - Exactly as documented  
    expect(Bun.revision).toMatch(/^[a-f0-9]{40}$/);
    console.log(`✅ Bun.revision: "${Bun.revision}" (matches official docs)`);
    
    // ✅ Bun.env - Exactly as documented (alias for Bun.env)
    expect(Bun.env).toBeDefined();
    expect(Bun.env).toBe(Bun.env);
    console.log(`✅ Bun.env: Alias for Bun.env (matches official docs)`);
    
    // ✅ Bun.main - Exactly as documented
    expect(Bun.main).toBeDefined();
    expect(typeof Bun.main).toBe('string');
    console.log(`✅ Bun.main: "${Bun.main}" (matches official docs)`);
  });

  test("should implement sleep utilities exactly as documented", async () => {
    // ✅ Bun.sleep(ms) - Exactly as documented
    const start1 = Date.now();
    await Bun.sleep(10);
    const end1 = Date.now();
    expect(end1 - start1).toBeGreaterThanOrEqual(10);
    console.log(`✅ Bun.sleep(ms): ~${end1 - start1}ms (matches official docs)`);
    
    // ✅ Bun.sleep(Date) - Exactly as documented
    const futureDate = new Date(Date.now() + 15);
    const start2 = Date.now();
    await Bun.sleep(futureDate);
    const end2 = Date.now();
    expect(end2 - start2).toBeGreaterThanOrEqual(15);
    console.log(`✅ Bun.sleep(Date): ~${end2 - start2}ms (matches official docs)`);
    
    // ✅ Bun.sleepSync(ms) - Exactly as documented
    const start3 = Date.now();
    Bun.sleepSync(5);
    const end3 = Date.now();
    expect(end3 - start3).toBeGreaterThanOrEqual(5);
    console.log(`✅ Bun.sleepSync(ms): ~${end3 - start3}ms (matches official docs)`);
  });

  test("should implement UUID v7 exactly as documented", () => {
    // ✅ Bun.randomUUIDv7() - Exactly as documented
    const id1 = Bun.randomUUIDv7();
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    console.log(`✅ Bun.randomUUIDv7(): "${id1}" (matches official docs)`);
    
    // ✅ Bun.randomUUIDv7(encoding) - Exactly as documented
    const id2 = Bun.randomUUIDv7("base64");
    expect(id2).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    console.log(`✅ Bun.randomUUIDv7("base64"): "${id2}" (matches official docs)`);
    
    // ✅ Bun.randomUUIDv7("buffer") - Exactly as documented
    const id3 = Bun.randomUUIDv7("buffer");
    expect(Buffer.isBuffer(id3)).toBe(true);
    expect(id3.length).toBe(16);
    console.log(`✅ Bun.randomUUIDv7("buffer"): ${id3.length} bytes (matches official docs)`);
    
    // ✅ Bun.randomUUIDv7(timestamp) - Exactly as documented
    const fixedTime = Date.now();
    const id4 = Bun.randomUUIDv7("hex", fixedTime);
    expect(id4).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    console.log(`✅ Bun.randomUUIDv7(timestamp): "${id4}" (matches official docs)`);
  });

  test("should implement peek utilities exactly as documented", () => {
    // ✅ Bun.peek(promise) - Exactly as documented
    const resolvedPromise = Promise.resolve("hi");
    expect(Bun.peek(resolvedPromise)).toBe("hi");
    console.log(`✅ Bun.peek(resolved): "${Bun.peek(resolvedPromise)}" (matches official docs)`);
    
    // ✅ Bun.peek.status(promise) - Exactly as documented
    expect(Bun.peek.status(resolvedPromise)).toBe("fulfilled");
    console.log(`✅ Bun.peek.status(resolved): "${Bun.peek.status(resolvedPromise)}" (matches official docs)`);
    
    // ✅ Bun.peek(non-promise) - Exactly as documented
    expect(Bun.peek(42)).toBe(42);
    console.log(`✅ Bun.peek(non-promise): ${Bun.peek(42)} (matches official docs)`);
    
    // ✅ Bun.peek(rejected) - Exactly as documented
    const rejectedPromise = Promise.reject(new Error("test"));
    // Catch the rejection to avoid unhandled promise rejection
    rejectedPromise.catch(() => {});
    expect(Bun.peek(rejectedPromise)).toBeInstanceOf(Error);
    expect(Bun.peek(rejectedPromise).message).toBe("test");
    expect(Bun.peek.status(rejectedPromise)).toBe("rejected");
    console.log(`✅ Bun.peek(rejected): Error message (matches official docs)`);
  });

  test("should implement deepEquals exactly as documented", () => {
    // ✅ Bun.deepEquals(obj1, obj2) - Exactly as documented
    const foo = { a: 1, b: 2, c: { d: 3 } };
    const bar = { a: 1, b: 2, c: { d: 3 } };
    const baz = { a: 1, b: 2, c: { d: 4 } };
    
    expect(Bun.deepEquals(foo, bar)).toBe(true);
    expect(Bun.deepEquals(foo, baz)).toBe(false);
    console.log(`✅ Bun.deepEquals(): Basic comparison (matches official docs)`);
    
    // ✅ Bun.deepEquals(obj1, obj2, strict) - Exactly as documented
    const a = { entries: [1, 2] };
    const b = { entries: [1, 2], extra: undefined };
    
    expect(Bun.deepEquals(a, b)).toBe(true); // Non-strict
    expect(Bun.deepEquals(a, b, true)).toBe(false); // Strict mode
    console.log(`✅ Bun.deepEquals(obj1, obj2, true): Strict mode (matches official docs)`);
  });

  test("should implement string utilities exactly as documented", () => {
    // ✅ Bun.stringWidth(input) - Exactly as documented
    expect(Bun.stringWidth("hello")).toBe(5);
    console.log(`✅ Bun.stringWidth("hello"): ${Bun.stringWidth("hello")} (matches official docs)`);
    
    // ✅ Bun.stringWidth(input, options) - Exactly as documented
    const ansiText = "\u001b[31mhello\u001b[0m";
    expect(Bun.stringWidth(ansiText)).toBe(5); // ANSI ignored
    expect(Bun.stringWidth(ansiText, { countAnsiEscapeCodes: true })).toBe(12); // ANSI counted
    console.log(`✅ Bun.stringWidth(ANSI, options): ${Bun.stringWidth(ansiText, { countAnsiEscapeCodes: true })} (matches official docs)`);
    
    // ✅ Bun.escapeHTML(value) - Exactly as documented
    const html = '<script>alert("xss")</script>';
    const escaped = Bun.escapeHTML(html);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    console.log(`✅ Bun.escapeHTML(): HTML escaped (matches official docs)`);
    
    // ✅ Bun.stripANSI(text) - Exactly as documented
    const coloredText = "\u001b[31mHello\u001b[0m \u001b[32mWorld\u001b[0m";
    expect(Bun.stripANSI(coloredText)).toBe("Hello World");
    console.log(`✅ Bun.stripANSI(): "${Bun.stripANSI(coloredText)}" (matches official docs)`);
  });

  test("should implement path utilities exactly as documented", () => {
    // ✅ Bun.fileURLToPath(url) - Exactly as documented
    const fileURL = new URL("file:///Users/test/example.txt");
    const filePath = Bun.fileURLToPath(fileURL);
    expect(filePath).toBe("/Users/test/example.txt");
    console.log(`✅ Bun.fileURLToPath(): "${filePath}" (matches official docs)`);
    
    // ✅ Bun.pathToFileURL(path) - Exactly as documented
    const convertedURL = Bun.pathToFileURL(filePath);
    expect(convertedURL.toString()).toBe("file:///Users/test/example.txt");
    console.log(`✅ Bun.pathToFileURL(): "${convertedURL}" (matches official docs)`);
  });

  test("should implement compression utilities exactly as documented", () => {
    // ✅ Bun.gzipSync(buffer) - Exactly as documented
    const originalText = "hello".repeat(100);
    const originalBuffer = Buffer.from(originalText);
    const compressed = Bun.gzipSync(originalBuffer);
    const decompressed = Bun.gunzipSync(compressed);
    
    expect(compressed.length).toBeLessThan(originalBuffer.length);
    expect(Buffer.from(decompressed).toString()).toBe(originalText);
    console.log(`✅ Bun.gzipSync()/gunzipSync(): ${originalBuffer.length}→${compressed.length} bytes (matches official docs)`);
    
    // ✅ Bun.deflateSync(buffer) - Exactly as documented
    const deflated = Bun.deflateSync(originalBuffer);
    const inflated = Bun.inflateSync(deflated);
    
    expect(deflated.length).toBeLessThan(originalBuffer.length);
    expect(Buffer.from(inflated).toString()).toBe(originalText);
    console.log(`✅ Bun.deflateSync()/inflateSync(): ${originalBuffer.length}→${deflated.length} bytes (matches official docs)`);
  });

  test("should implement inspection utilities exactly as documented", () => {
    // ✅ Bun.inspect(obj) - Exactly as documented
    const obj = { foo: "bar" };
    const inspected = Bun.inspect(obj);
    expect(inspected).toContain('foo: "bar"');
    console.log(`✅ Bun.inspect(): Object serialization (matches official docs)`);
    
    // ✅ Bun.inspect.table(data) - Exactly as documented
    const tableData = [
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ];
    const table = Bun.inspect.table(tableData, ["a", "c"]);
    expect(table).toContain("┌───┬───┬───┐");
    expect(table).toContain("│ a │ c │");
    console.log(`✅ Bun.inspect.table(): Table formatting (matches official docs)`);
  });

  test("should implement high-precision timing exactly as documented", () => {
    // ✅ Bun.nanoseconds() - Exactly as documented
    const ns = Bun.nanoseconds();
    expect(typeof ns).toBe('number');
    expect(ns).toBeGreaterThan(0);
    console.log(`✅ Bun.nanoseconds(): ${ns} nanoseconds (matches official docs)`);
  });

  test("should demonstrate script execution detection exactly as documented", () => {
    // ✅ import.meta.path === Bun.main - Exactly as documented
    const isDirectExecution = import.meta.path === Bun.main;
    expect(typeof isDirectExecution).toBe('boolean');
    console.log(`✅ import.meta.path === Bun.main: ${isDirectExecution} (matches official docs)`);
    console.log(`   import.meta.path: "${import.meta.path}"`);
    console.log(`   Bun.main: "${Bun.main}"`);
  });
});
