// utils/platform-detector.ts - Platform-specific secret management detection

export interface PlatformCapabilities {
  platform: NodeJS.Platform;
  hasBun: boolean;
  hasCredentialManager: boolean;
  hasKeychain: boolean;
  hasSecretService: boolean;
  recommendedPersistFlag: string;
  supportedFeatures: string[];
}

/**
 * Detects platform capabilities for secret management
 */
export function detectPlatformCapabilities(): PlatformCapabilities {
  const platform = process.platform;
  const hasBun = typeof Bun !== "undefined";
  
  // Windows-specific checks
  const hasCredentialManager = hasBun && "CredentialManager" in Bun;
  
  // macOS/Linux checks (keychain/secret service availability)
  const hasKeychain = hasBun && (platform === "darwin");
  const hasSecretService = hasBun && (platform === "linux");
  
  // Determine recommended persist flag based on platform
  let recommendedPersistFlag: string;
  let supportedFeatures: string[] = [];
  
  if (platform === "win32") {
    recommendedPersistFlag = hasCredentialManager ? "CRED_PERSIST_ENTERPRISE" : "CRED_PERSIST_LOCAL";
    supportedFeatures = hasCredentialManager 
      ? ["enterprise_scoping", "credential_manager", "windows_integration"]
      : ["local_storage", "fallback_mode"];
  } else if (platform === "darwin") {
    recommendedPersistFlag = "CRED_PERSIST_ENTERPRISE";
    supportedFeatures = ["keychain_integration", "user_scoping", "macos_integration"];
  } else if (platform === "linux") {
    recommendedPersistFlag = "CRED_PERSIST_ENTERPRISE";
    supportedFeatures = ["secret_service", "user_scoping", "linux_integration"];
  } else {
    recommendedPersistFlag = "CRED_PERSIST_LOCAL";
    supportedFeatures = ["basic_storage", "fallback_mode"];
  }
  
  return {
    platform,
    hasBun,
    hasCredentialManager,
    hasKeychain,
    hasSecretService,
    recommendedPersistFlag,
    supportedFeatures
  };
}

/**
 * Check if CRED_PERSIST_ENTERPRISE is available and recommended
 */
export function isEnterprisePersistAvailable(): boolean {
  const capabilities = detectPlatformCapabilities();
  return capabilities.hasBun && 
         capabilities.recommendedPersistFlag === "CRED_PERSIST_ENTERPRISE";
}

/**
 * Get platform-specific service name with proper scoping
 */
export function getScopedServiceName(baseService: string, team: string = "default"): string {
  const capabilities = detectPlatformCapabilities();
  const platformScope = capabilities.hasCredentialManager ? "ENTERPRISE" : "USER";
  return `${baseService}-${platformScope}-${team}`;
}

/**
 * Validate platform compatibility for secrets operations
 */
export function validatePlatformCompatibility(): {
  compatible: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
} {
  const capabilities = detectPlatformCapabilities();
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];
  
  // Check for Bun
  if (!capabilities.hasBun) {
    errors.push("Bun runtime is required for secret management");
    return {
      compatible: false,
      warnings,
      errors,
      recommendations: ["Install Bun runtime: curl -fsSL https://bun.sh/install | bash"]
    };
  }
  
  // Platform-specific validations
  if (capabilities.platform === "win32") {
    if (!capabilities.hasCredentialManager) {
      warnings.push("Windows CredentialManager not available - using fallback mode");
      recommendations.push("Consider updating Bun for full Windows CredentialManager support");
    }
  } else if (capabilities.platform === "darwin") {
    if (!capabilities.hasKeychain) {
      errors.push("macOS Keychain access not available");
      recommendations.push("Check Keychain Access permissions");
    }
  } else if (capabilities.platform === "linux") {
    if (!capabilities.hasSecretService) {
      warnings.push("Linux secret service not detected - may need libsecret-dev");
      recommendations.push("Install libsecret-dev: apt-get install libsecret-1-dev");
    }
  }
  
  // Check for enterprise features
  if (!isEnterprisePersistAvailable()) {
    warnings.push("CRED_PERSIST_ENTERPRISE not available - using local storage");
    recommendations.push("Update Bun for latest enterprise features");
  }
  
  const compatible = errors.length === 0;
  
  return {
    compatible,
    warnings,
    errors,
    recommendations
  };
}

/**
 * Enhanced version of the private method you shared
 */
export function checkCredentialManagerAvailability(): boolean {
  return process.platform === "win32" && 
         typeof Bun !== "undefined" && 
         "CredentialManager" in Bun;
}

/**
 * Get platform-specific secret storage info
 */
export function getSecretStorageInfo(): {
  type: string;
  location: string;
  encryption: string;
  accessibility: string;
} {
  const capabilities = detectPlatformCapabilities();
  
  if (capabilities.platform === "win32") {
    return {
      type: capabilities.hasCredentialManager ? "Windows Credential Manager" : "Local Storage",
      location: "Windows Credential Manager / Registry",
      encryption: "Windows DPAPI",
      accessibility: "Per-user with enterprise scoping"
    };
  } else if (capabilities.platform === "darwin") {
    return {
      type: "macOS Keychain",
      location: "~/Library/Keychains/login.keychain",
      encryption: "AES-256",
      accessibility: "Per-user keychain access"
    };
  } else if (capabilities.platform === "linux") {
    return {
      type: "Linux Secret Service",
      location: "/run/user/*/keyring",
      encryption: "GNOME Keyring / KWallet",
      accessibility: "Per-user secret service"
    };
  } else {
    return {
      type: "Local Storage",
      location: "File system",
      encryption: "None",
      accessibility: "Process-local only"
    };
  }
}
