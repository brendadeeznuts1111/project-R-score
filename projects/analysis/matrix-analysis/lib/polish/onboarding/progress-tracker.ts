// lib/polish/onboarding/progress-tracker.ts - Tour Progress Persistence
// ═══════════════════════════════════════════════════════════════════════════════

import { storage } from "../core/storage.ts";
import type { TourProgress } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Progress Tracker
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "tour-progress";

interface StoredProgress {
  tours: Record<string, TourProgress>;
  lastUpdated: string;
}

export class ProgressTracker {
  private cache: Map<string, TourProgress> = new Map();
  private loaded = false;

  async YAML.parse(): Promise<void> {
    if (this.loaded) return;

    const data = await storage.get<StoredProgress>(STORAGE_KEY);
    if (data?.tours) {
      for (const [id, progress] of Object.entries(data.tours)) {
        this.cache.set(id, {
          ...progress,
          startedAt: new Date(progress.startedAt),
          completedAt: progress.completedAt ? new Date(progress.completedAt) : undefined,
        });
      }
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    const tours: Record<string, TourProgress> = {};
    for (const [id, progress] of this.cache) {
      tours[id] = progress;
    }

    await storage.set<StoredProgress>(STORAGE_KEY, {
      tours,
      lastUpdated: new Date().toISOString(),
    });
  }

  async getProgress(tourId: string): Promise<TourProgress | null> {
    await this.YAML.parse();
    return this.cache.get(tourId) ?? null;
  }

  async setProgress(progress: TourProgress): Promise<void> {
    await this.YAML.parse();
    this.cache.set(progress.tourId, progress);
    await this.save();
  }

  async startTour(tourId: string, totalSteps: number): Promise<TourProgress> {
    const progress: TourProgress = {
      tourId,
      currentStep: 0,
      totalSteps,
      completed: false,
      startedAt: new Date(),
    };

    await this.setProgress(progress);
    return progress;
  }

  async advanceStep(tourId: string): Promise<TourProgress | null> {
    const progress = await this.getProgress(tourId);
    if (!progress) return null;

    progress.currentStep = Math.min(progress.currentStep + 1, progress.totalSteps - 1);
    await this.setProgress(progress);
    return progress;
  }

  async completeTour(tourId: string): Promise<TourProgress | null> {
    const progress = await this.getProgress(tourId);
    if (!progress) return null;

    progress.completed = true;
    progress.completedAt = new Date();
    await this.setProgress(progress);
    return progress;
  }

  async isCompleted(tourId: string): Promise<boolean> {
    const progress = await this.getProgress(tourId);
    return progress?.completed ?? false;
  }

  async resetTour(tourId: string): Promise<void> {
    await this.YAML.parse();
    this.cache.delete(tourId);
    await this.save();
  }

  async resetAll(): Promise<void> {
    this.cache.clear();
    await storage.delete(STORAGE_KEY);
  }

  async getAllProgress(): Promise<TourProgress[]> {
    await this.YAML.parse();
    return [...this.cache.values()];
  }

  async getCompletedTours(): Promise<string[]> {
    await this.YAML.parse();
    return [...this.cache.entries()]
      .filter(([_, progress]) => progress.completed)
      .map(([id]) => id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Instance
// ─────────────────────────────────────────────────────────────────────────────

export const progressTracker = new ProgressTracker();
