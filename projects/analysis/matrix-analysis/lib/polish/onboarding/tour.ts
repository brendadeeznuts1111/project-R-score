// lib/polish/onboarding/tour.ts - Onboarding Tour Manager
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "../core/runtime.ts";
import { logger } from "../core/logger.ts";
import { progressTracker } from "./progress-tracker.ts";
import type { TourStep, TourProgress, TourConfig } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Base Tour Class
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BaseTour {
  protected config: TourConfig;
  protected progress: TourProgress | null = null;
  protected isRunning = false;

  constructor(config: TourConfig) {
    this.config = {
      skipable: true,
      persistProgress: true,
      ...config,
    };
  }

  get id(): string {
    return this.config.id;
  }

  get steps(): TourStep[] {
    return this.config.steps;
  }

  get currentStepIndex(): number {
    return this.progress?.currentStep ?? 0;
  }

  get currentStep(): TourStep | null {
    return this.config.steps[this.currentStepIndex] ?? null;
  }

  get isComplete(): boolean {
    return this.progress?.completed ?? false;
  }

  async init(): Promise<void> {
    if (this.config.persistProgress) {
      this.progress = await progressTracker.getProgress(this.config.id);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    // Check if already completed
    if (this.config.persistProgress) {
      const completed = await progressTracker.isCompleted(this.config.id);
      if (completed) {
        logger.info(`Tour "${this.config.id}" already completed`);
        return;
      }
    }

    this.isRunning = true;

    if (this.config.persistProgress) {
      this.progress = await progressTracker.startTour(
        this.config.id,
        this.config.steps.length
      );
    } else {
      this.progress = {
        tourId: this.config.id,
        currentStep: 0,
        totalSteps: this.config.steps.length,
        completed: false,
        startedAt: new Date(),
      };
    }

    await this.showStep(0);
  }

  async next(): Promise<boolean> {
    if (!this.isRunning || !this.progress) return false;

    const nextIndex = this.progress.currentStep + 1;

    if (nextIndex >= this.config.steps.length) {
      await this.complete();
      return false;
    }

    if (this.config.persistProgress) {
      this.progress = await progressTracker.advanceStep(this.config.id);
    } else {
      this.progress.currentStep = nextIndex;
    }

    await this.showStep(nextIndex);
    return true;
  }

  async previous(): Promise<boolean> {
    if (!this.isRunning || !this.progress) return false;

    const prevIndex = this.progress.currentStep - 1;
    if (prevIndex < 0) return false;

    this.progress.currentStep = prevIndex;
    if (this.config.persistProgress) {
      await progressTracker.setProgress(this.progress);
    }

    await this.showStep(prevIndex);
    return true;
  }

  async skip(): void {
    if (!this.config.skipable) return;
    await this.complete();
  }

  async complete(): Promise<void> {
    this.isRunning = false;

    if (this.config.persistProgress) {
      await progressTracker.completeTour(this.config.id);
    }

    if (this.progress) {
      this.progress.completed = true;
      this.progress.completedAt = new Date();
    }

    await this.config.onComplete?.();
    await this.onComplete();
  }

  async reset(): Promise<void> {
    this.isRunning = false;
    this.progress = null;

    if (this.config.persistProgress) {
      await progressTracker.resetTour(this.config.id);
    }
  }

  getProgress(): TourProgress | null {
    return this.progress;
  }

  // Abstract methods for implementation
  protected abstract showStep(index: number): Promise<void>;
  protected abstract onComplete(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tour Builder
// ─────────────────────────────────────────────────────────────────────────────

export class TourBuilder {
  private config: TourConfig;

  constructor(id: string) {
    this.config = {
      id,
      steps: [],
      skipable: true,
      persistProgress: true,
    };
  }

  addStep(step: TourStep): this {
    this.config.steps.push(step);
    return this;
  }

  step(id: string, title: string, content: string): this {
    return this.addStep({ id, title, content });
  }

  withTarget(target: string): this {
    const lastStep = this.config.steps[this.config.steps.length - 1];
    if (lastStep) {
      lastStep.target = target;
    }
    return this;
  }

  withPosition(position: TourStep["position"]): this {
    const lastStep = this.config.steps[this.config.steps.length - 1];
    if (lastStep) {
      lastStep.position = position;
    }
    return this;
  }

  withAction(action: () => void | Promise<void>): this {
    const lastStep = this.config.steps[this.config.steps.length - 1];
    if (lastStep) {
      lastStep.action = action;
    }
    return this;
  }

  skipable(value = true): this {
    this.config.skipable = value;
    return this;
  }

  persist(value = true): this {
    this.config.persistProgress = value;
    return this;
  }

  onComplete(callback: () => void | Promise<void>): this {
    this.config.onComplete = callback;
    return this;
  }

  build(): TourConfig {
    return this.config;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tour Registry
// ─────────────────────────────────────────────────────────────────────────────

const tourRegistry = new Map<string, TourConfig>();

export function registerTour(config: TourConfig): void {
  tourRegistry.set(config.id, config);
}

export function getTourConfig(id: string): TourConfig | null {
  return tourRegistry.get(id) ?? null;
}

export function listTours(): string[] {
  return [...tourRegistry.keys()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createTour(id: string): TourBuilder {
  return new TourBuilder(id);
}
