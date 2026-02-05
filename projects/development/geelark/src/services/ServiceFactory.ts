// Feature-Aware Service Factory with Compile-Time Optimization
// Creates different service implementations based on feature flags
// Unused implementations are eliminated from the final bundle

import {
  COMPILE_TIME_CONFIG,
  COMPILE_TIME_FEATURES,
} from "../constants/features/compile-time.js";

/**
 * Type for feature flag function
 * Allows dependency injection for testing while preserving compile-time optimization
 */
export type FeatureFn = (flag: string) => boolean;

// Default feature function - returns false when not bundled (e.g., during tests)
// When bundled with --features, bun:bundle feature() will be used instead
const defaultFeature: FeatureFn = () => false;

// Try to import the real feature function from bun:bundle
// This will be replaced with a boolean at bundle time
let realFeature: FeatureFn = defaultFeature;
try {
  // Dynamic import to avoid errors in non-bundled environments
  const bunBundle = require("bun:bundle");
  if (bunBundle && typeof bunBundle.feature === "function") {
    realFeature = bunBundle.feature;
  }
} catch {
  // bun:bundle not available - use default (returns false)
}

/**
 * SERVICE FACTORY WITH COMPILE-TIME OPTIMIZATION
 * Different service implementations based on feature flags
 * Unused implementations are eliminated at build time
 *
 * Uses dependency injection for testability:
 * - Production: uses real `feature()` from bun:bundle
 * - Tests: can inject mock function for runtime control
 */
export class ServiceFactory {
  /**
   * @internal
   */
  private readonly featureFn: FeatureFn;

  constructor(featureFn?: FeatureFn) {
    // Default to real bun:bundle feature function
    this.featureFn = featureFn ?? realFeature;
  }

  /**
   * API Service Factory
   * Creates different API implementations based on features
   */
  createApiService() {
    // Capture feature function in closure for returned object methods
    const featureFn = this.featureFn;

    // Mock API only included in development builds
    if (featureFn("FEAT_MOCK_API")) {
      console.log("🧪 Creating mock API service (development only)");
      return {
        async request(endpoint: string) {
          // Mock implementation - eliminated in production
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100)
          );
          return {
            success: true,
            mocked: true,
            data: { endpoint, mock: true },
            timestamp: Date.now(),
            latency: Math.floor(Math.random() * 50),
          };
        },

        // Mock-specific methods (eliminated when FEAT_MOCK_API is false)
        async simulateError(endpoint: string) {
          return { success: false, error: "Mock error", endpoint };
        },

        setMockData(data: any) {
          console.log("📝 Mock data set:", data);
        },
      };
    }

    // Production API service
    console.log("🚀 Creating production API service");
    return {
      async request(endpoint: string, options?: any): Promise<any> {
        // Real implementation with feature-based configuration
        const timeout = COMPILE_TIME_CONFIG.API.TIMEOUT_MS;
        const retryAttempts = COMPILE_TIME_CONFIG.API.RETRY_ATTEMPTS;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(endpoint, {
            ...options,
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...options?.headers,
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.json();
        } catch (error) {
          // Retry logic if enabled
          if (featureFn("FEAT_RETRY_LOGIC") && retryAttempts > 0) {
            console.log(
              `🔄 Retrying API request (${retryAttempts} attempts remaining)`
            );
            return this.request(endpoint, options);
          }
          throw error;
        }
      },

      // Production-specific methods
      async healthCheck() {
        return this.request("/health");
      },
    };
  }

  /**
   * Logging Service Factory
   * Creates different logging implementations based on features
   */
  createLoggingService() {
    const featureFn = this.featureFn;

    // Extended logging only included when feature is enabled
    if (featureFn("FEAT_EXTENDED_LOGGING")) {
      console.log("📝 Creating extended logging service");
      return {
        log(message: string, metadata?: any) {
          const level = COMPILE_TIME_CONFIG.LOGGING.LEVEL;
          const timestamp = new Date().toISOString();

          // Structured logging if enabled
          if (featureFn("FEAT_ADVANCED_MONITORING")) {
            const logEntry = {
              timestamp,
              level,
              message,
              metadata,
              environment: COMPILE_TIME_FEATURES.ENVIRONMENT,
              tier: COMPILE_TIME_FEATURES.TIER,
            };

            console.log(JSON.stringify(logEntry));

            // Send to external logging if enabled
            if (COMPILE_TIME_CONFIG.LOGGING.EXTERNAL_LOGGING) {
              this.sendToExternalLogging(logEntry);
            }
          } else {
            console.log(`[${timestamp}] ${level}: ${message}`, metadata);
          }
        },

        // Extended logging methods (eliminated when FEAT_EXTENDED_LOGGING is false)
        sendToExternalLogging(logEntry: any) {
          // External logging integration
          if (featureFn("INTEGRATION_WEBHOOK")) {
            // Send to webhook service
            fetch("/api/logs", {
              method: "POST",
              body: JSON.stringify(logEntry),
            }).catch((err) => console.error("Failed to send log:", err));
          }
        },

        analyzeLogPatterns(message: string): string[] | undefined {
          // Pattern analysis logic (premium feature)
          if (featureFn("FEAT_PREMIUM")) {
            // Analyze log patterns for anomalies
            const patterns = this.extractPatterns(message);
            return patterns;
          }
        },

        extractPatterns(message: string) {
          // Extract patterns from log messages
          return message.match(/\b\w+\b/g) || [];
        },

        // Audit logging
        audit(action: string, user: string, details?: any) {
          if (featureFn("FEAT_AUDIT_LOGGING")) {
            this.log(`AUDIT: ${action}`, { user, details, type: "audit" });
          }
        },
      };
    }

    // Basic logging implementation
    console.log("📋 Creating basic logging service");
    return {
      log(message: string) {
        console.log(`📋 ${message}`);
      },
    };
  }

  /**
   * Monitoring Service Factory
   * Creates different monitoring implementations based on features
   */
  createMonitoringService() {
    const featureFn = this.featureFn;

    // Advanced monitoring only included in premium builds
    if (featureFn("FEAT_ADVANCED_MONITORING")) {
      console.log("📈 Creating advanced monitoring service");
      return {
        metrics: new Map(),

        trackMetric(name: string, value: number) {
          this.metrics.set(name, value);
          console.log(`📈 Metric: ${name} = ${value}`);

          // Premium monitoring features
          if (featureFn("FEAT_PREMIUM")) {
            this.calculateTrends(name, value);
            this.predictAnomalies(name, value);
          }

          // Real-time dashboard updates
          if (featureFn("FEAT_REAL_TIME_DASHBOARD")) {
            this.updateDashboard(name, value);
          }
        },

        // Premium-only methods (eliminated when FEAT_PREMIUM is false)
        calculateTrends(name: string, value: number) {
          // Trend analysis logic
          const history = this.getMetricHistory(name);
          if (history.length > 1) {
            const trend = this.calculateTrendDirection(history);
            console.log(`📊 Trend for ${name}: ${trend}`);
          }
        },

        predictAnomalies(name: string, value: number) {
          // Anomaly detection logic
          const history = this.getMetricHistory(name);
          if (history.length > 10) {
            const anomaly = this.detectAnomaly(history, value);
            if (anomaly) {
              console.log(`⚠️ Anomaly detected for ${name}: ${anomaly}`);

              // Send notifications if enabled
              if (featureFn("FEAT_NOTIFICATIONS")) {
                this.sendAlert(name, value, anomaly);
              }
            }
          }
        },

        updateDashboard(name: string, value: number) {
          // Real-time dashboard update
          console.log(`🖥️ Dashboard updated: ${name} = ${value}`);
        },

        getMetricHistory(name: string): number[] {
          // Return metric history for analysis
          return []; // Implementation would store history
        },

        calculateTrendDirection(history: number[]): string {
          // Simple trend calculation
          const recent = history.slice(-5);
          const older = history.slice(-10, -5);
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          return recentAvg > olderAvg ? "up" : "down";
        },

        detectAnomaly(history: number[], current: number): string | null {
          // Simple anomaly detection
          const avg = history.reduce((a, b) => a + b, 0) / history.length;
          const threshold = avg * 0.5; // 50% deviation
          return Math.abs(current - avg) > threshold
            ? "Significant deviation"
            : null;
        },

        sendAlert(name: string, value: number, anomaly: string) {
          // Send alert notification
          console.log(`🚨 Alert: ${name} = ${value} (${anomaly})`);
        },
      };
    }

    // Basic monitoring
    console.log("📊 Creating basic monitoring service");
    return {
      trackMetric(name: string, value: number) {
        console.log(`📊 ${name}: ${value}`);
      },
    };
  }

  /**
   * Phone Manager Factory
   * Creates different service implementations based on features
   */
  createPhoneManager() {
    console.log("📱 Creating phone manager");

    const featureFn = this.featureFn;

    // Multi-account feature affects max accounts
    const maxAccounts = featureFn("PHONE_MULTI_ACCOUNT")
      ? COMPILE_TIME_CONFIG.PHONE.MAX_ACCOUNTS
      : 1;

    return {
      phones: new Map(),
      maxAccounts,

      // Feature-based capabilities (using conditional evaluation)
      automationEnabled: featureFn("PHONE_AUTOMATION_ENABLED") ? true : false,
      realTimeSync: featureFn("PHONE_REAL_TIME_SYNC") ? true : false,
      advancedAnalytics: featureFn("PHONE_ADVANCED_ANALYTICS") ? true : false,
      bulkOperations: featureFn("PHONE_BULK_OPERATIONS") ? true : false,

      // Compile-time optimized methods
      canCreateAccount(): boolean {
        // This condition is evaluated at build time for static values
        if (featureFn("PHONE_MULTI_ACCOUNT")) {
          return this.phones.size < this.maxAccounts;
        }
        return this.phones.size === 0;
      },

      async createPhone(config: any) {
        if (!this.canCreateAccount()) {
          const limit = featureFn("PHONE_MULTI_ACCOUNT") ? maxAccounts : 1;
          throw new Error(`Account limit reached (${limit})`);
        }

        const phone = {
          id: `phone_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          ...config,
          createdAt: new Date().toISOString(),

          // Feature-based capabilities
          automation: this.automationEnabled,
          realTimeSync: this.realTimeSync,
          analytics: this.advancedAnalytics,

          // Methods based on features
          methods: this.getPhoneMethods(),
        };

        this.phones.set(phone.id, phone);

        // Log creation if extended logging is enabled
        if (featureFn("FEAT_EXTENDED_LOGGING")) {
          console.log(`📱 Phone created: ${phone.id}`);
        }

        return phone;
      },

      getPhoneMethods() {
        const methods: any = {
          // Basic methods always available
          basic: () => console.log("Basic phone operation"),
          getStatus: () => ({ active: true, synced: this.realTimeSync }),
        };

        // Automation methods (eliminated when PHONE_AUTOMATION_ENABLED is false)
        if (featureFn("PHONE_AUTOMATION_ENABLED")) {
          methods.automate = () => this.runAutomation();
          methods.schedule = () => this.scheduleTasks();
          methods.optimize = () => this.optimizeSettings();
        }

        // Analytics methods (eliminated when PHONE_ADVANCED_ANALYTICS is false)
        if (featureFn("PHONE_ADVANCED_ANALYTICS")) {
          methods.analyze = () => this.analyzePerformance();
          methods.getInsights = () => this.getPerformanceInsights();
          methods.exportData = () => this.exportAnalyticsData();
        }

        // Bulk operations (eliminated when PHONE_BULK_OPERATIONS is false)
        if (featureFn("PHONE_BULK_OPERATIONS")) {
          methods.bulkUpdate = (updates: any[]) =>
            this.bulkUpdatePhones(updates);
          methods.bulkDelete = (ids: string[]) => this.bulkDeletePhones(ids);
          methods.bulkExport = () => this.bulkExportPhones();
        }

        return methods;
      },

      analyzePerformance() {
        console.log("📊 Analyzing phone performance...");
        // Performance analysis logic
        return {
          efficiency: 0.85,
          recommendations: ["Optimize sync frequency", "Enable caching"],
        };
      },

      getPerformanceInsights() {
        console.log("💡 Getting performance insights...");
        // Insights generation logic
        return {
          trends: ["increasing_efficiency"],
          predictions: ["optimal_performance_next_week"],
        };
      },

      exportAnalyticsData() {
        console.log("📤 Exporting analytics data...");
        // Data export logic
        return { data: "analytics_data", format: "json" };
      },

      runAutomation() {
        console.log("🤖 Running automation...");
        return { automated: true, tasksCompleted: 5 };
      },

      scheduleTasks() {
        console.log("📅 Scheduling automation tasks...");
        return { scheduled: 3, nextRun: "in 1 hour" };
      },

      optimizeSettings() {
        console.log("⚡ Optimizing phone settings...");
        return { optimized: true, efficiencyGain: "15%" };
      },

      bulkUpdatePhones(updates: any[]) {
        console.log(`🔄 Bulk updating ${updates.length} phones...`);
        // Bulk update logic
        return { updated: updates.length, success: true };
      },

      bulkDeletePhones(ids: string[]) {
        console.log(`🗑️ Bulk deleting ${ids.length} phones...`);
        // Bulk delete logic
        return { deleted: ids.length, success: true };
      },

      bulkExportPhones() {
        console.log("📦 Bulk exporting phones...");
        // Bulk export logic
        return { data: Array.from(this.phones.values()), format: "json" };
      },
    };
  }

  /**
   * Notification Service Factory
   * Creates different notification implementations based on features
   */
  createNotificationService() {
    const featureFn = this.featureFn;

    if (!featureFn("FEAT_NOTIFICATIONS")) {
      console.log("🔕 Notifications disabled");
      return {
        send: async (message: string) => {
          console.log(`🔕 Notification suppressed: ${message}`);
        },
      };
    }

    console.log("🔔 Creating notification service");
    return {
      async send(message: string) {
        console.log(`🔔 Sending notification: ${message}`);

        // Email notifications
        if (featureFn("INTEGRATION_EMAIL_SERVICE")) {
          await this.sendEmail(message);
        }

        // SMS notifications
        if (featureFn("INTEGRATION_SMS_SERVICE")) {
          await this.sendSMS(message);
        }

        // Webhook notifications
        if (featureFn("INTEGRATION_WEBHOOK")) {
          await this.sendWebhook(message);
        }
      },

      // Channel-specific methods (eliminated when integrations are disabled)
      async sendEmail(message: string) {
        console.log(`📧 Email sent: ${message}`);
        // Email implementation
      },

      async sendSMS(message: string) {
        console.log(`💬 SMS sent: ${message}`);
        // SMS implementation
      },

      async sendWebhook(message: string) {
        console.log(`🔗 Webhook sent: ${message}`);
        // Webhook implementation
      },
    };
  }

  /**
   * Cache Service Factory
   * Creates different cache implementations based on features
   */
  createCacheService() {
    const featureFn = this.featureFn;

    if (!featureFn("FEAT_CACHE_OPTIMIZED")) {
      console.log("💾 Basic cache (no optimization)");
      // Use in-memory Map instead of localStorage (browser-specific)
      const cache = new Map<string, string>();
      return {
        get: (key: string) => cache.get(key) ?? null,
        set: (key: string, value: string) => cache.set(key, value),
        delete: (key: string) => cache.delete(key),
        clear: () => cache.clear(),
      };
    }

    console.log("⚡ Creating optimized cache service");
    return {
      cache: new Map<string, {
        value: any;
        size: number;
        created: number;
        accessed: number;
      }>(),
      maxSize: COMPILE_TIME_CONFIG.PERFORMANCE.CACHE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
      currentSize: 0,
      hits: 0,
      misses: 0,

      get(key: string) {
        const item = this.cache.get(key);
        if (item) {
          this.hits++;
          // Update access time for LRU
          item.accessed = Date.now();
          return item.value;
        }
        this.misses++;
        return null;
      },

      set(key: string, value: any) {
        const size = this.calculateSize(value);

        // Check if we need to evict items
        while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
          this.evictLRU();
        }

        this.cache.set(key, {
          value,
          size,
          created: Date.now(),
          accessed: Date.now(),
        });

        this.currentSize += size;
      },

      delete(key: string) {
        const item = this.cache.get(key);
        if (item) {
          this.currentSize -= item.size;
          this.cache.delete(key);
        }
      },

      clear() {
        this.cache.clear();
        this.currentSize = 0;
        this.hits = 0;
        this.misses = 0;
      },

      // Optimized cache methods
      calculateSize(value: any): number {
        // Simple size calculation
        return JSON.stringify(value).length * 2; // Rough estimate
      },

      evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of this.cache.entries()) {
          if (item.accessed < oldestTime) {
            oldestTime = item.accessed;
            oldestKey = key;
          }
        }

        if (oldestKey) {
          this.delete(oldestKey);
          this.evictionCount++;
        }
      },

      // Advanced cache features (premium)
      getStats() {
        if (featureFn("FEAT_PREMIUM")) {
          return {
            size: this.cache.size,
            currentSize: this.currentSize,
            maxSize: this.maxSize,
            hitRate: this.calculateHitRate(),
            evictionCount: this.evictionCount,
            hits: this.hits,
            misses: this.misses,
          };
        }
        return { size: this.cache.size };
      },

      calculateHitRate(): number {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
      },

      evictionCount: 0,
    };
  }
}

/**
 * Factory function for creating ServiceFactory instances
 * Provides backward compatibility with static API
 *
 * @example
 * // Default factory (uses real feature flags)
 * const factory = createServiceFactory();
 *
 * @example
 * // Test factory (with mocked feature flags)
 * const mockFeature = (flag: string) => flag === "FEAT_MOCK_API";
 * const factory = createServiceFactory(mockFeature);
 */
export const createServiceFactory = (featureFn?: FeatureFn): ServiceFactory => {
  return new ServiceFactory(featureFn);
};

/**
 * Default factory instance using real feature flags from bun:bundle
 * Use this for production code to leverage compile-time optimization
 */
export const defaultFactory = new ServiceFactory();

// Export the class as default for backward compatibility
export default ServiceFactory;
