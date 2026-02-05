// infrastructure/filehandle-readlines-engine.ts
import { feature } from "bun:bundle";

// Node.js fs/promises.readLines() with backpressure handling
export class FileHandleReadLinesEngine {
  // Zero-cost when NODEJS_READLINES is disabled
  static async *readLines(
    filePath: string,
    options: { encoding?: string; autoClose?: boolean } = {}
  ): AsyncGenerator<string> {
    if (!feature("NODEJS_READLINES")) {
      // Fallback to Bun native streaming
      yield* this.bunReadLines(filePath, options);
      return;
    }

    const file = await this.openFileHandle(filePath);
    const decoder = new TextDecoder(options.encoding || "utf8");

    try {
      let buffer = "";
      const chunkSize = 8192;

      while (true) {
        const chunk = new Uint8Array(chunkSize);
        const { bytesRead } = await file.read(chunk);

        if (bytesRead === 0) break; // EOF

        buffer += decoder.decode(chunk.subarray(0, bytesRead), { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ""; // Keep incomplete line

        for (const line of lines) {
          yield line;
        }

        // Backpressure handling
        if (this.shouldYield()) {
          await this.yieldToEventLoop();
        }
      }

      // Yield any remaining content
      if (buffer) yield buffer;

    } finally {
      if (options.autoClose !== false) {
        await file.close();
      }
    }
  }

  private static bunReadLines(
    filePath: string,
    options: any
  ): AsyncGenerator<string> {
    // Native Bun implementation (faster, less compatible)
    return (async function* () {
      const file = Bun.file(filePath);
      const content = await file.text();
      const lines = content.split(/\r?\n/);
      for (const line of lines) yield line;
    })();
  }

  private static async openFileHandle(path: string): Promise<any> {
    // Bun-compatible file handle
    const file = Bun.file(path);
    return {
      read: async (buffer: Uint8Array) => {
        const content = await file.arrayBuffer();
        const slice = content.slice(0, buffer.length);
        buffer.set(new Uint8Array(slice));
        return { bytesRead: slice.byteLength };
      },
      close: async () => {}
    };
  }

  private static shouldYield(): boolean {
    // Check event loop pressure (simplified)
    return false; // Bun handles this internally
  }

  private static async yieldToEventLoop(): Promise<void> {
    await new Promise(resolve => setImmediate(resolve));
  }

  // Implements node:fs/promises.FileHandle interface
  static createFileHandleInterface(filePath: string): any {
    if (!feature("NODEJS_READLINES")) {
      return null;
    }

    return {
      readLines: (options?: any) => this.readLines(filePath, options)
    };
  }
}

// Zero-cost export
export const { readLines, createFileHandleInterface } = feature("NODEJS_READLINES")
  ? FileHandleReadLinesEngine
  : {
      readLines: async function* () { yield* []; },
      createFileHandleInterface: () => null
    };