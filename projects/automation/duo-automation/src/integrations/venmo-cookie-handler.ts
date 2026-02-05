/**
 * 🍪 Venmo Cookie Handler - FactoryWager Venmo Family System
 * Manages Venmo authentication cookies and sessions
 */

import { decrypt, encrypt } from '../utils/crypto';

/**
 * 🍪 Venmo Cookie Structure
 */
interface VenmoCookie {
  domain: string;
  cookies: Map<string, string>;
  expires: Date;
  userId: string;
  isActive: boolean;
}

/**
 * 🔐 Venmo Cookie Handler Class
 */
export class VenmoCookieHandler {
  private cookieStore: Map<string, VenmoCookie> = new Map();
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.VENMO_COOKIE_KEY || 'default-key';
  }

  /**
   * 🍪 Store Venmo cookies for a user
   */
  async storeCookies(userId: string, domain: string, cookies: Record<string, string>): Promise<void> {
    try {
      // Encrypt sensitive cookie data
      const encryptedCookies = await this.encryptCookies(cookies);
      
      const venmoCookie: VenmoCookie = {
        domain,
        cookies: new Map(Object.entries(encryptedCookies)),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        userId,
        isActive: true
      };
      
      this.cookieStore.set(userId, venmoCookie);
      
      // Persist to storage (database, file, etc.)
      await this.persistCookies(userId, venmoCookie);
      
      console.log(`🍪 Stored ${Object.keys(cookies).length} cookies for user ${userId}`);
      
    } catch (error) {
      console.error('Failed to store Venmo cookies:', error);
      throw new Error('Cookie storage failed');
    }
  }

  /**
   * 🔍 Retrieve Venmo cookies for a user
   */
  async getCookies(userId: string): Promise<Record<string, string> | null> {
    try {
      // Check memory store first
      let venmoCookie = this.cookieStore.get(userId);
      
      // If not in memory, try to load from storage
      if (!venmoCookie) {
        venmoCookie = await this.loadCookies(userId);
        if (venmoCookie) {
          this.cookieStore.set(userId, venmoCookie);
        }
      }
      
      if (!venmoCookie || !venmoCookie.isActive) {
        return null;
      }
      
      // Check if cookies have expired
      if (new Date() > venmoCookie.expires) {
        await this.invalidateCookies(userId);
        return null;
      }
      
      // Decrypt cookies
      const decryptedCookies = await this.decryptCookies(
        Object.fromEntries(venmoCookie.cookies)
      );
      
      return decryptedCookies;
      
    } catch (error) {
      console.error('Failed to retrieve Venmo cookies:', error);
      return null;
    }
  }

  /**
   * 🗑️ Invalidate cookies for a user
   */
  async invalidateCookies(userId: string): Promise<void> {
    try {
      const venmoCookie = this.cookieStore.get(userId);
      if (venmoCookie) {
        venmoCookie.isActive = false;
        await this.persistCookies(userId, venmoCookie);
        this.cookieStore.delete(userId);
      }
      
      console.log(`🗑️ Invalidated cookies for user ${userId}`);
      
    } catch (error) {
      console.error('Failed to invalidate cookies:', error);
    }
  }

  /**
   * 🔄 Refresh cookies (extend expiration)
   */
  async refreshCookies(userId: string): Promise<void> {
    try {
      const venmoCookie = this.cookieStore.get(userId);
      if (venmoCookie && venmoCookie.isActive) {
        venmoCookie.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.persistCookies(userId, venmoCookie);
      }
    } catch (error) {
      console.error('Failed to refresh cookies:', error);
    }
  }

  /**
   * 🔐 Encrypt cookie data
   */
  private async encryptCookies(cookies: Record<string, string>): Promise<Record<string, string>> {
    const encrypted: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(cookies)) {
      // Only encrypt sensitive cookies
      if (this.isSensitiveCookie(key)) {
        encrypted[key] = await encrypt(value, this.encryptionKey);
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }

  /**
   * 🔓 Decrypt cookie data
   */
  private async decryptCookies(cookies: Record<string, string>): Promise<Record<string, string>> {
    const decrypted: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(cookies)) {
      if (this.isSensitiveCookie(key)) {
        try {
          decrypted[key] = await decrypt(value, this.encryptionKey);
        } catch (error) {
          console.error(`Failed to decrypt cookie ${key}:`, error);
          decrypted[key] = value; // Fallback to original value
        }
      } else {
        decrypted[key] = value;
      }
    }
    
    return decrypted;
  }

  /**
   * 🔍 Check if cookie is sensitive
   */
  private isSensitiveCookie(key: string): boolean {
    const sensitiveKeys = [
      'venmo_access_token',
      'venmo_refresh_token',
      'session_token',
      'auth_token',
      'csrf_token',
      'user_id'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * 💾 Persist cookies to storage
   */
  private async persistCookies(userId: string, venmoCookie: VenmoCookie): Promise<void> {
    // This would save to your database
    // For demo purposes, we'll just log it
    const cookieData = {
      userId,
      domain: venmoCookie.domain,
      cookies: Object.fromEntries(venmoCookie.cookies),
      expires: venmoCookie.expires.toISOString(),
      isActive: venmoCookie.isActive
    };
    
    console.log(`💾 Persisting cookies for user ${userId}:`, {
      domain: cookieData.domain,
      cookieCount: Object.keys(cookieData.cookies).length,
      expires: cookieData.expires
    });
    
    // In production, you would save to PostgreSQL, MongoDB, etc.
    // await db.collection('venmo_cookies').updateOne(
    //   { userId },
    //   { $set: cookieData },
    //   { upsert: true }
    // );
  }

  /**
   * 📥 Load cookies from storage
   */
  private async loadCookies(userId: string): Promise<VenmoCookie | null> {
    try {
      // This would load from your database
      // For demo purposes, return null
      console.log(`📥 Loading cookies for user ${userId} from storage`);
      return null;
      
      // In production:
      // const result = await db.collection('venmo_cookies').findOne({ userId });
      // if (result) {
      //   return {
      //     domain: result.domain,
      //     cookies: new Map(Object.entries(result.cookies)),
      //     expires: new Date(result.expires),
      //     userId: result.userId,
      //     isActive: result.isActive
      //   };
      // }
      // return null;
    } catch (error) {
      console.error('Failed to load cookies from storage:', error);
      return null;
    }
  }

  /**
   * 🧹 Cleanup expired cookies
   */
  async cleanupExpiredCookies(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [userId, venmoCookie] of this.cookieStore.entries()) {
      if (now > venmoCookie.expires || !venmoCookie.isActive) {
        this.cookieStore.delete(userId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cookie sessions`);
    }
  }

  /**
   * 📊 Get cookie statistics
   */
  getStats(): {
    totalUsers: number;
    activeUsers: number;
    expiredUsers: number;
    domains: string[];
  } {
    const now = new Date();
    let activeUsers = 0;
    let expiredUsers = 0;
    const domains = new Set<string>();
    
    for (const venmoCookie of this.cookieStore.values()) {
      domains.add(venmoCookie.domain);
      
      if (venmoCookie.isActive) {
        if (now <= venmoCookie.expires) {
          activeUsers++;
        } else {
          expiredUsers++;
        }
      }
    }
    
    return {
      totalUsers: this.cookieStore.size,
      activeUsers,
      expiredUsers,
      domains: Array.from(domains)
    };
  }
}

/**
 * 🍪 Venmo API Client with Cookie Support
 */
export class VenmoAPIClient {
  private cookieHandler: VenmoCookieHandler;
  private baseUrl: string;

  constructor(cookieHandler: VenmoCookieHandler) {
    this.cookieHandler = cookieHandler;
    this.baseUrl = 'https://api.venmo.com/v1';
  }

  /**
   * 📤 Make authenticated API request using stored cookies
   */
  async makeAuthenticatedRequest(
    userId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    try {
      // Get user's cookies
      const cookies = await this.cookieHandler.getCookies(userId);
      
      if (!cookies) {
        throw new Error('No valid Venmo session found for user');
      }
      
      // Build cookie header
      const cookieString = this.buildCookieString(cookies);
      
      // Make request with cookies
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Cookie': cookieString,
          'User-Agent': 'FactoryWager-Family-System/1.0',
          'Content-Type': 'application/json'
        }
      });
      
      // Check if session is still valid
      if (response.status === 401) {
        await this.cookieHandler.invalidateCookies(userId);
        throw new Error('Venmo session expired');
      }
      
      return response;
      
    } catch (error) {
      console.error('Venmo API request failed:', error);
      throw error;
    }
  }

  /**
   * 💳 Process payment using stored cookies
   */
  async processPayment(userId: string, paymentData: {
    targetEmail: string;
    amount: number;
    note: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const response = await this.makeAuthenticatedRequest(userId, '/payments', {
        method: 'POST',
        body: JSON.stringify({
          email: paymentData.targetEmail,
          amount: paymentData.amount.toString(),
          note: paymentData.note,
          audience: 'private'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          transactionId: result.data?.payment_id
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `Venmo API error: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * 👤 Get user profile using stored cookies
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest(userId, '/account');
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get profile: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to get Venmo profile:', error);
      throw error;
    }
  }

  /**
   * 🍪 Build cookie string from cookie object
   */
  private buildCookieString(cookies: Record<string, string>): string {
    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }
}

/**
 * 🍪 Cookie Management Examples
 */

// Example usage:
/*
const cookieHandler = new VenmoCookieHandler('your-encryption-key');

// Store cookies after Venmo login
await cookieHandler.storeCookies('user-123', 'api.venmo.com', {
  'venmo_access_token': 'abc123',
  'session_id': 'xyz789',
  'user_id': '456'
});

// Make API request with stored cookies
const apiClient = new VenmoAPIClient(cookieHandler);
const paymentResult = await apiClient.processPayment('user-123', {
  targetEmail: 'friend@example.com',
  amount: 25.50,
  note: 'Dinner'
});

console.log('Payment result:', paymentResult);
*/
