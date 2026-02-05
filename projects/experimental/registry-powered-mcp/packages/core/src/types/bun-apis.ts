/**
 * TypeScript interfaces for Bun Native APIs documentation
 * Provides type safety for API documentation access
 */

/**
 * Individual API documentation entry
 */
export interface ApiDocEntry {
  readonly api: string;
  readonly optimization: string;
  readonly performance: string;
  readonly implementation: string;
  readonly use_case: string;
  readonly security: string;
  readonly documentation: string;
  readonly code_location: string;
}

/**
 * Routing APIs category
 */
export interface RoutingApis {
  readonly URL_PATTERN: ApiDocEntry;
  readonly URL_API: ApiDocEntry;
  readonly STRING_OPERATIONS: ApiDocEntry;
}

/**
 * Data structures APIs category
 */
export interface DataStructureApis {
  readonly MAP: ApiDocEntry;
  readonly SWITCH_STATEMENTS: ApiDocEntry;
}

/**
 * HTTP and networking APIs category
 */
export interface HttpNetworkingApis {
  readonly BUN_SERVE: ApiDocEntry;
  readonly FETCH_API: ApiDocEntry;
  readonly HEADERS: ApiDocEntry;
}

/**
 * Performance APIs category
 */
export interface PerformanceApis {
  readonly PERFORMANCE_NOW: ApiDocEntry;
  readonly BUN_NANOSECONDS: ApiDocEntry;
}

/**
 * Security and cryptography APIs category
 */
export interface SecurityCryptoApis {
  readonly CRYPTO_UUID: ApiDocEntry;
  readonly CRYPTO_RANDOM: ApiDocEntry;
}

/**
 * Runtime APIs category
 */
export interface RuntimeApis {
  readonly BUN_ENV: ApiDocEntry;
  readonly PROCESS_EXIT: ApiDocEntry;
}

/**
 * File system APIs category
 */
export interface FileSystemApis {
  readonly BUN_FILE: ApiDocEntry;
}

/**
 * Complete BUN_NATIVE_APIS structure
 */
export interface BunNativeApis {
  readonly ROUTING: RoutingApis;
  readonly DATA_STRUCTURES: DataStructureApis;
  readonly HTTP_NETWORKING: HttpNetworkingApis;
  readonly PERFORMANCE: PerformanceApis;
  readonly SECURITY_CRYPTO: SecurityCryptoApis;
  readonly RUNTIME: RuntimeApis;
  readonly FILE_SYSTEM: FileSystemApis;
}

/**
 * Type for API category names
 */
export type ApiCategory = keyof BunNativeApis;

/**
 * Type for API names within a category
 */
export type RoutingApiName = keyof RoutingApis;
export type DataStructureApiName = keyof DataStructureApis;
export type HttpNetworkingApiName = keyof HttpNetworkingApis;
export type PerformanceApiName = keyof PerformanceApis;
export type SecurityCryptoApiName = keyof SecurityCryptoApis;
export type RuntimeApiName = keyof RuntimeApis;
export type FileSystemApiName = keyof FileSystemApis;

/**
 * Helper type to get all API names across all categories
 */
export type AnyApiName =
  | RoutingApiName
  | DataStructureApiName
  | HttpNetworkingApiName
  | PerformanceApiName
  | SecurityCryptoApiName
  | RuntimeApiName
  | FileSystemApiName;
