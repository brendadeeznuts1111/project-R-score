// Device Naming and Configuration Constants
// Defines naming conventions, requirements, and defaults for enhanced templates

export const DEVICE_NAMING = {
  // DuoPlus Phone Naming Patterns
  DUOPLUS_PHONE_PATTERNS: {
    GAMING_MOBILE: "gaming-phone-{id}",
    SOCIAL_MEDIA_MANAGER: "social-phone-{id}",
    DROPSHIPPING_PRO: "ecommerce-phone-{id}",
    ACCOUNT_CREATION_PRO: "account-phone-{id}",
    SCRAPING_STEALTH: "scraping-phone-{id}",
    DEVELOPMENT_CLOUD: "dev-phone-{id}",
    STREAMING_GLOBAL: "streaming-phone-{id}"
  },

  // IPFoxy Proxy Naming Patterns
  IPFOXY_PROXY_PATTERNS: {
    GAMING_MOBILE: "gaming-proxy-{ip}",
    SOCIAL_MEDIA_MANAGER: "social-proxy-{ip}",
    DROPSHIPPING_PRO: "ecommerce-proxy-{ip}",
    ACCOUNT_CREATION_PRO: "account-proxy-{ip}",
    SCRAPING_STEALTH: "scraping-proxy-{ip}",
    DEVELOPMENT_CLOUD: "dev-proxy-{ip}",
    STREAMING_GLOBAL: "streaming-proxy-{ip}"
  },

  // Default Phone Numbers and Area Codes
  DEFAULT_PHONE_CONFIGS: {
    GAMING_MOBILE: {
      phoneNumber: "+1-555-0123",
      areaCode: "555",
      ipAreaCode: "213"
    },
    SOCIAL_MEDIA_MANAGER: {
      phoneNumber: "+1-555-0134",
      areaCode: "555",
      ipAreaCode: "213"
    },
    DROPSHIPPING_PRO: {
      phoneNumber: "+1-555-0156",
      areaCode: "555",
      ipAreaCode: "302"
    },
    ACCOUNT_CREATION_PRO: {
      phoneNumber: "+1-555-0178",
      areaCode: "555",
      ipAreaCode: "214"
    },
    SCRAPING_STEALTH: {
      phoneNumber: "+1-555-0190",
      areaCode: "555",
      ipAreaCode: "69"
    },
    DEVELOPMENT_CLOUD: {
      phoneNumber: "+1-555-0145",
      areaCode: "555",
      ipAreaCode: "503"
    },
    STREAMING_GLOBAL: {
      phoneNumber: "+1-555-0167",
      areaCode: "555",
      ipAreaCode: "212"
    }
  },

  // Default Proxy Locations
  DEFAULT_PROXY_LOCATIONS: {
    GAMING_MOBILE: "US-California-LA",
    SOCIAL_MEDIA_MANAGER: "US-California-LA",
    DROPSHIPPING_PRO: "US-Delaware-Wilmington",
    ACCOUNT_CREATION_PRO: "US-Texas-Dallas",
    SCRAPING_STEALTH: "Germany-Frankfurt",
    DEVELOPMENT_CLOUD: "US-Oregon-Portland",
    STREAMING_GLOBAL: "US-NewYork-NYC"
  }
} as const;

// Proxy Protocol Configuration
export const PROXY_PROTOCOLS = {
  GAMING_MOBILE: { type: "socks5" as const, port: 1080, encryption: false },
  SOCIAL_MEDIA_MANAGER: { type: "https" as const, port: 443, encryption: true },
  DROPSHIPPING_PRO: { type: "https" as const, port: 443, encryption: true },
  ACCOUNT_CREATION_PRO: { type: "https" as const, port: 443, encryption: true },
  SCRAPING_STEALTH: { type: "https" as const, port: 443, encryption: true },
  DEVELOPMENT_CLOUD: { type: "socks5" as const, port: 1080, encryption: false },
  STREAMING_GLOBAL: { type: "https" as const, port: 443, encryption: true }
} as const;

// Template names constant for validation
export const TEMPLATE_NAMES = {
  GAMING_MOBILE: "GAMING_MOBILE",
  SOCIAL_MEDIA_MANAGER: "SOCIAL_MEDIA_MANAGER",
  DROPSHIPPING_PRO: "DROPSHIPPING_PRO",
  ACCOUNT_CREATION_PRO: "ACCOUNT_CREATION_PRO",
  SCRAPING_STEALTH: "SCRAPING_STEALTH",
  DEVELOPMENT_CLOUD: "DEVELOPMENT_CLOUD",
  STREAMING_GLOBAL: "STREAMING_GLOBAL"
} as const;

// Environment-Specific Overrides
export const ENVIRONMENT_OVERRIDES = {
  dev: {
    GAMING_MOBILE: {
      phoneNumber: "+1-555-0001",
      areaCode: "000"
    },
    SOCIAL_MEDIA_MANAGER: {
      phoneNumber: "+1-555-0002",
      areaCode: "000"
    }
    // Add dev overrides for other templates as needed
  },
  staging: {
    GAMING_MOBILE: {
      phoneNumber: "+1-555-1001",
      areaCode: "100"
    },
    SOCIAL_MEDIA_MANAGER: {
      phoneNumber: "+1-555-1002",
      areaCode: "100"
    }
    // Add staging overrides for other templates as needed
  },
  prod: {
    // Production uses defaults, no overrides needed
  }
} as const;

// Authentication Requirements Matrix
export const AUTH_REQUIREMENTS = {
  GAMING_MOBILE: {
    sms2fa: "required" as const,
    passwordManager2fa: "optional" as const,
    bindStatus: "bound" as const
  },
  SOCIAL_MEDIA_MANAGER: {
    sms2fa: "required" as const,
    passwordManager2fa: "required" as const,
    bindStatus: "bound" as const
  },
  DROPSHIPPING_PRO: {
    sms2fa: "required" as const,
    passwordManager2fa: "required" as const,
    bindStatus: "bound" as const
  },
  ACCOUNT_CREATION_PRO: {
    sms2fa: "required" as const,
    passwordManager2fa: "required" as const,
    bindStatus: "bound" as const
  },
  SCRAPING_STEALTH: {
    sms2fa: "not_required" as const,
    passwordManager2fa: "not_required" as const,
    bindStatus: "unbound" as const
  },
  DEVELOPMENT_CLOUD: {
    sms2fa: "not_required" as const,
    passwordManager2fa: "optional" as const,
    bindStatus: "unbound" as const
  },
  STREAMING_GLOBAL: {
    sms2fa: "not_required" as const,
    passwordManager2fa: "not_required" as const,
    bindStatus: "unbound" as const
  }
} as const;

// Type definitions for device naming
export type TemplateName = keyof typeof DEVICE_NAMING.DUOPLUS_PHONE_PATTERNS;
export type AuthRequirement = "required" | "optional" | "not_required";
export type BindStatus = "bound" | "unbound";
export type Environment = keyof typeof ENVIRONMENT_OVERRIDES;
export type ProxyType = "socks5" | "https";

// Runtime Validation Functions
export function validateTemplateName(name: string): name is TemplateName {
  return name in DEVICE_NAMING.DUOPLUS_PHONE_PATTERNS;
}

export function validateEnvironment(env: string): env is Environment {
  return env in ENVIRONMENT_OVERRIDES;
}

// Helper functions for device naming
export function generateDuoPlusPhoneName(template: TemplateName, phoneId: string): string {
  const pattern = DEVICE_NAMING.DUOPLUS_PHONE_PATTERNS[template];
  return pattern.replace("{id}", phoneId);
}

export function generateIPFoxyProxyName(template: TemplateName, ipAddress: string): string {
  const pattern = DEVICE_NAMING.IPFOXY_PROXY_PATTERNS[template];
  return pattern.replace("{ip}", ipAddress);
}

export function getDefaultPhoneConfig(template: TemplateName) {
  return DEVICE_NAMING.DEFAULT_PHONE_CONFIGS[template];
}

export function getDefaultProxyLocation(template: TemplateName): string {
  return DEVICE_NAMING.DEFAULT_PROXY_LOCATIONS[template];
}

export function getProxyProtocol(template: TemplateName) {
  return PROXY_PROTOCOLS[template];
}

export function getAuthRequirements(template: TemplateName) {
  return AUTH_REQUIREMENTS[template];
}

// Environment-specific configuration
export function getEnvConfig(template: TemplateName, env: Environment = "prod") {
  const defaultConfig = getDefaultPhoneConfig(template);
  const envOverride = (ENVIRONMENT_OVERRIDES[env] as Record<string, unknown>)?.[
    template
  ] as Partial<typeof defaultConfig>;
  return { ...defaultConfig, ...envOverride };
}

// Async Configuration Loading (for database integration)
export interface DatabasePhoneConfig {
  phoneNumber?: string;
  areaCode?: string;
  ipAreaCode?: string;
  customSettings?: Record<string, unknown>;
}

export interface DatabaseProxyConfig {
  port?: number;
  encryption?: boolean;
  customDns?: string[];
  customWhitelist?: string[];
}

// Mock database interface - replace with actual database implementation
export interface PhoneConfigDatabase {
  findOne(query: { template: TemplateName; phoneId: string }): Promise<DatabasePhoneConfig | null>;
  save(
    query: { template: TemplateName; phoneId: string },
    config: DatabasePhoneConfig
  ): Promise<void>;
}

export interface ProxyConfigDatabase {
  findOne(query: { template: TemplateName; proxyId: string }): Promise<DatabaseProxyConfig | null>;
  save(
    query: { template: TemplateName; proxyId: string },
    config: DatabaseProxyConfig
  ): Promise<void>;
}

// Async configuration loading functions
export async function getPhoneConfig(
  template: TemplateName,
  phoneId: string,
  env: Environment = "prod",
  db?: PhoneConfigDatabase
): Promise<Record<string, unknown>> {
  const defaultConfig = getEnvConfig(template, env);

  if (db) {
    try {
      const dbConfig = await db.findOne({ template, phoneId });
      return { ...defaultConfig, ...(dbConfig as Record<string, unknown>) };
    } catch {
      console.warn(
        `Failed to load phone config from database for ${template}:${phoneId}, using defaults`
      );
      return defaultConfig;
    }
  }

  return defaultConfig;
}

export async function getProxyConfig(
  template: TemplateName,
  proxyId: string,
  db?: ProxyConfigDatabase
): Promise<Record<string, unknown>> {
  const defaultConfig = getProxyProtocol(template);

  if (db) {
    try {
      const dbConfig = await db.findOne({ template, proxyId });
      return { ...defaultConfig, ...(dbConfig as Record<string, unknown>) };
    } catch {
      console.warn(
        `Failed to load proxy config from database for ${template}:${proxyId}, using defaults`
      );
      return defaultConfig;
    }
  }

  return defaultConfig;
}

// Validation functions
export function requiresSms2fa(template: TemplateName): boolean {
  return AUTH_REQUIREMENTS[template].sms2fa === "required";
}

export function requiresPasswordManager2fa(template: TemplateName): boolean {
  return AUTH_REQUIREMENTS[template].passwordManager2fa === "required";
}

export function isBoundTemplate(template: TemplateName): boolean {
  return AUTH_REQUIREMENTS[template].bindStatus === "bound";
}

// Health check validation
export function validateTemplateConfiguration(template: TemplateName): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate template exists
  if (!Object.values(TEMPLATE_NAMES).includes(template)) {
    errors.push(`Unknown template: ${template}`);
  }

  // Validate required fields
  const defaults = getDefaultPhoneConfig(template);
  if (!defaults.phoneNumber) {
    errors.push(`Template ${template} missing phone number`);
  }

  if (!defaults.areaCode) {
    errors.push(`Template ${template} missing area code`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Quick reference matrix data
export const QUICK_REFERENCE_MATRIX = {
  GAMING_MOBILE: {
    sms2fa: true,
    passwordManager2fa: false,
    bound: true,
    socks5: true,
    https: false
  },
  SOCIAL_MEDIA_MANAGER: {
    sms2fa: true,
    passwordManager2fa: true,
    bound: true,
    socks5: false,
    https: true
  },
  DROPSHIPPING_PRO: {
    sms2fa: true,
    passwordManager2fa: true,
    bound: true,
    socks5: false,
    https: true
  },
  ACCOUNT_CREATION_PRO: {
    sms2fa: true,
    passwordManager2fa: true,
    bound: true,
    socks5: false,
    https: true
  },
  SCRAPING_STEALTH: {
    sms2fa: false,
    passwordManager2fa: false,
    bound: false,
    socks5: false,
    https: true
  },
  DEVELOPMENT_CLOUD: {
    sms2fa: false,
    passwordManager2fa: false,
    bound: false,
    socks5: true,
    https: false
  },
  STREAMING_GLOBAL: {
    sms2fa: false,
    passwordManager2fa: false,
    bound: false,
    socks5: false,
    https: true
  }
} as const;

export type QuickReferenceMatrix = (typeof QUICK_REFERENCE_MATRIX)[TemplateName];

// Factory interface for creating PhoneProfile and ResourceBundle
export interface PhoneProfile {
  id: string;
  name: string;
  template: TemplateName;
  phoneNumber: string;
  areaCode: string;
  ipAreaCode: string;
  authRequirements: ReturnType<typeof getAuthRequirements>;
  bindStatus: BindStatus;
}

export interface ResourceBundle {
  id: string;
  name: string;
  template: TemplateName;
  proxyName: string;
  proxyProtocol: ReturnType<typeof getProxyProtocol>;
  location: string;
}

export interface DeviceFactory {
  createPhoneProfile(
    template: TemplateName,
    phoneId: string,
    env?: Environment
  ): Promise<PhoneProfile>;
  createResourceBundle(
    template: TemplateName,
    proxyId: string,
    ipAddress: string
  ): Promise<ResourceBundle>;
}

// Example factory implementation
export class EnhancedDeviceFactory implements DeviceFactory {
  private phoneDb?: PhoneConfigDatabase;
  private proxyDb?: ProxyConfigDatabase;
  private env: Environment;

  constructor(
    phoneDb?: PhoneConfigDatabase,
    proxyDb?: ProxyConfigDatabase,
    env: Environment = "prod"
  ) {
    this.phoneDb = phoneDb;
    this.proxyDb = proxyDb;
    this.env = env;
  }

  async createPhoneProfile(template: TemplateName, phoneId: string): Promise<PhoneProfile> {
    // Validate template
    const validation = validateTemplateConfiguration(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template configuration: ${validation.errors.join(", ")}`);
    }

    // Get configuration (with database override if available)
    const phoneConfig = await getPhoneConfig(template, phoneId, this.env, this.phoneDb);
    const authRequirements = getAuthRequirements(template);

    return {
      id: phoneId,
      name: generateDuoPlusPhoneName(template, phoneId),
      template,
      phoneNumber: String(phoneConfig.phoneNumber || ""),
      areaCode: String(phoneConfig.areaCode || ""),
      ipAreaCode: String(phoneConfig.ipAreaCode || ""),
      authRequirements,
      bindStatus: authRequirements.bindStatus
    };
  }

  async createResourceBundle(
    template: TemplateName,
    proxyId: string,
    ipAddress: string
  ): Promise<ResourceBundle> {
    // Validate template
    const validation = validateTemplateConfiguration(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template configuration: ${validation.errors.join(", ")}`);
    }

    // Get configuration (with database override if available)
    const proxyConfig = await getProxyConfig(template, proxyId, this.proxyDb);
    const location = getDefaultProxyLocation(template);

    return {
      id: proxyId,
      name: generateIPFoxyProxyName(template, ipAddress),
      template,
      proxyName: generateIPFoxyProxyName(template, ipAddress),
      proxyProtocol: proxyConfig as ReturnType<typeof getProxyProtocol>,
      location
    };
  }
}
