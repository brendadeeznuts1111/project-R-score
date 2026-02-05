// constants.ts - Extract magic numbers to named constants

// Timeouts and delays
export const TIMEOUTS = {
  CAPTCHA_WAIT_MS: 5000,
  SMS_POLL_INTERVAL_MS: 2000,
  SMS_DEFAULT_TIMEOUT_MS: 60000,
  DEVICE_PROVISION_TIMEOUT_MS: 120000,
  API_REQUEST_TIMEOUT_MS: 30000,
} as const;

// File paths
export const PATHS = {
  PROFILES_DIR: `${process.env.HOME}/.matrix/profiles`,
  LOGS_DIR: `${process.env.HOME}/.matrix`,
  DEVICE_LOGS: `${process.env.HOME}/.matrix/device-logs.jsonl`,
  DEVICE_DB: `${process.env.HOME}/.matrix/devices.db`,
} as const;

// Default values
export const DEFAULTS = {
  ANDROID_VERSION: "12B" as const,
  REGION: "us-west",
  DEVICE_COUNT: 1,
  PROFILE_EXTENSIONS: [".json5", ".json"] as const,
} as const;

// Service names
export const SERVICE_NAMES = {
  MATRIX: "com.duoplus.matrix",
} as const;
