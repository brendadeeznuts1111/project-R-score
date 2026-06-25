#!/usr/bin/env bun
/**
 * Component #138: Stream-Converters
 * Primary API: Bun.readableStreamToBytes
 * Secondary API: Multiple converters
 * Performance SLA: <2ms (1MB stream)
 * Parity Lock: 9y0z...1a2b
 * Status: VERIFIED
 */

import { feature } from "bun:bundle";

export class StreamConverters {
  private static instance: StreamConverters;

  private constructor() {}

  static getInstance(): StreamConverters {
    if (!this.instance) {
      this.instance = new StreamConverters();
    }
    return this.instance;
  }

  async toBytes(stream: ReadableStream): Promise<Uint8Array> {
    if (!feature("STREAM_CONVERTERS")) {
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    }

    const startTime = performance.now();
    const result = await Bun.readableStreamToBytes(stream);
    const duration = performance.now() - startTime;

    if (duration > 2) {
      console.warn(`⚠️  Stream conversion SLA breach: ${duration.toFixed(2)}ms > 2ms`);
    }

    return result;
  }

  async toString(stream: ReadableStream): Promise<string> {
    const bytes = await this.toBytes(stream);
    return new TextDecoder().decode(bytes);
  }

  async toJSON<T = any>(stream: ReadableStream): Promise<T> {
    const text = await this.toString(stream);
    return JSON.parse(text);
  }
}

export const streamConverters = feature("STREAM_CONVERTERS")
  ? StreamConverters.getInstance()
  : {
      toBytes: async (stream: ReadableStream) => {
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }

        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        return result;
      },
      toString: async (stream: ReadableStream) => {
        const bytes = await streamConverters.toBytes(stream);
        return new TextDecoder().decode(bytes);
      },
      toJSON: async (stream: ReadableStream) => {
        const text = await streamConverters.toString(stream);
        return JSON.parse(text);
      },
    };

export default streamConverters;
