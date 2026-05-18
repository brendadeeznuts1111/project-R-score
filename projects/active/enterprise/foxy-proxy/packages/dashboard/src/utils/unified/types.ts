// Unified Profile Types
export interface UnifiedProfile {
  id: string;
  name: string;
  proxyId: string;
  phoneId: string;
  status: "active" | "inactive" | "configuring" | "error";
  configuration: ProxyConfiguration;
  performance: PerformanceMetrics;
  metadata: ProfileMetadata;
  createdAt: string;
  lastUsed: string;
}

export interface ProxyConfiguration {
  ip: string;
  port: number;
  username: string;
  password: string;
  protocol: "http" | "https" | "socks5";
  region: string;
  dns: string[];
  whitelist: string[];
  blacklist: string[];
}

export interface PerformanceMetrics {
  responseTime: number;
  uptime: number;
  bandwidth: {
    upload: number;
    download: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
  lastUpdated: string;
}

export interface ProfileMetadata {
  description: string;
  tags: string[];
  category: "gaming" | "streaming" | "scraping" | "general" | "development";
  priority: "low" | "medium" | "high" | "critical";
  autoRotate: boolean;
  failoverEnabled: boolean;
}

// Profile Status Constants
export const PROFILE_STATUS = {
  ACTIVE: "active" as const,
  INACTIVE: "inactive" as const,
  CONFIGURING: "configuring" as const,
  ERROR: "error" as const
} as const;

// Protocol Constants
export const PROTOCOL_TYPES = {
  HTTP: "http" as const,
  HTTPS: "https" as const,
  SOCKS5: "socks5" as const
} as const;

// Category Constants
export const PROFILE_CATEGORIES = {
  GAMING: "gaming" as const,
  STREAMING: "streaming" as const,
  SCRAPING: "scraping" as const,
  GENERAL: "general" as const,
  DEVELOPMENT: "development" as const
} as const;

// Priority Constants
export const PROFILE_PRIORITY = {
  LOW: "low" as const,
  MEDIUM: "medium" as const,
  HIGH: "high" as const,
  CRITICAL: "critical" as const
} as const;

// Default Configurations
export const DEFAULT_CONFIGURATIONS = {
  GAMING: {
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: ["8.8.8.8", "1.1.1.1"],
    whitelist: [],
    blacklist: [],
    category: PROFILE_CATEGORIES.GAMING,
    priority: PROFILE_PRIORITY.HIGH,
    autoRotate: false,
    failoverEnabled: true
  },
  STREAMING: {
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: ["8.8.8.8", "1.1.1.1"],
    whitelist: ["netflix.com", "youtube.com", "twitch.tv"],
    blacklist: [],
    category: PROFILE_CATEGORIES.STREAMING,
    priority: PROFILE_PRIORITY.MEDIUM,
    autoRotate: true,
    failoverEnabled: true
  },
  SCRAPING: {
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: ["8.8.8.8", "1.1.1.1"],
    whitelist: [],
    blacklist: ["cloudflare.com", "google.com"],
    category: PROFILE_CATEGORIES.SCRAPING,
    priority: PROFILE_PRIORITY.LOW,
    autoRotate: true,
    failoverEnabled: true
  },
  GENERAL: {
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: ["8.8.8.8", "1.1.1.1"],
    whitelist: [],
    blacklist: [],
    category: PROFILE_CATEGORIES.GENERAL,
    priority: PROFILE_PRIORITY.MEDIUM,
    autoRotate: false,
    failoverEnabled: false
  },
  DEVELOPMENT: {
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: ["8.8.8.8", "1.1.1.1"],
    whitelist: ["github.com", "npmjs.com", "stackoverflow.com"],
    blacklist: [],
    category: PROFILE_CATEGORIES.DEVELOPMENT,
    priority: PROFILE_PRIORITY.HIGH,
    autoRotate: false,
    failoverEnabled: true
  }
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME: {
    EXCELLENT: 50, // ms
    GOOD: 100, // ms
    FAIR: 200, // ms
    POOR: 500 // ms
  },
  UPTIME: {
    EXCELLENT: 99.9, // %
    GOOD: 99.5, // %
    FAIR: 99.0, // %
    POOR: 95.0 // %
  },
  BANDWIDTH: {
    HIGH: 100, // Mbps
    MEDIUM: 50, // Mbps
    LOW: 10 // Mbps
  }
} as const;

// Region Constants
export const REGIONS = {
  "United States": "us",
  Germany: "de",
  "United Kingdom": "uk",
  Japan: "jp",
  Singapore: "sg",
  Canada: "ca",
  Australia: "au",
  France: "fr",
  Netherlands: "nl",
  Russia: "ru"
} as const;

// DNS Servers
export const DNS_SERVERS = {
  GOOGLE: ["8.8.8.8", "8.8.4.4"],
  CLOUDFLARE: ["1.1.1.1", "1.0.0.1"],
  OPEN_DNS: ["208.67.222.222", "208.67.220.220"],
  QUAD9: ["9.9.9.9", "149.112.112.112"],
  CUSTOM: [] as string[]
} as const;

// Profile Templates
export const PROFILE_TEMPLATES = {
  HIGH_PERFORMANCE: {
    name: "High Performance Gaming",
    description: "Optimized for low-latency gaming applications",
    tags: ["gaming", "low-latency", "performance"],
    category: PROFILE_CATEGORIES.GAMING,
    priority: PROFILE_PRIORITY.HIGH,
    autoRotate: false,
    failoverEnabled: true,
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: DNS_SERVERS.CLOUDFLARE,
    whitelist: [],
    blacklist: []
  },
  STREAMING_OPTIMIZED: {
    name: "Streaming Optimized",
    description: "Configured for video streaming services",
    tags: ["streaming", "video", "media"],
    category: PROFILE_CATEGORIES.STREAMING,
    priority: PROFILE_PRIORITY.MEDIUM,
    autoRotate: true,
    failoverEnabled: true,
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: DNS_SERVERS.GOOGLE,
    whitelist: ["netflix.com", "youtube.com", "twitch.tv", "hulu.com", "disney.com"],
    blacklist: []
  },
  WEB_SCRAPING: {
    name: "Web Scraping Professional",
    description: "Anonymous configuration for data collection",
    tags: ["scraping", "automation", "anonymous"],
    category: PROFILE_CATEGORIES.SCRAPING,
    priority: PROFILE_PRIORITY.LOW,
    autoRotate: true,
    failoverEnabled: true,
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: DNS_SERVERS.QUAD9,
    whitelist: [],
    blacklist: ["cloudflare.com", "google.com", "facebook.com"]
  },
  DEVELOPER_FRIENDLY: {
    name: "Developer Friendly",
    description: "Optimized for development and API access",
    tags: ["development", "api", "coding"],
    category: PROFILE_CATEGORIES.DEVELOPMENT,
    priority: PROFILE_PRIORITY.HIGH,
    autoRotate: false,
    failoverEnabled: true,
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: DNS_SERVERS.GOOGLE,
    whitelist: ["github.com", "npmjs.com", "stackoverflow.com", "docker.com"],
    blacklist: []
  },
  BALANCED_USAGE: {
    name: "Balanced Daily Usage",
    description: "Good all-around configuration for general use",
    tags: ["general", "balanced", "daily"],
    category: PROFILE_CATEGORIES.GENERAL,
    priority: PROFILE_PRIORITY.MEDIUM,
    autoRotate: false,
    failoverEnabled: false,
    protocol: PROTOCOL_TYPES.HTTPS,
    dns: DNS_SERVERS.GOOGLE,
    whitelist: [],
    blacklist: []
  }
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  IP_ADDRESS: /^(\d{1,3}\.){3}\d{1,3}$/,
  PORT_RANGE: { min: 1, max: 65535 },
  USERNAME_LENGTH: { min: 3, max: 50 },
  PASSWORD_LENGTH: { min: 8, max: 128 },
  PROFILE_NAME_LENGTH: { min: 3, max: 100 },
  DESCRIPTION_LENGTH: { min: 10, max: 500 },
  MAX_TAGS: 10,
  MAX_WHITELIST_ENTRIES: 100,
  MAX_BLACKLIST_ENTRIES: 100
} as const;

// Export all constants as a single object for easy access
export const UNIFIED_PROFILE_CONSTANTS = {
  STATUS: PROFILE_STATUS,
  PROTOCOL: PROTOCOL_TYPES,
  CATEGORY: PROFILE_CATEGORIES,
  PRIORITY: PROFILE_PRIORITY,
  DEFAULTS: DEFAULT_CONFIGURATIONS,
  THRESHOLDS: PERFORMANCE_THRESHOLDS,
  REGIONS,
  DNS: DNS_SERVERS,
  TEMPLATES: PROFILE_TEMPLATES,
  VALIDATION: VALIDATION_RULES
} as const;
