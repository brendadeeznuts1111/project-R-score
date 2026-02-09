import { performance } from 'node:perf_hooks';

export type DomainConfig = Record<string, unknown>;

export type DomainResource = 'DOM' | 'CSS' | 'BASE_JS' | 'CHARTS' | 'ANIMATION' | 'A11Y_AUDIT' | 'THEME_PRESETS';

export type DomainResources = {
  core: DomainResource[];
  enhanced: DomainResource[];
  optional: DomainResource[];
};

export type DomainPerformanceSnapshot = {
  id: string;
  color: string;
  generationTime: number;
  memoryFootprint: number;
};

export class Domain {
  readonly id: string;
  readonly color: string;
  readonly config: DomainConfig;
  readonly memory: number;
  readonly tension: number;

  constructor(input: {
    id: string;
    color: string;
    config?: DomainConfig;
    memory?: number;
    tension?: number;
  }) {
    this.id = String(input.id || '').trim();
    this.color = String(input.color || '').trim();
    this.config = input.config || {};
    this.memory = Number.isFinite(input.memory) ? Number(input.memory) : 256;
    this.tension = Number.isFinite(input.tension) ? Number(input.tension) : 0.5;
  }
}

export class InstrumentedDomain extends Domain {
  private readonly timers = new Map<string, number>();

  get withPerformance(): DomainPerformanceSnapshot {
    const start = performance.now();
    const snapshot: DomainPerformanceSnapshot = {
      id: this.id,
      color: this.color,
      generationTime: 0,
      memoryFootprint: 0,
    };

    const estimatedMemory =
      JSON.stringify(snapshot).length * 2 +
      Object.keys(this.config).length * 8;

    snapshot.generationTime = Number((performance.now() - start).toFixed(4));
    snapshot.memoryFootprint = estimatedMemory;
    return snapshot;
  }

  async loadResources(): Promise<DomainResources> {
    const core = await this.time('core', () => this.loadCoreResources());
    const enhanced = this.memory >= 256
      ? await this.time('enhanced', () => this.loadEnhancedResources())
      : [];
    const optional = this.tension >= 0.8
      ? await this.time('optional', () => this.loadOptionalResources())
      : [];

    return { core, enhanced, optional };
  }

  getTimings(): ReadonlyMap<string, number> {
    return this.timers;
  }

  private async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this.timers.set(label, Number((performance.now() - start).toFixed(3)));
    return result;
  }

  private async loadCoreResources(): Promise<DomainResource[]> {
    await Bun.sleep(10);
    return ['DOM', 'CSS', 'BASE_JS'];
  }

  private async loadEnhancedResources(): Promise<DomainResource[]> {
    await Bun.sleep(5);
    return ['CHARTS', 'ANIMATION'];
  }

  private async loadOptionalResources(): Promise<DomainResource[]> {
    await Bun.sleep(2);
    return ['A11Y_AUDIT', 'THEME_PRESETS'];
  }
}
