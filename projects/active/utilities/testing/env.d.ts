/// <reference types="bun-types" />

declare module "bun:bundle" {
  interface Registry {
    features:
      | "PROD"
      | "DEV"
      | "STAGING"
      | "TEST"
      | "PHONE_AUTO"
      | "PHONE_MULTI"
      | "PREMIUM"
      | "ENTERPRISE"
      | "ENCRYPTION"
      | "BATCH_PROCESSING"
      | "FEAT_MOCK_API"
      | "FEAT_EXTENDED_LOGGING"
      | "FEAT_AUTO_HEAL"
      | "FEAT_ADVANCED_MONITORING"
      | "DEBUG"
      | "CLOUD_UPLOAD"
      | "LOCAL_DEV"
      | "AUDIT_LOG";
  }
}
