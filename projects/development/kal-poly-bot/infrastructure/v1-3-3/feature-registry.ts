// infrastructure/v1-3-3/feature-registry.ts
// Complete v1.3.3 Feature Registry for Components #71-75

import { feature } from "bun:bundle";

// Component #71: Sourcemap-Integrity-Validator
export interface SourceMapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BuildOutput {
  path: string;
  sourceMap?: {
    sources: string[];
    sourcesContent?: string[];
    mappings: string;
  };
}

export interface CompileModeOptions {
  compile: boolean;
  sourcemap?: boolean | "inline" | "external";
  sourcemapIncludeSources?: boolean;
}

// Component #72: NAPI-ThreadSafety-Guard
export interface ThreadSafeFunction {
  id: number;
  fn: (value: any) => any;
  resourceName: string;
  maxQueueSize: number;
  queue: any[];
  refCount: number;
  finalize?: () => void;
}

export interface ThreadSafetyMetrics {
  activeThreads: number;
  prematureFinalizations: number;
  environmentRetentions: number;
  queueOverflows: number;
}

// Component #73: WebSocket-Fragment-Guard
export interface WebSocketFrame {
  opcode: number;
  payload: Uint8Array;
  final: boolean;
}

export interface WebSocketGuardedConnection {
  ws: any;
  closeFrameBuffer: Uint8Array;
  expectCloseFrame: boolean;
  originalSend: (data: string | Uint8Array) => void;
  originalClose: (code?: number, reason?: string) => void;
}

export interface FragmentMetrics {
  bufferedCloseFrames: number;
  fragmentedMessages: number;
  bufferOverflows: number;
  panicPreventions: number;
}

// Component #74: Worker-Thread-Safety-Engine
export interface WorkerSafetyOptions {
  env?: Record<string, string>;
  script?: string;
  type?: "module" | "classic";
}

export interface WorkerNapiTracking {
  worker: Worker;
  loadedModules: Set<string>;
  cleanupInProgress: boolean;
  terminationTimeout?: NodeJS.Timeout;
}

export interface WorkerSafetyMetrics {
  activeWorkers: number;
  napiModulesLoaded: number;
  cleanupTimeouts: number;
  successfulTerminations: number;
  failedTerminations: number;
}

// Component #75: YAML-Doc-End-Fix
export interface YAMLParseOptions {
  allowDuplicateKeys?: boolean;
  maxDepth?: number;
  onWarning?: (error: Error) => void;
}

export interface YAMLStringifyOptions {
  indent?: number;
  lineWidth?: number;
  minContentWidth?: number;
  singleQuote?: boolean;
}

export interface YAMLDocumentMetrics {
  parseCount: number;
  fixedDocEndMarkers: number;
  quotedStringFixes: number;
  parseErrors: number;
}

// Feature Registry for v1.3.3
export class FeatureRegistryV133 {
  // Component #71: Sourcemap Integrity
  static get SOURCEMAP_INTEGRITY(): boolean {
    return process.env.FEATURE_SOURCEMAP_INTEGRITY === "1";
  }

  // Component #72: N-API ThreadSafety
  static get NAPI_THREADSAFE(): boolean {
    return process.env.FEATURE_NAPI_THREADSAFE === "1";
  }

  // Component #73: WebSocket Fragment Guard
  static get WS_FRAGMENT_GUARD(): boolean {
    return process.env.FEATURE_WS_FRAGMENT_GUARD === "1";
  }

  // Component #74: Worker Thread Safety
  static get WORKER_THREAD_SAFETY(): boolean {
    return process.env.FEATURE_WORKER_THREAD_SAFETY === "1";
  }

  // Component #75: YAML Doc End Fix
  static get YAML_DOC_END_FIX(): boolean {
    return process.env.FEATURE_YAML_DOC_END_FIX === "1";
  }

  // Component #86: Unicode StringWidth Engine
  static get UNICODE_STRING_WIDTH(): boolean {
    return process.env.FEATURE_UNICODE_STRING_WIDTH === "1";
  }

  // Component #87: V8 Type Checking API
  static get V8_TYPE_BRIDGE(): boolean {
    return process.env.FEATURE_V8_TYPE_BRIDGE === "1";
  }

  // Component #89: Npmrc Environment Expansion
  static get NPMRC_ENV_EXPANSION(): boolean {
    return process.env.FEATURE_NPMRC_ENV_EXPANSION === "1";
  }

  // Component #90: Kqueue Event Loop Fix
  static get KQUEUE_EVENT_LOOP(): boolean {
    return process.env.FEATURE_KQUEUE_EVENT_LOOP === "1";
  }

  // Component #92: Bunx Metadata Corruption Fix
  static get BUNX_METADATA_FIX(): boolean {
    return process.env.FEATURE_BUNX_METADATA_FIX === "1";
  }

  // Component #94: Object Spread Nullish Fix
  static get OBJECT_SPREAD_NULLISH(): boolean {
    return process.env.FEATURE_OBJECT_SPREAD_NULLISH === "1";
  }

  // Component #95: YAML Boolean Strict Parser
  static get YAML_BOOLEAN_STRICT(): boolean {
    return process.env.FEATURE_YAML_BOOLEAN_STRICT === "1";
  }

  // Master flags
  static get BUN_PM_OPTIMIZATIONS(): boolean {
    return process.env.FEATURE_BUN_PM_OPTIMIZATIONS === "1";
  }

  static get NATIVE_STABILITY(): boolean {
    return process.env.FEATURE_NATIVE_STABILITY === "1";
  }

  static get GOLDEN_MATRIX_V1_3_3(): boolean {
    return process.env.FEATURE_GOLDEN_MATRIX_V1_3_3 === "1";
  }

  // Get all active features
  static getActiveFeatures(): string[] {
    const features: string[] = [];

    if (this.SOURCEMAP_INTEGRITY) features.push("SOURCEMAP_INTEGRITY");
    if (this.NAPI_THREADSAFE) features.push("NAPI_THREADSAFE");
    if (this.WS_FRAGMENT_GUARD) features.push("WS_FRAGMENT_GUARD");
    if (this.WORKER_THREAD_SAFETY) features.push("WORKER_THREAD_SAFETY");
    if (this.YAML_DOC_END_FIX) features.push("YAML_DOC_END_FIX");
    if (this.UNICODE_STRING_WIDTH) features.push("UNICODE_STRING_WIDTH");
    if (this.V8_TYPE_BRIDGE) features.push("V8_TYPE_BRIDGE");
    if (this.NPMRC_ENV_EXPANSION) features.push("NPMRC_ENV_EXPANSION");
    if (this.KQUEUE_EVENT_LOOP) features.push("KQUEUE_EVENT_LOOP");
    if (this.BUNX_METADATA_FIX) features.push("BUNX_METADATA_FIX");
    if (this.OBJECT_SPREAD_NULLISH) features.push("OBJECT_SPREAD_NULLISH");
    if (this.YAML_BOOLEAN_STRICT) features.push("YAML_BOOLEAN_STRICT");
    if (this.BUN_PM_OPTIMIZATIONS) features.push("BUN_PM_OPTIMIZATIONS");
    if (this.NATIVE_STABILITY) features.push("NATIVE_STABILITY");
    if (this.GOLDEN_MATRIX_V1_3_3) features.push("GOLDEN_MATRIX_V1_3_3");

    return features;
  }

  // Get feature status report
  static getFeatureReport(): Record<string, boolean> {
    return {
      "Component #71: Sourcemap Integrity": this.SOURCEMAP_INTEGRITY,
      "Component #72: N-API ThreadSafety": this.NAPI_THREADSAFE,
      "Component #73: WebSocket Fragment Guard": this.WS_FRAGMENT_GUARD,
      "Component #74: Worker Thread Safety": this.WORKER_THREAD_SAFETY,
      "Component #75: YAML Doc End Fix": this.YAML_DOC_END_FIX,
      "Component #86: Unicode StringWidth Engine": this.UNICODE_STRING_WIDTH,
      "Component #87: V8 Type Checking API": this.V8_TYPE_BRIDGE,
      "Component #89: Npmrc Environment Expansion": this.NPMRC_ENV_EXPANSION,
      "Component #90: Kqueue Event Loop Fix": this.KQUEUE_EVENT_LOOP,
      "Component #92: Bunx Metadata Corruption Fix": this.BUNX_METADATA_FIX,
      "Component #94: Object Spread Nullish Fix": this.OBJECT_SPREAD_NULLISH,
      "Component #95: YAML Boolean Strict Parser": this.YAML_BOOLEAN_STRICT,
      "Bun PM Optimizations": this.BUN_PM_OPTIMIZATIONS,
      "Native Stability": this.NATIVE_STABILITY,
      "Golden Matrix v1.3.3": this.GOLDEN_MATRIX_V1_3_3
    };
  }

  // Check if all critical features are enabled
  static isProductionReady(): boolean {
    return this.SOURCEMAP_INTEGRITY &&
           this.NAPI_THREADSAFE &&
           this.WS_FRAGMENT_GUARD &&
           this.WORKER_THREAD_SAFETY &&
           this.YAML_DOC_END_FIX &&
           this.UNICODE_STRING_WIDTH &&
           this.V8_TYPE_BRIDGE &&
           this.NPMRC_ENV_EXPANSION &&
           this.KQUEUE_EVENT_LOOP &&
           this.BUNX_METADATA_FIX &&
           this.OBJECT_SPREAD_NULLISH &&
           this.YAML_BOOLEAN_STRICT;
  }

  // Get zero-cost status (features that are disabled)
  static getZeroCostEliminated(): string[] {
    const allFeatures = [
      "SOURCEMAP_INTEGRITY",
      "NAPI_THREADSAFE",
      "WS_FRAGMENT_GUARD",
      "WORKER_THREAD_SAFETY",
      "YAML_DOC_END_FIX",
      "UNICODE_STRING_WIDTH",
      "V8_TYPE_BRIDGE",
      "NPMRC_ENV_EXPANSION",
      "KQUEUE_EVENT_LOOP",
      "BUNX_METADATA_FIX",
      "OBJECT_SPREAD_NULLISH",
      "YAML_BOOLEAN_STRICT"
    ];

    return allFeatures.filter(feature => !this[feature as keyof typeof this]);
  }

  // Get active component count
  static getActiveComponentCount(): number {
    return this.getActiveFeatures().length;
  }

  // Get total possible components
  static getTotalComponentCount(): number {
    return 75; // Complete Golden Matrix
  }

  // Get zero-cost abstraction percentage
  static getZeroCostPercentage(): number {
    const eliminated = this.getZeroCostEliminated().length;
    const total = 12; // Components #71-75, #86, #87, #89, #90, #92, #94, #95
    return Math.round((eliminated / total) * 100);
  }
}

// Note: Component classes and types are defined in their respective files
// This registry provides feature flag management and status reporting

// Default export
export default FeatureRegistryV133;
