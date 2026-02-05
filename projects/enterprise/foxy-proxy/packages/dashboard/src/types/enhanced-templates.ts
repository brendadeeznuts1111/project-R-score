// Enhanced Template System for IPFoxy + DuoPlus Integration
// Combines proxy capabilities with cloud phone features for optimal use cases

import { PROTOCOL_TYPES, PROFILE_CATEGORIES, PROFILE_PRIORITY } from "../utils/unified";

// DuoPlus Pre-Configuration Types
export interface DuoPlusDeviceTemplate {
  templateId: string;
  name: string;
  description: string;
  features: {
    gpuAcceleration: boolean;
    resolution: string;
    performanceProfile: "high" | "balanced" | "minimal";
    fingerprintProfile: "high_trust" | "balanced" | "aggressive";
  };
  supportedApps: string[];
  useCases: string[];
}

export interface DuoPlusPhoneConfig {
  purchasePhone: boolean;
  phoneCountry: string;
  phoneType: "long_term" | "short_term" | "disposable";
  autoVerify: boolean;
  smsInterception: boolean;
  webhookEnabled: boolean;
}

export interface DuoPlusProxyConfig {
  type: "socks5" | "http" | "https";
  host: string;
  port: number;
  username: string;
  password: string;
  rotation: "static" | "rotating" | "sticky";
  authentication: "auto" | "manual";
}

export interface DuoPlusFingerprintProfile {
  profile: "high_trust" | "balanced" | "aggressive";
  randomizationLevel: number; // 5-80%
  trustScore: "high" | "medium" | "low";
  accountCapacity: string;
  recommendedPlatforms: string[];
}

export interface DuoPlusBatchConfig {
  batchCreate: boolean;
  count: number;
  templateId: string;
  platform: string;
  proxyPool: string[];
  phoneCountries: string[];
  fingerprintRandomization: boolean;
}

// DuoPlus Pre-Built Templates (from their API)
export const DUOPLUS_DEVICE_TEMPLATES = {
  GAMING_V2: {
    templateId: "duoplus-gaming-v2",
    name: "Gaming Optimized v2",
    description: "High-performance mobile gaming with GPU acceleration",
    features: {
      gpuAcceleration: true,
      resolution: "1080x1920",
      performanceProfile: "high" as const,
      fingerprintProfile: "balanced" as const
    },
    supportedApps: [
      "PUBG Mobile",
      "Fortnite",
      "Call of Duty Mobile",
      "Garena Free Fire"
    ] as string[],
    useCases: ["Mobile Gaming", "Game Account Creation", "Tournament Participation"] as string[]
  },

  SOCIAL_PRO: {
    templateId: "duoplus-social-pro",
    name: "Social Media Professional",
    description: "Stable fingerprint for long-term social media use",
    features: {
      gpuAcceleration: false,
      resolution: "720x1280",
      performanceProfile: "balanced" as const,
      fingerprintProfile: "high_trust" as const
    },
    supportedApps: ["Facebook", "Instagram", "Twitter", "LinkedIn", "TikTok"] as string[],
    useCases: ["Social Media Management", "Account Verification", "Content Creation"] as string[]
  },

  MASS_CREATE: {
    templateId: "duoplus-mass-create",
    name: "Mass Account Creation",
    description: "Optimized for bulk account creation with aggressive randomization",
    features: {
      gpuAcceleration: false,
      resolution: "480x854",
      performanceProfile: "minimal" as const,
      fingerprintProfile: "aggressive" as const
    },
    supportedApps: ["TikTok", "Twitter", "Instagram", "Snapchat"] as string[],
    useCases: ["Bulk Account Creation", "A/B Testing", "Market Research"] as string[]
  }
} as const;

// DuoPlus Fingerprint Profiles
export const DUOPLUS_FINGERPRINT_PROFILES = {
  HIGH_TRUST: {
    profile: "high_trust" as const,
    randomizationLevel: 10, // 5-10% fields
    trustScore: "high" as const,
    accountCapacity: "1-2 accounts",
    recommendedPlatforms: ["Banking", "PayPal", "CashApp", "Venmo"] as string[]
  },

  BALANCED: {
    profile: "balanced" as const,
    randomizationLevel: 35, // 30-40% fields
    trustScore: "medium" as const,
    accountCapacity: "3-5 accounts",
    recommendedPlatforms: ["Facebook", "Instagram", "LinkedIn", "Twitter"] as string[]
  },

  AGGRESSIVE: {
    profile: "aggressive" as const,
    randomizationLevel: 75, // 70-80% fields
    trustScore: "low" as const,
    accountCapacity: "10+ accounts",
    recommendedPlatforms: ["TikTok", "Twitter", "Instagram Creation", "Snapchat"] as string[]
  }
} as const;

// Platform-specific DuoPlus Configuration Mappings
export const PLATFORM_DUOPLUS_CONFIG = {
  PAYPAL: {
    template: "duoplus-social-pro",
    fingerprintProfile: "high_trust",
    phoneConfig: {
      purchasePhone: true,
      phoneCountry: "US",
      phoneType: "long_term" as const,
      autoVerify: true,
      smsInterception: true,
      webhookEnabled: true
    },
    proxy: {
      type: "residential" as const,
      rotation: "static" as const,
      authentication: "auto" as const
    }
  },

  FACEBOOK: {
    template: "duoplus-social-pro",
    fingerprintProfile: "balanced",
    phoneConfig: {
      purchasePhone: true,
      phoneCountry: "US",
      phoneType: "long_term" as const,
      autoVerify: true,
      smsInterception: true,
      webhookEnabled: true
    },
    proxy: {
      type: "residential" as const,
      rotation: "sticky" as const,
      authentication: "auto" as const
    }
  },

  TWITTER: {
    template: "duoplus-mass-create",
    fingerprintProfile: "aggressive",
    phoneConfig: {
      purchasePhone: true,
      phoneCountry: "US",
      phoneType: "short_term" as const,
      autoVerify: true,
      smsInterception: true,
      webhookEnabled: true
    },
    proxy: {
      type: "residential" as const,
      rotation: "rotating" as const,
      authentication: "auto" as const
    }
  },

  GAMING: {
    template: "duoplus-gaming-v2",
    fingerprintProfile: "balanced",
    phoneConfig: {
      purchasePhone: false,
      phoneCountry: "US",
      phoneType: "disposable" as const,
      autoVerify: false,
      smsInterception: false,
      webhookEnabled: false
    },
    proxy: {
      type: "datacenter" as const,
      rotation: "static" as const,
      authentication: "manual" as const
    }
  },

  AMAZON: {
    template: "duoplus-social-pro",
    fingerprintProfile: "high_trust",
    phoneConfig: {
      purchasePhone: true,
      phoneCountry: "US",
      phoneType: "long_term" as const,
      autoVerify: true,
      smsInterception: true,
      webhookEnabled: true
    },
    proxy: {
      type: "residential" as const,
      rotation: "static" as const,
      authentication: "auto" as const
    }
  }
} as const;

// DuoPlus API Request/Response Types
export interface DuoPlusDeviceCreationRequest {
  template_id: string;
  fingerprint_profile?: "high_trust" | "balanced" | "aggressive";
  phone?: {
    country: string;
    type: "long_term" | "short_term" | "disposable";
    auto_verify: boolean;
  };
  proxy?: {
    type: "residential" | "datacenter";
    rotation: "static" | "rotating" | "sticky";
    authentication: "auto" | "manual";
  };
  custom_settings?: Record<string, unknown>;
}

export interface DuoPlusDeviceCreationResponse {
  device_id: string;
  phone_number?: string;
  proxy_config?: DuoPlusProxyConfig;
  fingerprint: {
    profile: string;
    randomization_applied: string[];
    trust_score: string;
  };
  status: "creating" | "ready" | "error";
  estimated_ready_time?: string;
}

export interface DuoPlusBatchCreationRequest {
  batch_create: boolean;
  count: number;
  config: DuoPlusDeviceCreationRequest & {
    platform?: string;
    proxy_pool?: string[];
    phone_countries?: string[];
  };
}

// Enhanced Template Types
export interface CloudPhoneConfig {
  phoneNumber?: string;
  areaCode?: string;
  smsEnabled: boolean;
  callForwarding: boolean;
  voicemail: boolean;
  dataPlan: "basic" | "premium" | "unlimited";
  location: {
    country: string;
    region: string;
    city: string;
  };
  ipAreaCode?: string;
  protocol?: "HTTP" | "HTTPS" | "SOCKS5";

  // DuoPlus Integration
  duoPlusTemplate?: string;
  duoPlusFingerprintProfile?: "high_trust" | "balanced" | "aggressive";
  duoPlusPhoneType?: "long_term" | "short_term" | "disposable";
  duoPlusAutoVerify?: boolean;
}

export interface EmailAccountConfig {
  provider: "gmail" | "outlook" | "yahoo" | "custom";
  address: string;
  password?: string;
  imapEnabled: boolean;
  popEnabled: boolean;
  twoFactorEnabled: boolean;
  recoveryEmail?: string;
  aliases: readonly string[];
}

export interface SocialMediaAccount {
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok";
  username: string;
  email: string;
  proxyRequired: boolean;
  phoneVerification: boolean;
  twoFactorAuth: boolean;
  backupCodes: boolean;
}

export interface EcommerceAccount {
  platform: "amazon" | "ebay" | "shopify" | "etsy";
  businessEmail: string;
  paymentMethods: string[];
  taxInfo: boolean;
  shippingAddresses: number;
  returnPolicy: boolean;
}

export interface ProfileCreationOptions {
  templateName: keyof typeof ENHANCED_PROFILE_TEMPLATES;
  proxyId: string;
  phoneId: string;
  customName?: string;

  // Phone Configuration
  phoneNumber?: string;
  areaCode?: string;
  ipAreaCode?: string;

  // Account Configurations
  emailProvider?: "gmail" | "outlook" | "yahoo" | "custom";
  emailAddress?: string;
  emailPassword?: string;
  socialPlatform?: "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok";
  socialUsername?: string;
  ecommercePlatform?: "amazon" | "ebay" | "shopify" | "etsy";
  businessEmail?: string;

  // Custom Configuration
  customDns?: string[];
  customWhitelist?: string[];
  customBlacklist?: string[];

  // DuoPlus Configuration
  duoPlusPlatform?: keyof typeof PLATFORM_DUOPLUS_CONFIG;
  duoPlusTemplate?: string;
  duoPlusFingerprintProfile?: "high_trust" | "balanced" | "aggressive";
  duoPlusPhoneType?: "long_term" | "short_term" | "disposable";
  duoPlusAutoVerify?: boolean;
  duoPlusBatchConfig?: DuoPlusBatchCreationRequest;
}

// Enhanced Profile Interface
export interface EnhancedUnifiedProfile {
  id: string;
  name: string;
  proxyId: string;
  phoneId: string;
  status: "active" | "inactive" | "configuring" | "error";

  // Core Configuration
  configuration: {
    ip: string;
    port: number;
    username: string;
    password: string;
    protocol: "http" | "https" | "socks5";
    region: string;
    dns: string[];
    whitelist: string[];
    blacklist: string[];
  };

  // Enhanced Features
  cloudPhone?: CloudPhoneConfig;
  emailAccount?: EmailAccountConfig;
  socialMedia?: SocialMediaAccount;
  ecommerce?: EcommerceAccount;

  // DuoPlus Integration
  duoPlusConfig?: {
    templateId: string;
    fingerprintProfile: "high_trust" | "balanced" | "aggressive";
    phoneConfig: DuoPlusPhoneConfig;
    proxyConfig: DuoPlusProxyConfig;
    deviceCreationRequest?: DuoPlusDeviceCreationRequest;
    deviceCreationResponse?: DuoPlusDeviceCreationResponse;
    batchConfig?: DuoPlusBatchCreationRequest;
  };

  // Performance & Metadata
  performance: {
    responseTime: number;
    uptime: number;
    bandwidth: { upload: number; download: number };
    requests: { total: number; successful: number; failed: number };
    lastUpdated: string;
  };

  metadata: {
    description: string;
    tags: string[];
    category: string;
    priority: string;
    autoRotate: boolean;
    failoverEnabled: boolean;
  };

  createdAt: string;
  lastUsed: string;
}

// Enhanced Template Definitions
export const ENHANCED_PROFILE_TEMPLATES = {
  // Gaming Templates
  GAMING_MOBILE: {
    name: "Mobile Gaming with Phone Verification",
    category: PROFILE_CATEGORIES.GAMING,
    priority: PROFILE_PRIORITY.HIGH,
    description: "Optimized for mobile gaming with phone verification and low latency",

    configuration: {
      protocol: PROTOCOL_TYPES.HTTPS,
      dns: ["1.1.1.1", "8.8.8.8"], // Cloudflare + Google for gaming
      whitelist: [
        "pubgmobile.com",
        "fortnite.com",
        "callofduty.com",
        "garena.com",
        "supercell.com",
        "riotgames.com"
      ],
      blacklist: ["facebook.com", "instagram.com", "twitter.com"],
      autoRotate: false,
      failoverEnabled: true
    },

    cloudPhone: {
      smsEnabled: true,
      callForwarding: false,
      voicemail: false,
      dataPlan: "unlimited",
      location: {
        country: "United States",
        region: "Virginia",
        city: "Ashburn"
      }
    },

    emailAccount: undefined,
    socialMedia: undefined,
    ecommerce: undefined,

    tags: ["gaming", "mobile", "phone-verification", "low-latency"]
  },

  // Social Media Templates
  SOCIAL_MEDIA_MANAGER: {
    name: "Social Media Management Suite",
    category: PROFILE_CATEGORIES.GENERAL,
    priority: PROFILE_PRIORITY.MEDIUM,
    description: "Complete social media management with multiple platforms and phone verification",

    configuration: {
      protocol: PROTOCOL_TYPES.HTTPS,
      dns: ["8.8.8.8", "1.1.1.1"],
      whitelist: [
        "facebook.com",
        "instagram.com",
        "twitter.com",
        "linkedin.com",
        "tiktok.com",
        "youtube.com",
        "pinterest.com",
        "reddit.com"
      ],
      blacklist: [],
      autoRotate: true,
      failoverEnabled: true
    },

    cloudPhone: {
      phoneNumber: "+1-555-0123",
      areaCode: "555",
      smsEnabled: true,
      callForwarding: true,
      voicemail: true,
      dataPlan: "premium",
      location: {
        country: "United States",
        region: "California",
        city: "Los Angeles"
      },
      ipAreaCode: "213",
      protocol: "SOCKS5"
    },

    emailAccount: {
      provider: "gmail",
      address: "social@business.com",
      imapEnabled: true,
      popEnabled: false,
      twoFactorEnabled: true,
      aliases: ["social@business.com", "marketing@business.com"]
    },

    socialMedia: {
      platform: "facebook",
      proxyRequired: true,
      phoneVerification: true,
      twoFactorAuth: true,
      backupCodes: true
    },

    tags: ["social-media", "marketing", "multi-platform", "phone-verified"]
  },

  // E-commerce Templates
  DROPSHIPPING_PRO: {
    name: "Professional Dropshipping Operation",
    category: PROFILE_CATEGORIES.GENERAL,
    priority: PROFILE_PRIORITY.HIGH,
    description: "Complete e-commerce setup with multiple platforms and payment processing",

    configuration: {
      protocol: PROTOCOL_TYPES.HTTPS,
      dns: ["1.1.1.1", "8.8.4.4"], // Cloudflare + Google secondary
      whitelist: [
        "amazon.com",
        "ebay.com",
        "shopify.com",
        "etsy.com",
        "paypal.com",
        "stripe.com",
        "aliexpress.com",
        "cjdropshipping.com"
      ],
      blacklist: ["competitor.com"],
      autoRotate: true,
      failoverEnabled: true
    },

    cloudPhone: {
      smsEnabled: true,
      callForwarding: true,
      voicemail: true,
      dataPlan: "premium",
      location: {
        country: "United States",
        region: "Delaware",
        city: "Wilmington"
      }
    },

    emailAccount: {
      provider: "outlook",
      address: "store@business.com",
      imapEnabled: true,
      popEnabled: true,
      twoFactorEnabled: true,
      recoveryEmail: "backup@business.com",
      aliases: ["orders@business.com", "support@business.com"]
    },

    ecommerce: {
      platform: "shopify",
      businessEmail: "store@business.com",
      paymentMethods: ["paypal", "stripe", "shopify-pay"],
      taxInfo: true,
      shippingAddresses: 5,
      returnPolicy: true
    },

    tags: ["ecommerce", "dropshipping", "business", "payment-processing"]
  },

  // Web Scraping Templates
  SCRAPING_STEALTH: {
    name: "Stealth Web Scraping Operation",
    category: PROFILE_CATEGORIES.SCRAPING,
    priority: PROFILE_PRIORITY.LOW,
    description: "Advanced scraping with rotating proxies and phone verification bypass",

    configuration: {
      protocol: PROTOCOL_TYPES.HTTPS,
      dns: ["8.8.8.8", "1.1.1.1"],
      whitelist: [], // Open access
      blacklist: ["cloudflare.com", "google.com", "facebook.com", "recaptcha.net", "hcaptcha.com"],
      autoRotate: true,
      failoverEnabled: true
    },

    cloudPhone: {
      smsEnabled: true,
      callForwarding: false,
      voicemail: false,
      dataPlan: "basic",
      location: {
        country: "Germany",
        region: "Frankfurt",
        city: "Frankfurt"
      }
    },

    emailAccount: undefined,
    socialMedia: undefined,
    ecommerce: undefined,

    tags: ["scraping", "automation", "stealth", "rotating"]
  },

  // Development Templates
  DEVELOPMENT_CLOUD: {
    name: "Cloud Development Environment",
    category: PROFILE_CATEGORIES.DEVELOPMENT,
    priority: PROFILE_PRIORITY.HIGH,
    description: "Secure development environment with API access and testing capabilities",

    configuration: {
      protocol: PROTOCOL_TYPES.SOCKS5,
      dns: ["8.8.8.8", "1.1.1.1"],
      whitelist: [
        "github.com",
        "gitlab.com",
        "bitbucket.org",
        "npmjs.com",
        "yarnpkg.com",
        "docker.com",
        "kubernetes.io",
        "aws.amazon.com",
        "azure.microsoft.com"
      ],
      blacklist: [],
      autoRotate: false,
      failoverEnabled: true
    },

    cloudPhone: {
      phoneNumber: "+1-555-0145",
      areaCode: "555",
      smsEnabled: false,
      callForwarding: false,
      voicemail: false,
      dataPlan: "basic",
      location: {
        country: "United States",
        region: "Oregon",
        city: "Portland"
      },
      ipAreaCode: "503",
      protocol: "SOCKS5"
    },

    emailAccount: {
      provider: "gmail",
      imapEnabled: true,
      popEnabled: false,
      twoFactorEnabled: true,
      aliases: ["dev@company.com", "ci@company.com"]
    },

    socialMedia: undefined,
    ecommerce: undefined,

    tags: ["development", "api", "cloud", "secure"]
  },

  // Streaming Templates
  STREAMING_GLOBAL: {
    name: "Global Streaming Content Access",
    category: PROFILE_CATEGORIES.STREAMING,
    priority: PROFILE_PRIORITY.MEDIUM,
    description: "Access geo-restricted streaming content from multiple regions",

    configuration: {
      protocol: PROTOCOL_TYPES.HTTPS,
      dns: ["1.1.1.1", "8.8.8.8"],
      whitelist: [
        "netflix.com",
        "youtube.com",
        "hulu.com",
        "disney.com",
        "primevideo.com",
        "hbo.com",
        "peacock.com",
        "paramount.com"
      ],
      blacklist: [],
      autoRotate: true,
      failoverEnabled: true
    },

    cloudPhone: {
      smsEnabled: false,
      callForwarding: false,
      voicemail: false,
      dataPlan: "premium",
      location: {
        country: "United States",
        region: "New York",
        city: "New York"
      }
    },

    emailAccount: undefined,
    socialMedia: undefined,
    ecommerce: undefined,

    tags: ["streaming", "geo-unblocking", "entertainment", "global"]
  },

  // Account Creation Templates
  ACCOUNT_CREATION_PRO: {
    name: "Professional Account Creation Service",
    category: PROFILE_CATEGORIES.GENERAL,
    priority: PROFILE_PRIORITY.CRITICAL,
    description: "Complete account creation service with phone verification and email management",

    configuration: {
      protocol: PROTOCOL_TYPES.HTTPS,
      dns: ["1.1.1.1", "8.8.8.8"],
      whitelist: [], // Open for account creation
      blacklist: [],
      autoRotate: true,
      failoverEnabled: true
    },

    cloudPhone: {
      smsEnabled: true,
      callForwarding: true,
      voicemail: true,
      dataPlan: "unlimited",
      location: {
        country: "United States",
        region: "Texas",
        city: "Dallas"
      }
    },

    emailAccount: {
      provider: "gmail",
      imapEnabled: true,
      popEnabled: true,
      twoFactorEnabled: true,
      recoveryEmail: "recovery@business.com",
      aliases: ["accounts@business.com", "verification@business.com", "support@business.com"]
    },

    socialMedia: {
      platform: "facebook",
      proxyRequired: true,
      phoneVerification: true,
      twoFactorAuth: true,
      backupCodes: true
    },

    ecommerce: {
      platform: "amazon",
      businessEmail: "seller@business.com",
      paymentMethods: ["credit-card", "bank-account"],
      taxInfo: true,
      shippingAddresses: 3,
      returnPolicy: true
    },

    tags: ["account-creation", "verification", "business", "professional"]
  }
} as const;

// Template Categories for Organization
export const TEMPLATE_CATEGORIES = {
  GAMING: {
    templates: ["GAMING_MOBILE"],
    description: "Mobile gaming with phone verification",
    icon: "🎮"
  },
  SOCIAL_MEDIA: {
    templates: ["SOCIAL_MEDIA_MANAGER"],
    description: "Multi-platform social media management",
    icon: "📱"
  },
  ECOMMERCE: {
    templates: ["DROPSHIPPING_PRO", "ACCOUNT_CREATION_PRO"],
    description: "E-commerce and business operations",
    icon: "🛒"
  },
  SCRAPING: {
    templates: ["SCRAPING_STEALTH"],
    description: "Advanced web scraping and automation",
    icon: "🕷️"
  },
  DEVELOPMENT: {
    templates: ["DEVELOPMENT_CLOUD"],
    description: "Cloud development and API access",
    icon: "💻"
  },
  STREAMING: {
    templates: ["STREAMING_GLOBAL"],
    description: "Global streaming content access",
    icon: "📺"
  }
} as const;

// Helper Functions
export function getTemplateByName(name: keyof typeof ENHANCED_PROFILE_TEMPLATES) {
  return ENHANCED_PROFILE_TEMPLATES[name];
}

export function getTemplatesByCategory(category: keyof typeof TEMPLATE_CATEGORIES) {
  const categoryInfo = TEMPLATE_CATEGORIES[category];
  return categoryInfo.templates.map((templateName) => ({
    key: templateName,
    ...ENHANCED_PROFILE_TEMPLATES[templateName as keyof typeof ENHANCED_PROFILE_TEMPLATES],
    category: categoryInfo
  }));
}

export function getAllTemplates() {
  return Object.entries(ENHANCED_PROFILE_TEMPLATES).map(([key, template]) => ({
    key,
    ...template,
    category: TEMPLATE_CATEGORIES[template.category as keyof typeof TEMPLATE_CATEGORIES]
  }));
}

export function validateTemplateRequirements(template: keyof typeof ENHANCED_PROFILE_TEMPLATES): {
  requiresPhone: boolean;
  requiresEmail: boolean;
  requiresSocialMedia: boolean;
  requiresEcommerce: boolean;
} {
  const t = ENHANCED_PROFILE_TEMPLATES[template];

  return {
    requiresPhone: !!t.cloudPhone,
    requiresEmail: !!t.emailAccount,
    requiresSocialMedia: !!(t as any).socialMedia,
    requiresEcommerce: !!(t as any).ecommerce
  };
}

// DuoPlus Integration Functions

/**
 * Maps enhanced template to DuoPlus device template
 */
export function mapTemplateToDuoPlus(template: keyof typeof ENHANCED_PROFILE_TEMPLATES): string {
  const mapping: Record<keyof typeof ENHANCED_PROFILE_TEMPLATES, string> = {
    GAMING_MOBILE: "duoplus-gaming-v2",
    SOCIAL_MEDIA_MANAGER: "duoplus-social-pro",
    DROPSHIPPING_PRO: "duoplus-social-pro",
    ACCOUNT_CREATION_PRO: "duoplus-mass-create",
    SCRAPING_STEALTH: "duoplus-mass-create",
    DEVELOPMENT_CLOUD: "duoplus-social-pro",
    STREAMING_GLOBAL: "duoplus-social-pro"
  };

  return mapping[template];
}

/**
 * Maps platform to DuoPlus configuration
 */
export function getPlatformDuoPlusConfig(platform: keyof typeof PLATFORM_DUOPLUS_CONFIG) {
  return PLATFORM_DUOPLUS_CONFIG[platform];
}

/**
 * Creates DuoPlus device creation request from enhanced template
 */
export function createDuoPlusDeviceRequest(
  template: keyof typeof ENHANCED_PROFILE_TEMPLATES,
  options: ProfileCreationOptions
): DuoPlusDeviceCreationRequest {
  const duoPlusTemplate = options.duoPlusTemplate || mapTemplateToDuoPlus(template);
  const fingerprintProfile =
    options.duoPlusFingerprintProfile ||
    (options.duoPlusPlatform
      ? PLATFORM_DUOPLUS_CONFIG[options.duoPlusPlatform].fingerprintProfile
      : "balanced");

  const request: DuoPlusDeviceCreationRequest = {
    template_id: duoPlusTemplate,
    fingerprint_profile: fingerprintProfile as "high_trust" | "balanced" | "aggressive"
  };

  // Add phone configuration if required
  if (options.duoPlusPlatform) {
    const platformConfig = PLATFORM_DUOPLUS_CONFIG[options.duoPlusPlatform];
    request.phone = {
      country: platformConfig.phoneConfig.phoneCountry,
      type: options.duoPlusPhoneType || platformConfig.phoneConfig.phoneType,
      auto_verify: options.duoPlusAutoVerify || platformConfig.phoneConfig.autoVerify
    };
  }

  // Add proxy configuration
  request.proxy = {
    type: options.duoPlusPlatform
      ? PLATFORM_DUOPLUS_CONFIG[options.duoPlusPlatform].proxy.type
      : "residential",
    rotation: "static", // Default rotation
    authentication: "auto"
  };

  // Add custom settings if provided
  if (options.customDns || options.customWhitelist || options.customBlacklist) {
    request.custom_settings = {
      dns: options.customDns,
      whitelist: options.customWhitelist,
      blacklist: options.customBlacklist
    };
  }

  return request;
}

/**
 * Creates DuoPlus batch creation request for scaling
 */
export function createDuoPlusBatchRequest(
  template: keyof typeof ENHANCED_PROFILE_TEMPLATES,
  count: number,
  options: ProfileCreationOptions,
  proxyPool: string[] = [],
  phoneCountries: string[] = ["US"]
): DuoPlusBatchCreationRequest {
  const deviceRequest = createDuoPlusDeviceRequest(template, options);

  return {
    batch_create: true,
    count,
    config: {
      ...deviceRequest,
      platform: options.duoPlusPlatform as string,
      proxy_pool: proxyPool,
      phone_countries: phoneCountries
    }
  };
}

/**
 * Validates DuoPlus configuration compatibility
 */
export function validateDuoPlusConfig(
  _template: keyof typeof ENHANCED_PROFILE_TEMPLATES,
  duoPlusConfig: DuoPlusDeviceCreationRequest
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate template exists
  if (
    !Object.values(DUOPLUS_DEVICE_TEMPLATES).some((t) => t.templateId === duoPlusConfig.template_id)
  ) {
    errors.push(`Unknown DuoPlus template: ${duoPlusConfig.template_id}`);
  }

  // Validate fingerprint profile
  if (
    duoPlusConfig.fingerprint_profile &&
    !Object.keys(DUOPLUS_FINGERPRINT_PROFILES).includes(duoPlusConfig.fingerprint_profile)
  ) {
    errors.push(`Unknown fingerprint profile: ${duoPlusConfig.fingerprint_profile}`);
  }

  // Validate phone configuration
  if (duoPlusConfig.phone) {
    const validPhoneTypes = ["long_term", "short_term", "disposable"];
    if (!validPhoneTypes.includes(duoPlusConfig.phone.type)) {
      errors.push(`Invalid phone type: ${duoPlusConfig.phone.type}`);
    }
  }

  // Validate proxy configuration
  if (duoPlusConfig.proxy) {
    const validProxyTypes = ["residential", "datacenter"];
    if (!validProxyTypes.includes(duoPlusConfig.proxy.type)) {
      errors.push(`Invalid proxy type: ${duoPlusConfig.proxy.type}`);
    }

    const validRotations = ["static", "rotating", "sticky"];
    if (!validRotations.includes(duoPlusConfig.proxy.rotation)) {
      errors.push(`Invalid proxy rotation: ${duoPlusConfig.proxy.rotation}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets DuoPlus template information
 */
export function getDuoPlusTemplate(templateId: string): DuoPlusDeviceTemplate | null {
  const template = Object.values(DUOPLUS_DEVICE_TEMPLATES).find((t) => t.templateId === templateId);
  return template || null;
}

/**
 * Gets DuoPlus fingerprint profile information
 */
export function getDuoPlusFingerprintProfile(
  profile: "high_trust" | "balanced" | "aggressive"
): DuoPlusFingerprintProfile | null {
  const profileKey = Object.keys(DUOPLUS_FINGERPRINT_PROFILES).find(
    (key) =>
      DUOPLUS_FINGERPRINT_PROFILES[key as keyof typeof DUOPLUS_FINGERPRINT_PROFILES].profile ===
      profile
  );

  return profileKey
    ? DUOPLUS_FINGERPRINT_PROFILES[profileKey as keyof typeof DUOPLUS_FINGERPRINT_PROFILES]
    : null;
}

/**
 * Estimates device creation time based on template and configuration
 */
export function estimateDeviceCreationTime(
  templateId: string,
  phoneConfig?: { type: "long_term" | "short_term" | "disposable" }
): number {
  const template = getDuoPlusTemplate(templateId);
  if (!template) {
    return 300;
  } // Default 5 minutes

  let baseTime = 60; // Base 1 minute

  // Add time based on template complexity
  switch (template.features.performanceProfile) {
    case "high":
      baseTime += 120;
      break;
    case "balanced":
      baseTime += 90;
      break;
    case "minimal":
      baseTime += 30;
      break;
  }

  // Add time for phone provisioning
  if (phoneConfig) {
    switch (phoneConfig.type) {
      case "long_term":
        baseTime += 180;
        break;
      case "short_term":
        baseTime += 120;
        break;
      case "disposable":
        baseTime += 60;
        break;
    }
  }

  return baseTime;
}

/**
 * Formats device creation response for UI display
 */
export function formatDeviceCreationResponse(response: DuoPlusDeviceCreationResponse): {
  status: string;
  message: string;
  estimatedTime: string;
  actions: string[];
} {
  const actions: string[] = [];
  let message = "";

  switch (response.status) {
    case "creating":
      message = "Device is being created and configured";
      actions.push("Monitor creation progress", "Prepare proxy configuration");
      break;
    case "ready":
      message = "Device is ready for use";
      actions.push("Start device", "Configure applications", "Test connectivity");
      break;
    case "error":
      message = "Device creation failed";
      actions.push("Check error logs", "Retry creation", "Contact support");
      break;
  }

  const estimatedTime = response.estimated_ready_time
    ? `Estimated ready: ${response.estimated_ready_time}`
    : "Time estimate not available";

  return {
    status: response.status,
    message,
    estimatedTime,
    actions
  };
}
