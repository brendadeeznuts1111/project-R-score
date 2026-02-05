/**
 * 📊 COMPREHENSIVE FEATURE FLAG REGISTRY
 * Synchronized with the canonical Feature Flag Status Matrix
 */

import { FEATURE_FLAGS, STATUS_BADGES } from '../constants';

export interface FeatureStatus {
  id: string;
  name: string;
  enabled: boolean;
  badge: string;
  category: string;
  description: string;
  criticalLevel: '✅ Critical' | '🚨 Critical' | '🚨 Prod Critical' | '⚠️ High' | '⚠️ Medium' | '🔵 Low' | '⚠️ Conditional';
  logHook: string;
}

export class FeatureRegistry {
  private static readonly METADATA: Record<string, { 
    description: string, 
    category: string, 
    criticalLevel: FeatureStatus['criticalLevel'],
    logHook: string
  }> = {
    ENV_DEVELOPMENT: { description: 'Development environment mode', category: '🌍 Environment', criticalLevel: '✅ Critical', logHook: 'ENV_CHANGE' },
    ENV_PRODUCTION: { description: 'Production environment mode', category: '🌍 Environment', criticalLevel: '✅ Critical', logHook: 'ENV_CHANGE' },
    FEAT_PREMIUM: { description: 'Premium tier features', category: '🏆 Feature Tier', criticalLevel: '⚠️ High', logHook: 'TIER_CHANGE' },
    FEAT_AUTO_HEAL: { description: 'Automatic error recovery', category: '🔄 Resilience', criticalLevel: '⚠️ High', logHook: 'HEALTH_CHANGE' },
    FEAT_NOTIFICATIONS: { description: 'Alert notifications', category: '🔔 Monitoring', criticalLevel: '⚠️ Medium', logHook: 'NOTIFY_CHANGE' },
    FEAT_ENCRYPTION: { description: 'Credential encryption', category: '🔐 Security', criticalLevel: '🚨 Critical', logHook: 'SECURITY_CHANGE' },
    FEAT_MOCK_API: { description: 'Mock API for testing', category: '🧪 Testing', criticalLevel: '🚨 Prod Critical', logHook: 'TESTING_CHANGE' },
    FEAT_EXTENDED_LOGGING: { description: 'Detailed logging', category: '📝 Logging', criticalLevel: '🔵 Low', logHook: 'LOGGING_CHANGE' },
    FEAT_ADVANCED_MONITORING: { description: 'Advanced metrics collection', category: '📈 Monitoring', criticalLevel: '⚠️ Medium', logHook: 'MONITOR_CHANGE' },
    FEAT_BATCH_PROCESSING: { description: 'Batch operations', category: '⚡ Performance', criticalLevel: '🔵 Low', logHook: 'PERF_CHANGE' },
    FEAT_VALIDATION_STRICT: { description: 'Strict validation rules', category: '✅ Validation', criticalLevel: '⚠️ High', logHook: 'VALIDATION_CHANGE' },
    PLATFORM_ANDROID: { description: 'Android platform target', category: '🤖 Platform', criticalLevel: '✅ Critical', logHook: 'PLATFORM_CHANGE' },
    PLATFORM_IOS: { description: 'iOS platform target', category: '🤖 Platform', criticalLevel: '✅ Critical', logHook: 'PLATFORM_CHANGE' },
    INTEGRATION_GEELARK_API: { description: 'GeeLark API integration', category: '🔌 Integration', criticalLevel: '🚨 Critical', logHook: 'INTEGRATION_CHANGE' },
    INTEGRATION_PROXY_SERVICE: { description: 'Proxy service integration', category: '🔌 Integration', criticalLevel: '⚠️ Conditional', logHook: 'INTEGRATION_CHANGE' },
    INTEGRATION_EMAIL_SERVICE: { description: 'Email service integration', category: '🔌 Integration', criticalLevel: '⚠️ Conditional', logHook: 'INTEGRATION_CHANGE' }
  };

  static getFullStatus(): FeatureStatus[] {
    const statuses: FeatureStatus[] = [];

    // Environment
    statuses.push(this.mapFlag('ENV_DEVELOPMENT', FEATURE_FLAGS.ENVIRONMENT.IS_DEVELOPMENT));
    statuses.push(this.mapFlag('ENV_PRODUCTION', FEATURE_FLAGS.ENVIRONMENT.IS_PRODUCTION));

    // Features
    Object.entries(FEATURE_FLAGS.FEATURES).forEach(([key, enabled]) => {
      this.addIfMapped(statuses, `FEAT_${key}`, enabled);
    });

    // Platforms
    statuses.push(this.mapFlag('PLATFORM_ANDROID', FEATURE_FLAGS.PLATFORM.ANDROID));
    statuses.push(this.mapFlag('PLATFORM_IOS', FEATURE_FLAGS.PLATFORM.IOS));

    return statuses;
  }

  private static addIfMapped(list: FeatureStatus[], id: string, enabled: boolean) {
    if (this.METADATA[id]) {
        list.push(this.mapFlag(id, enabled));
    }
  }

  private static mapFlag(id: string, enabled: boolean): FeatureStatus {
    const meta = this.METADATA[id] || { 
        description: 'System feature', 
        category: 'Other', 
        criticalLevel: '🔵 Low', 
        logHook: 'FEATURE_CHANGE' 
    };
    
    const config = (STATUS_BADGES.CONFIGURATIONS as any)[id] || { 
        enabled: id.replace('FEAT_', ''), 
        disabled: `NO ${id.replace('FEAT_', '')}` 
    };
    
    return {
      id,
      name: id.replace('FEAT_', '').replace('ENV_', '').replace('_', ' '),
      enabled,
      badge: enabled ? config.enabled : config.disabled,
      category: meta.category,
      description: meta.description,
      criticalLevel: meta.criticalLevel,
      logHook: meta.logHook
    };
  }
}
