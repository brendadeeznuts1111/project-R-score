/**
 * 📊 Analytics for Business Intelligence - FactoryWager Venmo Family System
 * Production-grade analytics, metrics, and business intelligence
 */

import { Redis } from '@upstash/redis';
import * as Sentry from '@sentry/nextjs';

/**
 * 📊 Payment Analytics Interface
 */
export interface PaymentAnalytics {
  provider: string;
  amount: number;
  participantCount: number;
  familyId: string;
  userId: string;
  timestamp: number;
  type: 'payment_sent' | 'payment_received' | 'qr_payment' | 'sms_payment';
  status: 'success' | 'failed' | 'pending';
  processingTime: number;
}

/**
 * 📊 Family Analytics Interface
 */
export interface FamilyAnalytics {
  familyId: string;
  memberCount: number;
  totalVolume: number;
  transactionCount: number;
  averageTransaction: number;
  topSpender: string;
  mostActiveDay: string;
  lastActivity: number;
}

/**
 * 📊 User Analytics Interface
 */
export interface UserAnalytics {
  userId: string;
  familyId: string;
  totalSent: number;
  totalReceived: number;
  transactionCount: number;
  averageAmount: number;
  preferredMethod: string;
  lastActivity: number;
  riskScore: number;
}

/**
 * 📊 Real-time Dashboard Data
 */
export interface RealtimeDashboard {
  totalProcessed: number;
  averagePayment: number;
  topPayer: string;
  activeFamilies: number;
  currentHourVolume: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
}

/**
 * 📊 Analytics Manager
 */
export class AnalyticsManager {
  private redis: Redis;
  private realtimeData: RealtimeDashboard;

  constructor() {
    this.redis = Redis.fromEnv();
    this.realtimeData = {
      totalProcessed: 0,
      averagePayment: 0,
      topPayer: '',
      activeFamilies: 0,
      currentHourVolume: 0,
      errorRate: 0,
      responseTime: 0,
      uptime: 99.9
    };
  }

  /**
   * 📊 Track payment event
   */
  async trackPayment(payment: PaymentAnalytics): Promise<void> {
    try {
      const timestamp = Date.now();
      const date = new Date(timestamp).toISOString().split('T')[0];
      const hour = new Date(timestamp).getHours();
      
      // Track to analytics service (this would integrate with your analytics provider)
      await this.trackToAnalyticsService('payment_received', {
        provider: payment.provider,
        amount: payment.amount,
        participantCount: payment.participantCount,
        familyId: payment.familyId,
        type: payment.type,
        status: payment.status,
        processingTime: payment.processingTime
      });
      
      // Update real-time dashboard
      await this.updateRealtimeDashboard(payment);
      
      // Store in Redis for BI queries
      await this.storePaymentMetrics(payment, date, hour);
      
      // Update family analytics
      await this.updateFamilyAnalytics(payment);
      
      // Update user analytics
      await this.updateUserAnalytics(payment);
      
      // Track business metrics
      await this.trackBusinessMetrics(payment);
    } catch (error) {
      console.error('Error tracking payment:', error);
      Sentry.captureException(error, {
        tags: { analytics_type: 'payment_tracking' },
        extra: { payment }
      });
    }
  }

  /**
   * 📊 Track to analytics service
   */
  private async trackToAnalyticsService(event: string, properties: any): Promise<void> {
    // This would integrate with services like:
    // - Segment
    // - Mixpanel
    // - Amplitude
    // - Google Analytics
    // - Custom analytics dashboard
    
    console.log(`Analytics Event: ${event}`, properties);
    
    // Example with Segment:
    /*
    analytics.track({
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
    */
  }

  /**
   * 📊 Update real-time dashboard
   */
  private async updateRealtimeDashboard(payment: PaymentAnalytics): Promise<void> {
    // Update total processed
    this.realtimeData.totalProcessed += payment.amount;
    
    // Update average payment
    const totalPayments = await this.redis.incr('dashboard:total_payments');
    const totalAmount = (await this.redis.get('dashboard:total_amount') || '0');
    this.realtimeData.averagePayment = parseFloat(totalAmount) / totalPayments;
    
    // Update top payer
    const currentTop = await this.redis.get('dashboard:top_payer');
    if (!currentTop || payment.amount > parseFloat(currentTop)) {
      this.realtimeData.topPayer = payment.userId;
      await this.redis.set('dashboard:top_payer', payment.amount.toString());
    }
    
    // Update current hour volume
    const hourKey = `dashboard:hour:${new Date().getHours()}`;
    await this.redis.incrby(hourKey, payment.amount);
    await this.redis.expire(hourKey, 3600);
    
    // Store updated dashboard data
    await this.redis.setex('dashboard:realtime', 300, JSON.stringify(this.realtimeData));
  }

  /**
   * 📊 Store payment metrics
   */
  private async storePaymentMetrics(payment: PaymentAnalytics, date: string, hour: number): Promise<void> {
    // Daily metrics
    const dailyKey = `analytics:daily:${date}`;
    await this.redis.hincrby(dailyKey, 'total_amount', payment.amount);
    await this.redis.hincrby(dailyKey, 'total_transactions', 1);
    await this.redis.hincrby(dailyKey, `${payment.provider}_amount`, payment.amount);
    await this.redis.hincrby(dailyKey, `${payment.provider}_count`, 1);
    await this.redis.expire(dailyKey, 86400 * 30); // 30 days
    
    // Hourly metrics
    const hourlyKey = `analytics:hourly:${date}:${hour}`;
    await this.redis.hincrby(hourlyKey, 'total_amount', payment.amount);
    await this.redis.hincrby(hourlyKey, 'total_transactions', 1);
    await this.redis.expire(hourlyKey, 86400 * 7); // 7 days
    
    // Provider metrics
    const providerKey = `analytics:provider:${payment.provider}:${date}`;
    await this.redis.hincrby(providerKey, 'total_amount', payment.amount);
    await this.redis.hincrby(providerKey, 'total_transactions', 1);
    await this.redis.expire(providerKey, 86400 * 30);
    
    // Type metrics
    const typeKey = `analytics:type:${payment.type}:${date}`;
    await this.redis.hincrby(typeKey, 'total_amount', payment.amount);
    await this.redis.hincrby(typeKey, 'total_transactions', 1);
    await this.redis.expire(typeKey, 86400 * 30);
  }

  /**
   * 👨‍👩‍👧‍👦 Update family analytics
   */
  private async updateFamilyAnalytics(payment: PaymentAnalytics): Promise<void> {
    const familyKey = `analytics:family:${payment.familyId}`;
    
    // Get existing family data
    const existing = await this.redis.hgetall(familyKey);
    
    const updatedData = {
      totalVolume: (parseInt(existing.totalVolume || '0') + payment.amount).toString(),
      transactionCount: (parseInt(existing.transactionCount || '0') + 1).toString(),
      averagePayment: (parseInt(existing.totalVolume || '0') + payment.amount) / (parseInt(existing.transactionCount || '0') + 1),
      lastActivity: Date.now().toString(),
      memberCount: existing.memberCount || payment.participantCount.toString()
    };
    
    // Update family analytics
    await this.redis.hmset(familyKey, updatedData);
    await this.redis.expire(familyKey, 86400 * 90); // 90 days
    
    // Track top spender for family
    const memberKey = `analytics:family:${payment.familyId}:members`;
    const currentMemberTotal = parseInt(await this.redis.hget(memberKey, payment.userId) || '0');
    await this.redis.hset(memberKey, payment.userId, (currentMemberTotal + payment.amount).toString());
    await this.redis.expire(memberKey, 86400 * 90);
  }

  /**
   * 👤 Update user analytics
   */
  private async updateUserAnalytics(payment: PaymentAnalytics): Promise<void> {
    const userKey = `analytics:user:${payment.userId}`;
    
    // Get existing user data
    const existing = await this.redis.hgetall(userKey);
    
    const isSent = payment.type === 'payment_sent' || payment.type === 'qr_payment';
    const isReceived = payment.type === 'payment_received';
    
    const updatedData = {
      totalSent: (parseInt(existing.totalSent || '0') + (isSent ? payment.amount : 0)).toString(),
      totalReceived: (parseInt(existing.totalReceived || '0') + (isReceived ? payment.amount : 0)).toString(),
      transactionCount: (parseInt(existing.transactionCount || '0') + 1).toString(),
      averageAmount: ((parseInt(existing.totalSent || '0') + parseInt(existing.totalReceived || '0')) / (parseInt(existing.transactionCount || '0') + 1)).toString(),
      preferredMethod: payment.provider,
      lastActivity: Date.now().toString(),
      familyId: payment.familyId
    };
    
    // Update user analytics
    await this.redis.hmset(userKey, updatedData);
    await this.redis.expire(userKey, 86400 * 90); // 90 days
    
    // Calculate risk score
    await this.calculateUserRiskScore(payment.userId);
  }

  /**
   * 🎯 Calculate user risk score
   */
  private async calculateUserRiskScore(userId: string): Promise<void> {
    const userKey = `analytics:user:${userId}`;
    const userData = await this.redis.hgetall(userKey);
    
    let riskScore = 0;
    
    // High transaction frequency
    const transactionCount = parseInt(userData.transactionCount || '0');
    if (transactionCount > 100) riskScore += 20;
    else if (transactionCount > 50) riskScore += 10;
    
    // High average amount
    const averageAmount = parseFloat(userData.averageAmount || '0');
    if (averageAmount > 1000) riskScore += 15;
    else if (averageAmount > 500) riskScore += 8;
    
    // Unusual activity patterns
    const lastActivity = parseInt(userData.lastActivity || '0');
    const now = Date.now();
    const hoursSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60);
    
    if (hoursSinceLastActivity < 1 && transactionCount > 10) {
      riskScore += 25; // Suspicious rapid activity
    }
    
    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);
    
    await this.redis.hset(userKey, 'riskScore', riskScore.toString());
  }

  /**
   * 📊 Track business metrics
   */
  private async trackBusinessMetrics(payment: PaymentAnalytics): Promise<void> {
    // Track revenue metrics
    const revenueKey = `business:revenue:${new Date().toISOString().split('T')[0]}`;
    await this.redis.incrby(revenueKey, payment.amount);
    await this.redis.expire(revenueKey, 86400 * 365); // 1 year
    
    // Track active families
    await this.redis.sadd('business:active_families', payment.familyId);
    await this.redis.expire('business:active_families', 86400); // 24 hours
    
    // Track provider usage
    await this.redis.hincrby('business:provider_usage', payment.provider, 1);
    
    // Track payment methods
    await this.redis.hincrby('business:payment_methods', payment.type, 1);
  }

  /**
   * 📊 Get real-time dashboard data
   */
  async getRealtimeDashboard(): Promise<RealtimeDashboard> {
    try {
      const data = await this.redis.get('dashboard:realtime');
      return data ? JSON.parse(data) : this.realtimeData;
    } catch (error) {
      console.error('Error getting realtime dashboard:', error);
      return this.realtimeData;
    }
  }

  /**
   * 📊 Get family analytics
   */
  async getFamilyAnalytics(familyId: string): Promise<FamilyAnalytics | null> {
    try {
      const familyKey = `analytics:family:${familyId}`;
      const familyData = await this.redis.hgetall(familyData);
      
      if (!familyData || Object.keys(familyData).length === 0) {
        return null;
      }
      
      // Get top spender
      const memberKey = `analytics:family:${familyId}:members`;
      const members = await this.redis.hgetall(memberKey);
      const topSpender = Object.entries(members).reduce((a, b) => 
        parseInt(a[1]) > parseInt(b[1]) ? a : b, ['unknown', '0'])[0];
      
      return {
        familyId,
        memberCount: parseInt(familyData.memberCount || '0'),
        totalVolume: parseInt(familyData.totalVolume || '0'),
        transactionCount: parseInt(familyData.transactionCount || '0'),
        averageTransaction: parseFloat(familyData.averagePayment || '0'),
        topSpender,
        mostActiveDay: 'Monday', // This would be calculated from historical data
        lastActivity: parseInt(familyData.lastActivity || '0')
      };
    } catch (error) {
      console.error('Error getting family analytics:', error);
      Sentry.captureException(error, {
        tags: { analytics_type: 'family_analytics' },
        extra: { familyId }
      });
      return null;
    }
  }

  /**
   * 👤 Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    try {
      const userKey = `analytics:user:${userId}`;
      const userData = await this.redis.hgetall(userKey);
      
      if (!userData || Object.keys(userData).length === 0) {
        return null;
      }
      
      return {
        userId,
        familyId: userData.familyId,
        totalSent: parseInt(userData.totalSent || '0'),
        totalReceived: parseInt(userData.totalReceived || '0'),
        transactionCount: parseInt(userData.transactionCount || '0'),
        averageAmount: parseFloat(userData.averageAmount || '0'),
        preferredMethod: userData.preferredMethod || 'unknown',
        lastActivity: parseInt(userData.lastActivity || '0'),
        riskScore: parseInt(userData.riskScore || '0')
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      Sentry.captureException(error, {
        tags: { analytics_type: 'user_analytics' },
        extra: { userId }
      });
      return null;
    }
  }

  /**
   * 📊 Get business intelligence report
   */
  async getBusinessIntelligenceReport(days: number = 30): Promise<any> {
    try {
      const report = {
        summary: {},
        trends: {},
        providers: {},
        paymentTypes: {},
        topFamilies: [],
        topUsers: []
      };
      
      // Generate summary for the last N days
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        const dailyData = await this.redis.hgetall(`analytics:daily:${dateKey}`);
        if (Object.keys(dailyData).length > 0) {
          report.summary[dateKey] = dailyData;
        }
      }
      
      // Get provider breakdown
      const providerUsage = await this.redis.hgetall('business:provider_usage');
      report.providers = providerUsage;
      
      // Get payment type breakdown
      const paymentMethods = await this.redis.hgetall('business:payment_methods');
      report.paymentTypes = paymentMethods;
      
      // Get top families (by volume)
      const activeFamilies = await this.redis.smembers('business:active_families');
      const familyVolumes = [];
      
      for (const familyId of activeFamilies.slice(0, 100)) { // Limit to 100 families
        const familyData = await this.redis.hgetall(`analytics:family:${familyId}`);
        if (familyData.totalVolume) {
          familyVolumes.push({
            familyId,
            volume: parseInt(familyData.totalVolume),
            transactions: parseInt(familyData.transactionCount || '0')
          });
        }
      }
      
      report.topFamilies = familyVolumes
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10);
      
      return report;
    } catch (error) {
      console.error('Error generating BI report:', error);
      Sentry.captureException(error, {
        tags: { analytics_type: 'bi_report' }
      });
      return null;
    }
  }

  /**
   * 📊 Get performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toISOString().split('T')[0];
      
      // Current hour metrics
      const hourKey = `analytics:hourly:${today}:${currentHour}`;
      const hourData = await this.redis.hgetall(hourKey);
      
      // Today's metrics
      const dailyKey = `analytics:daily:${today}`;
      const dailyData = await this.redis.hgetall(dailyKey);
      
      return {
        currentHour: hourData,
        today: dailyData,
        activeFamilies: await this.redis.scard('business:active_families'),
        uptime: 99.9,
        errorRate: 0.5 // This would come from monitoring system
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return null;
    }
  }
}

/**
 * 📊 Real-time Dashboard Updater
 */
export class RealtimeDashboardUpdater {
  private analytics: AnalyticsManager;
  private updateInterval: NodeJS.Timeout;

  constructor(analytics: AnalyticsManager) {
    this.analytics = analytics;
  }

  /**
   * 🚀 Start real-time updates
   */
  startUpdates(): void {
    this.updateInterval = setInterval(async () => {
      await this.updateDashboard();
    }, 5000); // Update every 5 seconds
  }

  /**
   * 🛑 Stop real-time updates
   */
  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  /**
   * 📊 Update dashboard data
   */
  private async updateDashboard(): Promise<void> {
    try {
      // This would push updates to connected clients via WebSocket
      const dashboardData = await this.analytics.getRealtimeDashboard();
      
      // WebSocket broadcast to connected clients
      // broadcastToClients('dashboard_update', dashboardData);
      
      console.log('Dashboard updated:', dashboardData);
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }
}

/**
 * 🚀 Global Analytics Instance
 */
export const analyticsManager = new AnalyticsManager();
export const realtimeDashboard = new RealtimeDashboardUpdater(analyticsManager);

/**
 * 🚀 Usage Examples
 */

// Track a payment:
/*
await analyticsManager.trackPayment({
  provider: 'venmo',
  amount: 25.50,
  participantCount: 2,
  familyId: 'family_123',
  userId: 'user_456',
  timestamp: Date.now(),
  type: 'payment_sent',
  status: 'success',
  processingTime: 1200
});
*/

// Get family analytics:
/*
const familyAnalytics = await analyticsManager.getFamilyAnalytics('family_123');
console.log('Family analytics:', familyAnalytics);
*/

// Get business intelligence report:
/*
const biReport = await analyticsManager.getBusinessIntelligenceReport(30);
console.log('BI Report:', biReport);
*/

// Start real-time dashboard:
/*
realtimeDashboard.startUpdates();
*/
