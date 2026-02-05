// docs/changelogs/DUOPLUS_CONSTANTS.ts
// Extracted constants from DuoPlus Update Log 2025-12-31

export const ANDROID_VERSIONS = ['10', '11', '12B'] as const;

export const DUOPLUS_FEATURES = {
  CLOUD_NUMBER: 1,
  RPA_TEMPLATES: 2,
  BATCH_CLOUD_DRIVE: 3,
  API_INTERFACES: 4,
  DEVELOPER_TOOLS: 5,
  EXPIRY_DISPLAY: 6,
  RPA_MODE_ACCESSIBILITY: 7,
  PURCHASE_ENTRY: 8
} as const;

export const DUOPLUS_OPTIMIZATIONS = {
  REDDIT_ANTI_DETECT: 1,
  PROXY_DNS_LEAK: 2,
  CLOUD_PHONE_SORT: 3,
  AUTO_RENEWAL: 4,
  TEAM_MEMBER_ADD: 5,
  BULK_CONFIG_LIMIT: 6,
  RPA_UI_LAYOUT: 7,
  COST_CENTER_UI: 8
} as const;

export const BULK_LIMITS = {
  OLD: 150,
  NEW: 500
} as const;

export const RPA_TEMPLATES = [
  'tiktok_auto_comment',
  'tiktok_warming',
  'reddit_warming'
] as const;

export const BUN_NATIVE_SUGGESTIONS = {
  CLOUD_NUMBER: 'Bun.randomUUIDv7() for num IDs; Bun.file() for num storage',
  RPA_TEMPLATES: 'Bun.sleep() for task delays; AbortController for cancels',
  BATCH_CLOUD_DRIVE: 'Bun.zstdCompressSync() files; Bun.write() bulk',
  API_INTERFACES: 'Bun.serve() mock APIs; Bun.resolveSync() endpoints',
  DEVELOPER_TOOLS: 'Bun.inspect() dumps; Bun.openInEditor() logs',
  EXPIRY_DISPLAY: 'Bun.nanoseconds() expiry calc; Date utils',
  RPA_MODE_ACCESSIBILITY: 'Bun.peek() for UI promises; SIMD recog loops',
  PURCHASE_ENTRY: 'Bun.which(\'bun\') for CLI buys; Bun.env pricing',
  REDDIT_ANTI_DETECT: 'Uint8Array fingerprints; TextEncoder hashing',
  PROXY_DNS_LEAK: 'Bun.resolveSync() proxy paths; no leaks native',
  CLOUD_PHONE_SORT: 'Bun.stringWidth() table cols; Bun.inspect.table()',
  AUTO_RENEWAL: 'Bun.sleepSync() for renewal polls',
  TEAM_MEMBER_ADD: 'Bun.randomUUIDv7(\'base64url\') invite tokens',
  BULK_CONFIG_LIMIT: 'Bun.readableStreamToArrayBuffer() imports',
  RPA_UI_LAYOUT: 'Bun.escapeHTML() UI; Bun.stripANSI() logs',
  COST_CENTER_UI: 'Bun.deepEquals() cost calcs'
} as const;

export type DuoPlusFeature = typeof DUOPLUS_FEATURES[keyof typeof DUOPLUS_FEATURES];
export type DuoPlusOptimization = typeof DUOPLUS_OPTIMIZATIONS[keyof typeof DUOPLUS_OPTIMIZATIONS];
export type AndroidVersion = typeof ANDROID_VERSIONS[number];
export type RPATemplate = typeof RPA_TEMPLATES[number];
