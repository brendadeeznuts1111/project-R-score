export type FeatureFlag = 
  // 🌍 Environment Flags
  | "ENV_DEVELOPMENT" | "ENV_PRODUCTION" | "ENV_STAGING" | "ENV_TEST" | "AUDIT_MODE"
  // 🏆 Feature Tier Flags
  | "FEAT_PREMIUM" | "FEAT_FREE" | "FEAT_ENTERPRISE"
  // 🔐 Security Flags
  | "FEAT_ENCRYPTION" | "FEAT_VALIDATION_STRICT" | "FEAT_AUDIT_LOGGING"
  // 🔄 Resilience Flags
  | "FEAT_AUTO_HEAL" | "FEAT_CIRCUIT_BREAKER" | "FEAT_RETRY_LOGIC"
  // 📊 Monitoring Flags
  | "FEAT_NOTIFICATIONS" | "FEAT_ADVANCED_MONITORING" | "FEAT_REAL_TIME_DASHBOARD" | "FEAT_PERFORMANCE_TRACKING"
  // ⚡ Performance Flags
  | "FEAT_BATCH_PROCESSING" | "FEAT_CACHE_OPTIMIZED" | "FEAT_COMPRESSION" | "FEAT_ASYNC_OPERATIONS"
  // 🧪 Development Flags
  | "FEAT_MOCK_API" | "FEAT_EXTENDED_LOGGING" | "FEAT_DEBUG_TOOLS" | "FEAT_VERBOSE_OUTPUT"
  // 🔌 Integration Flags
  | "INTEGRATION_GEELARK_API" | "INTEGRATION_PROXY_SERVICE" | "INTEGRATION_EMAIL_SERVICE" | "INTEGRATION_SMS_SERVICE" | "INTEGRATION_WEBHOOK";

export interface FlagImpact {
  bundleSize: string;
  performance: string;
  security: string;
}

export interface FlagCategory {
  id: string;
  label: string;
  description: string;
  flags: { 
    id: FeatureFlag; 
    name?: string;
    description: string; 
    tooltip?: string;
    badge?: { enabled: string; disabled: string };
    critical?: boolean;
    impact?: FlagImpact;
  }[];
}

export interface BuildConfig {
  name: string;
  description: string;
  cliCommand: string;
  features: FeatureFlag[];
  optimizations: string[];
  output: string;
  sizeEstimate: string;
  deadCodeElimination: string;
}

export interface BundleStat {
  name: string;
  size: number;
  max: number;
  dce: string;
}

export interface OptimizationReport {
  analysis: string;
  estimatedGains: string;
  criticalWarnings: string[];
}

export interface MatrixItem {
  component: string;
  implementation: string;
  typeSafety: "high" | "medium" | "low";
  dce: "full" | "partial" | "none";
  impact: "optimized" | "minor" | "varies";
}

export interface ConstantItem {
  source: string;
  value: string;
  description: string;
}

export interface ConstantCategory {
  id: string;
  label: string;
  items: ConstantItem[];
}

export interface HealthScoreItem {
  range: string;
  color: string;
  badge: string;
  status: string;
}

export interface AlertItem {
  type: string;
  trigger: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  channel: string;
  recovery: boolean;
}

export interface UnicodeWidthItem {
  feature: string;
  example: string;
  oldWidth: number;
  newWidth: number;
  correct: boolean;
  terminal: string;
}

export interface IntegrationItem {
  name: string;
  flag: FeatureFlag;
  healthCheck: string;
  timeout: string;
  retry: number;
  fallback: string;
  icon: string;
}
