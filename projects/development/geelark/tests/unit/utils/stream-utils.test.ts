#!/usr/bin/env bun

/**
 * Tests for StreamUtils
 * Enhanced stream utilities using Bun's native capabilities
 */

// @ts-ignore - bun:test types are available when running with Bun
import { describe, expect, it } from "bun:test";
// @ts-ignore - test utilities are available when running with Bun
import { testUtils } from "../../config/test-setup";
import { Stream, StreamUtils } from "../../../src/utils/StreamUtils";

describe("StreamUtils", () => {
  const tempDir = testUtils.createTempDir();

  describe("uint8ArrayToStream", () => {
    it("should convert empty array to empty stream", async () => {
      const arr = new Uint8Array(0);
      const stream = StreamUtils.uint8ArrayToStream(arr);

      const reader = stream.getReader();
      const { done, value } = await reader.read();

      expect(done).toBe(true);
      expect(value).toBeUndefined();
    });

    it("should convert array to stream with default chunk size", async () => {
      const data = new TextEncoder().encode("Hello, World!");
      const stream = StreamUtils.uint8ArrayToStream(data);

      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      expect(totalLength).toBe(data.length);
    });

    it("should respect custom chunk size", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const stream = StreamUtils.uint8ArrayToStream(data, { chunkSize: 3 });

      const reader = stream.getReader();
      const chunkSizes: number[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunkSizes.push(value.length);
      }

      expect(chunkSizes).toEqual([3, 3, 3, 1]);
    });

    it("should throttle streaming with delay option", async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const stream = StreamUtils.uint8ArrayToStream(data, {
        chunkSize: 1,
        delay: 10
      });

      const start = Date.now();
      const reader = stream.getReader();

      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(30); // 3 delays of 10ms each
    });
  });

  describe("readableTo", () => {
    it("should convert stream to ArrayBuffer", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from([Buffer.from("Hello"), Buffer.from(" World")]);

      const buffer = await StreamUtils.readableTo(stream, "arrayBuffer");
      const text = new TextDecoder().decode(buffer);

      expect(text).toBe("Hello World");
    });

    it("should convert stream to text", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from(["Hello, ", "stream!"]);

      const text = await StreamUtils.readableTo(stream, "text");

      expect(text).toBe("Hello, stream!");
    });

    it("should convert stream to JSON", async () => {
      const { Readable } = require("stream");
      const data = { hello: "world", num: 42 };
      const stream = Readable.from([JSON.stringify(data)]);

      const json = await StreamUtils.readableTo(stream, "json");

      expect(json).toEqual(data);
    });

    it("should convert stream to Blob", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from([Buffer.from("blob data")]);

      const blob = await StreamUtils.readableTo(stream, "blob");

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(9);
      expect(await blob.text()).toBe("blob data");
    });
  });

  describe("shorthand methods", () => {
    it("should use readableToArrayBuffer", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from([Buffer.from("test")]);

      const buffer = await StreamUtils.readableToArrayBuffer(stream);
      const text = new TextDecoder().decode(buffer);

      expect(text).toBe("test");
    });

    it("should use readableToText", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from(["text", " data"]);

      const text = await StreamUtils.readableToText(stream);

      expect(text).toBe("text data");
    });

    it("should use readableToJson with type", async () => {
      const { Readable } = require("stream");
      interface TestData { foo: string; bar: number }
      const stream = Readable.from([JSON.stringify({ foo: "test", bar: 123 })]);

      const json = await StreamUtils.readableToJson<TestData>(stream);

      expect(json).toEqual({ foo: "test", bar: 123 });
    });

    it("should use readableToBlob", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from([Buffer.from("blobby")]);

      const blob = await StreamUtils.readableToBlob(stream);

      expect(await blob.text()).toBe("blobby");
    });
  });

  describe("createStreamingResponse", () => {
    it("should create Response from Uint8Array", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const response = StreamUtils.createStreamingResponse(data);

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("application/octet-stream");

      const received = await response.arrayBuffer();
      expect(new Uint8Array(received)).toEqual(data);
    });

    it("should create Response from string", async () => {
      const text = "Hello, streaming!";
      const response = StreamUtils.createStreamingResponse(text);

      expect(await response.text()).toBe(text);
    });

    it("should use custom options", async () => {
      const data = new TextEncoder().encode("a".repeat(100));
      const response = StreamUtils.createStreamingResponse(data, {
        chunkSize: 10
      });

      expect(response).toBeInstanceOf(Response);
      expect(await response.arrayBuffer()).toEqual(data.buffer);
    });
  });

  describe("streamToFile", () => {
    it("should write stream to file", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const stream = StreamUtils.uint8ArrayToStream(data);
      const targetFile = `${tempDir}/stream-output.bin`;

      await StreamUtils.streamToFile(stream, targetFile);

      const file = Bun.file(targetFile);
      expect(await file.exists()).toBe(true);

      const content = await file.arrayBuffer();
      expect(new Uint8Array(content)).toEqual(data);

      testUtils.cleanupTempDir(tempDir);
    });

    it("should handle large streams", async () => {
      const data = new Uint8Array(10000).fill(0x42);
      const stream = StreamUtils.uint8ArrayToStream(data, { chunkSize: 1024 });
      const targetFile = `${tempDir}/large-stream.bin`;

      await StreamUtils.streamToFile(stream, targetFile);

      const file = Bun.file(targetFile);
      const content = new Uint8Array(await file.arrayBuffer());

      expect(content.length).toBe(10000);
      expect(content.every(byte => byte === 0x42)).toBe(true);

      testUtils.cleanupTempDir(tempDir);
    });
  });

  describe("mergeArrays", () => {
    it("should merge multiple arrays", async () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([4, 5]);
      const arr3 = new Uint8Array([6, 7, 8, 9]);

      const stream = StreamUtils.mergeArrays([arr1, arr2, arr3]);

      const reader = stream.getReader();
      const result: number[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result.push(...value);
      }

      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("should merge empty arrays", async () => {
      const stream = StreamUtils.mergeArrays([]);

      const reader = stream.getReader();
      const { done } = await reader.read();

      expect(done).toBe(true);
    });

    it("should respect custom options when merging", async () => {
      const arr1 = new Uint8Array([1, 2, 3, 4]);
      const arr2 = new Uint8Array([5, 6]);

      const stream = StreamUtils.mergeArrays([arr1, arr2], {
        chunkSize: 2
      });

      const reader = stream.getReader();
      const chunkSizes: number[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunkSizes.push(value.length);
      }

      expect(chunkSizes).toEqual([2, 2, 2]);
    });
  });

  describe("createTransformStream", () => {
    it("should transform chunks", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const sourceStream = StreamUtils.uint8ArrayToStream(data, { chunkSize: 2 });

      const transform = StreamUtils.createTransformStream(async (chunk) => {
        // Double each byte value
        return new Uint8Array(chunk.map(b => b * 2));
      });

      const transformed = sourceStream.pipeThrough(transform);
      const reader = transformed.getReader();
      const result: number[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result.push(...value);
      }

      expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    it("should handle async transform functions", async () => {
      const data = new Uint8Array([1, 2, 3]);
      const sourceStream = StreamUtils.uint8ArrayToStream(data);

      const transform = StreamUtils.createTransformStream(async (chunk) => {
        await Bun.sleep(1); // Simulate async work
        return new Uint8Array(chunk.map(b => b + 1));
      });

      const transformed = sourceStream.pipeThrough(transform);
      const reader = transformed.getReader();
      const result: number[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result.push(...value);
      }

      expect(result).toEqual([2, 3, 4]);
    });
  });
});

describe("Stream utility exports", () => {
  it("should export all utility functions", () => {
    expect(Stream.toStream).toBeDefined();
    expect(Stream.toArrayBuffer).toBeDefined();
    expect(Stream.toText).toBeDefined();
    expect(Stream.toJson).toBeDefined();
    expect(Stream.toBlob).toBeDefined();
    expect(Stream.response).toBeDefined();
    expect(Stream.toFile).toBeDefined();
    expect(Stream.merge).toBeDefined();
    expect(Stream.transform).toBeDefined();
  });

  it("should use Stream.toStream shorthand", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const stream = Stream.toStream(data);

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("should use Stream.toArrayBuffer shorthand", async () => {
    const { Readable } = require("stream");
    const stream = Readable.from([Buffer.from("test")]);

    const buffer = await Stream.toArrayBuffer(stream);
    const text = new TextDecoder().decode(buffer);

    expect(text).toBe("test");
  });
});
