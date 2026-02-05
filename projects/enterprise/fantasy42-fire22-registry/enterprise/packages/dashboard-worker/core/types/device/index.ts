/**
 * Device Types
 * Shared types and interfaces for device detection, user agent management, and tracking
 */

import type { BaseEntity, RiskLevel } from '../shared/common';

export type DeviceType =
  | 'desktop'
  | 'mobile'
  | 'tablet'
  | 'smart_tv'
  | 'console'
  | 'wearable'
  | 'other';

export type BrowserType =
  | 'chrome'
  | 'firefox'
  | 'safari'
  | 'edge'
  | 'opera'
  | 'brave'
  | 'vivaldi'
  | 'other';

export type OSType = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'other';

export type BotType =
  | 'search_engine'
  | 'social_media'
  | 'monitoring'
  | 'automation'
  | 'malicious'
  | 'other';

export interface UserAgentConfig {
  name: string;
  version: string;
  platform: string;
  features: string[];
  buildDate: Date;
  customHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface UserAgentAnalytics {
  userAgent: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastUsed: Date;
  endpoints: Map<string, EndpointStats>;
  errors: Map<string, ErrorStats>;
  geographicData: GeographicStats;
  performanceMetrics: PerformanceMetrics;
}

export interface EndpointStats {
  count: number;
  avgResponseTime: number;
  successRate: number;
  lastAccessed: Date;
  errorCount: number;
}

export interface ErrorStats {
  count: number;
  lastOccurred: Date;
  sampleMessages: string[];
  statusCodes: Map<number, number>;
}

export interface GeographicStats {
  countries: Map<string, number>;
  regions: Map<string, number>;
  topCountry: string;
  topRegion: string;
}

export interface PerformanceMetrics {
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  uptime: number; // percentage
}

export interface APICall extends BaseEntity {
  userAgent: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  success: boolean;
  bytesTransferred: number;
  ipAddress?: string;
  userId?: string;
  sessionId?: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  errorMessage?: string;
  retryCount: number;
  userAgentParsed?: ParsedUserAgent;
  geographicInfo?: GeographicInfo;
}

export interface ParsedUserAgent {
  browser: {
    name: BrowserType;
    version: string;
    major: number;
    minor: number;
  };
  os: {
    name: OSType;
    version: string;
    platform: string;
  };
  device: {
    type: DeviceType;
    model?: string;
    vendor?: string;
  };
  engine: {
    name: string;
    version: string;
  };
  isBot: boolean;
  botType?: BotType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsWebRTC: boolean;
  supportsWebGL: boolean;
  supportsTouch: boolean;
  cookieEnabled: boolean;
  language: string;
  timezone: string;
  screenResolution?: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
}

export interface GeographicInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  organization?: string;
  asn?: string;
  accuracy: number;
  threatLevel: RiskLevel;
}

export interface DeviceFingerprint {
  id: string;
  customerId: string;
  fingerprint: string;
  components: FingerprintComponents;
  confidence: number; // 0-100
  firstSeen: Date;
  lastSeen: Date;
  seenCount: number;
  riskScore: number;
  isTrusted: boolean;
  blocklisted: boolean;
  notes?: string;
}

export interface FingerprintComponents {
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  webdriver: boolean;
  plugins: string[];
  fonts: string[];
  canvas: string;
  webgl: string;
  audio: string;
  timezoneOffset: number;
  sessionStorage: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  cookiesEnabled: boolean;
  doNotTrack?: string;
  adBlock: boolean;
  touchSupport: {
    maxTouchPoints: number;
    touchEvent: boolean;
    touchStart: boolean;
  };
}

export interface DeviceSession {
  id: string;
  customerId: string;
  deviceFingerprint: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  pageViews: number;
  events: SessionEvent[];
  ipAddress: string;
  userAgent: string;
  geographicInfo: GeographicInfo;
  riskScore: number;
  isActive: boolean;
  terminationReason?: string;
}

export interface SessionEvent {
  timestamp: Date;
  type: 'page_view' | 'click' | 'scroll' | 'form_submit' | 'error' | 'custom';
  details: Record<string, any>;
  element?: string;
  url?: string;
}

export interface SecurityAlert extends BaseEntity {
  customerId: string;
  alertType:
    | 'suspicious_activity'
    | 'unusual_location'
    | 'device_change'
    | 'bot_detection'
    | 'fraud_attempt';
  severity: RiskLevel;
  description: string;
  details: Record<string, any>;
  triggeredBy: string; // device_id, ip, etc.
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  actions: SecurityAction[];
}

export interface SecurityAction {
  type:
    | 'block_ip'
    | 'block_device'
    | 'require_2fa'
    | 'send_notification'
    | 'flag_account'
    | 'custom';
  executed: boolean;
  executedAt?: Date;
  result?: string;
  parameters?: Record<string, any>;
}

export interface DeviceAnalytics {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalSessions: number;
  uniqueDevices: number;
  uniqueCustomers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topDevices: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
  topBrowsers: Array<{
    browser: string;
    count: number;
    percentage: number;
  }>;
  geographicDistribution: Array<{
    location: string;
    count: number;
    percentage: number;
  }>;
  securityMetrics: {
    blockedAttempts: number;
    suspiciousActivities: number;
    botDetections: number;
    fraudPrevention: number;
  };
}

// Export utility types
export type UserAgentConfigCreate = Omit<UserAgentConfig, 'buildDate'>;
export type APICallCreate = Omit<APICall, keyof BaseEntity>;
export type DeviceFingerprintCreate = Omit<DeviceFingerprint, 'id'>;
export type DeviceSessionCreate = Omit<DeviceSession, 'id' | 'duration'>;
export type SecurityAlertCreate = Omit<SecurityAlert, keyof BaseEntity>;

// Export constants
export const BROWSER_FINGERPRINTS: Record<string, Partial<ParsedUserAgent>> = {
  chrome: {
    browser: { name: 'chrome', version: '', major: 0, minor: 0 },
    engine: { name: 'Blink', version: '' },
  },
  firefox: {
    browser: { name: 'firefox', version: '', major: 0, minor: 0 },
    engine: { name: 'Gecko', version: '' },
  },
  safari: {
    browser: { name: 'safari', version: '', major: 0, minor: 0 },
    engine: { name: 'WebKit', version: '' },
  },
  edge: {
    browser: { name: 'edge', version: '', major: 0, minor: 0 },
    engine: { name: 'Blink', version: '' },
  },
};

export const BOT_PATTERNS = [
  'bot',
  'crawler',
  'spider',
  'scraper',
  'indexer',
  'monitor',
  'ping',
  'check',
  'validator',
  'preview',
  'scan',
  'archive',
];

export const SUSPICIOUS_PATTERNS = [
  'selenium',
  'webdriver',
  'phantomjs',
  'headless',
  'automation',
  'testing',
  'crawl',
  'hack',
  'exploit',
];
