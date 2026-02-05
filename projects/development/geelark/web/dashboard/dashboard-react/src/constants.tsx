import { FlagCategory, MatrixItem, ConstantCategory, HealthScoreItem, AlertItem, UnicodeWidthItem, IntegrationItem, BuildConfig } from './types';

export const BUILD_CONFIGURATIONS: BuildConfig[] = [
  {
    name: "development",
    description: "Development build with debugging",
    cliCommand: "bun run build:dev",
    features: ["ENV_DEVELOPMENT", "FEAT_EXTENDED_LOGGING", "FEAT_MOCK_API"],
    optimizations: [],
    output: "./dist/dev",
    sizeEstimate: "450KB",
    deadCodeElimination: "0%"
  },
  {
    name: "production-lite",
    description: "Production deployment - minimal",
    cliCommand: "bun run build:prod-lite",
    features: ["ENV_PRODUCTION", "FEAT_ENCRYPTION"],
    optimizations: ["minify", "drop-console", "jsx-side-effects"],
    output: "./dist/prod-lite",
    sizeEstimate: "320KB",
    deadCodeElimination: "29%"
  },
  {
    name: "production-standard",
    description: "Production deployment - standard",
    cliCommand: "bun run build:prod-standard",
    features: ["ENV_PRODUCTION", "FEAT_AUTO_HEAL", "FEAT_NOTIFICATIONS", "FEAT_ENCRYPTION", "FEAT_BATCH_PROCESSING"],
    optimizations: ["minify", "drop-console", "jsx-side-effects"],
    output: "./dist/prod-standard",
    sizeEstimate: "280KB",
    deadCodeElimination: "38%"
  },
  {
    name: "production-premium",
    description: "Production deployment - premium",
    cliCommand: "bun run build:prod-premium",
    features: ["ENV_PRODUCTION", "FEAT_PREMIUM", "FEAT_AUTO_HEAL", "FEAT_NOTIFICATIONS", "FEAT_ENCRYPTION", "FEAT_BATCH_PROCESSING", "FEAT_ADVANCED_MONITORING", "FEAT_EXTENDED_LOGGING", "FEAT_VALIDATION_STRICT"],
    optimizations: ["minify", "drop-console", "jsx-side-effects"],
    output: "./dist/prod-premium",
    sizeEstimate: "340KB",
    deadCodeElimination: "24%"
  },
  {
    name: "test",
    description: "CI/CD testing build",
    cliCommand: "bun run build:test",
    features: ["ENV_DEVELOPMENT", "FEAT_MOCK_API"],
    optimizations: [],
    output: "./dist/test",
    sizeEstimate: "180KB",
    deadCodeElimination: "60%"
  },
  {
    name: "audit",
    description: "Security audit build",
    cliCommand: "bun run build:audit",
    features: ["AUDIT_MODE", "FEAT_PREMIUM", "FEAT_AUTO_HEAL", "FEAT_NOTIFICATIONS", "FEAT_ENCRYPTION", "FEAT_BATCH_PROCESSING", "FEAT_ADVANCED_MONITORING", "FEAT_EXTENDED_LOGGING", "FEAT_VALIDATION_STRICT"],
    optimizations: ["debug"],
    output: "./dist/audit",
    sizeEstimate: "600KB",
    deadCodeElimination: "0%"
  }
];

export const FLAG_CATEGORIES: FlagCategory[] = [
  {
    id: "environment",
    label: "Environment",
    description: "Build and runtime environment configuration",
    flags: [
      { 
        id: "ENV_DEVELOPMENT", 
        name: "DEV",
        description: "Development environment features",
        critical: true,
        badge: { enabled: "🌍 DEV", disabled: "🌍 PROD" },
        impact: { bundleSize: "+15%", performance: "neutral", security: "neutral" }
      },
      { 
        id: "ENV_PRODUCTION", 
        name: "PROD",
        description: "Production environment optimizations",
        critical: true,
        badge: { enabled: "🌍 PROD", disabled: "🌍 DEV" },
        impact: { bundleSize: "-25%", performance: "neutral", security: "neutral" }
      },
      { id: "ENV_STAGING", description: "Staging environment settings" },
      { id: "ENV_TEST", description: "Test execution environment" }
    ]
  },
  {
    id: "security",
    label: "Security",
    description: "Security and encryption features",
    flags: [
      { 
        id: "FEAT_ENCRYPTION", 
        name: "ENCRYPTED",
        description: "End-to-end encryption",
        critical: true,
        badge: { enabled: "🔐 ENCRYPTED", disabled: "⚠️ PLAINTEXT" },
        impact: { bundleSize: "+5%", performance: "+8%", security: "enhanced" }
      },
      { 
        id: "FEAT_VALIDATION_STRICT", 
        name: "STRICT",
        description: "Strict input validation",
        badge: { enabled: "✅ STRICT", disabled: "⚠️ LENIENT" },
        impact: { bundleSize: "+5%", performance: "+3%", security: "neutral" }
      }
    ]
  },
  {
    id: "resilience",
    label: "Resilience",
    description: "Error handling and recovery features",
    flags: [
      { 
        id: "FEAT_AUTO_HEAL", 
        name: "AUTOHEAL",
        description: "Auto-healing capabilities",
        badge: { enabled: "🔄 AUTO-HEAL", disabled: "⚠️ MANUAL" },
        impact: { bundleSize: "+10%", performance: "+3%", security: "neutral" }
      },
      { id: "FEAT_CIRCUIT_BREAKER", description: "Fault isolation mechanism" },
      { id: "FEAT_RETRY_LOGIC", description: "Automatic request retry logic" }
    ]
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Monitoring and alerting features",
    flags: [
      { 
        id: "FEAT_NOTIFICATIONS", 
        name: "ACTIVE",
        description: "Notification system",
        badge: { enabled: "🔔 ACTIVE", disabled: "🔕 SILENT" },
        impact: { bundleSize: "+8%", performance: "+2%", security: "neutral" }
      },
      { 
        id: "FEAT_ADVANCED_MONITORING", 
        name: "ADVANCED",
        description: "Advanced monitoring features",
        badge: { enabled: "📈 ADVANCED", disabled: "📊 BASIC" },
        impact: { bundleSize: "+7%", performance: "+10%", security: "neutral" }
      },
      { id: "FEAT_REAL_TIME_DASHBOARD", description: "Live system metrics display" },
      { id: "FEAT_PERFORMANCE_TRACKING", description: "Execution profiling" }
    ]
  },
  {
    id: "performance",
    label: "Performance",
    description: "Performance optimization features",
    flags: [
      { 
        id: "FEAT_BATCH_PROCESSING", 
        name: "BATCH",
        description: "Batch processing optimization",
        badge: { enabled: "⚡ BATCH", disabled: "🐌 SEQUENTIAL" },
        impact: { bundleSize: "+8%", performance: "-20%", security: "neutral" }
      },
      { id: "FEAT_CACHE_OPTIMIZED", description: "Zero-copy cache mechanisms" },
      { id: "FEAT_COMPRESSION", description: "Network payload compression" },
      { id: "FEAT_ASYNC_OPERATIONS", description: "Enhanced async task pool" }
    ]
  },
  {
    id: "logging",
    label: "Logging",
    description: "Logging and debugging features",
    flags: [
      { 
        id: "FEAT_EXTENDED_LOGGING", 
        name: "VERBOSE",
        description: "Extended logging output",
        badge: { enabled: "📝 VERBOSE", disabled: "📋 NORMAL" },
        impact: { bundleSize: "+12%", performance: "+5%", security: "neutral" }
      },
      { id: "FEAT_DEBUG_TOOLS", description: "Integrated debugging utilities" },
      { id: "FEAT_VERBOSE_OUTPUT", description: "Detailed execution tracing" }
    ]
  },
  {
    id: "tier",
    label: "Feature Tier",
    description: "Product tier features",
    flags: [
      { 
        id: "FEAT_PREMIUM", 
        name: "PREMIUM",
        description: "Premium tier features",
        badge: { enabled: "🏆 PREMIUM", disabled: "🔓 FREE" },
        impact: { bundleSize: "+15%", performance: "+5%", security: "neutral" }
      },
      { 
        id: "FEAT_ENTERPRISE", 
        name: "ENTERPRISE",
        description: "Enterprise tier features",
        badge: { enabled: "🏢 ENTERPRISE", disabled: "🔓 STANDARD" },
        impact: { bundleSize: "+25%", performance: "+8%", security: "neutral" }
      },
      { id: "FEAT_FREE", description: "Baseline functionality" }
    ]
  },
  {
    id: "integration",
    label: "Integration",
    description: "External service integrations",
    flags: [
      { 
        id: "INTEGRATION_GEELARK_API", 
        name: "GEELARK API",
        description: "GeeLark API integration",
        critical: true,
        badge: { enabled: "🔌 GEELARK API", disabled: "🔌 NO API" },
        impact: { bundleSize: "+20%", performance: "neutral", security: "neutral" }
      },
      { id: "INTEGRATION_PROXY_SERVICE", description: "Built-in proxy routing" },
      { id: "INTEGRATION_EMAIL_SERVICE", description: "SMTP/SES connector" },
      { id: "INTEGRATION_SMS_SERVICE", description: "Twilio/SMS connector" }
    ]
  }
];

export const IMPLEMENTATION_MATRIX: MatrixItem[] = [
  { component: "Type Registry", implementation: "env.d.ts Registry Interface", typeSafety: "high", dce: "none", impact: "optimized" },
  { component: "Feature Flags", implementation: "import { feature } from \"bun:bundle\"", typeSafety: "high", dce: "full", impact: "optimized" },
  { component: "Build Configuration", implementation: "CLI flags & bun.build() API", typeSafety: "low", dce: "full", impact: "varies" },
  { component: "Feature Manager", implementation: "Runtime wrapper class", typeSafety: "high", dce: "partial", impact: "minor" },
  { component: "Constants Integration", implementation: "Compile-time constants", typeSafety: "high", dce: "full", impact: "optimized" },
];

export const HEALTH_SCORE_MATRIX: HealthScoreItem[] = [
  { range: "90-100%", color: "#28a745", badge: "✅ HEALTHY", status: "Normal operation" },
  { range: "70-89%", color: "#ffc107", badge: "⚠️ DEGRADED", status: "Warning banner" },
  { range: "50-69%", color: "#fd7e14", badge: "🔄 IMPAIRED", status: "Alert banner" },
  { range: "<50%", color: "#dc3545", badge: "🚨 CRITICAL", status: "Red alert overlay" },
];

export const ALERT_MATRIX: AlertItem[] = [
  { type: "Security Critical", trigger: "FEAT_ENCRYPTION disabled in prod", severity: "Critical", channel: "SMS, Slack", recovery: false },
  { type: "Production Warning", trigger: "FEAT_MOCK_API enabled in prod", severity: "High", channel: "Email, Slack", recovery: true },
  { type: "Feature Degradation", trigger: ">30% features disabled", severity: "Medium", channel: "Dashboard", recovery: true },
  { type: "Integration Failure", trigger: "Service down >5min", severity: "Medium", channel: "Slack", recovery: true },
];

export const UNICODE_WIDTH_MATRIX: UnicodeWidthItem[] = [
  { feature: "Flag Emoji", example: "🇺🇸", oldWidth: 1, newWidth: 2, correct: true, terminal: "Modern" },
  { feature: "Skin Tone", example: "👋🏽", oldWidth: 4, newWidth: 2, correct: true, terminal: "Most" },
  { feature: "ZWJ Sequences", example: "👨‍👩‍👧", oldWidth: 8, newWidth: 2, correct: true, terminal: "Modern" },
  { feature: "ANSI Sequences", example: "\\x1b[32mOK\\x1b[0m", oldWidth: 8, newWidth: 2, correct: true, terminal: "All" },
];

export const INTEGRATION_STATUS_MATRIX: IntegrationItem[] = [
  { name: "GeeLark API", flag: "INTEGRATION_GEELARK_API", healthCheck: "HTTP GET /health", timeout: "10s", retry: 3, fallback: "Mock Service", icon: "📱" },
  { name: "Proxy Service", flag: "INTEGRATION_PROXY_SERVICE", healthCheck: "Connection test", timeout: "5s", retry: 5, fallback: "Local Proxy", icon: "🌐" },
  { name: "Email Service", flag: "INTEGRATION_EMAIL_SERVICE", healthCheck: "SMTP test", timeout: "15s", retry: 2, fallback: "Log to file", icon: "📧" },
];

export const RUNTIME_CONSTANTS: ConstantCategory[] = [
  {
    id: "perf",
    label: "Performance & Timing",
    items: [
      { source: "performance.timeOrigin", value: "Unix Epoch", description: "Base timestamp for performance.now() relative to boot." },
      { source: "Bun.nanoseconds()", value: "number (uint64)", description: "Monotonic high-precision timer for micro-benchmarks." },
      { source: "Default CPU Profile", value: "cpuprofile", description: "Standard extension for V8/JSC compatible sampling data." },
      { source: "GC Type", value: "Synchronous / Full", description: "Behavior of Bun.gc(true) in tight loops." },
      { source: "Max Buffer Size", value: "2GB (Internal)", description: "Constraint on TypedArray allocations in JavaScriptCore." }
    ]
  },
  {
    id: "module",
    label: "Module Resolution",
    items: [
      { source: "Extension Order", value: ".tsx, .ts, .jsx, .js, .json", description: "Priority resolution for extension-less imports." },
      { source: "Auto Install", value: "Enabled (--install)", description: "Automatic fetch of missing npm packages during execution." },
      { source: "Target Environment", value: "bun, browser, node", description: "Built-in target presets for the transpiler." },
      { source: "Module System", value: "ESM (Standard)", description: "First-class support with automatic CJS interoperability." },
      { source: "Transpiler Level", value: "Native (C++)", description: "Bun's internal transpiler speed vs SWC/Esbuild." }
    ]
  }
];

export const SNIPPETS = {
  serviceFactory: `
import { feature } from "bun:bundle";

export class ServiceFactory {
  static createApiService() {
    if (feature("FEAT_MOCK_API")) {
      console.log("🧪 Creating mock API service");
      return { request: () => ({ success: true, mocked: true }) };
    }
    console.log("🚀 Creating production API service");
    return {
      request: async (url) => {
        const res = await fetch(url);
        return res.json();
      }
    };
  }

  static createMonitoring() {
    if (feature("FEAT_ADVANCED_MONITORING")) {
      return { 
        trackMetric: (name, value) => {
          console.log(\`📈 Metric: \${name} = \${value}\`);
          if (feature("FEAT_PREMIUM")) {
            this.calculateTrends(name, value);
          }
        }
      };
    }
    return { trackMetric: () => {} };
  }
}`,
  buildManager: `
import { feature } from "bun:bundle";

export class BuildManager {
  static async build(configName) {
    const config = BUILD_CONFIGS[configName];
    
    // Validate feature combinations
    const warnings = this.validateFeatures(config.features);
    
    // Perform build
    return await Bun.build({
      entrypoints: ["./src/index.ts"],
      outdir: config.output,
      target: "bun",
      format: "esm",
      minify: config.optimizations.includes("minify")
    });
  }
}`,
  deadCode: `
import { feature } from "bun:bundle";

function calculatePrice() {
  const basePrice = feature("FEAT_PREMIUM") ? 99 : 29;
  const discount = feature("ENV_DEVELOPMENT") ? 0.5 : 1;
  return basePrice * discount;
}

function getMaxAccounts() {
  switch (true) {
    case feature("FEAT_ENTERPRISE"): return 10000;
    case feature("FEAT_PREMIUM"): return 1000;
    default: return 20;
  }
}`
};
