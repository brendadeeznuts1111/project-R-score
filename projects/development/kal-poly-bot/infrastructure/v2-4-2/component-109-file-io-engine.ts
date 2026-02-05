#!/usr/bin/env bun
/**
 * Component #109: File-IO-Engine
 * Primary API: Bun.file()
 * Secondary API: Bun.write()
 * Performance SLA: <5ms read/write
 * Parity Lock: 3m4n...5o6p
 * Status: LAZY_LOAD
 */

import { feature } from "bun:bundle";

interface FileIOOptions {
  encoding?: "utf8" | "binary";
  highWaterMark?: number;
}

export class FileIOEngine {
  private static instance: FileIOEngine;

  private constructor() {}

  static getInstance(): FileIOEngine {
    if (!this.instance) {
      this.instance = new FileIOEngine();
    }
    return this.instance;
  }

  async read(path: string, options: FileIOOptions = {}): Promise<string | Uint8Array> {
    if (!feature("FILE_IO_ENGINE")) {
      return Bun.file(path).text();
    }

    const startTime = performance.now();
    const file = Bun.file(path);

    if (!file.exists()) {
      throw new Error(`File not found: ${path}`);
    }

    const result = options.encoding === "binary" 
      ? await file.arrayBuffer()
      : await file.text();

    const duration = performance.now() - startTime;
    if (duration > 5) {
      console.warn(`⚠️  File read SLA breach: ${duration.toFixed(2)}ms > 5ms`);
    }

    return result;
  }

  async write(path: string, content: string | Uint8Array): Promise<number> {
    if (!feature("FILE_IO_ENGINE")) {
      return Bun.write(path, content);
    }

    const startTime = performance.now();
    const bytesWritten = await Bun.write(path, content);
    const duration = performance.now() - startTime;

    if (duration > 5) {
      console.warn(`⚠️  File write SLA breach: ${duration.toFixed(2)}ms > 5ms`);
    }

    return bytesWritten;
  }

  async stream(path: string): Promise<ReadableStream> {
    const file = Bun.file(path);
    return file.stream();
  }
}

export const fileIOEngine = feature("FILE_IO_ENGINE")
  ? FileIOEngine.getInstance()
  : {
      read: async (path: string) => Bun.file(path).text(),
      write: async (path: string, content: any) => Bun.write(path, content),
      stream: async (path: string) => Bun.file(path).stream(),
    };

export default fileIOEngine;
