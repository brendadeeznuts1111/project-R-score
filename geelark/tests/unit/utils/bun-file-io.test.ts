#!/usr/bin/env bun

// @ts-ignore - bun:test types are available when running with Bun
import { describe, expect, it } from "bun:test";
// @ts-ignore - test utilities are available when running with Bun
import { testUtils } from "../../config/test-setup";

// Note: This file demonstrates Bun's optimized file I/O APIs
// All Bun globals are available when running with Bun test runner
// @ts-ignore - Bun globals are available when running with Bun

describe("Bun File I/O Best Practices", () => {
  const tempDir = testUtils.createTempDir();

  it("should demonstrate Bun.file for reading", async () => {
    // Create a test file using Bun.write
    const testFile = `${tempDir}/test-read.txt`;
    const content = "Hello, Bun file I/O!";

    await Bun.write(testFile, content);

    // Read using Bun.file - optimized for performance
    const file = Bun.file(testFile);
    const readContent = await file.text();

    expect(readContent).toBe(content);
    expect(file.size).toBe(content.length);
    expect(file.type).toBe("text/plain");

    // Cleanup
    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate Bun.write for writing", async () => {
    const testFile = `${tempDir}/test-write.txt`;
    const content = "Written with Bun.write()";

    // Bun.write is optimized for performance
    await Bun.write(testFile, content);

    // Verify the write
    const file = Bun.file(testFile);
    expect(await file.text()).toBe(content);

    // Test writing different data types
    const jsonFile = `${tempDir}/test.json`;
    const jsonData = { test: true, message: "Bun I/O" };

    await Bun.write(jsonFile, JSON.stringify(jsonData));
    const readJson = JSON.parse(await Bun.file(jsonFile).text());

    expect(readJson).toEqual(jsonData);

    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate file existence checking", async () => {
    const testFile = `${tempDir}/existence.txt`;

    // Check non-existent file
    expect(await Bun.file(testFile).exists()).toBe(false);

    // Create file
    await Bun.write(testFile, "I exist!");

    // Check existing file
    expect(await Bun.file(testFile).exists()).toBe(true);

    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate streaming with file I/O", async () => {
    const testFile = `${tempDir}/stream.txt`;
    const largeContent = "Line 1\n".repeat(1000);

    // Write large content
    await Bun.write(testFile, largeContent);

    // Read as stream for memory efficiency using getReader()
    const file = Bun.file(testFile);
    const stream = file.stream();

    const reader = stream.getReader();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }

    expect(result).toBe(largeContent);

    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate streaming with for await pattern", async () => {
    const testFile = `${tempDir}/stream-iterable.txt`;
    const content = "Hello, World!\n".repeat(100);

    await Bun.write(testFile, content);

    const file = Bun.file(testFile);
    const stream = file.stream();

    // Use for await pattern (async iterable)
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Reconstruct content
    const decoder = new TextDecoder();
    const reconstructed = chunks.map(chunk => decoder.decode(chunk)).join('');

    expect(reconstructed).toBe(content);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c instanceof Uint8Array)).toBe(true);

    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate binary file handling", async () => {
    const binaryFile = `${tempDir}/binary.bin`;
    const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

    // Write binary data
    await Bun.write(binaryFile, binaryData);

    // Read binary data using arrayBuffer()
    const file = Bun.file(binaryFile);
    const readBinary = await file.arrayBuffer();
    const readArray = new Uint8Array(readBinary);

    expect(readArray).toEqual(binaryData);

    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate file.bytes() method", async () => {
    const binaryFile = `${tempDir}/bytes-test.bin`;
    const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64]); // "Hello World"

    // Write binary data
    await Bun.write(binaryFile, binaryData);

    // Read using bytes() - returns Uint8Array directly
    const file = Bun.file(binaryFile);
    const byteArray = await file.bytes();

    // Verify it's a Uint8Array
    expect(byteArray).toBeInstanceOf(Uint8Array);
    expect(byteArray.length).toBe(binaryData.length);
    expect(byteArray).toEqual(binaryData);

    // Test direct byte access
    expect(byteArray[0]).toBe(0x48); // 'H'
    expect(byteArray[byteArray.length - 1]).toBe(0x64); // 'd'

    // Convert to string
    const text = new TextDecoder().decode(byteArray);
    expect(text).toBe("Hello World");

    testUtils.cleanupTempDir(tempDir);
  });

  it("should compare bytes() vs arrayBuffer()", async () => {
    const testFile = `${tempDir}/compare-test.bin`;
    const originalData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);

    await Bun.write(testFile, originalData);

    const file = Bun.file(testFile);

    // Method 1: bytes() - direct Uint8Array
    const bytes1 = await file.bytes();

    // Method 2: arrayBuffer() - need to wrap
    const arrayBuffer = await file.arrayBuffer();
    const bytes2 = new Uint8Array(arrayBuffer);

    // Both should be equal
    expect(bytes1).toEqual(bytes2);
    expect(bytes1).toEqual(originalData);
    expect(bytes2).toEqual(originalData);

    // bytes() is more convenient - no wrapping needed
    expect(bytes1).toBeInstanceOf(Uint8Array);
    expect(bytes2).toBeInstanceOf(Uint8Array);

    testUtils.cleanupTempDir(tempDir);
  });

  it("should demonstrate file.type MIME type detection", async () => {
    // Test JSON file
    const jsonFile = `${tempDir}/test.json`;
    await Bun.write(jsonFile, '{"test": true}');
    const json = Bun.file(jsonFile);
    expect(json.type).toContain('application/json');

    // Test HTML file
    const htmlFile = `${tempDir}/test.html`;
    await Bun.write(htmlFile, '<html><body>Hello</body></html>');
    const html = Bun.file(htmlFile);
    expect(html.type).toContain('text/html');

    // Test text file
    const textFile = `${tempDir}/test.txt`;
    await Bun.write(textFile, 'Hello, World!');
    const text = Bun.file(textFile);
    expect(text.type).toContain('text/plain');

    testUtils.cleanupTempDir(tempDir);
  });
});
