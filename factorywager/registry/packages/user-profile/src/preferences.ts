#!/usr/bin/env bun
/**
 * 🔄 FactoryWager PREFERENCE & PROGRESS MANAGEMENT API v10.1
 * 
 * Preference updates, progress persistence, real-time sync via pub/sub
 */

import { UserProfileEngine, ProfilePrefs, profileEngine } from './core';

const engine = profileEngine;

// Simple pub/sub for real-time updates (v10.1)
class PubSub {
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(channel)?.delete(callback);
    };
  }

  publish(channel: string, data: any): void {
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`PubSub callback error on ${channel}:`, error);
        }
      });
    }
  }
}

export const pubsub = new PubSub();

export interface ProgressEntry {
  milestone: string;
  metadata?: any;
  score: number;
  timestamp?: number;
}

export interface UpdatePreferencesResult {
  status: 'preferences_updated' | 'error';
  userId: string;
  newHash?: string;
  changes?: string[];
  message?: string;
}

/**
 * Update user preferences with atomic hash update
 */
export async function updatePreferences(
  userId: string,
  updates: Partial<ProfilePrefs>
): Promise<UpdatePreferencesResult> {
  try {
    const current = await engine.getProfile(userId);
    if (!current) {
      throw new Error(`Profile not found: ${userId}`);
    }

    const nextPrefs = { ...current, ...updates };

    // Atomic update + new parity hash
    const newHash = await engine.createProfile(nextPrefs); // overwrites with new version

    // Publish real-time update
    pubsub.publish('profile-updated', {
      userId,
      change: Object.keys(updates),
      newHash,
      timestamp: Date.now(),
      updates,
    });

    return {
      status: 'preferences_updated',
      userId,
      newHash,
      changes: Object.keys(updates),
    };
  } catch (error: any) {
    return {
      status: 'error',
      userId,
      message: error.message,
    };
  }
}

/**
 * Save progress entry (append-only log)
 */
export async function saveProgress(
  userId: string,
  entry: ProgressEntry
): Promise<void> {
  // Append-only log — never overwrites history
  const entryHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(entry))))
  ).map(b => b.toString(16).padStart(2, '0')).join('');

  await engine.appendProgress(userId, {
    ...entry,
    timestamp: entry.timestamp || Date.now(),
    hash: entryHash,
  });

  // Update profile progress summary
  await engine.saveProgress(userId, entry);

  // AI personalization boost trigger
  try {
    const { xgboostPers } = await import('@factorywager/xgboost-pers');
    const profile = await engine.getProfile(userId);
    if (profile) {
      const boosterInput = await engine.buildPersVector(userId);
      const features = xgboostPers.extractFeatures({
        userId,
        prefs: profile,
        progress: profile.progress || {},
        geoIP: profile.location,
        subLevel: profile.subLevel,
      });
      const prediction = await xgboostPers.predict(features);

      if (prediction.score > 0.999) {
        pubsub.publish('personalization-peak', {
          userId,
          score: prediction.score,
          milestone: entry.milestone,
        });
      }
    }
  } catch (error) {
    // Non-fatal - progress is still saved
    console.warn(`Personalization boost failed for ${userId}:`, error);
  }

  // Publish progress update
  pubsub.publish('progress-updated', {
    userId,
    milestone: entry.milestone,
    score: entry.score,
    timestamp: entry.timestamp || Date.now(),
  });
}

/**
 * Get progress history for user
 */
export async function getProgressHistory(userId: string, limit: number = 50): Promise<ProgressEntry[]> {
  const db = (engine as any).db;
  const stmt = db.prepare('SELECT milestone, metadata, score, timestamp FROM progress_log WHERE userId = ? ORDER BY timestamp DESC LIMIT ?');
  const rows = stmt.all(userId, limit) as Array<{
    milestone: string;
    metadata: string;
    score: number;
    timestamp: number;
  }>;

  return rows.map(row => ({
    milestone: row.milestone,
    metadata: JSON.parse(row.metadata || '{}'),
    score: row.score,
    timestamp: row.timestamp,
  }));
}
