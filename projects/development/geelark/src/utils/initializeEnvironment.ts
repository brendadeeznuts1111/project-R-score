/**
 * Shared Environment Initialization Utility
 * Consolidates repeated initialization logic used in index.ts, CLI.ts, and main.ts
 * 
 * Reduces code duplication and ensures consistent environment setup across entry points
 * @__PURE__
 */

import { BUILD_CONFIGS } from "../config";
import { BuildType, FeatureFlag, LogLevel, PlatformType, SystemConfig } from "../types";

/**
 * Initialize environment configuration from process environment and options
 * @param options - Configuration options to override environment variables
 * @returns Initialized SystemConfig
 */
export const initializeEnvironment = (options: {
  environment?: "development" | "production";
  platform?: PlatformType;
  buildType?: BuildType;
  verbose?: boolean;
} = {}): SystemConfig => {
  // Determine environment
  const environment: "development" | "production" =
    options.environment ||
    (process.env.NODE_ENV === "production" ? "production" : "development");

  // Determine platform
  const platform =
    options.platform ||
    (process.env.PLATFORM === "ios" ? PlatformType.IOS : PlatformType.ANDROID);

  // Determine build type
  let buildType: BuildType = options.buildType || BuildType.DEVELOPMENT;
  if (process.env.BUILD_TYPE) {
    const envBuildType = process.env.BUILD_TYPE as keyof typeof BuildType;
    buildType = BuildType[envBuildType] || BuildType.DEVELOPMENT;
  }

  // Get build configuration
  const buildConfig = BUILD_CONFIGS[buildType];
  const featureFlags = new Map<FeatureFlag, boolean>();

  // Set feature flags based on build configuration
  buildConfig.flags.forEach((flag) => {
    featureFlags.set(flag, true);
  });

  // Override with environment-specific flags
  if (environment === "production") {
    featureFlags.set(FeatureFlag.ENV_PRODUCTION, true);
    featureFlags.set(FeatureFlag.ENV_DEVELOPMENT, false);
  } else {
    featureFlags.set(FeatureFlag.ENV_DEVELOPMENT, true);
    featureFlags.set(FeatureFlag.ENV_PRODUCTION, false);
  }

  // Platform-specific flags
  if (platform === PlatformType.ANDROID) {
    featureFlags.set(FeatureFlag.PLATFORM_ANDROID, true);
  }

  return {
    environment,
    platform,
    buildType,
    featureFlags,
    apiEndpoints: {
      geelark: process.env.GEELARK_BASE_URL,
      proxy: process.env.PROXY_SERVICE_URL,
      email: process.env.EMAIL_SERVICE_URL,
      sms: process.env.SMS_SERVICE_URL,
    },
    logging: {
      level: options.verbose ? LogLevel.DEBUG : (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      externalServices:
        process.env.EXTERNAL_LOGGING === "true"
          ? [
              "elasticsearch",
              "splunk",
              "datadog",
              "prometheus",
              "sentry",
              "cloudwatch",
            ]
          : [],
      retention: parseInt(process.env.LOG_RETENTION_DAYS || "30"),
    },
    security: {
      encryption: featureFlags.get(FeatureFlag.FEAT_ENCRYPTION) || false,
      validation:
        (process.env.VALIDATION_MODE as "strict" | "lenient") || "strict",
      auditTrail:
        featureFlags.get(FeatureFlag.FEAT_EXTENDED_LOGGING) || false,
    },
    monitoring: {
      advanced:
        featureFlags.get(FeatureFlag.FEAT_ADVANCED_MONITORING) || false,
      notifications:
        featureFlags.get(FeatureFlag.FEAT_NOTIFICATIONS) || false,
      healthChecks: true,
    },
  };
};

/**
 * Extract environment details from process.argv for CLI usage
 * @returns Options extracted from command-line arguments
 */
export const extractCliOptions = () => {
  const args = process.argv.slice(2);
  return {
    verbose: args.includes("--verbose"),
    dryRun: args.includes("--dry-run"),
    ascii: args.includes("--ascii"),
  };
};
