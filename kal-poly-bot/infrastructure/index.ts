// infrastructure/index.ts - Golden Matrix v2.4.1 Infrastructure Components
import { feature } from "bun:bundle";

// Component #86: Compile-Time Flag Engine
export {
  augmentRegistry,
  validateFeatureFlag,
  analyzeBundleDeadCode,
  applyDeadCodeElimination
} from "./compile-time-flag-engine";

// Component #87: Unicode StringWidth Engine
export { calculateWidth } from "./unicode-stringwidth-engine";

// Component #88: V8 Type Check API
export {
  isMap,
  isArray,
  isInt32,
  isBigInt,
  createNapiTypeChecker
} from "./v8-type-check-api";

// Component #89: S3 Content-Disposition
export {
  setContentDisposition,
  uploadWithDisposition
} from "./s3-content-disposition";

// Component #90: Npmrc Environment Expander
export {
  expandValue,
  loadNpmrcWithExpansion,
  expandValueSecure
} from "./npmrc-env-expander";

// Component #91: Selective Hoist Controller
export {
  getHoistPatterns,
  shouldHoist,
  createHoistedSymlinks,
  parseNpmrcHoistPatterns
} from "./selective-hoist-controller";

// Component #92: FileHandle ReadLines Engine
export { readLines } from "./filehandle-readlines-engine";

// Component #93: Sourcemap Integrity Validator
export {
  validateBuildSourcemaps,
  fixCompileOptions,
  rewriteImportMeta
} from "./sourcemap-integrity-validator";

// Component #94: N-API ThreadSafety Guard
export { createThreadSafeFunction } from "./napi-threadsafety-guard";

// Component #95: WebSocket Fragment Guard
export { createWebSocket } from "./websocket-fragment-guard";

// Re-exports for Infrastructure object
import {
  augmentRegistry as ar,
  validateFeatureFlag as vff,
  analyzeBundleDeadCode as abdc,
  applyDeadCodeElimination as adce
} from "./compile-time-flag-engine";

import { calculateWidth as cw } from "./unicode-stringwidth-engine";

import {
  isMap as im,
  isArray as ia,
  isInt32 as ii32,
  isBigInt as ib,
  createNapiTypeChecker as cntc
} from "./v8-type-check-api";

import {
  setContentDisposition as scd,
  uploadWithDisposition as uwd
} from "./s3-content-disposition";

import {
  expandValue as ev,
  loadNpmrcWithExpansion as lnwe,
  expandValueSecure as evs
} from "./npmrc-env-expander";

import {
  getHoistPatterns as ghp,
  shouldHoist as sh,
  createHoistedSymlinks as chs,
  parseNpmrcHoistPatterns as pnhp
} from "./selective-hoist-controller";

import { readLines as rl } from "./filehandle-readlines-engine";

import {
  validateBuildSourcemaps as vbs,
  fixCompileOptions as fco,
  rewriteImportMeta as rim
} from "./sourcemap-integrity-validator";

import { createThreadSafeFunction as ctsf } from "./napi-threadsafety-guard";

import { createWebSocket as cws } from "./websocket-fragment-guard";

// Infrastructure Health Check
export async function infrastructureHealthCheck(): Promise<{
  version: string;
  activeComponents: number;
  zeroCostEliminated: number;
  status: string;
}> {
  if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) {
    return {
      version: "2.4.1-STABLE-FINAL",
      activeComponents: 30,
      zeroCostEliminated: 65,
      status: "HEALTH_CHECKS_DISABLED"
    };
  }

  const response = await fetch("https://api.buncatalog.com/v1/infrastructure/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  }).catch(() => null);

  if (!response) {
    return {
      version: "2.4.1-STABLE-FINAL",
      activeComponents: 30,
      zeroCostEliminated: 65,
      status: "OFFLINE"
    };
  }

  return response.json();
}

// Component #86: Feature Flag Registry
export const FEATURE_REGISTRY = {
  // Infrastructure (Components #1-85)
  INFRASTRUCTURE: [
    "MCP_ENABLED", "QUANTUM_READY", "PREMIUM", "DEBUG", "CONFIG_VERSION_STABLE"
  ],

  // Package Manager (Components #65-70)
  PACKAGE_MANAGER: [
    "NO_PEER_DEPS_OPT", "NPMRC_EMAIL", "SELECTIVE_HOISTING", "PACK_ENFORCER"
  ],

  // Native/Stability (Components #71-95)
  NATIVE_STABILITY: [
    "SOURCEMAP_INTEGRITY",           // Component #71
    "NAPI_THREADSAFE",               // Component #72
    "WS_FRAGMENT_GUARD",             // Component #73
    "WORKER_THREAD_SAFETY",          // Component #74
    "YML_DOC_END_FIX",               // Component #75
    "BUNX_UTF8_FIX",                 // Component #76
    "MYSQL_PARAM_GUARD",             // Component #77
    "MYSQL_TLS_FIX",                 // Component #78
    "MYSQL_IDLE_FIX",                // Component #79
    "REDIS_URL_VALIDATE",            // Component #80
    "S3_ETAG_FIX",                   // Component #81
    "FFI_ERROR_SURFACE",             // Component #82
    "WS_COOKIE_FIX",                 // Component #83
    "NODEJS_COMPAT_PATCH",           // Component #84
    "CLOUDFLARE_SEC_PATCH",          // Component #85
    "COMPILE_TIME_VALIDATION",       // Component #86
    "STRING_WIDTH_OPT",              // Component #87
    "V8_TYPE_CHECK",                 // Component #88
    "S3_CONTENT_DISPOSITION",        // Component #89
    "NPMRC_ENV_EXPAND",              // Component #90
    "SELECTIVE_HOIST_CTRL",          // Component #91
    "NODEJS_READLINES",              // Component #92
    "SOURCEMAP_INTEGRITY",           // Component #93
    "NAPI_THREADSAFE",               // Component #94
    "WS_FRAGMENT_GUARD"              // Component #95
  ],

  // Master flags
  MASTER: [
    "BUN_PM_OPTIMIZATIONS",
    "NATIVE_STABILITY",
    "GOLDEN_MATRIX_V2_4_1_FINAL"
  ]
};

// Export all components as a single object for easy access
export const Infrastructure = {
  // Component #86
  CompileTimeFlagEngine: {
    augmentRegistry: ar,
    validateFeatureFlag: vff,
    analyzeBundleDeadCode: abdc,
    applyDeadCodeElimination: adce
  },

  // Component #87
  UnicodeStringWidthEngine: {
    calculateWidth: cw
  },

  // Component #88
  V8TypeCheckAPI: {
    isMap: im,
    isArray: ia,
    isInt32: ii32,
    isBigInt: ib,
    createNapiTypeChecker: cntc
  },

  // Component #89
  S3ContentDisposition: {
    setContentDisposition: scd,
    uploadWithDisposition: uwd
  },

  // Component #90
  NpmrcEnvExpander: {
    expandValue: ev,
    loadNpmrcWithExpansion: lnwe,
    expandValueSecure: evs
  },

  // Component #91
  SelectiveHoistController: {
    getHoistPatterns: ghp,
    shouldHoist: sh,
    createHoistedSymlinks: chs,
    parseNpmrcHoistPatterns: pnhp
  },

  // Component #92
  FileHandleReadLinesEngine: {
    readLines: rl
  },

  // Component #93
  SourcemapIntegrityValidator: {
    validateBuildSourcemaps: vbs,
    fixCompileOptions: fco,
    rewriteImportMeta: rim
  },

  // Component #94
  NAPIThreadSafetyGuard: {
    createThreadSafeFunction: ctsf
  },

  // Component #95
  WebSocketFragmentGuard: {
    createWebSocket: cws
  },

  // Health check
  healthCheck: infrastructureHealthCheck,

  // Registry
  registry: FEATURE_REGISTRY
};

// Default export
export default Infrastructure;
