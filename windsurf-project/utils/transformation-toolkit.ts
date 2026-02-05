#!/usr/bin/env bun
/**
 * transformation-toolkit.ts
 * Bun-native replacement for legacy patterns.
 * Optimized for high-throughput zero-copy I/O.
 */

import { $ } from "bun";

/**
 * Replace legacy execSync/spawnSync with Bun shell ($)
 * Preserves sequential execution logic while gaining performance.
 */
export async function bunExecute(cmd: string, args: string[] = []) {
  const fullCmd = `${cmd} ${args.join(" ")}`;
  return await $`${{raw: fullCmd}}`.quiet();
}

/**
 * Highly efficient stream reader
 * Replaces loop-based stream reading with native optimized helper.
 */
export async function streamToBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
  return await Bun.readableStreamToArrayBuffer(stream);
}

/**
 * Native file operations
 * Uses memory-mapped files when available.
 */
export const bunIO = {
  readText: (path: string) => Bun.file(path).text(),
  readJson: (path: string) => Bun.file(path).json(),
  write: (path: string, content: string | Buffer | ArrayBuffer) => Bun.write(path, content),
  exists: (path: string) => Bun.file(path).exists(),
};

/**
 * Migration helper for net.Socket / tls.connect
 * Transitions legacy Node.js networking to Bun.connect()
 */
export async function bunConnect(options: { 
  hostname: string, 
  port: number, 
  tls?: boolean,
  data?: (socket: any, data: Buffer) => void,
  error?: (socket: any, error: Error) => void,
  end?: (socket: any) => void
}) {
  return await Bun.connect({
    hostname: options.hostname,
    port: options.port,
    tls: options.tls,
    socket: {
      data(socket, data) {
        if (options.data) options.data(socket, data);
      },
      error(socket, error) {
        if (options.error) options.error(socket, error);
      },
      end(socket) {
        if (options.end) options.end(socket);
      }
    }
  });
}
