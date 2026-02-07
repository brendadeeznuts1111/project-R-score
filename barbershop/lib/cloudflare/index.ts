/**
 * Cloudflare Integration Library
 * 
 * High-performance Cloudflare API client using Bun-native fetch.
 * Provides zone management, DNS records, SSL/TLS, caching, and analytics.
 * 
 * Secrets Integration:
 *   import { createClientFromSecrets } from './lib/cloudflare';
 *   const client = await createClientFromSecrets();
 * 
 * Unified Service (v1.3.7+):
 *   import { unifiedCloudflare } from './lib/cloudflare';
 *   await unifiedCloudflare.deployStack({...});
 */

export {
  CloudflareClient,
  createClientFromEnv,
  createClientFromSecrets,
  createClient,
  type CloudflareConfig,
  type CFZone,
  type CFDNSRecord,
  type CFSSLVerification,
  type CFPageRule,
  type CFWorkerScript,
  type CFFirewallRule,
  type CFApiResponse,
} from './client';

export {
  CloudflareSecretsBridge,
  cfSecretsBridge,
  type CloudflareCredentials,
} from './secrets-bridge';

export {
  UnifiedCloudflareService,
  unifiedCloudflare,
} from './unified-client';

export {
  UnifiedVersionManager,
  versionManager,
  semver,
  versionSatisfies,
  bumpVersion,
  isValidSemver,
  versionCompare,
} from './unified-versioning';

export type {
  SemverVersion,
  VersionedResource,
  DeploymentVersion,
  CompatibilityMatrix,
} from './unified-versioning';

export {
  BunCookieManager,
  BunColorManager,
  PrefixedEnvManager,
  BunHeaderManager,
  BunDataCLIManager,
  cookieManager,
  colorManager,
  headerManager,
  createPrefixedEnv,
  createDataCLI,
} from './bun-data-api';

export type {
  CookieOptions,
  ColorFormat,
  ColorValue,
  EnvConfig,
  HeaderConfig,
  DataCLIConfig,
} from './bun-data-api';

export {
  FactoryWagerRegistry,
  registry,
} from './registry';

export type {
  RegistryEntry,
  RegistryQuery,
  PlaygroundConfig,
  DashboardLayout,
  WidgetConfig,
  PermissionConfig,
  PaymentPipeline,
  PipelineStage,
  BarberHierarchy,
  PaymentApproval,
  ApprovalComment,
  PaymentType,
  PaymentProvider,
  PaymentStatus,
  CancellationReason,
  TipType,
  TipConfig,
  PaymentTransaction,
  P2PTransfer,
  BarberPayout,
  BarberAdvance,
  InsufficientFundsConfig,
  PaymentNotification,
} from './registry';

// Re-export as default
export { CloudflareClient as default } from './client';
