const FEATURES: Readonly<Record<string, boolean>> = {
  DEBUG: true,
  PREMIUM_TIER: false,
  ENTERPRISE: false,
  QUANTUM_SAFE: false,
  ADVANCED_WIDTH_CALC: true,
  MOCK_API: true,
  BETA_FEATURES: false,
  SSO_INTEGRATION: false,
  AUDIT_LOGS: false,
  COMPLIANCE_MODE: false,
  ADVANCED_ANALYTICS: true,
  PERFORMANCE_PROFILING: false,
  WEBHOOK_SUPPORT: true,
  BACKUP_AUTOMATION: true
};

export function feature(name: string): boolean {
  return FEATURES[name] ?? false;
}
