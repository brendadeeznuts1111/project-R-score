/**
 * Custom error classes for NBA Swarm system
 */

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class VectorDimensionError extends Error {
  constructor(
    message: string,
    public readonly expected: number,
    public readonly actual: number
  ) {
    super(message);
    this.name = "VectorDimensionError";
  }
}

export class EdgeBuildError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = "EdgeBuildError";
  }
}

export class GraphError extends Error {
  constructor(message: string, public readonly graphSize?: number) {
    super(message);
    this.name = "GraphError";
  }
}

export class LedgerError extends Error {
  constructor(message: string, public readonly operation?: string) {
    super(message);
    this.name = "LedgerError";
  }
}

export class HedgerError extends Error {
  constructor(message: string, public readonly quote?: number) {
    super(message);
    this.name = "HedgerError";
  }
}

export class StatsError extends Error {
  constructor(message: string, public readonly sampleSize?: number) {
    super(message);
    this.name = "StatsError";
  }
}

