#!/usr/bin/env bun
/**
 * 📊 Error Tracking System
 * Centralized error occurrence tracking and statistics
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ErrorOccurrence {
  errorCode: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  source?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorStatistics {
  errorCode: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  contexts: Record<string, unknown>[];
  sources: string[];
  avgFrequency: number; // occurrences per hour
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private occurrences: ErrorOccurrence[] = [];
  private statistics: Map<string, ErrorStatistics> = new Map();
  private trackingEnabled: boolean = true;
  private dataPath: string;
  private maxOccurrences: number = 10000;

  private constructor() {
    this.dataPath = join(process.cwd(), 'data', 'error-tracking.json');
    this.loadTrackingData();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Load existing tracking data
   */
  private loadTrackingData(): void {
    if (existsSync(this.dataPath)) {
      try {
        const data = JSON.parse(readFileSync(this.dataPath, 'utf-8'));
        this.occurrences =
          data.occurrences?.map((occ: any) => ({
            ...occ,
            timestamp: new Date(occ.timestamp),
          })) || [];

        // Rebuild statistics
        this.rebuildStatistics();
      } catch (error) {
        console.warn('Failed to load error tracking data:', error);
      }
    }
  }

  /**
   * Save tracking data
   */
  private saveTrackingData(): void {
    if (!this.trackingEnabled) return;

    try {
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        require('fs').mkdirSync(dataDir, { recursive: true });
      }

      const data = {
        occurrences: this.occurrences.slice(-this.maxOccurrences), // Keep only recent occurrences
        lastUpdated: new Date().toISOString(),
        totalTracked: this.occurrences.length,
      };

      writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to save error tracking data:', error);
    }
  }

  /**
   * Rebuild statistics from occurrences
   */
  private rebuildStatistics(): void {
    this.statistics.clear();

    for (const occurrence of this.occurrences) {
      this.updateStatistics(occurrence);
    }
  }

  /**
   * Update statistics for an error occurrence
   */
  private updateStatistics(occurrence: ErrorOccurrence): void {
    const existing = this.statistics.get(occurrence.errorCode);

    if (existing) {
      existing.occurrences++;
      existing.lastSeen = occurrence.timestamp;
      existing.contexts.push(occurrence.context || {});
      if (occurrence.source && !existing.sources.includes(occurrence.source)) {
        existing.sources.push(occurrence.source);
      }

      // Recalculate average frequency
      const hoursSpan =
        (existing.lastSeen.getTime() - existing.firstSeen.getTime()) / (1000 * 60 * 60);
      existing.avgFrequency = hoursSpan > 0 ? existing.occurrences / hoursSpan : 0;
    } else {
      this.statistics.set(occurrence.errorCode, {
        errorCode: occurrence.errorCode,
        occurrences: 1,
        firstSeen: occurrence.timestamp,
        lastSeen: occurrence.timestamp,
        contexts: [occurrence.context || {}],
        sources: occurrence.source ? [occurrence.source] : [],
        avgFrequency: 0,
      });
    }
  }

  /**
   * Track an error occurrence
   */
  async trackError(errorCode: string, context?: Record<string, unknown>): Promise<void> {
    if (!this.trackingEnabled) return;

    const occurrence: ErrorOccurrence = {
      errorCode,
      timestamp: new Date(),
      context,
      source: (context?.source as string) || 'unknown',
    };

    this.occurrences.push(occurrence);
    this.updateStatistics(occurrence);
    this.saveTrackingData();

    // Log for monitoring
    console.log(
      `📊 Error tracked: ${errorCode} (${this.statistics.get(errorCode)?.occurrences || 1} total)`
    );
  }

  /**
   * Get statistics for a specific error code
   */
  getErrorStatistics(errorCode: string): ErrorStatistics | undefined {
    return this.statistics.get(errorCode);
  }

  /**
   * Get all error statistics
   */
  getAllStatistics(): ErrorStatistics[] {
    return Array.from(this.statistics.values());
  }

  /**
   * Get recent occurrences
   */
  getRecentOccurrences(limit: number = 100): ErrorOccurrence[] {
    return this.occurrences.slice(-limit);
  }

  /**
   * Get occurrences for specific error code
   */
  getOccurrencesForError(errorCode: string, limit: number = 50): ErrorOccurrence[] {
    return this.occurrences.filter(occ => occ.errorCode === errorCode).slice(-limit);
  }

  /**
   * Get tracking summary
   */
  getTrackingSummary(): {
    totalErrors: number;
    uniqueErrorCodes: number;
    totalOccurrences: number;
    trackingEnabled: boolean;
    lastTracked?: Date;
    topErrors: Array<{ errorCode: string; occurrences: number }>;
  } {
    const topErrors = Array.from(this.statistics.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map(stat => ({ errorCode: stat.errorCode, occurrences: stat.occurrences }));

    return {
      totalErrors: this.statistics.size,
      uniqueErrorCodes: this.statistics.size,
      totalOccurrences: this.occurrences.length,
      trackingEnabled: this.trackingEnabled,
      lastTracked:
        this.occurrences.length > 0
          ? this.occurrences[this.occurrences.length - 1].timestamp
          : undefined,
      topErrors,
    };
  }

  /**
   * Clear all tracking data
   */
  clearTrackingData(): void {
    this.occurrences = [];
    this.statistics.clear();
    this.saveTrackingData();
  }

  /**
   * Enable/disable tracking
   */
  setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
  }

  /**
   * Check if tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.trackingEnabled;
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();
