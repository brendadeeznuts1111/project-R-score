/**
 * Rotation heatmap utilities
 * 
 * Generates Unicode heatmap characters and HSL themes from SharpVector + rotationNumber
 */

import type { SharpVector } from "../types/game.js";
import { vectorMagnitude } from "../core/vector.js";

/**
 * Unicode block characters for heatmap visualization
 */
const HEAT_CHARS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

/**
 * Generate heatmap string from SharpVector
 * Returns 3-character Unicode block visualization
 */
export function generateHeatmap(vector: SharpVector): string {
  // Calculate overall intensity from vector magnitude
  const magnitude = vectorMagnitude(vector);
  
  // Normalize to 0-1 range (assuming max magnitude ~3.74 for 14D unit vector)
  const normalized = Math.min(1, magnitude / 3.74);
  
  // Map to 3 heat levels
  const level1 = Math.floor(normalized * 8);
  const level2 = Math.floor((normalized * 8 + 1) % 8);
  const level3 = Math.floor((normalized * 8 + 2) % 8);
  
  return `${HEAT_CHARS[level1]}${HEAT_CHARS[level2]}${HEAT_CHARS[level3]}`;
}

/**
 * Generate HSL color from rotation number
 * Uses semantic rotation-based color mapping
 */
export function generateSemanticTheme(rotationNumber: number): {
  base: { h: number; s: number; l: number };
  accent: { h: number; s: number; l: number };
} {
  // Map rotation number to HSL hue (0-360)
  // Risk rotations → red spectrum (0-60)
  // Speed rotations → cyan spectrum (180-240)
  // Neutral rotations → yellow-green spectrum (60-120)
  
  const rotHash = rotationNumber % 360;
  let hue = 0;
  
  if (rotationNumber < 100) {
    // Risk rotations: red-orange
    hue = (rotationNumber % 60);
  } else if (rotationNumber < 500) {
    // Speed rotations: cyan-blue
    hue = 180 + ((rotationNumber % 60));
  } else {
    // Neutral rotations: yellow-green
    hue = 60 + ((rotationNumber % 60));
  }
  
  return {
    base: {
      h: hue,
      s: 70 + (rotationNumber % 20), // 70-90% saturation
      l: 45 + (rotationNumber % 15), // 45-60% lightness
    },
    accent: {
      h: (hue + 180) % 360,
      s: 80,
      l: 55,
    },
  };
}

/**
 * Generate HSL color string for CSS
 */
export function hslString(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Extract rotation number from game ID
 * Format: "NBA-YYYYMMDD-XXX" → rotationNumber
 */
export function extractRotationNumber(gameId: string): number {
  const match = gameId.match(/-(\d{3})$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // Fallback: hash the game ID
  let hash = 0;
  for (let i = 0; i < gameId.length; i++) {
    hash = ((hash << 5) - hash) + gameId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 1000;
}

/**
 * Generate fingerprint from SharpVector
 * Returns short alphanumeric fingerprint
 */
export function generateFingerprint(vector: SharpVector): string {
  // Simple hash-based fingerprint
  let hash = 0;
  for (let i = 0; i < vector.length; i++) {
    hash = ((hash << 5) - hash) + Math.floor(vector[i] * 1000);
    hash = hash & hash;
  }
  
  // Convert to base36 short string
  const absHash = Math.abs(hash);
  return absHash.toString(36).substring(0, 8);
}

