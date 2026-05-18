// examples/simple-feature-demo.ts - Simple working example of Bun feature flags
// This demonstrates the correct syntax for Bun's feature() function

import { feature } from "bun:bundle";

// ✅ CORRECT: feature() used directly in if statements
export function debugLog(message: string): void {
  if (feature("DEBUG")) {
    console.info(`🐛 [DEBUG] ${message}`);
  }
}

export function getSecurityMode(): string {
  if (feature("ENTERPRISE_SECURITY")) {
    return "ENTERPRISE";
  } else if (feature("STANDARD_SECURITY")) {
    return "STANDARD";  
  } else if (feature("DEVELOPMENT_MODE")) {
    return "DEVELOPMENT";
  } else {
    return "UNKNOWN";
  }
}

export function getAuthMethod(): string {
  if (feature("AWS_SIGV4")) {
    return "AWS Signature V4";
  } else {
    return "Basic Authentication";
  }
}

export function getCacheType(): string {
  if (feature("REDIS_CACHE")) {
    return "Redis";
  } else {
    return "Memory";
  }
}

export function getAuditLevel(): string {
  if (feature("FULL_AUDIT")) {
    return "Full Audit";
  } else {
    return "Basic Audit";
  }
}

// ✅ CORRECT: feature() used in ternary operators
export function isDebugEnabled(): boolean {
  return feature("DEBUG") ? true : false;
}

export function isEnterpriseMode(): boolean {
  return feature("ENTERPRISE_SECURITY") ? true : false;
}

// Example class with feature-based behavior
export class SecureAPIClient {
  constructor() {
    if (feature("ENTERPRISE_SECURITY")) {
      console.info('🏢 Enterprise API Client initialized');
      this.setupEnterpriseFeatures();
    } else if (feature("STANDARD_SECURITY")) {
      console.info('🔒 Standard API Client initialized');
      this.setupStandardFeatures();
    } else {
      console.info('🛠️ Development API Client initialized');
      this.setupDevelopmentFeatures();
    }
  }
  
  private setupEnterpriseFeatures(): void {
    console.info('  ✅ Advanced threat detection enabled');
    console.info('  ✅ Compliance reporting enabled');
    console.info('  ✅ Enhanced monitoring enabled');
  }
  
  private setupStandardFeatures(): void {
    console.info('  ✅ Basic security enabled');
    console.info('  ✅ Standard audit logging enabled');
  }
  
  private setupDevelopmentFeatures(): void {
    console.info('  ✅ Debug mode enabled');
    console.info('  ✅ Mock services enabled');
  }
  
  async authenticate(): Promise<boolean> {
    if (feature("AWS_SIGV4")) {
      console.info('🔐 Using AWS Signature V4 authentication');
      return true;
    } else {
      console.info('🔑 Using Basic authentication');
      return true;
    }
  }
  
  async storeData(key: string, value: any): Promise<void> {
    if (feature("REDIS_CACHE")) {
      console.info(`💾 Storing ${key} in Redis cache`);
    } else {
      console.info(`🧠 Storing ${key} in memory cache`);
    }
    
    if (feature("FULL_AUDIT")) {
      console.info(`📊 Full audit: Stored ${key}`);
    } else {
      console.info(`📝 Basic audit: Stored ${key}`);
    }
  }
}

// Main demonstration function
export async function demonstrateFeatureFlags(): Promise<void> {
  console.info('🚀 Bun Feature Flags Demonstration\\n');
  
  // Show current feature configuration
  console.info('🔧 Current Feature Configuration:');
  console.info(`  Security Mode: ${getSecurityMode()}`);
  console.info(`  Auth Method: ${getAuthMethod()}`);
  console.info(`  Cache Type: ${getCacheType()}`);
  console.info(`  Audit Level: ${getAuditLevel()}`);
  console.info(`  Debug Enabled: ${isDebugEnabled() ? 'Yes' : 'No'}`);
  console.info(`  Enterprise Mode: ${isEnterpriseMode() ? 'Yes' : 'No'}`);
  
  // Test debug logging
  debugLog('This message only appears if DEBUG feature is enabled');
  
  // Test API client
  console.info('\\n🔐 Testing API Client:');
  const client = new SecureAPIClient();
  await client.authenticate();
  await client.storeData('test-key', { data: 'test-value' });
  
  console.info('\\n✅ Feature flags demonstration completed!');
}

// Run if executed directly
if (import.meta.main) {
  demonstrateFeatureFlags().catch(console.error);
}
