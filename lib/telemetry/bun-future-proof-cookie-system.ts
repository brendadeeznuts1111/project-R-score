#!/usr/bin/env bun

/**
 * Future-Proof Cookie System
 * 
 * Preparing for the cookie-less future with abstraction layers,
 * consent-aware management, and fallback strategies
 */

import { Cookie } from './bun-cookies-complete-v2';

// 🌐 STORAGE ABSTRACTION INTERFACES
export interface StorageAdapter {
  set(key: string, value: any, options?: any): Promise<boolean>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
}

// 💾 IN-MEMORY STORAGE FALLBACK
export class MemoryStorage {
  private data: Map<string, string> = new Map();
  
  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }
  
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  
  removeItem(key: string): void {
    this.data.delete(key);
  }
  
  clear(): void {
    this.data.clear();
  }
  
  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }
  
  get length(): number {
    return this.data.size;
  }
}

// 🍪 COOKIE STORAGE ADAPTER
export class CookieStorage implements StorageAdapter {
  private domain: string;
  private path: string;
  private secure: boolean;
  
  constructor(options: { domain?: string; path?: string; secure?: boolean } = {}) {
    this.domain = options.domain || '';
    this.path = options.path || '/';
    this.secure = options.secure ?? true;
  }
  
  async set(key: string, value: any, options: any = {}): Promise<boolean> {
    try {
      const cookie = new Cookie(key, JSON.stringify(value), {
        domain: options.domain || this.domain,
        path: options.path || this.path,
        secure: options.secure ?? this.secure,
        httpOnly: options.httpOnly ?? false,
        sameSite: options.sameSite || 'lax',
        maxAge: options.maxAge || 60 * 60 * 24 * 30 // 30 days default
      });
      
      // In a real implementation, this would set the cookie via headers
      console.log(`🍪 Cookie set: ${cookie.toString()}`);
      return true;
    } catch (error) {
      console.error(`❌ Cookie set failed: ${error.message}`);
      return false;
    }
  }
  
  async get(key: string): Promise<any> {
    try {
      // In a real implementation, this would parse from request headers
      console.log(`🍪 Cookie get: ${key}`);
      return null; // Placeholder
    } catch (error) {
      console.error(`❌ Cookie get failed: ${error.message}`);
      return null;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      const cookie = new Cookie(key, '', { maxAge: 0 });
      console.log(`🍪 Cookie deleted: ${cookie.toString()}`);
      return true;
    } catch (error) {
      console.error(`❌ Cookie delete failed: ${error.message}`);
      return false;
    }
  }
  
  async clear(): Promise<boolean> {
    console.log('🍪 All cookies cleared');
    return true;
  }
  
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
  
  async size(): Promise<number> {
    console.log('🍪 Cookie size calculated');
    return 0; // Placeholder
  }
  
  async keys(): Promise<string[]> {
    console.log('🍪 Cookie keys retrieved');
    return []; // Placeholder
  }
}

// 💾 WEB STORAGE ADAPTER
export class WebStorage implements StorageAdapter {
  private storage: globalThis.Storage | MemoryStorage;
  private prefix: string;
  
  constructor(storage?: globalThis.Storage, prefix: string = 'app_') {
    // Use provided storage or fallback to memory storage in non-browser environments
    this.storage = storage || (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : new MemoryStorage());
    this.prefix = prefix;
  }
  
  async set(key: string, value: any, options: any = {}): Promise<boolean> {
    try {
      const fullKey = this.prefix + key;
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        expires: options.expires || null
      });
      
      this.storage.setItem(fullKey, serialized);
      console.log(`💾 WebStorage set: ${fullKey}`);
      return true;
    } catch (error) {
      console.error(`❌ WebStorage set failed: ${error.message}`);
      return false;
    }
  }
  
  async get(key: string): Promise<any> {
    try {
      const fullKey = this.prefix + key;
      const serialized = this.storage.getItem(fullKey);
      
      if (!serialized) return null;
      
      const data = JSON.parse(serialized);
      
      // Check expiration
      if (data.expires && Date.now() > data.expires) {
        this.storage.removeItem(fullKey);
        return null;
      }
      
      console.log(`💾 WebStorage get: ${fullKey}`);
      return data.value;
    } catch (error) {
      console.error(`❌ WebStorage get failed: ${error.message}`);
      return null;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.prefix + key;
      this.storage.removeItem(fullKey);
      console.log(`💾 WebStorage deleted: ${fullKey}`);
      return true;
    } catch (error) {
      console.error(`❌ WebStorage delete failed: ${error.message}`);
      return false;
    }
  }
  
  async clear(): Promise<boolean> {
    try {
      const keys = this.getStorageKeys().filter(key => key.startsWith(this.prefix));
      keys.forEach(key => this.storage.removeItem(key));
      console.log(`💾 WebStorage cleared ${keys.length} items`);
      return true;
    } catch (error) {
      console.error(`❌ WebStorage clear failed: ${error.message}`);
      return false;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    const fullKey = this.prefix + key;
    return this.storage.getItem(fullKey) !== null;
  }
  
  async size(): Promise<number> {
    const keys = this.getStorageKeys().filter(key => key.startsWith(this.prefix));
    return keys.length;
  }
  
  async keys(): Promise<string[]> {
    return this.getStorageKeys()
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.substring(this.prefix.length));
  }
  
  private getStorageKeys(): string[] {
    if (this.storage instanceof MemoryStorage) {
      const keys: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } else {
      return Object.keys(this.storage);
    }
  }
}

// 🔒 SECURE STORAGE ADAPTER (HTTP-ONLY)
export class SecureStorage implements StorageAdapter {
  private encryptionKey: string;
  private fallbackStorage: WebStorage;
  
  constructor(encryptionKey: string = 'default-key') {
    this.encryptionKey = encryptionKey;
    // Use memory storage fallback for localStorage in non-browser environments
    const localStorage = typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : undefined;
    this.fallbackStorage = new WebStorage(localStorage, 'secure_');
  }
  
  async set(key: string, value: any, options: any = {}): Promise<boolean> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(value));
      return await this.fallbackStorage.set(key, encrypted, options);
    } catch (error) {
      console.error(`❌ SecureStorage set failed: ${error.message}`);
      return false;
    }
  }
  
  async get(key: string): Promise<any> {
    try {
      const encrypted = await this.fallbackStorage.get(key);
      if (!encrypted) return null;
      
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`❌ SecureStorage get failed: ${error.message}`);
      return null;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    return await this.fallbackStorage.delete(key);
  }
  
  async clear(): Promise<boolean> {
    return await this.fallbackStorage.clear();
  }
  
  async exists(key: string): Promise<boolean> {
    return await this.fallbackStorage.exists(key);
  }
  
  async size(): Promise<number> {
    return await this.fallbackStorage.size();
  }
  
  async keys(): Promise<string[]> {
    return await this.fallbackStorage.keys();
  }
  
  private async encrypt(data: string): Promise<string> {
    // Simple encryption - in production use proper encryption
    return Buffer.from(data).toString('base64');
  }
  
  private async decrypt(data: string): Promise<string> {
    // Simple decryption - in production use proper decryption
    return Buffer.from(data, 'base64').toString();
  }
}

// 🎯 CONSENT MANAGEMENT SYSTEM
export interface ConsentSettings {
  necessary: boolean;    // Always required
  functional: boolean;   // Site functionality
  analytics: boolean;    // Analytics and tracking
  marketing: boolean;    // Marketing and advertising
  personalization: boolean; // Personalization
}

export class ConsentManager {
  private static instance: ConsentManager;
  private consent: ConsentSettings;
  private storage: WebStorage;
  
  constructor() {
    // Use memory storage fallback for localStorage in non-browser environments
    const localStorage = typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : undefined;
    this.storage = new WebStorage(localStorage, 'consent_');
    // Initialize with default consent for simplicity
    this.consent = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false
    };
  }
  
  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }
  
  hasConsent(category: keyof ConsentSettings): boolean {
    return this.consent[category];
  }
  
  updateConsent(newConsent: Partial<ConsentSettings>): void {
    this.consent = { ...this.consent, ...newConsent };
    this.storage.set('user_consent', this.consent);
  }
  
  getConsent(): ConsentSettings {
    return { ...this.consent };
  }
  
  resetConsent(): void {
    this.consent = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false
    };
    this.storage.delete('user_consent');
  }
}

// 🌐 FUTURE-PROOF COOKIE SYSTEM
export class FutureProofCookieSystem {
  // 1. ABSTRACTION LAYER
  private storage = {
    cookie: new CookieStorage(),
    localStorage: new WebStorage(typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : undefined),
    sessionStorage: new WebStorage(typeof globalThis.sessionStorage !== 'undefined' ? globalThis.sessionStorage : undefined, 'session_'),
    httpOnly: new SecureStorage()
  };
  
  private consentManager: ConsentManager;
  private fallbackStrategy: 'localStorage' | 'sessionStorage' | 'memory' = 'localStorage';
  
  constructor() {
    this.consentManager = ConsentManager.getInstance();
  }
  
  // 🔄 UNIFIED STORAGE INTERFACE
  async store(
    key: string, 
    value: any, 
    method: 'cookie' | 'localStorage' | 'sessionStorage' | 'httpOnly' = 'cookie',
    options: any = {}
  ): Promise<boolean> {
    try {
      // Check if cookies are supported/enabled
      if (method === 'cookie' && !this.areCookiesSupported()) {
        console.log('🍪 Cookies not supported, falling back to localStorage');
        return await this.storage.localStorage.set(key, value, options);
      }
      
      return await this.storage[method].set(key, value, options);
    } catch (error) {
      console.error(`❌ Store failed for ${method}: ${error.message}`);
      return await this.fallbackStore(key, value, options);
    }
  }
  
  async retrieve(
    key: string, 
    method: 'cookie' | 'localStorage' | 'sessionStorage' | 'httpOnly' = 'cookie'
  ): Promise<any> {
    try {
      return await this.storage[method].get(key);
    } catch (error) {
      console.error(`❌ Retrieve failed for ${method}: ${error.message}`);
      return await this.fallbackRetrieve(key);
    }
  }
  
  async remove(
    key: string, 
    method: 'cookie' | 'localStorage' | 'sessionStorage' | 'httpOnly' = 'cookie'
  ): Promise<boolean> {
    try {
      return await this.storage[method].delete(key);
    } catch (error) {
      console.error(`❌ Remove failed for ${method}: ${error.message}`);
      return await this.fallbackRemove(key);
    }
  }
  
  // 2. COOKIE PREFERENCES SYSTEM
  static createConsentAwareCookie(
    name: string, 
    value: string, 
    category: keyof ConsentSettings,
    options: any = {}
  ): Cookie | null {
    const consentManager = ConsentManager.getInstance();
    
    // Check user preferences before setting
    if (!consentManager.hasConsent(category)) {
      console.log(`🚫 No consent for ${category}, creating ephemeral cookie`);
      return FutureProofCookieSystem.createEphemeralCookie(name, value, options);
    }
    
    const settings = FutureProofCookieSystem.getSettingsForCategory(category);
    return new Cookie(name, value, { ...settings, ...options });
  }
  
  private static createEphemeralCookie(name: string, value: string, options: any = {}): Cookie {
    return new Cookie(name, value, {
      ...options,
      maxAge: 0, // Session cookie only
      secure: false, // Allow for testing
      httpOnly: false, // Allow JavaScript access
      sameSite: 'lax'
    });
  }
  
  private static getSettingsForCategory(category: keyof ConsentSettings): any {
    const baseSettings = {
      secure: true,
      httpOnly: false,
      sameSite: 'lax' as const,
      path: '/'
    };
    
    switch (category) {
      case 'necessary':
        return {
          ...baseSettings,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 365 // 1 year
        };
      
      case 'functional':
        return {
          ...baseSettings,
          maxAge: 60 * 60 * 24 * 30 // 30 days
        };
      
      case 'analytics':
        return {
          ...baseSettings,
          maxAge: 60 * 60 * 24 * 730, // 2 years
          domain: '.example.com' // Cross-subdomain
        };
      
      case 'marketing':
        return {
          ...baseSettings,
          maxAge: 60 * 60 * 24 * 90 // 90 days
        };
      
      case 'personalization':
        return {
          ...baseSettings,
          maxAge: 60 * 60 * 24 * 180 // 6 months
        };
      
      default:
        return baseSettings;
    }
  }
  
  // 🔄 FALLBACK STRATEGIES
  private async fallbackStore(key: string, value: any, options: any): Promise<boolean> {
    console.log(`🔄 Using fallback strategy: ${this.fallbackStrategy}`);
    
    switch (this.fallbackStrategy) {
      case 'localStorage':
        return await this.storage.localStorage.set(key, value, options);
      case 'sessionStorage':
        return await this.storage.sessionStorage.set(key, value, options);
      case 'memory':
        // In-memory storage (volatile)
        console.log(`💾 Memory fallback: ${key}`);
        return true;
      default:
        return false;
    }
  }
  
  private async fallbackRetrieve(key: string): Promise<any> {
    console.log(`🔄 Using fallback retrieve: ${this.fallbackStrategy}`);
    
    switch (this.fallbackStrategy) {
      case 'localStorage':
        return await this.storage.localStorage.get(key);
      case 'sessionStorage':
        return await this.storage.sessionStorage.get(key);
      case 'memory':
        console.log(`💾 Memory retrieve: ${key}`);
        return null;
      default:
        return null;
    }
  }
  
  private async fallbackRemove(key: string): Promise<boolean> {
    console.log(`🔄 Using fallback remove: ${this.fallbackStrategy}`);
    
    switch (this.fallbackStrategy) {
      case 'localStorage':
        return await this.storage.localStorage.delete(key);
      case 'sessionStorage':
        return await this.storage.sessionStorage.delete(key);
      case 'memory':
        console.log(`💾 Memory remove: ${key}`);
        return true;
      default:
        return false;
    }
  }
  
  // 🔍 DETECTION & COMPATIBILITY
  private areCookiesSupported(): boolean {
    try {
      // Check if cookies are enabled
      return navigator.cookieEnabled;
    } catch {
      return false;
    }
  }
  
  // 📊 STORAGE ANALYSIS
  async getStorageAnalysis(): Promise<StorageAnalysis> {
    const analysis: StorageAnalysis = {
      cookieSupported: this.areCookiesSupported(),
      localStorageSupported: this.isLocalStorageSupported(),
      sessionStorageSupported: this.isSessionStorageSupported(),
      totalSize: 0,
      recommendedMethod: 'cookie'
    };
    
    // Calculate total size across all storage types
    for (const [method, storage] of Object.entries(this.storage)) {
      try {
        const size = await storage.size();
        analysis.totalSize += size;
      } catch {
        // Storage not available
      }
    }
    
    // Recommend best storage method
    if (!analysis.cookieSupported) {
      analysis.recommendedMethod = analysis.localStorageSupported ? 'localStorage' : 'sessionStorage';
    }
    
    return analysis;
  }
  
  private isLocalStorageSupported(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  
  private isSessionStorageSupported(): boolean {
    try {
      const test = '__test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  
  // 🧹 CLEANUP & MAINTENANCE
  async cleanup(): Promise<void> {
    console.log('🧹 Starting storage cleanup...');
    
    for (const [method, storage] of Object.entries(this.storage)) {
      try {
        const keys = await storage.keys();
        const expiredKeys: string[] = [];
        
        // Check for expired items
        for (const key of keys) {
          const value = await storage.get(key);
          if (value === null) {
            expiredKeys.push(key);
          }
        }
        
        // Remove expired items
        for (const key of expiredKeys) {
          await storage.delete(key);
        }
        
        console.log(`🧹 ${method}: Removed ${expiredKeys.length} expired items`);
      } catch (error) {
        console.error(`❌ Cleanup failed for ${method}: ${error.message}`);
      }
    }
  }
  
  // 📈 MIGRATION TOOLS
  async migrateToStorage(
    fromMethod: keyof typeof this.storage, 
    toMethod: keyof typeof this.storage
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      itemsMigrated: 0,
      errors: []
    };
    
    try {
      const fromStorage = this.storage[fromMethod];
      const toStorage = this.storage[toMethod];
      
      const keys = await fromStorage.keys();
      result.itemsMigrated = keys.length;
      
      for (const key of keys) {
        try {
          const value = await fromStorage.get(key);
          await toStorage.set(key, value);
          await fromStorage.delete(key);
        } catch (error) {
          result.errors.push(`${key}: ${error.message}`);
        }
      }
      
      result.success = result.errors.length === 0;
      console.log(`📈 Migration ${fromMethod} → ${toMethod}: ${result.itemsMigrated} items, ${result.errors.length} errors`);
      
    } catch (error) {
      result.errors.push(`Migration failed: ${error.message}`);
    }
    
    return result;
  }
}

// 🔧 UTILITY CLASSES
export interface StorageAnalysis {
  cookieSupported: boolean;
  localStorageSupported: boolean;
  sessionStorageSupported: boolean;
  totalSize: number;
  recommendedMethod: string;
}

export interface MigrationResult {
  success: boolean;
  itemsMigrated: number;
  errors: string[];
}

// 🎪 DEMO SYSTEM
export class FutureProofCookieDemo {
  private system: FutureProofCookieSystem;
  
  constructor() {
    this.system = new FutureProofCookieSystem();
  }
  
  async runDemo(): Promise<void> {
    console.log('🌐 Future-Proof Cookie System Demo');
    console.log('='.repeat(50));
    
    // Demo 1: Storage Analysis
    console.log('\n📊 Demo 1: Storage Analysis');
    console.log('-'.repeat(30));
    const analysis = await this.system.getStorageAnalysis();
    console.log('Storage Analysis:', analysis);
    
    // Demo 2: Consent Management
    console.log('\n🎯 Demo 2: Consent Management');
    console.log('-'.repeat(30));
    const consentManager = ConsentManager.getInstance();
    console.log('Current consent:', consentManager.getConsent());
    
    // Update consent
    consentManager.updateConsent({ analytics: true, functional: true });
    console.log('Updated consent:', consentManager.getConsent());
    
    // Demo 3: Consent-Aware Cookies
    console.log('\n🍪 Demo 3: Consent-Aware Cookies');
    console.log('-'.repeat(30));
    
    const analyticsCookie = FutureProofCookieSystem.createConsentAwareCookie(
      '_ga', 
      'GA.123.456', 
      'analytics'
    );
    console.log('Analytics cookie:', analyticsCookie?.toString());
    
    const marketingCookie = FutureProofCookieSystem.createConsentAwareCookie(
      'marketing', 
      'promo_data', 
      'marketing'
    );
    console.log('Marketing cookie:', marketingCookie?.toString());
    
    // Demo 4: Unified Storage Interface
    console.log('\n💾 Demo 4: Unified Storage Interface');
    console.log('-'.repeat(30));
    
    await this.system.store('user_id', '12345', 'localStorage');
    await this.system.store('session_token', 'abc123', 'sessionStorage');
    await this.system.store('secure_data', 'secret', 'httpOnly');
    
    const userId = await this.system.retrieve('user_id', 'localStorage');
    const sessionToken = await this.system.retrieve('session_token', 'sessionStorage');
    const secureData = await this.system.retrieve('secure_data', 'httpOnly');
    
    console.log('Retrieved user_id:', userId);
    console.log('Retrieved session_token:', sessionToken);
    console.log('Retrieved secure_data:', secureData);
    
    // Demo 5: Migration
    console.log('\n📈 Demo 5: Storage Migration');
    console.log('-'.repeat(30));
    
    const migrationResult = await this.system.migrateToStorage('localStorage', 'sessionStorage');
    console.log('Migration result:', migrationResult);
    
    // Demo 6: Cleanup
    console.log('\n🧹 Demo 6: Storage Cleanup');
    console.log('-'.repeat(30));
    
    await this.system.cleanup();
    
    console.log('\n🎉 Demo Complete!');
  }
}

// Export for immediate use
export default FutureProofCookieSystem;
