#!/usr/bin/env bun

/**
 * 📊 Documentation Analytics Service
 * 
 * Track documentation access patterns, popular URLs, and usage metrics
 * for enterprise monitoring and optimization.
 */

import { DocumentationProvider, DocumentationCategory } from '../constants/domains';

export interface AccessEvent {
  timestamp: Date;
  url: string;
  provider?: DocumentationProvider;
  category?: DocumentationCategory;
  userType?: 'developers' | 'beginners' | 'educators' | 'all_users';
  source?: 'direct' | 'search' | 'link' | 'bookmark';
  sessionId?: string;
  userAgent?: string;
  referrer?: string;
  duration?: number; // Time spent on page in milliseconds
}

export interface PopularURL {
  url: string;
  count: number;
  uniqueUsers: number;
  averageDuration: number;
  lastAccessed: Date;
  provider?: DocumentationProvider;
  category?: DocumentationCategory;
}

export interface UsageMetrics {
  totalAccess: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  topProviders: Array<{
    provider: DocumentationProvider;
    count: number;
    percentage: number;
  }>;
  topCategories: Array<{
    category: DocumentationCategory;
    count: number;
    percentage: number;
  }>;
  accessByHour: Record<number, number>;
  accessByDay: Record<string, number>;
}

export class DocumentationAnalytics {
  private static accessLog: AccessEvent[] = [];
  private static userSessions = new Map<string, { startTime: Date; lastActivity: Date }>();
  private static maxLogSize = 10000; // Prevent memory issues
  private static sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private static lastCleanup = Date.now();
  private static cleanupInterval = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Log documentation access for analytics
   */
  static logAccess(event: Partial<AccessEvent>): void {
    // Validate required fields
    if (!event.url || typeof event.url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    // Sanitize user-provided strings
    const sanitizedEvent: Partial<AccessEvent> = {
      ...event,
      userAgent: event.userAgent ? this.sanitizeString(event.userAgent) : undefined,
      referrer: event.referrer ? this.sanitizeString(event.referrer) : undefined
    };
    
    const accessEvent: AccessEvent = {
      timestamp: new Date(),
      url: sanitizedEvent.url!,
      provider: sanitizedEvent.provider,
      category: sanitizedEvent.category,
      userType: sanitizedEvent.userType || 'all_users',
      source: sanitizedEvent.source || 'direct',
      sessionId: sanitizedEvent.sessionId,
      userAgent: sanitizedEvent.userAgent,
      referrer: sanitizedEvent.referrer,
      duration: sanitizedEvent.duration
    };
    
    // Add to log
    this.accessLog.push(accessEvent);
    
    // Manage log size efficiently
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog.splice(0, this.accessLog.length - this.maxLogSize);
    }
    
    // Update session tracking with automatic cleanup
    if (sanitizedEvent.sessionId) {
      this.userSessions.set(sanitizedEvent.sessionId, {
        startTime: this.userSessions.get(sanitizedEvent.sessionId)?.startTime || new Date(),
        lastActivity: new Date()
      });
    }
    
    // Periodic cleanup of expired sessions
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanupExpiredSessions();
      this.lastCleanup = now;
    }
  }
  
  /**
   * Sanitize string input to prevent injection
   */
  private static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/data:/gi, '') // Remove data protocol
      .replace(/vbscript:/gi, '') // Remove vbscript protocol
      .trim();
  }
  
  /**
   * Clean up expired sessions
   */
  private static cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.userSessions.entries()) {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.userSessions.delete(sessionId);
    });
  }
  
  /**
   * Get most accessed documentation URLs
   */
  static getPopularURLs(limit: number = 10, timeRange?: { from: Date; to: Date }): PopularURL[] {
    let filteredLog = this.accessLog;
    
    // Apply time range filter
    if (timeRange) {
      filteredLog = this.accessLog.filter(event => 
        event.timestamp >= timeRange.from && event.timestamp <= timeRange.to
      );
    }
    
    // Group by URL
    const urlStats = new Map<string, {
      count: number;
      uniqueUsers: Set<string>;
      durations: number[];
      lastAccessed: Date;
      provider?: DocumentationProvider;
      category?: DocumentationCategory;
    }>();
    
    filteredLog.forEach(event => {
      const existing = urlStats.get(event.url) || {
        count: 0,
        uniqueUsers: new Set(),
        durations: [],
        lastAccessed: event.timestamp,
        provider: event.provider,
        category: event.category
      };
      
      existing.count++;
      existing.lastAccessed = event.timestamp;
      
      if (event.sessionId) {
        existing.uniqueUsers.add(event.sessionId);
      }
      
      if (event.duration) {
        existing.durations.push(event.duration);
      }
      
      urlStats.set(event.url, existing);
    });
    
    // Convert to PopularURL array and sort
    return Array.from(urlStats.entries())
      .map(([url, stats]) => ({
        url,
        count: stats.count,
        uniqueUsers: stats.uniqueUsers.size,
        averageDuration: stats.durations.length > 0 
          ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length 
          : 0,
        lastAccessed: stats.lastAccessed,
        provider: stats.provider,
        category: stats.category
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  /**
   * Get comprehensive usage metrics
   */
  static getUsageMetrics(timeRange?: { from: Date; to: Date }): UsageMetrics {
    let filteredLog = this.accessLog;
    
    // Apply time range filter
    if (timeRange) {
      filteredLog = this.accessLog.filter(event => 
        event.timestamp >= timeRange.from && event.timestamp <= timeRange.to
      );
    }
    
    const totalAccess = filteredLog.length;
    const uniqueUsers = new Set(
      filteredLog
        .filter(event => event.sessionId)
        .map(event => event.sessionId!)
    ).size;
    
    // Calculate average session duration
    const sessionDurations = filteredLog
      .filter(event => event.duration)
      .map(event => event.duration!);
    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;
    
    // Top providers
    const providerStats = new Map<DocumentationProvider, number>();
    filteredLog.forEach(event => {
      if (event.provider) {
        providerStats.set(event.provider, (providerStats.get(event.provider) || 0) + 1);
      }
    });
    
    const topProviders = Array.from(providerStats.entries())
      .map(([provider, count]) => ({
        provider,
        count,
        percentage: totalAccess > 0 ? (count / totalAccess) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    // Top categories
    const categoryStats = new Map<DocumentationCategory, number>();
    filteredLog.forEach(event => {
      if (event.category) {
        categoryStats.set(event.category, (categoryStats.get(event.category) || 0) + 1);
      }
    });
    
    const topCategories = Array.from(categoryStats.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalAccess > 0 ? (count / totalAccess) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    // Access by hour
    const accessByHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      accessByHour[i] = 0;
    }
    filteredLog.forEach(event => {
      const hour = event.timestamp.getHours();
      accessByHour[hour]++;
    });
    
    // Access by day
    const accessByDay: Record<string, number> = {};
    filteredLog.forEach(event => {
      const day = event.timestamp.toISOString().split('T')[0];
      accessByDay[day] = (accessByDay[day] || 0) + 1;
    });
    
    return {
      totalAccess,
      uniqueUsers,
      averageSessionDuration,
      topProviders,
      topCategories,
      accessByHour,
      accessByDay
    };
  }
  
  /**
   * Get access patterns for a specific URL
   */
  static getURLAccessPatterns(url: string, timeRange?: { from: Date; to: Date }): {
    totalAccess: number;
    uniqueUsers: number;
    averageDuration: number;
    accessByHour: Record<number, number>;
    referrers: Array<{ referrer: string; count: number }>;
  } {
    let filteredLog = this.accessLog.filter(event => event.url === url);
    
    // Apply time range filter
    if (timeRange) {
      filteredLog = filteredLog.filter(event => 
        event.timestamp >= timeRange.from && event.timestamp <= timeRange.to
      );
    }
    
    const totalAccess = filteredLog.length;
    const uniqueUsers = new Set(
      filteredLog
        .filter(event => event.sessionId)
        .map(event => event.sessionId!)
    ).size;
    
    const durations = filteredLog
      .filter(event => event.duration)
      .map(event => event.duration!);
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    // Access by hour
    const accessByHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      accessByHour[i] = 0;
    }
    filteredLog.forEach(event => {
      const hour = event.timestamp.getHours();
      accessByHour[hour]++;
    });
    
    // Referrers
    const referrerStats = new Map<string, number>();
    filteredLog.forEach(event => {
      if (event.referrer) {
        referrerStats.set(event.referrer, (referrerStats.get(event.referrer) || 0) + 1);
      }
    });
    
    const referrers = Array.from(referrerStats.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      totalAccess,
      uniqueUsers,
      averageDuration,
      accessByHour,
      referrers
    };
  }
  
  /**
   * Clean up old sessions and optimize memory
   */
  static cleanup(): void {
    const now = new Date();
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    
    // Clean up old sessions
    for (const [sessionId, session] of this.userSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > sessionTimeout) {
        this.userSessions.delete(sessionId);
      }
    }
    
    // Trim access log if needed
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog = this.accessLog.slice(-this.maxLogSize);
    }
  }
  
  /**
   * Export analytics data for external analysis
   */
  static exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'url', 'provider', 'category', 'userType', 'source', 'sessionId', 'duration'];
      const rows = this.accessLog.map(event => [
        event.timestamp.toISOString(),
        event.url,
        event.provider || '',
        event.category || '',
        event.userType,
        event.source,
        event.sessionId || '',
        event.duration || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify({
      accessLog: this.accessLog,
      userSessions: Array.from(this.userSessions.entries()),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
  
  /**
   * Get analytics summary
   */
  static getSummary(): {
    totalEvents: number;
    activeSessions: number;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  } {
    return {
      totalEvents: this.accessLog.length,
      activeSessions: this.userSessions.size,
      oldestEvent: this.accessLog.length > 0 ? this.accessLog[0].timestamp : null,
      newestEvent: this.accessLog.length > 0 ? this.accessLog[this.accessLog.length - 1].timestamp : null
    };
  }
}

export default DocumentationAnalytics;
