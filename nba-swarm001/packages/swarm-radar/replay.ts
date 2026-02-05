/**
 * VR replay system (optional)
 */

import { SharpShiftLedger } from "./ledger.js";
import type { Edge } from "../../src/types/game.js";

/**
 * Convert ledger edges to VR-compatible format
 * This is a placeholder - actual glTF export would require additional libraries
 */
export function exportToVR(ledger: SharpShiftLedger): {
  edges: Edge[];
  metadata: {
    edgeCount: number;
    exportedAt: number;
  };
} {
  const edges = ledger.readEdges();

  return {
    edges,
    metadata: {
      edgeCount: edges.length,
      exportedAt: Date.now(),
    },
  };
}

/**
 * Stream ledger for replay
 */
export function streamLedgerForReplay(
  ledger: SharpShiftLedger,
  callback: (edge: Edge) => void
): void {
  const edges = ledger.readEdges();

  // Stream edges in chronological order
  edges.sort((a, b) => a.timestamp - b.timestamp);

  for (const edge of edges) {
    callback(edge);
  }
}

