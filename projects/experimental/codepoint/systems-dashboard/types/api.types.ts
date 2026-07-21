// types/api.types.ts

/**
 * HSL Color type
 */
export interface HSLColor {
  h: number; // hue: 0-360
  s: number; // saturation: 0-1
  l: number; // lightness: 0-1
}

/**
 * 13-byte configuration structure
 */
export interface Config13Byte {
  version: number; // 1 byte
  registryHash: number; // 4 bytes
  featureFlags: number; // 1 byte
  terminalMode: number; // 1 byte
  rows: number; // 1 byte
  cols: number; // 2 bytes
  reserved: number; // 3 bytes (padding to 13 bytes total)
}

/**
 * Scoring metrics interface
 */
export interface ScoringMetrics {
  performance: number;
  reliability: number;
  security: number;
  scalability: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  size: number;
  hitRate: number;
  evictions: number;
  maxSize: number;
}

/**
 * URL pattern match result
 */
export interface URLPatternMatch {
  params: Record<string, string>;
  pathname: string;
  search: string;
  hash: string;
}

/**
 * Component tree node
 */
export interface ComponentNode {
  name: string;
  value?: string;
  children?: ComponentNode[];
}

/**
 * Status panel item
 */
export interface StatusItem {
  label: string;
  value: string;
  status: "success" | "warning" | "error" | "info";
}
