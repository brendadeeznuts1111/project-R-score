import { AlertSeverity, FeatureFlag, HealthScore } from '../types';

/**
 * Pure utility functions for dead code elimination
 * These functions have no side effects and can be safely removed
 */

// Feature flag utilities
export const isFeatureEnabled = /*@__PURE__*/ (flag: FeatureFlag): boolean => {
  // This will be replaced with compile-time constants
  return false;
};

export const getFeatureBadge = /*@__PURE__*/ (flag: FeatureFlag, enabled: boolean): string => {
  const badges: Record<FeatureFlag, { enabled: string; disabled: string }> = {
    [FeatureFlag.ENV_DEVELOPMENT]: { enabled: '🌍 DEV', disabled: '🌍 PROD' },
    [FeatureFlag.ENV_PRODUCTION]: { enabled: '🌍 PROD', disabled: '🌍 DEV' },
    [FeatureFlag.FEAT_PREMIUM]: { enabled: '🏆 PREMIUM', disabled: '🔓 FREE' },
    [FeatureFlag.FEAT_AUTO_HEAL]: { enabled: '🔄 AUTO-HEAL', disabled: '⚠️ MANUAL' },
    [FeatureFlag.FEAT_NOTIFICATIONS]: { enabled: '🔔 ACTIVE', disabled: '🔕 SILENT' },
    [FeatureFlag.FEAT_ENCRYPTION]: { enabled: '🔐 ENCRYPTED', disabled: '⚠️ PLAINTEXT' },
    [FeatureFlag.FEAT_MOCK_API]: { enabled: '🧪 MOCK', disabled: '🚀 REAL' },
    [FeatureFlag.FEAT_EXTENDED_LOGGING]: { enabled: '📝 VERBOSE', disabled: '📋 NORMAL' },
    [FeatureFlag.FEAT_ADVANCED_MONITORING]: { enabled: '📈 ADVANCED', disabled: '📊 BASIC' },
    [FeatureFlag.FEAT_BATCH_PROCESSING]: { enabled: '⚡ BATCH', disabled: '🐌 SEQUENTIAL' },
    [FeatureFlag.FEAT_VALIDATION_STRICT]: { enabled: '✅ STRICT', disabled: '⚠️ LENIENT' },
    [FeatureFlag.PLATFORM_ANDROID]: { enabled: '🤖 ANDROID', disabled: '🍎 IOS' },
    [FeatureFlag.INTEGRATION_GEELARK_API]: { enabled: '🔌 GEELARK API', disabled: '🔌 NO API' },
    [FeatureFlag.INTEGRATION_PROXY_SERVICE]: { enabled: '🌐 PROXY', disabled: '🚫 NO PROXY' },
    [FeatureFlag.INTEGRATION_EMAIL_SERVICE]: { enabled: '📧 EMAIL', disabled: '🚫 NO EMAIL' },
    [FeatureFlag.INTEGRATION_SMS_SERVICE]: { enabled: '💬 SMS', disabled: '🚫 NO SMS' },
  };

  return enabled ? badges[flag]?.enabled || '✅ UNKNOWN' : badges[flag]?.disabled || '❌ UNKNOWN';
};

// Health status utilities
export const getHealthBadge = /*@__PURE__*/ (status: HealthScore): string => {
  const badges: Record<HealthScore, string> = {
    [HealthScore.HEALTHY]: '✅ HEALTHY',
    [HealthScore.DEGRADED]: '⚠️ DEGRADED',
    [HealthScore.IMPAIRED]: '🔄 IMPAIRED',
    [HealthScore.CRITICAL]: '🚨 CRITICAL',
    [HealthScore.OFFLINE]: '💀 OFFLINE',
  };
  return badges[status] || '❓ UNKNOWN';
};

export const calculateHealthPercentage = /*@__PURE__*/ (enabled: number, total: number): number => {
  return total > 0 ? Math.round((enabled / total) * 100) : 0;
};

// Alert utilities
export const getAlertIcon = /*@__PURE__*/ (severity: AlertSeverity): string => {
  const icons: Record<AlertSeverity, string> = {
    [AlertSeverity.CRITICAL]: '🚨',
    [AlertSeverity.HIGH]: '⚠️',
    [AlertSeverity.MEDIUM]: '⚡',
    [AlertSeverity.LOW]: 'ℹ️',
  };
  return icons[severity] || '❓';
};

// Performance utilities
export const formatBytes = /*@__PURE__*/ (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = /*@__PURE__*/ (value: number, total: number): string => {
  if (total === 0) return '0%';
  return Math.round((value / total) * 100) + '%';
};

// String utilities
export const truncateString = /*@__PURE__*/ (str: string, maxLength: number): string => {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

export const padString = /*@__PURE__*/ (str: string, length: number, padChar: string = ' '): string => {
  return str.padEnd(length, padChar);
};

// Time utilities
export const formatDuration = /*@__PURE__*/ (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const getTimestamp = /*@__PURE__*/ (): string => {
  return new Date().toISOString();
};

// Conditional rendering utilities
export const renderIf = /*@__PURE__*/ <T>(
  condition: boolean,
  truthy: T,
  falsy?: T
): T | undefined => {
  return condition ? truthy : falsy;
};

export const renderFeature = /*@__PURE__*/ <T>(
  flag: FeatureFlag,
  enabled: T,
  disabled?: T
): T | undefined => {
  return isFeatureEnabled(flag) ? enabled : disabled;
};

// Comparison utilities

// Bun.deepEquals exists at runtime but may be missing from types
const bunDeepEquals = (a: unknown, b: unknown, strict = false): boolean => {
  return (Bun as any).deepEquals(a, b, strict);
};

export const deepEquals = /*@__PURE__*/ (a: unknown, b: unknown, strict = false): boolean => {
  return bunDeepEquals(a, b, strict);
};

export interface DiffResult {
  equal: boolean;
  path: string;
  reason?: string;
  actual?: unknown;
  expected?: unknown;
}

export const deepEqualsWithDiff = /*@__PURE__*/ (
  a: unknown,
  b: unknown,
  strict = false,
  path = ''
): DiffResult => {
  // Fast path: use Bun's native check first
  if (bunDeepEquals(a, b, strict)) {
    return { equal: true, path };
  }

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) {
    return {
      equal: false,
      path,
      reason: 'type mismatch',
      actual: typeA,
      expected: typeB
    };
  }

  if (a === null || b === null) {
    return {
      equal: false,
      path,
      reason: 'null mismatch',
      actual: a,
      expected: b
    };
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return {
        equal: false,
        path,
        reason: 'array length',
        actual: a.length,
        expected: b.length
      };
    }
    for (let i = 0; i < a.length; i++) {
      const result = deepEqualsWithDiff(a[i], b[i], strict, `${path}[${i}]`);
      if (!result.equal) return result;
    }
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    const missing = keysB.filter(k => !keysA.includes(k));
    const extra = keysA.filter(k => !keysB.includes(k));

    if (missing.length > 0) {
      return {
        equal: false,
        path,
        reason: `missing keys: ${missing.join(', ')}`
      };
    }
    if (extra.length > 0 && strict) {
      return {
        equal: false,
        path,
        reason: `extra keys: ${extra.join(', ')}`
      };
    }

    for (const key of keysA) {
      if (key in (b as object)) {
        const result = deepEqualsWithDiff(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          strict,
          path ? `${path}.${key}` : key
        );
        if (!result.equal) return result;
      }
    }
  }

  // Primitive mismatch
  return {
    equal: false,
    path,
    reason: 'value mismatch',
    actual: a,
    expected: b
  };
};
