/**
 * Binary ledger for storing edge history
 * 
 * Optimized using Bun's native binary data capabilities for maximum performance
 */

import { LedgerError } from "../../src/types/errors.js";
import { LEDGER_TOTAL_EDGE_SIZE } from "../../src/constants.js";
import type { Edge } from "../../src/types/game.js";
import { getLogger } from "../../src/utils/logger.js";
import { handleError, createErrorContext } from "../../src/utils/error-handler.js";
import { BinaryUtils } from "../../src/utils/binary.js";

const logger = getLogger();

/**
 * Binary format: 8 bytes per edge + 4 bytes timestamp
 * [gameId1: u16][gameId2: u16][weight: f32][timestamp: u32]
 */
export class SharpShiftLedger {
  private buffer: Buffer;
  private gameIdMap: Map<string, number> = new Map();
  private nextGameId: number = 0;
  private retentionMs: number;

  constructor(retentionHours: number = 24) {
    this.buffer = Buffer.alloc(0);
    this.retentionMs = retentionHours * 3600000;
  }

  /**
   * Get or assign numeric ID for game string ID
   */
  private getGameId(gameId: string): number {
    if (!this.gameIdMap.has(gameId)) {
      this.gameIdMap.set(gameId, this.nextGameId++);
    }
    return this.gameIdMap.get(gameId)!;
  }

  /**
   * Append edge to ledger
   */
  appendEdge(edge: Edge): void {
    try {
      const gameId1 = this.getGameId(edge.from);
      const gameId2 = this.getGameId(edge.to);
      const timestamp = edge.timestamp || Date.now();

      // Validate game IDs fit in u16
      if (gameId1 > 65535 || gameId2 > 65535) {
        throw new LedgerError(
          `Game ID exceeds u16 range: ${gameId1}, ${gameId2}`,
          "appendEdge"
        );
      }

      // Create buffer for this edge (12 bytes total)
      const edgeBuffer = Buffer.alloc(LEDGER_TOTAL_EDGE_SIZE);
      
      // Write game IDs (u16 each)
      edgeBuffer.writeUInt16LE(gameId1, 0);
      edgeBuffer.writeUInt16LE(gameId2, 2);
      
      // Write weight (f32)
      edgeBuffer.writeFloatLE(edge.weight, 4);
      
      // Write timestamp (u32)
      edgeBuffer.writeUInt32LE(timestamp, 8);

      // Append to main buffer
      this.buffer = Buffer.concat([this.buffer, edgeBuffer]);

      logger.debug("Edge appended to ledger", {
        from: edge.from,
        to: edge.to,
        weight: edge.weight,
      });
    } catch (error) {
      throw new LedgerError(
        `Failed to append edge: ${error instanceof Error ? error.message : String(error)}`,
        "appendEdge"
      );
    }
  }

  /**
   * Append multiple edges in batch (optimized)
   * Uses pre-allocated buffer for better performance
   */
  appendEdges(edges: Edge[]): void {
    if (edges.length === 0) return;

    // Pre-allocate buffer for all edges
    const totalSize = this.buffer.length + (edges.length * LEDGER_TOTAL_EDGE_SIZE);
    const newBuffer = Buffer.alloc(totalSize);
    
    // Copy existing buffer
    if (this.buffer.length > 0) {
      this.buffer.copy(newBuffer, 0);
    }

    // Write all edges efficiently
    let writeOffset = this.buffer.length;
    const view = new DataView(newBuffer.buffer, newBuffer.byteOffset, newBuffer.byteLength);

    for (const edge of edges) {
      try {
        const gameId1 = this.getGameId(edge.from);
        const gameId2 = this.getGameId(edge.to);
        const timestamp = edge.timestamp || Date.now();

        // Validate game IDs fit in u16
        if (gameId1 > 65535 || gameId2 > 65535) {
          throw new LedgerError(
            `Game ID exceeds u16 range: ${gameId1}, ${gameId2}`,
            "appendEdges"
          );
        }

        // Write using DataView for precise control
        view.setUint16(writeOffset, gameId1, true); // little-endian
        view.setUint16(writeOffset + 2, gameId2, true);
        view.setFloat32(writeOffset + 4, edge.weight, true);
        view.setUint32(writeOffset + 8, timestamp, true);

        writeOffset += LEDGER_TOTAL_EDGE_SIZE;
      } catch (error) {
        throw new LedgerError(
          `Failed to append edge: ${error instanceof Error ? error.message : String(error)}`,
          "appendEdges"
        );
      }
    }

    this.buffer = newBuffer;

    logger.debug("Edges appended to ledger", {
      count: edges.length,
      totalEdges: this.getEdgeCount(),
    });
  }

  /**
   * Read edges from ledger (optimized with DataView)
   */
  readEdges(): Edge[] {
    const edges: Edge[] = [];
    const reverseIdMap = new Map<number, string>();
    
    // Build reverse map
    for (const [gameId, numericId] of this.gameIdMap) {
      reverseIdMap.set(numericId, gameId);
    }

    const edgeCount = this.buffer.length / LEDGER_TOTAL_EDGE_SIZE;
    
    if (edgeCount === 0) return edges;

    // Use DataView for efficient reading
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);

    for (let i = 0; i < edgeCount; i++) {
      const offset = i * LEDGER_TOTAL_EDGE_SIZE;

      const gameId1 = view.getUint16(offset, true); // little-endian
      const gameId2 = view.getUint16(offset + 2, true);
      const weight = view.getFloat32(offset + 4, true);
      const timestamp = view.getUint32(offset + 8, true);

      const from = reverseIdMap.get(gameId1);
      const to = reverseIdMap.get(gameId2);

      if (!from || !to) {
        logger.warn("Missing game ID mapping", { gameId1, gameId2 });
        continue;
      }

      edges.push({
        from,
        to,
        weight,
        similarity: 0, // Not stored in binary format
        timestamp,
      });
    }

    return edges;
  }

  /**
   * Prune old edges based on retention period (optimized)
   * Uses in-place filtering to avoid full rebuild when possible
   */
  pruneOldEdges(): number {
    const now = Date.now();
    const cutoffTime = now - this.retentionMs;

    const edges = this.readEdges();
    const validEdges = edges.filter((edge) => edge.timestamp >= cutoffTime);

    if (validEdges.length === edges.length) {
      return 0; // No pruning needed
    }

    // Rebuild buffer with only valid edges (use optimized batch append)
    this.buffer = Buffer.alloc(0);
    this.appendEdges(validEdges);

    const prunedCount = edges.length - validEdges.length;
    logger.info("Pruned old edges", {
      prunedCount,
      remainingCount: validEdges.length,
    });

    return prunedCount;
  }

  /**
   * Compress ledger using gzip
   * Returns Uint8Array for better compatibility
   */
  compress(): Uint8Array {
    try {
      const compressed = Bun.gzipSync(this.buffer, { level: 9 });
      
      logger.debug("Ledger compressed", {
        originalSize: this.buffer.length,
        compressedSize: compressed.length,
        ratio: compressed.length / this.buffer.length,
      });

      // Return as Uint8Array for better Web API compatibility
      return new Uint8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength);
    } catch (error) {
      throw new LedgerError(
        `Compression failed: ${error instanceof Error ? error.message : String(error)}`,
        "compress"
      );
    }
  }

  /**
   * Decompress ledger from gzip
   * Accepts Buffer or Uint8Array
   */
  static decompress(compressed: Buffer | Uint8Array): Buffer {
    try {
      const buffer = compressed instanceof Buffer 
        ? compressed 
        : Buffer.from(compressed);
      return Bun.gunzipSync(buffer);
    } catch (error) {
      throw new LedgerError(
        `Decompression failed: ${error instanceof Error ? error.message : String(error)}`,
        "decompress"
      );
    }
  }

  /**
   * Get ledger size in bytes
   */
  getSize(): number {
    return this.buffer.length;
  }

  /**
   * Get edge count
   */
  getEdgeCount(): number {
    return this.buffer.length / LEDGER_TOTAL_EDGE_SIZE;
  }

  /**
   * Clear ledger
   */
  clear(): void {
    this.buffer = Buffer.alloc(0);
    this.gameIdMap.clear();
    this.nextGameId = 0;
  }

  /**
   * Load ledger from buffer
   */
  load(buffer: Buffer, gameIdMap: Map<string, number>): void {
    this.buffer = buffer;
    this.gameIdMap = new Map(gameIdMap);
    
    // Find max ID
    let maxId = -1;
    for (const id of gameIdMap.values()) {
      maxId = Math.max(maxId, id);
    }
    this.nextGameId = maxId + 1;
  }

  /**
   * Export ledger data as Blob for Web API compatibility
   */
  exportAsBlob(): Blob {
    return new Blob([this.buffer], { type: "application/octet-stream" });
  }

  /**
   * Export ledger data as ReadableStream for streaming
   */
  exportAsStream(): ReadableStream<Uint8Array> {
    const uint8 = BinaryUtils.bufferToUint8Array(this.buffer);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(uint8);
        controller.close();
      },
    });
  }

  /**
   * Export ledger data (legacy compatibility)
   */
  export(): { buffer: Buffer; gameIdMap: Map<string, number> } {
    return {
      buffer: this.buffer,
      gameIdMap: new Map(this.gameIdMap),
    };
  }
}

