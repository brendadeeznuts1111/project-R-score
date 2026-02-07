/**
 * Utils Module - Centralized utilities export
 */

// Logger
export { logger, Logger, LogLevel } from './logger';

// Fetch utilities
export { fetchWithDefaults, isPublicHttpUrl, type FetchOptions } from './fetch-utils';

// Crypto utilities
export { checkCrypto } from './check-crypto';

// CLI Table
export {
  generateTable,
  printTable,
  ColumnTypes,
  formatStatus,
  getDisplayWidth,
  padUnicode,
  truncateUnicode,
  wrapText,
  type TableOptions,
  type TableColumn,
  type TableRow,
  type StatusType,
} from './cli-table';

// WebAssembly Table
export {
  WASMMachine,
  createDefaultMachine,
  DefaultHooks,
  type ComputeHook,
  type TableConfig,
  type HookEntry,
  type HookRegistry,
} from './wasm-table';
