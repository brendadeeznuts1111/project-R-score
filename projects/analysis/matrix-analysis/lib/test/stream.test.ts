import { describe, it, expect } from "bun:test";
import {
  toText,
  toJson,
  toBytes,
  toBuffer,
  toBlob,
  toArray,
  fromIterable,
  fromText,
  peek,
  status,
  zstdCompress,
  zstdDecompress,
  zstdCompressSync,
  zstdDecompressSync,
  gzip,
  gunzip,
  deflate,
  inflate,
  concatBuffers,
  toFormData,
} from "../src/core/stream.ts";

const makeStream = (text: string): ReadableStream =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

describe("stream", () => {
  describe("BN-040: toText", () => {
    it("should consume stream as text", async () => {
      const s = makeStream("hello world");
      expect(await toText(s)).toBe("hello world");
    });
  });

  describe("BN-040: toJson", () => {
    it("should consume stream as parsed JSON", async () => {
      const s = makeStream('{"ok": true}');
      expect(await toJson<{ ok: boolean }>(s)).toEqual({ ok: true });
    });
  });

  describe("BN-040: toBytes", () => {
    it("should consume stream as Uint8Array", async () => {
      const s = makeStream("abc");
      const bytes = await toBytes(s);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(3);
      expect(bytes[0]).toBe(0x61);
      expect(bytes[1]).toBe(0x62);
      expect(bytes[2]).toBe(0x63);
    });

    it("should preserve binary data byte-for-byte", async () => {
      const raw = new Uint8Array([0x00, 0xFF, 0x80, 0x7F, 0x01]);
      const s = new ReadableStream({
        start(controller) {
          controller.enqueue(raw);
          controller.close();
        },
      });
      const bytes = await toBytes(s);
      expect(bytes.length).toBe(5);
      expect(Array.from(bytes)).toEqual([0x00, 0xFF, 0x80, 0x7F, 0x01]);
    });
  });

  describe("BN-040: toBuffer", () => {
    it("should consume stream as ArrayBuffer with correct bytes", async () => {
      const s = makeStream("abc");
      const buf = await toBuffer(s);
      expect(buf).toBeInstanceOf(ArrayBuffer);
      expect(buf.byteLength).toBe(3);
      const view = new Uint8Array(buf);
      expect(view[0]).toBe(0x61);
      expect(view[1]).toBe(0x62);
      expect(view[2]).toBe(0x63);
    });
  });

  describe("BN-040: toBlob", () => {
    it("should consume stream as Blob", async () => {
      const s = makeStream("hello");
      const blob = await toBlob(s);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(5);
    });
  });

  describe("BN-040: toArray", () => {
    it("should consume stream as array of chunks", async () => {
      const s = makeStream("data");
      const arr = await toArray(s);
      expect(arr.length).toBeGreaterThan(0);
    });
  });

  describe("BN-041: fromIterable", () => {
    it("should create stream from sync iterable", async () => {
      const s = fromIterable(["a", "b", "c"]);
      const arr = await toArray<string>(s);
      expect(arr).toEqual(["a", "b", "c"]);
    });

    it("should create stream from async iterable", async () => {
      async function* gen() {
        yield "x";
        yield "y";
      }
      const s = fromIterable(gen());
      const arr = await toArray<string>(s);
      expect(arr).toEqual(["x", "y"]);
    });
  });

  describe("BN-041: fromText", () => {
    it("should create stream from text and read back", async () => {
      const s = fromText("hello stream");
      const text = await toText(s);
      expect(text).toBe("hello stream");
    });
  });

  describe("BN-042: peek/status", () => {
    it("should peek at a resolved promise", () => {
      const p = Promise.resolve(42);
      expect(peek(p)).toBe(42);
    });

    it("should return fulfilled status for resolved promise", () => {
      const p = Promise.resolve("done");
      expect(status(p)).toBe("fulfilled");
    });

    it("should return pending status for unresolved promise", () => {
      const p = new Promise(() => {});
      expect(status(p)).toBe("pending");
    });
  });

  describe("BN-043: Compression", () => {
    it("should zstd compress and decompress async", async () => {
      const input = "hello world ".repeat(100);
      const compressed = await zstdCompress(input);
      expect(compressed).not.toBeNull();
      expect(compressed!.length).toBeLessThan(input.length);
      const decompressed = await zstdDecompress(compressed!);
      expect(decompressed).not.toBeNull();
      expect(new TextDecoder().decode(decompressed!)).toBe(input);
    });

    it("should zstd compress and decompress sync", () => {
      const input = "sync test data ".repeat(50);
      const compressed = zstdCompressSync(input);
      expect(compressed).not.toBeNull();
      const decompressed = zstdDecompressSync(compressed!);
      expect(decompressed).not.toBeNull();
      expect(new TextDecoder().decode(decompressed!)).toBe(input);
    });

    it("should gzip and gunzip", () => {
      const input = "gzip test data ".repeat(50);
      const compressed = gzip(input);
      expect(compressed).not.toBeNull();
      expect(compressed!.length).toBeLessThan(input.length);
      const decompressed = gunzip(compressed!);
      expect(decompressed).not.toBeNull();
      expect(new TextDecoder().decode(decompressed!)).toBe(input);
    });

    it("should preserve binary bytes through gzip roundtrip", () => {
      const raw = new Uint8Array([0x00, 0xFF, 0x80, 0x7F, 0x01, 0xFE]);
      const compressed = gzip(raw);
      expect(compressed).not.toBeNull();
      const decompressed = gunzip(compressed!);
      expect(decompressed).not.toBeNull();
      expect(Array.from(decompressed!)).toEqual([0x00, 0xFF, 0x80, 0x7F, 0x01, 0xFE]);
    });

    it("should preserve binary bytes through zstd roundtrip", () => {
      const raw = new Uint8Array(256);
      for (let i = 0; i < 256; i++) raw[i] = i;
      const compressed = zstdCompressSync(raw);
      expect(compressed).not.toBeNull();
      const decompressed = zstdDecompressSync(compressed!);
      expect(decompressed).not.toBeNull();
      expect(decompressed!.length).toBe(256);
      for (let i = 0; i < 256; i++) {
        expect(decompressed![i]).toBe(i);
      }
    });

    it("should preserve binary bytes through deflate roundtrip", () => {
      const raw = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF]);
      const compressed = deflate(raw);
      expect(compressed).not.toBeNull();
      const decompressed = inflate(compressed!);
      expect(decompressed).not.toBeNull();
      expect(Array.from(decompressed!)).toEqual([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF]);
    });

    it("should return null for invalid decompress", () => {
      expect(zstdDecompressSync(new Uint8Array([0, 1, 2, 3]))).toBeNull();
      expect(gunzip(new Uint8Array([0, 1, 2, 3]))).toBeNull();
    });

    it("should return null for invalid async zstd decompress", async () => {
      expect(await zstdDecompress(new Uint8Array([0, 1, 2, 3]))).toBeNull();
    });

    it("should return null for zstdCompress with null input", async () => {
      expect(await zstdCompress(null as any)).toBeNull();
    });

    it("should return null for zstdCompressSync with null input", () => {
      expect(zstdCompressSync(null as any)).toBeNull();
    });

    it("should return null for gzip with null input", () => {
      expect(gzip(null as any)).toBeNull();
    });
  });

  describe("BN-097: Deflate/Inflate", () => {
    it("should deflate and inflate roundtrip", () => {
      const input = "deflate test data ".repeat(50);
      const compressed = deflate(input);
      expect(compressed).not.toBeNull();
      expect(compressed!.length).toBeLessThan(input.length);
      const decompressed = inflate(compressed!);
      expect(decompressed).not.toBeNull();
      expect(new TextDecoder().decode(decompressed!)).toBe(input);
    });

    it("should return null for invalid inflate", () => {
      expect(inflate(new Uint8Array([0, 1, 2, 3]))).toBeNull();
    });

    it("should return null for invalid deflate input", () => {
      // deflate() accepts string/Uint8Array/ArrayBuffer, but null will catch
      expect(deflate(null as any)).toBeNull();
    });
  });

  describe("BN-098: Buffer Utilities", () => {
    it("should concatenate array buffers", () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const result = new Uint8Array(concatBuffers([a, b]));
      expect(result.length).toBe(6);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should handle empty array", () => {
      const result = concatBuffers([]);
      expect(result.byteLength).toBe(0);
    });

    it("should preserve byte boundaries across buffers", () => {
      const a = new Uint8Array([0xFF, 0x00]);
      const b = new Uint8Array([0x00, 0xFF]);
      const result = new Uint8Array(concatBuffers([a, b]));
      expect(Array.from(result)).toEqual([0xFF, 0x00, 0x00, 0xFF]);
    });

    it("should handle single-byte buffers", () => {
      const bufs = [new Uint8Array([0x41]), new Uint8Array([0x42]), new Uint8Array([0x43])];
      const result = new Uint8Array(concatBuffers(bufs));
      expect(new TextDecoder().decode(result)).toBe("ABC");
    });
  });

  describe("BN-040b: toFormData", () => {
    it("should parse multipart form data from stream", async () => {
      const boundary = "----TestBoundary123";
      const body = [
        `------TestBoundary123`,
        `Content-Disposition: form-data; name="field1"`,
        ``,
        `value1`,
        `------TestBoundary123--`,
        ``,
      ].join("\r\n");
      const stream = fromText(body);
      const fd = await toFormData(stream, boundary);
      expect(fd).toBeInstanceOf(FormData);
      expect(fd.get("field1")).toBe("value1");
    });
  });
});
