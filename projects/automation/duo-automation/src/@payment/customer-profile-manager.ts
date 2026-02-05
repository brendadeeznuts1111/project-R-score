#!/usr/bin/env bun

/**
 * Customer Profile Management System
 * 
 * ACME-approved customer profile system for FactoryWager family payments
 * with payment preferences, transaction history, and smart recommendations.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface CustomerProfile {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  avatar?: string;
  familyIds: string[];
  paymentPreferences: PaymentPreferences;
  transactionHistory: TransactionSummary[];
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
}

interface PaymentPreferences {
  defaultMethod?: PaymentMethod['type'];
  enabledMethods: PaymentMethod['type'][];
  preferredRecipient?: string;
  autoApproveFamilyPayments: boolean;
  paymentLimits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  quickAmounts: number[];
  recentRecipients: RecentRecipient[];
}

interface PaymentMethod {
  type: 'cashapp' | 'venmo' | 'crypto' | 'factory-wager';
  identifier: string;
  displayName: string;
  verified: boolean;
  isDefault: boolean;
}

interface TransactionSummary {
  id: string;
  intentId: string;
  amount: number;
  currency: string;
  description: string;
  recipientId: string;
  recipientName: string;
  method: PaymentMethod['type'];
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  familyId: string;
}

interface RecentRecipient {
  id: string;
  name: string;
  familyId: string;
  lastPaymentDate: Date;
  paymentCount: number;
  totalAmount: number;
  favoriteAmount?: number;
}

interface CustomerQuery {
  email?: string;
  phone?: string;
  familyId?: string;
  status?: CustomerProfile['status'];
  activeSince?: Date;
  limit?: number;
  offset?: number;
}

interface SmartRecommendation {
  recipientId: string;
  recipientName: string;
  familyId: string;
  confidence: number;
  reason: string;
  suggestedAmount?: number;
}

class CustomerProfileManager {
  private static readonly STORAGE_FILE = 'data/customer-profiles.json';
  private static readonly MAX_RECENT_RECIPIENTS = 10;
  private static readonly MAX_QUICK_AMOUNTS = 8;

  /**
   * Create new customer profile
   */
  static async createProfile(params: {
    email?: string;
    phone?: string;
    name: string;
    familyIds: string[];
    avatar?: string;
    paymentPreferences?: Partial<PaymentPreferences>;
  }): Promise<CustomerProfile> {
    
    const customerId = randomUUID();
    const now = new Date();

    const profile: CustomerProfile = {
      id: customerId,
      email: params.email,
      phone: params.phone,
      name: params.name,
      avatar: params.avatar,
      familyIds: params.familyIds,
      paymentPreferences: {
        defaultMethod: 'factory-wager',
        enabledMethods: ['factory-wager', 'cashapp', 'venmo'],
        autoApproveFamilyPayments: true,
        paymentLimits: {
          daily: 500,
          weekly: 2000,
          monthly: 5000
        },
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        quickAmounts: [5, 10, 20, 25, 50],
        recentRecipients: [],
        ...params.paymentPreferences
      },
      transactionHistory: [],
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      status: 'active'
    };

    await this.saveProfile(profile);
    console.log(`👤 Created customer profile: ${customerId} for ${params.name}`);

    return profile;
  }

  /**
   * Get customer profile by ID
   */
  static async getProfile(customerId: string): Promise<CustomerProfile | null> {
    const profiles = await this.loadProfiles();
    return profiles[customerId] || null;
  }

  /**
   * Get customer profile by email or phone
   */
  static async getProfileByEmailOrPhone(emailOrPhone: string): Promise<CustomerProfile | null> {
    const profiles = await this.loadProfiles();
    
    for (const profile of Object.values(profiles)) {
      if (profile.email === emailOrPhone || profile.phone === emailOrPhone) {
        return profile;
      }
    }
    
    return null;
  }

  /**
   * Update customer profile
   */
  static async updateProfile(
    customerId: string,
    updates: Partial<CustomerProfile>
  ): Promise<CustomerProfile> {
    
    const profile = await this.getProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    Object.assign(profile, updates, {
      updatedAt: new Date(),
      lastActiveAt: new Date()
    });

    await this.saveProfile(profile);
    console.log(`🔄 Updated customer profile: ${customerId}`);

    return profile;
  }

  /**
   * Add transaction to customer history
   */
  static async addTransaction(
    customerId: string,
    transaction: TransactionSummary
  ): Promise<CustomerProfile> {
    
    const profile = await this.getProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Add to transaction history
    profile.transactionHistory.unshift(transaction);
    
    // Keep only last 100 transactions
    if (profile.transactionHistory.length > 100) {
      profile.transactionHistory = profile.transactionHistory.slice(0, 100);
    }

    // Update recent recipients
    await this.updateRecentRecipients(profile, transaction);

    // Update last active
    profile.lastActiveAt = new Date();
    profile.updatedAt = new Date();

    await this.saveProfile(profile);
    console.log(`💰 Added transaction to profile: ${customerId}`);

    return profile;
  }

  /**
   * Update payment preferences
   */
  static async updatePaymentPreferences(
    customerId: string,
    preferences: Partial<PaymentPreferences>
  ): Promise<CustomerProfile> {
    
    const profile = await this.getProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    profile.paymentPreferences = {
      ...profile.paymentPreferences,
      ...preferences
    };

    profile.updatedAt = new Date();
    profile.lastActiveAt = new Date();

    await this.saveProfile(profile);
    console.log(`⚙️ Updated payment preferences: ${customerId}`);

    return profile;
  }

  /**
   * Add payment method to profile
   */
  static async addPaymentMethod(
    customerId: string,
    method: Omit<PaymentMethod, 'isDefault'>
  ): Promise<CustomerProfile> {
    
    const profile = await this.getProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    // Check if method already exists
    const existingMethod = profile.paymentPreferences.enabledMethods.find(m => m === method.type);
    if (!existingMethod) {
      profile.paymentPreferences.enabledMethods.push(method.type);
    }

    profile.updatedAt = new Date();
    profile.lastActiveAt = new Date();

    await this.saveProfile(profile);
    console.log(`💳 Added payment method: ${method.type} to ${customerId}`);

    return profile;
  }

  /**
   * Get smart recommendations for customer
   */
  static async getSmartRecommendations(
    customerId: string,
    familyId?: string
  ): Promise<SmartRecommendation[]> {
    
    const profile = await this.getProfile(customerId);
    if (!profile) {
      return [];
    }

    const recommendations: SmartRecommendation[] = [];

    // Recent recipients with high frequency
    for (const recipient of profile.paymentPreferences.recentRecipients.slice(0, 5)) {
      if (!familyId || recipient.familyId === familyId) {
        const confidence = Math.min(0.9, recipient.paymentCount / 10);
        recommendations.push({
          recipientId: recipient.id,
          recipientName: recipient.name,
          familyId: recipient.familyId,
          confidence,
          reason: `Paid ${recipient.paymentCount} times recently`,
          suggestedAmount: recipient.favoriteAmount
        });
      }
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);

    return recommendations.slice(0, 5);
  }

  /**
   * Get customer statistics
   */
  static async getStatistics(customerId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    averageAmount: number;
    favoriteRecipient?: string;
    preferredMethod: PaymentMethod['type'];
    activeFamilies: string[];
  }> {
    
    const profile = await this.getProfile(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    const completedTransactions = profile.transactionHistory.filter(t => t.status === 'completed');
    const totalTransactions = completedTransactions.length;
    const totalAmount = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Find favorite recipient
    const recipientCounts = new Map<string, { count: number; name: string }>();
    for (const transaction of completedTransactions) {
      const current = recipientCounts.get(transaction.recipientId) || { count: 0, name: transaction.recipientName };
      recipientCounts.set(transaction.recipientId, {
        count: current.count + 1,
        name: current.name
      });
    }

    let favoriteRecipient;
    let maxCount = 0;
    for (const [id, data] of recipientCounts) {
      if (data.count > maxCount) {
        maxCount = data.count;
        favoriteRecipient = data.name;
      }
    }

    // Find preferred method
    const methodCounts = new Map<PaymentMethod['type'], number>();
    for (const transaction of completedTransactions) {
      methodCounts.set(transaction.method, (methodCounts.get(transaction.method) || 0) + 1);
    }

    let preferredMethod: PaymentMethod['type'] = 'factory-wager';
    let methodMaxCount = 0;
    for (const [method, count] of methodCounts) {
      if (count > methodMaxCount) {
        methodMaxCount = count;
        preferredMethod = method;
      }
    }

    return {
      totalTransactions,
      totalAmount,
      averageAmount,
      favoriteRecipient,
      preferredMethod,
      activeFamilies: profile.familyIds
    };
  }

  /**
   * Query customer profiles
   */
  static async queryProfiles(query: CustomerQuery): Promise<CustomerProfile[]> {
    const profiles = await this.loadProfiles();
    let results = Object.values(profiles);

    // Apply filters
    if (query.email) {
      results = results.filter(p => p.email === query.email);
    }

    if (query.phone) {
      results = results.filter(p => p.phone === query.phone);
    }

    if (query.familyId) {
      results = results.filter(p => p.familyIds.includes(query.familyId!));
    }

    if (query.status) {
      results = results.filter(p => p.status === query.status);
    }

    if (query.activeSince) {
      results = results.filter(p => p.createdAt >= query.activeSince!);
    }

    // Sort by last active (most recent first)
    results.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Update recent recipients
   */
  private static async updateRecentRecipients(
    profile: CustomerProfile,
    transaction: TransactionSummary
  ): Promise<void> {
    
    const existingIndex = profile.paymentPreferences.recentRecipients.findIndex(
      r => r.id === transaction.recipientId
    );

    const recipientData: RecentRecipient = {
      id: transaction.recipientId,
      name: transaction.recipientName,
      familyId: transaction.familyId,
      lastPaymentDate: transaction.timestamp,
      paymentCount: 1,
      totalAmount: transaction.amount
    };

    if (existingIndex >= 0) {
      // Update existing recipient
      const existing = profile.paymentPreferences.recentRecipients[existingIndex];
      recipientData.paymentCount = existing.paymentCount + 1;
      recipientData.totalAmount = existing.totalAmount + transaction.amount;
      recipientData.favoriteAmount = existing.favoriteAmount || transaction.amount;
      
      profile.paymentPreferences.recentRecipients[existingIndex] = recipientData;
      
      // Move to front
      profile.paymentPreferences.recentRecipients.splice(existingIndex, 1);
      profile.paymentPreferences.recentRecipients.unshift(recipientData);
    } else {
      // Add new recipient
      profile.paymentPreferences.recentRecipients.unshift(recipientData);
    }

    // Keep only recent recipients
    if (profile.paymentPreferences.recentRecipients.length > this.MAX_RECENT_RECIPIENTS) {
      profile.paymentPreferences.recentRecipients = profile.paymentPreferences.recentRecipients.slice(0, this.MAX_RECENT_RECIPIENTS);
    }
  }

  /**
   * Load all profiles from storage
   */
  private static async loadProfiles(): Promise<Record<string, CustomerProfile>> {
    try {
      if (!existsSync(this.STORAGE_FILE)) {
        return {};
      }
      const data = readFileSync(this.STORAGE_FILE, 'utf-8');
      const profiles = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const profile of Object.values(profiles)) {
        const p = profile as any;
        p.createdAt = new Date(p.createdAt);
        p.updatedAt = new Date(p.updatedAt);
        p.lastActiveAt = new Date(p.lastActiveAt);
        
        if (p.transactionHistory) {
          p.transactionHistory = p.transactionHistory.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }));
        }
        
        if (p.paymentPreferences?.recentRecipients) {
          p.paymentPreferences.recentRecipients = p.paymentPreferences.recentRecipients.map((r: any) => ({
            ...r,
            lastPaymentDate: new Date(r.lastPaymentDate)
          }));
        }
      }
      
      return profiles;
    } catch (error) {
      console.error('Failed to load customer profiles:', error);
      return {};
    }
  }

  /**
   * Save profile to storage
   */
  private static async saveProfile(profile: CustomerProfile): Promise<void> {
    const profiles = await this.loadProfiles();
    profiles[profile.id] = profile;
    await this.saveAllProfiles(profiles);
  }

  /**
   * Save all profiles to storage
   */
  private static async saveAllProfiles(profiles: Record<string, CustomerProfile>): Promise<void> {
    try {
      // Ensure data directory exists
      if (!existsSync('data')) {
        await require('fs').promises.mkdir('data', { recursive: true });
      }
      
      writeFileSync(this.STORAGE_FILE, JSON.stringify(profiles, null, 2));
    } catch (error) {
      console.error('Failed to save customer profiles:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const customerId = process.argv[3];

  switch (command) {
    case 'create':
      CustomerProfileManager.createProfile({
        name: 'John Doe',
        email: 'john@example.com',
        familyIds: ['FAM123']
      }).then(profile => {
        console.log('✅ Created profile:', profile.id);
        console.log(`Name: ${profile.name}`);
        console.log(`Email: ${profile.email}`);
        console.log(`Families: ${profile.familyIds.join(', ')}`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'get':
      if (customerId) {
        CustomerProfileManager.getProfile(customerId).then(profile => {
          if (profile) {
            console.log('👤 Profile Details:');
            console.log(`ID: ${profile.id}`);
            console.log(`Name: ${profile.name}`);
            console.log(`Email: ${profile.email}`);
            console.log(`Status: ${profile.status}`);
            console.log(`Transactions: ${profile.transactionHistory.length}`);
            console.log(`Last Active: ${profile.lastActiveAt.toISOString()}`);
          } else {
            console.log('❌ Profile not found');
          }
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'stats':
      if (customerId) {
        CustomerProfileManager.getStatistics(customerId).then(stats => {
          console.log('📊 Customer Statistics:');
          console.log(`Total Transactions: ${stats.totalTransactions}`);
          console.log(`Total Amount: $${stats.totalAmount.toFixed(2)}`);
          console.log(`Average Amount: $${stats.averageAmount.toFixed(2)}`);
          console.log(`Favorite Recipient: ${stats.favoriteRecipient || 'None'}`);
          console.log(`Preferred Method: ${stats.preferredMethod}`);
          console.log(`Active Families: ${stats.activeFamilies.join(', ')}`);
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'recommendations':
      if (customerId) {
        CustomerProfileManager.getSmartRecommendations(customerId).then(recs => {
          console.log('🤖 Smart Recommendations:');
          recs.forEach(rec => {
            console.log(`  ${rec.recipientName} (${rec.familyId}) - ${Math.round(rec.confidence * 100)}% confidence`);
            console.log(`    Reason: ${rec.reason}`);
            if (rec.suggestedAmount) {
              console.log(`    Suggested Amount: $${rec.suggestedAmount}`);
            }
          });
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    default:
      console.log(`
👤 Customer Profile Management System

Usage:
  profile-manager create                    - Create new profile
  profile-manager get <customerId>          - Get profile details
  profile-manager stats <customerId>        - Get customer statistics
  profile-manager recommendations <customerId> - Get smart recommendations

Features:
✅ Customer profile management
✅ Payment preferences and history
✅ Smart recommendations
✅ Transaction tracking
✅ ACME-approved data management
      `);
  }
}

export default CustomerProfileManager;
