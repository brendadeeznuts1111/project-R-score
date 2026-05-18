// duoplus/phone-provisioning.ts
import { DUOPLUS_CONFIG, DuoPlusCloudPhone, DuoPlusCloudNumber, SMSMessage } from './config.js';

// Constants for magic numbers
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute in milliseconds
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DEFAULT_SMS_LIMIT = 10;
const DEFAULT_RENEWAL_DURATION_DAYS = 30;
const TIMEOUT_CREATE_PHONE = 30000; // 30 seconds
const TIMEOUT_SMS = 15000; // 15 seconds
const TIMEOUT_DELETE_PHONE = 20000; // 20 seconds
const TIMEOUT_RENEW_PHONE = 15000; // 15 seconds
const TIMEOUT_GET_PHONE = 10000; // 10 seconds

export class DuoPlusPhoneManager {
  private apiKey: string;
  private rateLimiter: Map<string, number[]> = new Map();
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Rate limiting helper
   */
  private async checkRateLimit(endpoint: string, limit: number, windowMs: number = RATE_LIMIT_WINDOW_MS): Promise<void> {
    const now = Date.now();
    const requests = this.rateLimiter.get(endpoint) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded for ${endpoint}. Wait ${Math.ceil(waitTime / MILLISECONDS_PER_SECOND)} seconds.`);
    }
    
    recentRequests.push(now);
    this.rateLimiter.set(endpoint, recentRequests);
  }

  /**
   * Purchase & Configure Cloud Phone
   * From Update Log: "Direct purchase entry" available
   */
  async createCloudPhone(config: {
    androidVersion: '10' | '11' | '12B';
    region: string;
    proxy?: {
      type: 'residential' | 'datacenter' | 'mobile';
      host: string;
      port: number;
      username?: string;
      password?: string;
    };
    autoRenew: boolean;
    teamId?: string;
  }): Promise<DuoPlusCloudPhone> {
    await this.checkRateLimit('phoneProvisioning', DUOPLUS_CONFIG.rateLimits.phoneProvisioning);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_CREATE_PHONE);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.cloudPhones}`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            android_version: config.androidVersion,
            region: config.region,
            proxy_config: config.proxy,
            auto_renew: config.autoRenew,
            team_id: config.teamId
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.phone_id,
        deviceId: data.device_id,
        androidVersion: config.androidVersion,
        status: data.status, // active, pending, expired
        expiry: new Date(data.expiry_date),
        proxy: config.proxy,
        // From Update Log: "Dump tool" for RPA analysis
        developerTools: {
          dumpVisible: false // Toggle via API
        },
        teamId: config.teamId,
        region: config.region
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Purchase Cloud Number (VOIP/Non-VOIP)
   * From Update Log: "No SIM card required, isolated per number"
   */
  async purchaseCloudNumber(config: {
    country: string;
    type: 'VOIP' | 'Non-VOIP';
    areaCode?: string;
    purpose: 'sms' | 'voice' | 'both';
  }): Promise<DuoPlusCloudNumber> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_CREATE_PHONE);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.cloudNumbers}`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.number_id,
        phoneNumber: data.phone_number,
        country: config.country,
        type: config.type,
        status: 'active',
        // Bound to cloud phone for SMS 2FA
        boundTo: null,
        // From Update Log: "Safe bulk account registration"
        isolation: {
          deviceFingerprint: data.fingerprint_id,
          ipIsolation: true
        }
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bind Number to Cloud Phone for SMS/2FA
   * From Update Log: "Easily bind to cloud phones"
   */
  async bindNumberToPhone(numberId: string, phoneId: string): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_SMS);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/bind-number`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number_id: numberId,
            phone_id: phoneId,
            type: 'sms_forwarding'
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Receive SMS via Webhook or Polling
   * From Update Log: "Receive verification codes"
   */
  async getSMS(phoneNumber: string, limit: number = DEFAULT_SMS_LIMIT): Promise<SMSMessage[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_SMS);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.sms}?phone_number=${phoneNumber}&limit=${limit}`,
        {
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return data.messages.map((msg: any) => ({
        from: msg.sender,
        content: msg.body,
        timestamp: new Date(msg.received_at),
        type: msg.message_type // 'verification', 'promotional', 'standard'
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Configure Anti-Detection Settings
   * From Update Log: "Optimized Reddit anti-detection"
   */
  async configureAntiDetection(phoneId: string, settings: {
    appSpecific?: {
      reddit?: {
        deviceSpoofing: boolean;
        behaviorRandomization: boolean;
      },
      tiktok?: {
        accountWarming: boolean;
        engagementPatterns: boolean;
      },
      instagram?: {
        deviceFingerprint: boolean;
        timingRandomization: boolean;
      }
    };
    network?: {
      dnsLeakProtection: boolean; // From Update Log: "Optimized proxy DNS leak"
      webrtcLeakProtection: boolean;
    };
  }): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DELETE_PHONE);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/anti-detection`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all cloud phones
   */
  async listPhones(filters?: {
    status?: string;
    teamId?: string;
    androidVersion?: string;
  }): Promise<DuoPlusCloudPhone[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.teamId) params.append('team_id', filters.teamId);
      if (filters?.androidVersion) params.append('android_version', filters.androidVersion);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_SMS);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.cloudPhones}?${params.toString()}`,
        {
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return data.phones.map((phone: any) => ({
        id: phone.phone_id,
        deviceId: phone.device_id,
        androidVersion: phone.android_version,
        status: phone.status,
        expiry: new Date(phone.expiry_date),
        proxy: phone.proxy_config,
        developerTools: {
          dumpVisible: phone.developer_tools?.dump_visible || false
        },
        teamId: phone.team_id,
        region: phone.region
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Toggle developer tools (dump visibility)
   * From Update Log: "Toggle visibility of system apps"
   */
  async toggleDeveloperTools(phoneId: string, visible: boolean): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_GET_PHONE);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/developer-tools`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ dump_visible: visible }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Renew phone subscription
   * From Update Log: "Auto-Renewal Switch"
   */
  async renewPhone(phoneId: string, duration: number = DEFAULT_RENEWAL_DURATION_DAYS): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_SMS);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/renew`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ duration_days: duration }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get phone expiry information
   * From Update Log: "Product Expiry Display"
   */
  async getPhoneExpiry(phoneId: string): Promise<{
    phoneId: string;
    expiryDate: Date;
    daysUntilExpiry: number;
    autoRenewEnabled: boolean;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_GET_PHONE);
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/expiry`,
        {
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      const expiryDate = new Date(data.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY));

      return {
        phoneId,
        expiryDate,
        daysUntilExpiry,
        autoRenewEnabled: data.auto_renew_enabled
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
