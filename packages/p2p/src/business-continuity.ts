// lib/p2p/business-continuity.ts — Business continuity for P2P proxy migrations

import Redis from 'ioredis';

const redis = new Redis(Bun.env.REDIS_URL ?? 'redis://localhost:6379', {
  retryStrategy: times => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

export interface BrandingConfig {
  logoUrl?: string; // URL to logo image
  logoText?: string; // Text to display if no logo (defaults to first letter)
  primaryColor: string; // Primary brand color (hex)
  secondaryColor?: string; // Secondary color
  accentColor?: string; // Accent color
  backgroundColor?: string; // Background color/gradient
  fontFamily?: string; // Custom font family
  faviconUrl?: string; // Favicon URL
  theme?: 'light' | 'dark' | 'auto';
}

export interface BusinessSpecialty {
  type:
    | 'barbershop'
    | 'coffee'
    | 'gym'
    | 'restaurant'
    | 'bookstore'
    | 'retail'
    | 'service'
    | 'other';
  services?: string[]; // For barbershop/service businesses
  menuItems?: string[]; // For restaurants/coffee shops
  membershipTiers?: { name: string; price: string }[]; // For gyms/membership businesses
  categories?: string[]; // For bookstores/retail
  specialties?: string[]; // General specialties
  hours?: string; // Business hours
  popularItems?: string[]; // Popular items/services
  pricing?: { item: string; price: string }[]; // Price list
}

export interface BusinessIdentity {
  name: string;
  alias: string; // Primary handle (e.g., "HaircutPro")
  startDate: string;
  endDate?: string; // null if active
  paymentHandles: {
    cashapp: string;
    venmo: string;
    paypal: string;
  };
  location?: string;
  contact: string;
  branding?: BrandingConfig; // Extended branding configuration
  specialty?: BusinessSpecialty; // Business-specific details
}

export interface MigrationData {
  name: string;
  alias: string;
  reason: 'rename' | 'relocation' | 'rebrand' | 'closure';
  forwardPayments?: boolean;
  forwardDays?: number;
}

export class BusinessContinuity {
  /**
   * Register a new business identity
   */
  static async registerBusinessIdentity(businessData: BusinessIdentity): Promise<string> {
    const businessId = Bun.hash(businessData.name + businessData.alias)
      .toString(16)
      .substring(0, 16);
    const now = new Date().toISOString();

    // Store the business identity
    await redis.hmset(`business:${businessId}`, [
      'name',
      businessData.name,
      'alias',
      businessData.alias,
      'startDate',
      businessData.startDate,
      'endDate',
      businessData.endDate || '',
      'current',
      businessData.endDate ? 'false' : 'true',
      'contact',
      businessData.contact,
      'location',
      businessData.location || '',
      'paymentHandles',
      JSON.stringify(businessData.paymentHandles),
      'branding',
      businessData.branding ? JSON.stringify(businessData.branding) : '',
      'specialty',
      businessData.specialty ? JSON.stringify(businessData.specialty) : '',
    ]);

    // Create alias mapping (aliases never change)
    await redis.hset(`alias:${businessData.alias}`, 'businessId', businessId);

    // Store all historical aliases for this business
    await redis.sadd(`business:${businessId}:aliases`, businessData.alias);

    console.log(`🏢 Registered business: ${businessData.name} (${businessData.alias})`);
    return businessId;
  }

  /**
   * Handle business migration/renaming
   */
  static async migrateBusiness(
    oldAlias: string,
    newBusinessData: MigrationData
  ): Promise<{
    oldBusinessId: string;
    newBusinessId: string;
    redirectSetup: boolean;
  }> {
    // 1. Mark old business as inactive
    const oldBusinessId = await redis.hget(`alias:${oldAlias}`, 'businessId');
    if (!oldBusinessId) throw new Error('Old business not found');

    const oldBusiness = await redis.hgetall(`business:${oldBusinessId}`);
    if (!oldBusiness || !oldBusiness.name) {
      throw new Error('Old business data not found');
    }

    await redis.hset(`business:${oldBusinessId}`, [
      'endDate',
      new Date().toISOString(),
      'current',
      'false',
      'migratedTo',
      newBusinessData.alias,
      'migrationReason',
      newBusinessData.reason,
    ]);

    // 2. Create new business identity
    const newBusinessId = await this.registerBusinessIdentity({
      name: newBusinessData.name,
      alias: newBusinessData.alias,
      startDate: new Date().toISOString(),
      paymentHandles: JSON.parse(oldBusiness.paymentHandles || '{}'), // Keep same or update
      contact: oldBusiness.contact || '',
      location: oldBusiness.location || '',
    });

    // 3. Set up payment forwarding if needed
    let redirectSetup = false;
    if (newBusinessData.forwardPayments) {
      await this.setupPaymentForwarding(
        oldAlias,
        newBusinessData.alias,
        newBusinessData.forwardDays || 90
      );
      redirectSetup = true;
    }

    // 4. Notify existing customers (stored in habits data)
    await this.notifyCustomersOfChange(
      oldBusinessId,
      newBusinessData.alias,
      newBusinessData.reason
    );

    return { oldBusinessId, newBusinessId, redirectSetup };
  }

  /**
   * Smart payment routing that handles old aliases
   */
  static async getCurrentPaymentHandles(alias: string): Promise<{
    handles: {
      cashapp: string;
      venmo: string;
      paypal: string;
    };
    branding?: BrandingConfig;
    isActive: boolean;
    redirectTo?: string;
    message?: string;
  }> {
    // Check if this alias exists
    const businessId = await redis.hget(`alias:${alias}`, 'businessId');
    if (!businessId) {
      throw new Error(`Business alias "${alias}" not found`);
    }

    const business = await redis.hgetall(`business:${businessId}`);
    if (!business || !business.paymentHandles) {
      throw new Error(`Business data not found for alias "${alias}"`);
    }

    const isActive = business.current === 'true';
    const branding = business.branding ? JSON.parse(business.branding) : undefined;

    // Check if this business has been migrated
    if (!isActive && business.migratedTo) {
      // Get current handles from migrated business
      const newBusinessId = await redis.hget(`alias:${business.migratedTo}`, 'businessId');
      if (newBusinessId) {
        const newBusiness = await redis.hgetall(`business:${newBusinessId}`);
        if (newBusiness && newBusiness.paymentHandles) {
          const newBranding = newBusiness.branding ? JSON.parse(newBusiness.branding) : undefined;
          return {
            handles: JSON.parse(newBusiness.paymentHandles),
            branding: newBranding,
            isActive: false,
            redirectTo: business.migratedTo,
            message: `This business has moved to ${business.migratedTo}`,
          };
        }
      }
    }

    return {
      handles: JSON.parse(business.paymentHandles),
      branding,
      isActive,
      message: isActive ? undefined : 'This business is no longer active',
    };
  }

  /**
   * Setup automatic forwarding for old payments
   */
  private static async setupPaymentForwarding(
    oldAlias: string,
    newAlias: string,
    days: number
  ): Promise<void> {
    const forwardingKey = `forward:${oldAlias}`;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await redis.hmset(forwardingKey, [
      'to',
      newAlias,
      'expiresAt',
      expiresAt,
      'setupAt',
      new Date().toISOString(),
    ]);

    // Set expiration on the forwarding rule
    await redis.expire(forwardingKey, days * 24 * 60 * 60);

    console.log(`🔄 Payment forwarding: ${oldAlias} → ${newAlias} (${days} days)`);
  }

  /**
   * Notify customers who have paid before
   */
  private static async notifyCustomersOfChange(
    oldBusinessId: string,
    newAlias: string,
    reason: string
  ): Promise<string[]> {
    // Find all customers who have transacted with this business
    const customerKeys = await redis.keys(`habits:*`);

    const messages: string[] = [];
    for (const key of customerKeys.slice(0, 100)) {
      // Limit to 100 for demo
      const habits = await redis.hgetall(key);
      if (habits?.businessId === oldBusinessId || habits?.lastBusiness === oldBusinessId) {
        const stealthId = key.replace('habits:', '');

        // Store notification for customer
        await redis.lpush(
          `notifications:${stealthId}`,
          JSON.stringify({
            type: 'business_change',
            oldBusinessId,
            newAlias,
            reason,
            timestamp: new Date().toISOString(),
            read: false,
          })
        );

        messages.push(stealthId);
      }
    }

    console.log(`📢 Notified ${messages.length} customers of business change`);
    return messages;
  }

  /**
   * Check if forwarding is active for an alias
   */
  static async getForwardingInfo(alias: string): Promise<{
    to?: string;
    expiresAt?: string;
    isActive: boolean;
  }> {
    const forwarding = await redis.hgetall(`forward:${alias}`);

    if (!forwarding || !forwarding.to) {
      return { isActive: false };
    }

    const expiresAt = forwarding.expiresAt ? new Date(forwarding.expiresAt) : null;
    const isActive = expiresAt ? expiresAt > new Date() : true;

    return {
      to: forwarding.to,
      expiresAt: forwarding.expiresAt,
      isActive,
    };
  }

  /**
   * List all businesses
   */
  static async listBusinesses(): Promise<any[]> {
    const businessKeys = await redis.keys('business:*');
    const businesses: any[] = [];

    for (const key of businessKeys) {
      if (key.includes(':aliases') || key.includes(':')) {
        const parts = key.split(':');
        if (parts.length === 2) {
          const businessId = parts[1];
          const business = await redis.hgetall(key);
          if (business && business.name) {
            businesses.push({
              id: businessId,
              ...business,
              paymentHandles: business.paymentHandles ? JSON.parse(business.paymentHandles) : {},
            });
          }
        }
      }
    }

    return businesses;
  }

  /**
   * Get business statistics
   */
  static async getBusinessStats(alias: string): Promise<{
    alias: string;
    businessId: string | null;
    totalPayments: number;
    totalRevenue: number;
    recentPayments: any[];
  }> {
    const businessId = await redis.hget(`alias:${alias}`, 'businessId');
    if (!businessId) {
      throw new Error('Business not found');
    }

    // Get all payments for this business
    const paymentKeys = await redis.keys(`payment:*`);
    const payments: any[] = [];
    let total = 0;

    for (const key of paymentKeys.slice(0, 200)) {
      const payment = await redis.hgetall(key);
      if (payment && payment.businessAlias === alias) {
        payments.push(payment);
        total += parseFloat(payment.amount || '0');
      }
    }

    return {
      alias,
      businessId,
      totalPayments: payments.length,
      totalRevenue: total,
      recentPayments: payments.slice(0, 10),
    };
  }
}
