// Notification Service for Merchant Dashboard

export interface MerchantNotificationMessage {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  merchantId: string;
  disputeId?: string;
  createdAt: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface MerchantPushNotification {
  token: string;
  platform: 'ios' | 'android' | 'web';
  merchantId: string;
}

export interface MerchantEmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class MerchantNotificationService {
  private pushTokens = new Map<string, MerchantPushNotification[]>();
  private emailSettings = new Map<string, MerchantEmailSettings>();
  
  constructor() {
    this.initializeServices();
  }
  
  private initializeServices(): void {
    // Initialize push notification service
    this.setupPushService();
    
    // Initialize email service
    this.setupEmailService();
  }
  
  // Send real-time notification
  async sendMerchantNotification(notification: Omit<MerchantNotificationMessage, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const id = this.generateNotificationId();
    const fullNotification: MerchantNotificationMessage = {
      ...notification,
      id,
      createdAt: new Date(),
      read: false
    };
    
    // Store notification
    await this.storeNotification(fullNotification);
    
    // Send push notifications
    await this.sendPushNotifications(fullNotification);
    
    // Send email if enabled
    await this.sendEmailNotification(fullNotification);
    
    // Send WebSocket update
    await this.sendWebSocketUpdate(fullNotification);
    
    console.log(`📧 Notification sent: ${notification.title} to merchant ${notification.merchantId}`);
    return id;
  }
  
  // Send bulk notifications
  async sendMerchantBulkNotifications(notifications: Omit<MerchantNotificationMessage, 'id' | 'createdAt' | 'read'>[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const notification of notifications) {
      const id = await this.sendMerchantNotification(notification);
      ids.push(id);
    }
    
    return ids;
  }
  
  // Get notifications for merchant
  async getMerchantNotifications(merchantId: string, limit: number = 50, offset: number = 0): Promise<MerchantNotificationMessage[]> {
    // Mock implementation - would query database
    return [];
  }
  
  // Mark notification as read
  async markMerchantNotificationAsRead(notificationId: string, merchantId: string): Promise<void> {
    // Mock implementation - would update database
    console.log(`📖 Marked notification ${notificationId} as read`);
  }
  
  // Register push token
  async registerMerchantPushToken(token: MerchantPushNotification): Promise<void> {
    const merchantTokens = this.pushTokens.get(token.merchantId) || [];
    merchantTokens.push(token);
    this.pushTokens.set(token.merchantId, merchantTokens);
    
    console.log(`📱 Registered push token for merchant ${token.merchantId}`);
  }
  
  // Unregister push token
  async unregisterMerchantPushToken(merchantId: string, token: string): Promise<void> {
    const merchantTokens = this.pushTokens.get(merchantId) || [];
    const filtered = merchantTokens.filter(t => t.token !== token);
    this.pushTokens.set(merchantId, filtered);
    
    console.log(`📱 Unregistered push token for merchant ${merchantId}`);
  }
  
  // Configure email settings
  async configureMerchantEmailSettings(merchantId: string, settings: MerchantEmailSettings): Promise<void> {
    this.emailSettings.set(merchantId, settings);
    console.log(`⚙️ Configured email settings for merchant ${merchantId}`);
  }
  
  private async storeNotification(notification: MerchantNotificationMessage): Promise<void> {
    // Mock database storage
    console.log(`💾 Storing notification: ${notification.id}`);
  }
  
  private async sendPushNotifications(notification: MerchantNotificationMessage): Promise<void> {
    const tokens = this.pushTokens.get(notification.merchantId) || [];
    
    for (const tokenData of tokens) {
      try {
        await this.sendPushNotification(tokenData, notification);
      } catch (error) {
        console.error(`Failed to send push to ${tokenData.token}:`, error);
      }
    }
  }
  
  private async sendPushNotification(token: MerchantPushNotification, notification: MerchantNotificationMessage): Promise<void> {
    const payload = {
      to: token.token,
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
        merchantId: notification.merchantId,
        disputeId: notification.disputeId,
        type: notification.type.toLowerCase()
      },
      priority: 'high',
      sound: 'default'
    };
    
    // Mock push notification sending
    console.log(`📱 Sending push to ${token.platform}:`, payload);
  }
  
  private async sendEmailNotification(notification: MerchantNotificationMessage): Promise<void> {
    const settings = this.emailSettings.get(notification.merchantId);
    if (!settings || !settings.enabled) {
      return;
    }
    
    const email: MerchantEmailNotification = {
      to: settings.email,
      subject: `FactoryWager: ${notification.title}`,
      template: this.getEmailTemplate(notification.type),
      data: {
        merchantName: settings.merchantName,
        title: notification.title,
        message: notification.message,
        disputeId: notification.disputeId,
        createdAt: notification.createdAt.toLocaleString()
      }
    };
    
    await this.sendEmail(email);
  }
  
  private async sendEmail(email: MerchantEmailNotification): Promise<void> {
    // Mock email sending
    console.log(`📧 Sending email to ${email.to}:`, email);
  }
  
  private async sendWebSocketUpdate(notification: MerchantNotificationMessage): Promise<void> {
    // Mock WebSocket broadcast
    console.log(`🔌 Broadcasting WebSocket update for notification ${notification.id}`);
  }
  
  private getEmailTemplate(type: string): string {
    const templates = {
      'INFO': 'notification-info',
      'SUCCESS': 'notification-success',
      'WARNING': 'notification-warning',
      'ERROR': 'notification-error'
    };
    
    return templates[type] || 'notification-default';
  }
  
  private setupPushService(): void {
    console.log('🔧 Setting up push notification service');
  }
  
  private setupEmailService(): void {
    console.log('🔧 Setting up email service');
  }
  
  private generateNotificationId(): string {
    return `merchant_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface MerchantEmailSettings {
  enabled: boolean;
  email: string;
  merchantName: string;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  types: string[];
}
