import { heapStats } from "bun:jsc";

export type CriticalLevel = 'low' | 'medium' | 'high' | 'critical';
export type LogHook = 'ENV_CHANGE' | 'SECURITY_CHANGE' | 'PERF_CHANGE' | 'INTEGRATION_CHANGE';

export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  criticalLevel: CriticalLevel;
  logHook: LogHook;
  buildTimeImpact: number; // Percentage
  memoryImpact: number; // Percentage
  dashboardBadge: {
    enabled: string;
    disabled: string;
    unicodeWidth: number;
  };
  validation?: () => boolean;
}

export class FeatureRegistry {
  private static instance: FeatureRegistry;
  private flags: Map<string, FeatureFlag> = new Map();
  private changeListeners: Map<LogHook, Array<(flag: FeatureFlag) => void>> = new Map();

  private constructor() {
    this.initializeCoreFlags();
  }

  static getInstance(): FeatureRegistry {
    if (!FeatureRegistry.instance) {
      FeatureRegistry.instance = new FeatureRegistry();
    }
    return FeatureRegistry.instance;
  }

  private initializeCoreFlags(): void {
    this.registerFlag({
      name: 'ENV_DEVELOPMENT',
      description: 'Development environment mode',
      enabled: process.env.NODE_ENV === 'development',
      criticalLevel: 'critical',
      logHook: 'ENV_CHANGE',
      buildTimeImpact: 15,
      memoryImpact: 15,
      dashboardBadge: {
        enabled: '🌍 DEV',
        disabled: '🌍 PROD',
        unicodeWidth: 2
      }
    });

    this.registerFlag({
      name: 'FEAT_PREMIUM',
      description: 'Premium feature tier',
      enabled: process.env.FEAT_PREMIUM === 'true',
      criticalLevel: 'high',
      logHook: 'ENV_CHANGE',
      buildTimeImpact: 15,
      memoryImpact: 10,
      dashboardBadge: {
        enabled: '🏆 PREMIUM',
        disabled: '🔓 FREE',
        unicodeWidth: 2
      }
    });

    this.registerFlag({
      name: 'FEAT_ENCRYPTION',
      description: 'End-to-end encryption',
      enabled: process.env.NODE_ENV === 'production',
      criticalLevel: 'critical',
      logHook: 'SECURITY_CHANGE',
      buildTimeImpact: 5,
      memoryImpact: 10,
      dashboardBadge: {
        enabled: '🔐 ENCRYPTED',
        disabled: '⚠️ PLAINTEXT',
        unicodeWidth: 2
      },
      validation: () => {
        // Ensure encryption keys are available in production
        if (process.env.NODE_ENV === 'production') {
          return !!process.env.ENCRYPTION_KEY;
        }
        return true;
      }
    });

    // Add all other flags from the matrix...
  }

  registerFlag(flag: FeatureFlag): void {
    this.flags.set(flag.name, flag);
  }

  enableFlag(name: string): boolean {
    const flag = this.flags.get(name);
    if (!flag) return false;
    
    flag.enabled = true;
    this.triggerHook(flag.logHook, flag);
    return true;
  }

  disableFlag(name: string): boolean {
    const flag = this.flags.get(name);
    if (!flag) return false;
    
    // Prevent disabling critical security features in production
    if (flag.criticalLevel === 'critical' && process.env.NODE_ENV === 'production') {
      console.error(`🚨 Cannot disable critical flag ${name} in production`);
      return false;
    }
    
    flag.enabled = false;
    this.triggerHook(flag.logHook, flag);
    return true;
  }

  isEnabled(name: string): boolean {
    const flag = this.flags.get(name);
    return flag?.enabled || false;
  }

  getHealthScore(): number {
    const enabledCount = Array.from(this.flags.values())
      .filter(f => f.enabled).length;
    return (enabledCount / this.flags.size) * 100;
  }

  getBuildImpact(): number {
    return Array.from(this.flags.values())
      .filter(f => f.enabled)
      .reduce((sum, flag) => sum + flag.buildTimeImpact, 0);
  }

  private triggerHook(hook: LogHook, flag: FeatureFlag): void {
    const listeners = this.changeListeners.get(hook) || [];
    listeners.forEach(listener => listener(flag));
  }

  addChangeListener(hook: LogHook, callback: (flag: FeatureFlag) => void): void {
    const listeners = this.changeListeners.get(hook) || [];
    listeners.push(callback);
    this.changeListeners.set(hook, listeners);
  }
}
