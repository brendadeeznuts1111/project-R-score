/**
 * §Types:128 - Pattern Definition System
 * @pattern Pattern:128
 * @perf <1ms type checking
 * @roi ∞ (compile-time safety)
 * @section §Types
 */

// Base pattern interface with Generics for TInput and TResult
export interface BasePattern<TInput = any, TResult = any, TConfig = any> {
  readonly id: string;
  readonly category: string;
  readonly perfBudget: string;
  readonly roi: string;
  readonly semantics: string[];
  readonly config: TConfig;

  test(input: any): boolean;
  exec(input: TInput): Promise<TResult> | TResult;
}

export type LSPPatternInfo = {
  id: string;
  perf: string;
  roi: string;
  semantics: string[];
  description: string;
  examples: string[];
};

/**
 * §Gate Pattern (§Pattern:54)
 */
export interface GatePattern<TInput = void> extends BasePattern<TInput, GateResult> {
  readonly category: 'Gate';
  test(input: TInput): boolean;
  exec(input: TInput): GateResult;
}

export interface GateResult {
  passed: boolean;
  score?: number;
  max?: number;
  status: string;
}

/**
 * §Filter Pattern (§Pattern:89)
 */
export interface FilterPattern<TInput, TOutput> extends BasePattern<TInput, FilterResult<TOutput>> {
  readonly category: 'Filter';
  readonly hasRegex: boolean;
  test(input: TInput): boolean;
  exec(input: TInput): FilterResult<TOutput>;
}

export interface FilterResult<TOutput> {
  result: TOutput;
  groups: Record<string, any>;
}

/**
 * §Query Pattern (§Pattern:91)
 */
export interface QueryPattern<TKey, TValue> extends BasePattern<QueryOptions<TKey, TValue>, QueryResult<TValue>> {
  readonly category: 'Query';
  test(key: TKey): boolean; 
  getStats(): Promise<{ hitRate: number; size: number }>;
}

export interface QueryOptions<TKey, TValue> {
  method: 'get' | 'set' | 'delete';
  key: TKey;
  value?: TValue;
  ttl?: number;
}

export interface QueryResult<TValue> {
  hit: boolean;
  data?: TValue;
}

/**
 * §Pattern Matching Pattern (§Pattern:90)
 */
export interface PatternMatcher<TMatch> extends BasePattern<string, MatchResult<TMatch>> {
  readonly category: 'Pattern';
  readonly hasRegExpGroups: boolean;
  test(input: string): boolean;
}

export interface MatchResult<TMatch> {
  groups: TMatch;
  pathname?: any;
}

/**
 * §Workflow Pattern (§Workflow:95)
 */
export interface WorkflowPattern<TInput, TResult> extends BasePattern<TInput, WorkflowResult<TResult>> {
  readonly category: 'Workflow';
  readonly stages: Array<WorkflowStage<any, any>>;
  getMetrics(): Promise<WorkflowMetrics>;
}

export interface WorkflowStage<TIn, TOut> {
  name: string;
  pattern: string;
  condition?: (context: any) => boolean;
  action: (context: any) => Promise<TOut>;
  budget: string;
}

export interface WorkflowResult<TResult> {
  result: TResult;
  duration: number;
  stages: string[];
}

export interface WorkflowMetrics {
  avgDuration: number;
  throughput: number;
  successRate: number;
  matrixRows: string[];
}

/**
 * §Path Pattern (§Storage:8)
 * Boosted with contentDisposition support
 */
export interface PathPattern extends BasePattern<string, PathComponents> {
  readonly category: 'Storage';
  test(path: string): boolean;
  list(pattern: string): Promise<string[]>;
}

export interface PathComponents {
  bucket: string;
  key: string;
  namespace: string;
  disposition?: string; // attachment; filename="xxx"
}

/**
 * §Farm Pattern (§Farm:82)
 */
export interface FarmPattern<TInput, TOutput> extends BasePattern<FarmOptions<TInput, TOutput>, FarmResult<TOutput>> {
  readonly category: 'Farm';
  readonly concurrency: number;
  scale(factor: number): void;
}

export interface FarmOptions<TInput, TOutput> {
  stream: ReadableStream<TInput>;
  worker: (item: TInput) => Promise<TOutput>;
}

export interface FarmResult<TOutput> {
  results: TOutput[];
  duration: number;
  throughput: number;
}
