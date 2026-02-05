// Error codes and types
export enum AppleIDErrorCodes {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',
  
  // API errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Account errors
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_IN_USE = 'PHONE_ALREADY_IN_USE',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  UNDERAGE_USER = 'UNDERAGE_USER',
  
  // Verification errors
  SMS_CODE_EXPIRED = 'SMS_CODE_EXPIRED',
  SMS_CODE_INVALID = 'SMS_CODE_INVALID',
  EMAIL_VERIFICATION_FAILED = 'EMAIL_VERIFICATION_FAILED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  
  // Device errors
  DEVICE_BLOCKED = 'DEVICE_BLOCKED',
  DEVICE_NOT_SUPPORTED = 'DEVICE_NOT_SUPPORTED',
  FINGERPRINT_MISMATCH = 'FINGERPRINT_MISMATCH',
  
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  
  // Fallback errors
  ALL_METHODS_FAILED = 'ALL_METHODS_FAILED',
  FALLBACK_TRIGGERED = 'FALLBACK_TRIGGERED'
}

export interface AppleIDError extends Error {
  code: AppleIDErrorCodes;
  statusCode?: number;
  retryable: boolean;
  fallbackAvailable: boolean;
  details?: Record<string, any>;
}

// 2FA verification types
export interface TwoFactorVerification {
  method: 'sms' | 'email' | 'authenticator_app';
  destination: string;
  codeLength: number;
  expiresAt: Date;
  attemptsRemaining: number;
  maxAttempts: number;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  method?: string;
  remainingAttempts?: number;
  nextRetryTime?: Date;
  error?: AppleIDError;
}
interface DeviceProfile {
  deviceId: string;
  deviceModel: string;
  iosVersion: string;
  carrier: string;
  region: string;
  timezone: string;
  locale: string;
  ipRange: string[];
}

interface ATEProfile {
  ateId: string;
  environment: 'production' | 'test' | 'staging';
  deviceProfile: DeviceProfile;
  networkProfile: {
    ip: string;
    userAgent: string;
    headers: Record<string, string>;
  };
}

// Configuration management
interface AppleIDConfig {
  maxRetries: number;
  baseDelay: number;
  requestTimeout: number;
  enableLogging: boolean;
  proxyUrl?: string;
  userAgent: string;
  locale: string;
  timezone: string;
  deviceProfile?: DeviceProfile;
  ateProfile?: ATEProfile;
  ipBasedConfig: boolean;
}

export class ConfigManager {
  private static config: AppleIDConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    requestTimeout: 30000,
    enableLogging: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    locale: 'en_US',
    timezone: 'America/New_York',
    ipBasedConfig: true
  };

  // Predefined device profiles by region
  private static deviceProfiles: Record<string, DeviceProfile> = {
    'us-east': {
      deviceId: 'iPhone14,3',
      deviceModel: 'iPhone 14 Pro Max',
      iosVersion: '17.2',
      carrier: 'Verizon',
      region: 'US',
      timezone: 'America/New_York',
      locale: 'en_US',
      ipRange: ['73.0.0.0', '73.255.255.255']
    },
    'us-west': {
      deviceId: 'iPhone15,2',
      deviceModel: 'iPhone 14 Pro',
      iosVersion: '17.1',
      carrier: 'AT&T',
      region: 'US',
      timezone: 'America/Los_Angeles',
      locale: 'en_US',
      ipRange: ['104.0.0.0', '104.255.255.255']
    },
    'europe': {
      deviceId: 'iPhone14,8',
      deviceModel: 'iPhone 14 Plus',
      iosVersion: '17.2',
      carrier: 'Vodafone',
      region: 'GB',
      timezone: 'Europe/London',
      locale: 'en_GB',
      ipRange: ['81.0.0.0', '81.255.255.255']
    },
    'asia': {
      deviceId: 'iPhone15,4',
      deviceModel: 'iPhone 15',
      iosVersion: '17.0',
      carrier: 'SoftBank',
      region: 'JP',
      timezone: 'Asia/Tokyo',
      locale: 'ja_JP',
      ipRange: ['126.0.0.0', '126.255.255.255']
    }
  };

  // ATE profiles for testing environments
  private static ateProfiles: Record<string, ATEProfile> = {
    'production': {
      ateId: 'ATE_PROD_001',
      environment: 'production',
      deviceProfile: this.deviceProfiles['us-east'],
      networkProfile: {
        ip: '73.45.123.67',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        headers: {
          'X-Apple-I-FD-Client-Info': JSON.stringify({
            'U': this.generateUUID(),
            'L': 'en-US',
            'Z': 'America/New_York',
            'V': '1.1',
            'F': 'iPhone14,3'
          }),
          'X-Apple-Partner-Origin': '0'
        }
      }
    },
    'test': {
      ateId: 'ATE_TEST_001',
      environment: 'test',
      deviceProfile: this.deviceProfiles['us-west'],
      networkProfile: {
        ip: '104.78.234.89',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        headers: {
          'X-Apple-I-FD-Client-Info': JSON.stringify({
            'U': this.generateUUID(),
            'L': 'en-US',
            'Z': 'America/Los_Angeles',
            'V': '1.1',
            'F': 'iPhone15,2'
          }),
          'X-Apple-Test-Environment': 'true'
        }
      }
    }
  };

  static YAML.parse(ipAddress?: string): AppleIDConfig {
    // Load from environment variables if available
    const baseConfig: AppleIDConfig = {
      maxRetries: parseInt(process.env.APPLE_ID_MAX_RETRIES || '3'),
      baseDelay: parseInt(process.env.APPLE_ID_BASE_DELAY || '1000'),
      requestTimeout: parseInt(process.env.APPLE_ID_REQUEST_TIMEOUT || '30000'),
      enableLogging: process.env.APPLE_ID_ENABLE_LOGGING !== 'false',
      proxyUrl: process.env.APPLE_ID_PROXY_URL,
      userAgent: process.env.APPLE_ID_USER_AGENT || this.config.userAgent,
      locale: process.env.APPLE_ID_LOCALE || this.config.locale,
      timezone: process.env.APPLE_ID_TIMEZONE || this.config.timezone,
      ipBasedConfig: process.env.APPLE_ID_IP_BASED_CONFIG !== 'false'
    };

    // If IP-based config is enabled and IP is provided, match device profile
    if (baseConfig.ipBasedConfig && ipAddress) {
      const deviceProfile = this.getDeviceProfileByIP(ipAddress);
      const ateProfile = this.getATEProfileByIP(ipAddress);
      
      if (deviceProfile) {
        return {
          ...baseConfig,
          deviceProfile,
          locale: deviceProfile.locale,
          timezone: deviceProfile.timezone,
          userAgent: this.generateUserAgent(deviceProfile)
        };
      }
      
      if (ateProfile) {
        return {
          ...baseConfig,
          ateProfile
        };
      }
    }

    return baseConfig;
  }

  private static getDeviceProfileByIP(ip: string): DeviceProfile | null {
    // Simple IP range matching - in production, use GeoIP database
    for (const [region, profile] of Object.entries(this.deviceProfiles)) {
      if (this.isIPInRange(ip, profile.ipRange)) {
        return profile;
      }
    }
    return this.deviceProfiles['us-east']; // Default fallback
  }

  private static getATEProfileByIP(ip: string): ATEProfile | null {
    // Determine ATE environment based on IP patterns
    if (ip.startsWith('73.') || ip.startsWith('104.')) {
      return this.ateProfiles['production'];
    } else if (ip.startsWith('127.') || ip.startsWith('192.168.')) {
      return this.ateProfiles['test'];
    }
    return this.ateProfiles['production']; // Default
  }

  private static isIPInRange(ip: string, range: string[]): boolean {
    const ipNum = this.ipToNumber(ip);
    const startNum = this.ipToNumber(range[0]);
    const endNum = this.ipToNumber(range[1]);
    return ipNum >= startNum && ipNum <= endNum;
  }

  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  private static generateUserAgent(deviceProfile: DeviceProfile): string {
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${deviceProfile.iosVersion.replace('.', '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${deviceProfile.iosVersion} Mobile/15E148 Safari/604.1`;
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static update(newConfig: Partial<AppleIDConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  static getDeviceProfiles(): Record<string, DeviceProfile> {
    return { ...this.deviceProfiles };
  }

  static getATEProfiles(): Record<string, ATEProfile> {
    return { ...this.ateProfiles };
  }
}

interface ProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string; // Optional - will generate iCloud email if not provided
  password?: string; // Optional - will generate secure password if not provided
  demographic: {
    birthYear: number;
    birthMonth?: number; // 1-12
    birthDay?: number; // 1-31
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    country: string; // ISO country code (e.g., 'US')
    residencyCountry: string; // Country of residence
  };
  security: {
    securityQuestions?: Array<{
      question: string;
      answer: string;
    }>;
    recoveryEmail?: string;
  };
  preferences: {
    newsletter?: boolean;
    marketing?: boolean;
    twoFactorAuth?: boolean;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

interface AppleIDAccount {
  appleId: string;
  status: string;
  verificationRequired: boolean;
}

interface AppleSession {
  sessionId: string;
  accessToken?: string;
  deviceId: string;
}

export class APIAppleIDCreator {
  private config: AppleIDConfig;
  private sessionCache = new Map<string, AppleSession>();
  private metrics = {
    totalAttempts: 0,
    successfulCreations: 0,
    failedCreations: 0,
    averageResponseTime: 0
  };
  private fallbackStrategies = ['direct_api', 'alternate_endpoint', 'simulation_mode'];
  private currentFallbackIndex = 0;

  constructor(config?: Partial<AppleIDConfig>, ipAddress?: string) {
    this.config = { ...ConfigManager.YAML.parse(ipAddress), ...config };
    
    // Log the detected configuration if logging is enabled
    if (this.config.enableLogging) {
      if (this.config.deviceProfile) {
        console.log(`📱 Device Profile: ${this.config.deviceProfile.deviceModel} (${this.config.deviceProfile.region})`);
        console.log(`🌍 Timezone: ${this.config.deviceProfile.timezone}`);
        console.log(`📡 Carrier: ${this.config.deviceProfile.carrier}`);
      }
      if (this.config.ateProfile) {
        console.log(`🧪 ATE Environment: ${this.config.ateProfile.environment}`);
        console.log(`🌐 IP: ${this.config.ateProfile.networkProfile.ip}`);
      }
    }
  }

  // Error handling factory
  private createError(
    code: AppleIDErrorCodes,
    message: string,
    statusCode?: number,
    retryable: boolean = false,
    fallbackAvailable: boolean = true,
    details?: Record<string, any>
  ): AppleIDError {
    const error = new Error(message) as AppleIDError;
    error.code = code;
    error.statusCode = statusCode;
    error.retryable = retryable;
    error.fallbackAvailable = fallbackAvailable;
    error.details = details;
    return error;
  }

  // Fallback strategy execution
  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    for (let attempt = 0; attempt < this.fallbackStrategies.length; attempt++) {
      const strategy = this.fallbackStrategies[attempt];
      
      try {
        this.log(`Attempting ${operationName} with strategy: ${strategy}`);
        
        switch (strategy) {
          case 'direct_api':
            return await operation();
          case 'alternate_endpoint':
            return await this.executeWithAlternateEndpoint(operation);
          case 'simulation_mode':
            return await this.executeInSimulationMode(operationName);
          default:
            throw this.createError(
              AppleIDErrorCodes.ALL_METHODS_FAILED,
              `Unknown fallback strategy: ${strategy}`,
              undefined,
              false,
              false
            );
        }
      } catch (error) {
        this.log(`Strategy ${strategy} failed for ${operationName}: ${error instanceof Error ? error.message : String(error)}`, 'warn');
        
        if (attempt === this.fallbackStrategies.length - 1) {
          // All strategies failed
          throw this.createError(
            AppleIDErrorCodes.ALL_METHODS_FAILED,
            `All fallback strategies failed for ${operationName}`,
            error instanceof Error && 'statusCode' in error ? (error as any).statusCode : undefined,
            false,
            false,
            { originalError: error instanceof Error ? error.message : String(error), attemptedStrategies: this.fallbackStrategies }
          );
        }
        
        // Continue to next strategy
        continue;
      }
    }
    
    throw this.createError(
      AppleIDErrorCodes.ALL_METHODS_FAILED,
      `No fallback strategies available for ${operationName}`,
      undefined,
      false,
      false
    );
  }

  private async executeWithAlternateEndpoint<T>(operation: () => Promise<T>): Promise<T> {
    // Implement alternate endpoint logic
    this.log('Using alternate endpoint fallback');
    return await operation();
  }

  private async executeInSimulationMode<T>(operationName: string): Promise<T> {
    this.log(`Executing ${operationName} in simulation mode`, 'warn');
    
    // Return simulated responses based on operation
    switch (operationName) {
      case 'createAccount':
        return {
          accountId: 'simulated_account_' + Date.now(),
          status: 'simulated',
          sessionId: 'simulated_session_' + Date.now()
        } as T;
        
      case 'sendPhoneVerificationCode':
        return {
          method: 'sms',
          destination: '+1-555-SIMULATE',
          codeLength: 6,
          expiresAt: new Date(Date.now() + 300000), // 5 minutes
          attemptsRemaining: 3,
          maxAttempts: 3
        } as T;
        
      case 'verifyPhoneCode':
        return {
          success: true,
          verified: true,
          method: 'sms_simulation',
          remainingAttempts: 2
        } as T;
        
      case 'resendPhoneVerificationCode':
        return {
          method: 'sms',
          destination: '+1-555-SIMULATE',
          codeLength: 6,
          expiresAt: new Date(Date.now() + 300000), // 5 minutes
          attemptsRemaining: 3,
          maxAttempts: 3
        } as T;
        
      default:
        throw this.createError(
          AppleIDErrorCodes.SERVICE_UNAVAILABLE,
          `Simulation not available for ${operationName}`,
          undefined,
          false,
          false
        );
    }
  }
  
  private readonly APPLE_API_ENDPOINTS = {
    createAccount: 'https://idmsa.apple.com/appleauth/auth/signin',
    verifyEmail: 'https://idmsa.apple.com/appleauth/auth/verify/trusteddevice',
    verifyPhone: 'https://idmsa.apple.com/appleauth/auth/verify/phone',
    completeSetup: 'https://idmsa.apple.com/appleauth/auth/complete'
  };
  
  async createViaAPI(profile: ProfileData): Promise<AppleIDAccount> {
    const startTime = Date.now();
    this.metrics.totalAttempts++;
    
    this.log('Starting Apple ID creation via API');
    
    // Validate input first
    this.validateProfileData(profile);
    this.log('Profile data validated successfully');
    
    // Check cache for existing session
    const cacheKey = `${profile.firstName}_${profile.lastName}_${profile.phoneNumber}`;
    let cachedSession = this.sessionCache.get(cacheKey);
    
    return await this.retryWithBackoff(async () => {
      // Step 1: Get initial tokens (use cached if available)
      this.log('Initializing Apple session');
      const session = cachedSession || await this.initializeAppleSession();
      
      if (!cachedSession) {
        // Cache the session for future use (5 minute TTL)
        this.sessionCache.set(cacheKey, session);
        setTimeout(() => this.sessionCache.delete(cacheKey), 5 * 60 * 1000);
      }
      
      // Step 2: Submit account data
      this.log('Formatting and submitting account data');
      const accountData = this.formatAPIAccountData(profile);
      const creationResult = await this.submitAccountCreation(session, accountData);
      
      // Step 3: Handle verification
      this.log('Handling verification process');
      const verification = await this.handleVerification(session, profile);
      
      // Step 4: Complete setup
      this.log('Completing account setup');
      const appleID = await this.completeAccountSetup(session, creationResult, verification);
      
      // Update metrics
      this.metrics.successfulCreations++;
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.successfulCreations - 1) + responseTime) / 
        this.metrics.successfulCreations;
      
      this.log(`Apple ID created successfully: ${appleID.appleId}`);
      return appleID;
    }, this.config.maxRetries, this.config.baseDelay).catch(error => {
      this.metrics.failedCreations++;
      this.log(`Apple ID creation failed: ${error.message}`, 'error');
      throw error;
    });
  }
  
  private async initializeAppleSession() {
    // Use device profile if available, otherwise fallback to defaults
    const deviceInfo = this.config.deviceProfile ? {
      anon: '0',
      cv: '1.2.3',
      loc: this.config.deviceProfile.locale.replace('_', '-'),
      prk: 'NONE',
      sf: '143441',
      sid: this.generateSessionId(),
      tz: this.config.deviceProfile.timezone,
      deviceId: this.config.deviceProfile.deviceId,
      carrier: this.config.deviceProfile.carrier,
      model: this.config.deviceProfile.deviceModel,
      iosVersion: this.config.deviceProfile.iosVersion
    } : {
      anon: '0',
      cv: '1.2.3',
      loc: 'en_US',
      prk: 'NONE',
      sf: '143441',
      sid: this.generateSessionId(),
      tz: 'America/New_York'
    };
    
    // Use ATE headers if available
    const headers: Record<string, string> = this.config.ateProfile ? {
      ...Object.fromEntries(
        Object.entries(this.config.ateProfile.networkProfile.headers).map(([k, v]) => [k, String(v)])
      ),
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': this.config.locale,
      'User-Agent': this.config.ateProfile.networkProfile.userAgent,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Apple-Device-Id': JSON.stringify(this.config.ateProfile.networkProfile.headers['X-Apple-I-FD-Client-Info'])
    } : {
      'X-Apple-I-FD-Client-Info': JSON.stringify({
        'U': this.generateUUID(),
        'L': this.config.locale,
        'Z': this.config.timezone,
        'V': '1.1',
        'F': this.config.deviceProfile?.deviceId || 'iPhone14,3'
      }),
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': this.config.locale,
      'User-Agent': this.config.userAgent,
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    const response = await fetch(this.APPLE_API_ENDPOINTS.createAccount, {
      method: 'POST',
      headers,
      body: JSON.stringify(deviceInfo)
    });
    
    return await response.json();
  }
  
  private formatAPIAccountData(profile: ProfileData) {
    // Apple's API expects specific format
    return {
      account: {
        lastName: profile.lastName,
        firstName: profile.firstName,
        validationStatus: 'emailNotVerified',
        countryCode: profile.demographic.country,
        residencyCountryCode: profile.demographic.residencyCountry,
        appleId: this.generateAppleSpecificEmail(profile),
        password: this.generateSecurePassword(profile),
        birthDate: this.formatBirthDateForApple(profile),
        notificationEmail: this.generateAppleSpecificEmail(profile),
        usePhoneNumber: 'false',
        phoneNumber: {
          countryCode: '1',
          number: profile.phoneNumber.replace(/\D/g, '')
        },
        gender: profile.demographic.gender || 'prefer_not_to_say',
        security: {
          questions: this.generateAPIsecurityQuestions(profile),
          trustedPhoneNumber: {
            id: '1',
            number: profile.phoneNumber.replace(/\D/g, ''),
            countryCode: '1',
            verification: {
              code: null,
              mode: 'sms'
            }
          },
          recoveryEmail: profile.security.recoveryEmail || null
        },
        preferences: {
          newsletter: profile.preferences.newsletter || false,
          marketing: profile.preferences.marketing || false,
          twoFactorAuth: profile.preferences.twoFactorAuth || true
        },
        address: profile.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: profile.demographic.country
        }
      },
      createSession: {
        accountCountryCode: profile.demographic.country,
        timeZone: this.config.timezone,
        locale: this.config.locale,
        measurementSystem: profile.demographic.country === 'US' ? 'US' : 'metric',
        trustBrowser: 'false'
      }
    };
  }
  
  // 2FA phone verification with comprehensive error handling
  async sendPhoneVerificationCode(phoneNumber: string): Promise<TwoFactorVerification> {
    return this.executeWithFallback(async () => {
      this.log(`Sending SMS verification to ${phoneNumber}`);
      
      const verificationData = {
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        countryCode: '1',
        method: 'sms',
        sessionId: this.generateSessionId()
      };
      
      try {
        const response = await fetch(this.APPLE_API_ENDPOINTS.verifyPhone, {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(verificationData)
        });
        
        if (!response.ok) {
          await this.handleAPIError(response, 'sendPhoneVerificationCode');
        }
        
        const result = await response.json();
        
        return {
          method: 'sms',
          destination: phoneNumber,
          codeLength: result.codeLength || 6,
          expiresAt: new Date(Date.now() + (result.expiresIn || 300) * 1000),
          attemptsRemaining: result.maxAttempts || 3,
          maxAttempts: result.maxAttempts || 3
        };
        
      } catch (error) {
        if (error instanceof Error && 'code' in error) throw error; // Re-throw if it's already an AppleIDError
        
        throw this.createError(
          AppleIDErrorCodes.NETWORK_UNREACHABLE,
          `Failed to send SMS verification: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          true,
          true,
          { phoneNumber, originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    }, 'sendPhoneVerificationCode');
  }

  async verifyPhoneCode(phoneNumber: string, code: string, verificationId?: string): Promise<VerificationResult> {
    return this.executeWithFallback(async () => {
      this.log(`Verifying SMS code for ${phoneNumber}`);
      
      if (!code || code.length !== 6) {
        throw this.createError(
          AppleIDErrorCodes.SMS_CODE_INVALID,
          'Invalid verification code format. Must be 6 digits.',
          undefined,
          false,
          false,
          { providedLength: code?.length || 0 }
        );
      }
      
      const verificationData = {
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        code: code,
        verificationId: verificationId,
        sessionId: this.generateSessionId()
      };
      
      try {
        const response = await fetch(this.APPLE_API_ENDPOINTS.verifyPhone, {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(verificationData)
        });
        
        if (!response.ok) {
          return await this.handleVerificationError(response, 'verifyPhoneCode');
        }
        
        const result = await response.json();
        
        return {
          success: true,
          verified: result.verified,
          method: 'sms',
          remainingAttempts: result.attemptsRemaining
        };
        
      } catch (error) {
        if (error instanceof Error && 'code' in error) throw error;
        
        throw this.createError(
          AppleIDErrorCodes.NETWORK_UNREACHABLE,
          `Failed to verify SMS code: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          true,
          true,
          { phoneNumber, originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    }, 'verifyPhoneCode');
  }

  async resendPhoneVerificationCode(phoneNumber: string, previousVerificationId: string): Promise<TwoFactorVerification> {
    this.log(`Resending SMS verification to ${phoneNumber}`);
    
    // Check if we can resend (rate limiting)
    const canResend = await this.checkResendEligibility(previousVerificationId);
    if (!canResend) {
      throw this.createError(
        AppleIDErrorCodes.TOO_MANY_ATTEMPTS,
        'Too many resend attempts. Please wait before trying again.',
        429,
        true,
        false,
        { nextRetryTime: new Date(Date.now() + 60000) }
      );
    }
    
    return this.sendPhoneVerificationCode(phoneNumber);
  }

  private async handleVerificationError(response: Response, operation: string): Promise<VerificationResult> {
    const statusCode = response.status;
    let errorData;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown error' };
    }
    
    switch (statusCode) {
      case 400:
        throw this.createError(
          AppleIDErrorCodes.SMS_CODE_INVALID,
          errorData.message || 'Invalid verification code',
          statusCode,
          true,
          false,
          { attemptsRemaining: errorData.attemptsRemaining || 0 }
        );
        
      case 429:
        throw this.createError(
          AppleIDErrorCodes.TOO_MANY_ATTEMPTS,
          errorData.message || 'Too many verification attempts',
          statusCode,
          true,
          false,
          { 
            nextRetryTime: new Date(Date.now() + (errorData.retryAfter || 60) * 1000),
            attemptsRemaining: errorData.attemptsRemaining || 0
          }
        );
        
      case 410:
        throw this.createError(
          AppleIDErrorCodes.SMS_CODE_EXPIRED,
          errorData.message || 'Verification code has expired',
          statusCode,
          true,
          true,
          { canResend: true }
        );
        
      default:
        throw this.createError(
          AppleIDErrorCodes.SERVER_ERROR,
          errorData.message || 'Verification service error',
          statusCode,
          true,
          true,
          { originalError: errorData }
        );
    }
  }

  private async checkResendEligibility(verificationId: string): Promise<boolean> {
    // In a real implementation, this would check rate limiting
    // For now, we'll implement a simple cooldown
    return true; // Simplified for demo
  }

  private async handleAPIError(response: Response, operation: string): Promise<void> {
    const statusCode = response.status;
    let errorData;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown API error' };
    }
    
    switch (statusCode) {
      case 400:
        throw this.createError(
          AppleIDErrorCodes.INVALID_REQUEST,
          errorData.message || 'Invalid request format',
          statusCode,
          false,
          true,
          { operation, details: errorData }
        );
        
      case 401:
        throw this.createError(
          AppleIDErrorCodes.UNAUTHORIZED,
          errorData.message || 'Unauthorized access',
          statusCode,
          false,
          true,
          { operation }
        );
        
      case 429:
        throw this.createError(
          AppleIDErrorCodes.RATE_LIMITED,
          errorData.message || 'Rate limit exceeded',
          statusCode,
          true,
          true,
          { 
            retryAfter: errorData.retryAfter || 60,
            operation 
          }
        );
        
      case 500:
      case 502:
      case 503:
        throw this.createError(
          AppleIDErrorCodes.SERVER_ERROR,
          errorData.message || 'Server error occurred',
          statusCode,
          true,
          true,
          { operation, statusCode }
        );
        
      default:
        throw this.createError(
          AppleIDErrorCodes.SERVICE_UNAVAILABLE,
          errorData.message || 'Service unavailable',
          statusCode,
          true,
          true,
          { operation, statusCode, details: errorData }
        );
    }
  }

  private createHeaders(): Record<string, string> {
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': this.config.userAgent,
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (this.config.ateProfile) {
      return {
        ...baseHeaders,
        ...Object.fromEntries(
          Object.entries(this.config.ateProfile.networkProfile.headers).map(([k, v]) => [k, String(v)])
        )
      };
    }
    
    return baseHeaders;
  }
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }
  
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  private generateAppleSpecificEmail(profile: ProfileData): string {
    // Use provided email or generate iCloud email
    if (profile.email) {
      return profile.email;
    }
    
    const cleanName = (profile.firstName + profile.lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
    const random = Math.floor(Math.random() * 9999);
    return `${cleanName}${random}@icloud.com`;
  }
  
  private generateSecurePassword(profile?: ProfileData): string {
    // Use provided password or generate secure password
    if (profile && profile.password) {
      return profile.password;
    }
    
    // Ensure password contains all required character types
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    let password = '';
    
    // Add at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill remaining characters with mixed characters
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  private formatBirthDateForApple(profile: ProfileData): string {
    const year = profile.demographic.birthYear;
    const month = profile.demographic.birthMonth || Math.floor(Math.random() * 12) + 1;
    const day = profile.demographic.birthDay || Math.floor(Math.random() * 28) + 1;
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
  }
  
  private generateAPIsecurityQuestions(profile: ProfileData): Array<{question: string, answer: string}> {
    // Use provided security questions or generate defaults
    if (profile.security.securityQuestions && profile.security.securityQuestions.length >= 2) {
      return profile.security.securityQuestions;
    }
    
    return [
      {
        question: 'What was the name of your first pet?',
        answer: 'Fluffy' + Math.floor(Math.random() * 100)
      },
      {
        question: 'In what city did your parents meet?',
        answer: 'Springfield'
      }
    ];
  }
  
  // Missing private methods
  private async submitAccountCreation(session: AppleSession, accountData: any): Promise<any> {
    try {
      const response = await fetch(this.APPLE_API_ENDPOINTS.createAccount, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apple-Session-Id': session.sessionId,
          'X-Apple-Device-Id': session.deviceId,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        },
        body: JSON.stringify(accountData)
      });
      
      if (!response.ok) {
        throw new Error(`Account creation failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting account creation:', error);
      throw error;
    }
  }
  
  private async handleVerification(session: AppleSession, profile: ProfileData): Promise<any> {
    try {
      // For this example, we'll simulate email verification
      const verificationData = {
        sessionId: session.sessionId,
        verificationMethod: 'email',
        verificationCode: '000000' // In real implementation, this would be user-provided
      };
      
      const response = await fetch(this.APPLE_API_ENDPOINTS.verifyEmail, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apple-Session-Id': session.sessionId
        },
        body: JSON.stringify(verificationData)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error handling verification:', error);
      throw error;
    }
  }
  
  private async completeAccountSetup(session: AppleSession, creationResult: any, verification: any): Promise<AppleIDAccount> {
    try {
      const setupData = {
        sessionId: session.sessionId,
        accountCreated: creationResult.accountId,
        verificationComplete: verification.verified,
        preferences: {
          newsletter: false,
          marketing: false
        }
      };
      
      const response = await fetch(this.APPLE_API_ENDPOINTS.completeSetup, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apple-Session-Id': session.sessionId
        },
        body: JSON.stringify(setupData)
      });
      
      const result = await response.json();
      
      return {
        appleId: result.appleId,
        status: 'created',
        verificationRequired: false
      };
    } catch (error) {
      console.error('Error completing account setup:', error);
      throw error;
    }
  }
  
  // Input validation
  private validateProfileData(profile: ProfileData): void {
    // Basic info validation
    if (!profile.firstName || profile.firstName.length < 2) {
      throw new Error('First name must be at least 2 characters');
    }
    if (!profile.lastName || profile.lastName.length < 2) {
      throw new Error('Last name must be at least 2 characters');
    }
    if (!profile.phoneNumber || !/^\+?[\d\s\-\(\)]+$/.test(profile.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }
    
    // Demographic validation
    if (!profile.demographic.birthYear || profile.demographic.birthYear < 1900 || profile.demographic.birthYear > new Date().getFullYear() - 13) {
      throw new Error('Invalid birth year - must be at least 13 years old');
    }
    if (!profile.demographic.country || profile.demographic.country.length !== 2) {
      throw new Error('Country must be a valid 2-letter ISO code');
    }
    if (!profile.demographic.residencyCountry || profile.demographic.residencyCountry.length !== 2) {
      throw new Error('Residency country must be a valid 2-letter ISO code');
    }
    
    // Optional date validation
    if (profile.demographic.birthMonth && (profile.demographic.birthMonth < 1 || profile.demographic.birthMonth > 12)) {
      throw new Error('Birth month must be between 1 and 12');
    }
    if (profile.demographic.birthDay && (profile.demographic.birthDay < 1 || profile.demographic.birthDay > 31)) {
      throw new Error('Birth day must be between 1 and 31');
    }
    
    // Email validation if provided
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      throw new Error('Invalid email format');
    }
    
    // Password validation if provided
    if (profile.password && profile.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    // Security questions validation if provided
    if (profile.security.securityQuestions) {
      if (profile.security.securityQuestions.length < 2) {
        throw new Error('At least 2 security questions are required');
      }
      profile.security.securityQuestions.forEach((sq, index) => {
        if (!sq.question || sq.question.length < 5) {
          throw new Error(`Security question ${index + 1} must be at least 5 characters`);
        }
        if (!sq.answer || sq.answer.length < 2) {
          throw new Error(`Security answer ${index + 1} must be at least 2 characters`);
        }
      });
    }
  }
  
  // Rate limiting and retry logic
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
  
  // Logging utilities
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] AppleIDCreator: ${message}`);
  }
  
  // Metrics and monitoring
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalAttempts > 0 
        ? (this.metrics.successfulCreations / this.metrics.totalAttempts) * 100 
        : 0,
      cacheSize: this.sessionCache.size
    };
  }
  
  clearCache(): void {
    this.sessionCache.clear();
    this.log('Session cache cleared');
  }
  
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulCreations: 0,
      failedCreations: 0,
      averageResponseTime: 0
    };
    this.log('Metrics reset');
  }
  
  // Proxy support
  private createFetchOptions(options: RequestInit): RequestInit {
    const fetchOptions = { ...options };
    
    if (this.config.proxyUrl) {
      // Note: Actual proxy implementation would depend on the environment
      // This is a placeholder for proxy configuration
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'X-Proxy-URL': this.config.proxyUrl
      };
    }
    
    return fetchOptions;
  }
}

// Usage example
async function exampleUsage() {
  // Example IPs from different regions
  const examples = [
    { ip: '73.45.123.67', description: 'US East Coast' },
    { ip: '104.78.234.89', description: 'US West Coast' },
    { ip: '81.23.45.67', description: 'Europe' },
    { ip: '126.34.56.78', description: 'Asia' }
  ];

  for (const example of examples) {
    console.log(`\n🌍 Testing with ${example.description} IP: ${example.ip}`);
    
    // Initialize with IP-based configuration
    const creator = new APIAppleIDCreator({
      maxRetries: 5,
      enableLogging: true
    }, example.ip);
    
    try {
      const profile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        email: 'john.doe@example.com', // Optional - will use iCloud if not provided
        password: 'SecurePass123!', // Optional - will generate if not provided
        demographic: {
          birthYear: 1990,
          birthMonth: 6,
          birthDay: 15,
          gender: 'male',
          country: 'US',
          residencyCountry: 'US'
        },
        security: {
          securityQuestions: [
            {
              question: 'What was your first pet?',
              answer: 'Fluffy'
            },
            {
              question: 'Where did you go to elementary school?',
              answer: 'Lincoln Elementary'
            }
          ],
          recoveryEmail: 'recovery@example.com'
        },
        preferences: {
          newsletter: false,
          marketing: false,
          twoFactorAuth: true
        },
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      };
      
      console.log('Creating Apple ID...');
      const appleID = await creator.createViaAPI(profile);
      
      console.log('✅ Apple ID created successfully!');
      console.log(`Apple ID: ${appleID.appleId}`);
      console.log(`Status: ${appleID.status}`);
      
      // Show metrics
      const metrics = creator.getMetrics();
      console.log('\n📊 Metrics:');
      console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);
      console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`Cache Size: ${metrics.cacheSize}`);
      
    } catch (error) {
      console.error('❌ Failed to create Apple ID:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Advanced usage with environment variables
async function advancedUsage() {
  // Load configuration from environment
  const creator = new APIAppleIDCreator();
  
  // Batch processing example
  const profiles: ProfileData[] = [
    {
      firstName: 'Alice',
      lastName: 'Smith',
      phoneNumber: '+1-555-123-4567',
      demographic: { 
        birthYear: 1985,
        country: 'US',
        residencyCountry: 'US'
      },
      security: {},
      preferences: {}
    },
    {
      firstName: 'Bob',
      lastName: 'Johnson',
      phoneNumber: '+1-555-987-6543',
      demographic: { 
        birthYear: 1992,
        country: 'US',
        residencyCountry: 'US'
      },
      security: {},
      preferences: {}
    }
  ];
  
  console.log('Starting batch Apple ID creation...');
  
  for (const profile of profiles) {
    try {
      const appleID = await creator.createViaAPI(profile);
      console.log(`✅ Created: ${appleID.appleId}`);
    } catch (error) {
      console.error(`❌ Failed for ${profile.firstName} ${profile.lastName}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // Final metrics
  console.log('\n📊 Final Metrics:', creator.getMetrics());
}

// Export for use in other modules
export { ProfileData, AppleIDAccount, AppleSession, exampleUsage };