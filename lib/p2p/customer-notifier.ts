// lib/p2p/customer-notifier.ts — Customer notification system for business changes

import Redis from 'ioredis';

const redis = new Redis(Bun.env.REDIS_URL ?? 'redis://localhost:6379', {
  retryStrategy: times => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

export interface NotificationPreferences {
  email?: string;
  phone?: string;
  businessChanges: boolean;
  paymentConfirmations: boolean;
  promotions: boolean;
}

export class CustomerNotifier {
  /**
   * Send notification when business changes
   */
  static async notifyPaymentToOldBusiness(
    stealthId: string,
    oldAlias: string,
    newAlias: string,
    amount: number
  ): Promise<void> {
    // Store notification
    await redis.lpush(
      `notifications:${stealthId}`,
      JSON.stringify({
        id: crypto.randomUUID(),
        type: 'payment_to_old_address',
        title: 'Business Name Updated',
        message: `You sent $${amount} to ${oldAlias}. This business is now ${newAlias}.`,
        oldAlias,
        newAlias,
        amount,
        timestamp: new Date().toISOString(),
        read: false,
        action: {
          type: 'update_payment_link',
          url: `/pay?alias=${newAlias}&amount=${amount}`,
        },
      })
    );

    // Send immediate notification if customer has contact info
    const contact = await redis.hget(`customer:${stealthId}`, 'contact');
    if (contact) {
      await this.sendImmediateNotification(contact, {
        oldAlias,
        newAlias,
        amount,
      });
    }
  }

  /**
   * Set customer notification preferences
   */
  static async setNotificationPreferences(
    stealthId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    await redis.hmset(`prefs:${stealthId}`, [
      'email',
      preferences.email || '',
      'phone',
      preferences.phone || '',
      'businessChanges',
      preferences.businessChanges ? 'true' : 'false',
      'paymentConfirmations',
      preferences.paymentConfirmations ? 'true' : 'false',
      'promotions',
      preferences.promotions ? 'true' : 'false',
    ]);
  }

  /**
   * Get customer notification preferences
   */
  static async getNotificationPreferences(
    stealthId: string
  ): Promise<NotificationPreferences | null> {
    const prefs = await redis.hgetall(`prefs:${stealthId}`);
    if (!prefs || Object.keys(prefs).length === 0) {
      return null;
    }

    return {
      email: prefs.email || undefined,
      phone: prefs.phone || undefined,
      businessChanges: prefs.businessChanges === 'true',
      paymentConfirmations: prefs.paymentConfirmations === 'true',
      promotions: prefs.promotions === 'true',
    };
  }

  /**
   * Generate customer portal data
   */
  static async generateCustomerPortal(stealthId: string): Promise<{
    stealthId: string;
    unreadNotifications: number;
    recentNotifications: any[];
    notificationPreferences: NotificationPreferences | null;
    subscribedBusinesses: string[];
    lastUpdated: string;
  }> {
    const notifications = await redis.lrange(`notifications:${stealthId}`, 0, 20);
    const parsed = notifications.map(n => JSON.parse(n));

    const preferences = await this.getNotificationPreferences(stealthId);

    // Get all businesses this customer has paid
    const paymentKeys = await redis.keys(`payment:*`);
    const businesses = new Set<string>();

    for (const key of paymentKeys.slice(0, 100)) {
      const payment = await redis.hgetall(key);
      if (payment && payment.stealthId === stealthId && payment.businessAlias) {
        businesses.add(payment.businessAlias);
      }
    }

    return {
      stealthId,
      unreadNotifications: parsed.filter(n => !n.read).length,
      recentNotifications: parsed.slice(0, 5),
      notificationPreferences: preferences,
      subscribedBusinesses: Array.from(businesses),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(stealthId: string, notificationId: string): Promise<void> {
    const notifications = await redis.lrange(`notifications:${stealthId}`, 0, 50);

    for (let i = 0; i < notifications.length; i++) {
      const notif = JSON.parse(notifications[i]);
      if (notif.id === notificationId) {
        notif.read = true;
        await redis.lset(`notifications:${stealthId}`, i, JSON.stringify(notif));
        break;
      }
    }
  }

  /**
   * Send immediate notification (email/SMS)
   */
  private static async sendImmediateNotification(
    contact: string,
    data: { oldAlias: string; newAlias: string; amount: number }
  ): Promise<void> {
    // In production, integrate with email/SMS service
    console.log(`📧 Would send notification to ${contact}:`, data);

    // Store for async processing
    await redis.lpush(
      'notification_queue',
      JSON.stringify({
        contact,
        type: 'business_change',
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Get all notifications for a customer
   */
  static async getNotifications(stealthId: string, limit: number = 20): Promise<any[]> {
    const notifications = await redis.lrange(`notifications:${stealthId}`, 0, limit - 1);
    return notifications.map(n => JSON.parse(n));
  }

  /**
   * Create a notification
   */
  static async createNotification(
    stealthId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      action?: { type: string; url: string };
      data?: any;
    }
  ): Promise<void> {
    await redis.lpush(
      `notifications:${stealthId}`,
      JSON.stringify({
        id: crypto.randomUUID(),
        ...notification,
        timestamp: new Date().toISOString(),
        read: false,
      })
    );
  }
}
