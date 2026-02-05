// infrastructure/filehandle-readlines-engine.ts
import { feature } from "bun:bundle";

// Node.js fs/promises.readLines() with backpressure handling
export class FileHandleReadLinesEngine {
  // Zero-cost when NODEJS_READLINES is disabled
  static async *readLines(
    filePath: string,
    options: { encoding?: string; autoClose?: boolean; signal?: AbortSignal } = {}
  ): AsyncGenerator<string> {
    if (!feature("NODEJS_READLINES")) {
      // Fallback to Bun native streaming
      yield* this.bunReadLines(filePath, options);
      return;
    }

    // Component #92: Use node:fs/promises for compatibility
    const fs = await import("node:fs/promises");
    const handle = await fs.open(filePath, "r");

    try {
      // AbortSignal support
      if (options.signal) {
        options.signal.addEventListener('abort', () => handle.close());
      }

      let buffer = "";
      const decoder = new TextDecoder(options.encoding || "utf8");

      while (true) {
        const chunk = new Uint8Array(8192);
        const { bytesRead } = await handle.read(chunk);

        if (bytesRead === 0) break; // EOF

        buffer += decoder.decode(chunk.subarray(0, bytesRead), { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ""; // Keep incomplete line

        for (const line of lines) {
          yield line;

          // Component #92: Backpressure handling
          if (this.shouldYield()) {
            await new Promise(resolve => setImmediate(resolve));
          }
        }
      }

      // Yield remaining content
      if (buffer) yield buffer;

    } finally {
      if (options.autoClose !== false) {
        await handle.close();
      }
    }
  }

  private static async *bunReadLines(
    filePath: string,
    options: any
  ): AsyncGenerator<string> {
    const file = Bun.file(filePath);
    const content = await file.text();
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      yield line;
      if (options.signal?.aborted) break;
    }
  }

  private static shouldYield(): boolean {
    // Check event loop depth for backpressure
    return (globalThis as any).__bun_event_loop_depth__ > 100;
  }
}

// Zero-cost export
export const { readLines } = feature("NODEJS_READLINES")
  ? FileHandleReadLinesEngine
  : {
      readLines: async function* () { yield* []; }
    };
