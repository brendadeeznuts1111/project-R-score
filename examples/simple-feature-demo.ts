// examples/simple-feature-demo.ts - Simple working example of Bun feature flags
// This demonstrates the correct syntax for Bun's feature() function

import { feature } from "bun:bundle";

// ✅ CORRECT: feature() used directly in if statements
export function debugLog(message: string): void {
  if (feature("DEBUG")) {
    console.log(`🐛 [DEBUG] ${message}`);
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
      console.log('🏢 Enterprise API Client initialized');
      this.setupEnterpriseFeatures();
    } else if (feature("STANDARD_SECURITY")) {
      console.log('🔒 Standard API Client initialized');
      this.setupStandardFeatures();
    } else {
      console.log('🛠️ Development API Client initialized');
      this.setupDevelopmentFeatures();
    }
  }
  
  private setupEnterpriseFeatures(): void {
    console.log('  ✅ Advanced threat detection enabled');
    console.log('  ✅ Compliance reporting enabled');
    console.log('  ✅ Enhanced monitoring enabled');
  }
  
  private setupStandardFeatures(): void {
    console.log('  ✅ Basic security enabled');
    console.log('  ✅ Standard audit logging enabled');
  }
  
  private setupDevelopmentFeatures(): void {
    console.log('  ✅ Debug mode enabled');
    console.log('  ✅ Mock services enabled');
  }
  
  async authenticate(): Promise<boolean> {
    if (feature("AWS_SIGV4")) {
      console.log('🔐 Using AWS Signature V4 authentication');
      return true;
    } else {
      console.log('🔑 Using Basic authentication');
      return true;
    }
  }
  
  async storeData(key: string, value: any): Promise<void> {
    if (feature("REDIS_CACHE")) {
      console.log(`💾 Storing ${key} in Redis cache`);
    } else {
      console.log(`🧠 Storing ${key} in memory cache`);
    }
    
    if (feature("FULL_AUDIT")) {
      console.log(`📊 Full audit: Stored ${key}`);
    } else {
      console.log(`📝 Basic audit: Stored ${key}`);
    }
  }
}

// Main demonstration function
export async function demonstrateFeatureFlags(): Promise<void> {
  console.log('🚀 Bun Feature Flags Demonstration\\n');
  
  // Show current feature configuration
  console.log('🔧 Current Feature Configuration:');
  console.log(`  Security Mode: ${getSecurityMode()}`);
  console.log(`  Auth Method: ${getAuthMethod()}`);
  console.log(`  Cache Type: ${getCacheType()}`);
  console.log(`  Audit Level: ${getAuditLevel()}`);
  console.log(`  Debug Enabled: ${isDebugEnabled() ? 'Yes' : 'No'}`);
  console.log(`  Enterprise Mode: ${isEnterpriseMode() ? 'Yes' : 'No'}`);
  
  // Test debug logging
  debugLog('This message only appears if DEBUG feature is enabled');
  
  // Test API client
  console.log('\\n🔐 Testing API Client:');
  const client = new SecureAPIClient();
  await client.authenticate();
  await client.storeData('test-key', { data: 'test-value' });
  
  console.log('\\n✅ Feature flags demonstration completed!');
}

// Run if executed directly
if (import.meta.main) {
  demonstrateFeatureFlags().catch(console.error);
}
