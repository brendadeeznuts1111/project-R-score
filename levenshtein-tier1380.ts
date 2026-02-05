// levenshtein-tier1380.ts — Pure, optimized Levenshtein similarity engine
import { Database } from "bun:sqlite";

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────
export interface SimilarityResult {
  target: string;
  candidate: string;
  distance: number;
  normalizedDistance: number;
  operations: EditOperations;
  latencyNs: number;
  score: number;
  suggestion: string;
  hash: Buffer;
  timestamp: number;
}

export interface EditOperations {
  insertions: number;
  deletions: number;
  substitutions: number;
  transpositions?: number; // For Damerau-Levenshtein variant
}

export interface UnicodeMetrics {
  graphemeCount: number;
  visualWidth: number;
  isWellFormed: boolean;
  normalizedForm: string;
}

export interface ProfileConfig {
  name: string;
  environment: 'development' | 'staging' | 'production';
  similarityThresholds: SimilarityThresholds;
  cacheConfig: CacheConfig;
  performanceConfig: PerformanceConfig;
}

export interface SimilarityThresholds {
  exact: number;
  close: number;
  similar: number;
  partial: number;
  unrelated: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxEntries: number;
  strategy: 'lru' | 'fifo' | 'ttl';
}

export interface PerformanceConfig {
  matrixPreallocation: boolean;
  useBufferOperations: boolean;
  parallelThreshold: number;
  unicodeAware: boolean;
}

// ────────────────────────────────────────────────────────────────
// CONSTANTS - BUN_ prefix for exported SCREAMING_SNAKE_CASE
// ────────────────────────────────────────────────────────────────
export const BUN_LEVENSHTEIN_VERSION = '1.3.7-enhanced';
export const BUN_MAX_MATRIX_SIZE = 4096;
export const BUN_DEFAULT_SIMILARITY_THRESHOLDS: SimilarityThresholds = {
  exact: 0.0,
  close: 1.0,
  similar: 2.0,
  partial: 3.0,
  unrelated: 4.0
};

export const BUN_EDIT_OPERATION_WEIGHTS = {
  insertion: 1,
  deletion: 1,
  substitution: 2,
  transposition: 1
};

export const BUN_UNICODE_CATEGORIES = {
  COMBINING_MARK: /[\u0300-\u036f\u1ab0-\u1aff\u20d0-\u20ff\ufe20-\ufe2f]/,
  EMOJI: /\p{Emoji}/u,
  ZWJ: /\u200d/,
  VARIATION_SELECTOR: /[\ufe00-\ufe0f\ue0100-\ue01ef]/
};

export const BUN_PERFORMANCE_CONFIGS: Record<string, PerformanceConfig> = {
  development: {
    matrixPreallocation: true,
    useBufferOperations: false,
    parallelThreshold: 1000,
    unicodeAware: true
  },
  production: {
    matrixPreallocation: true,
    useBufferOperations: true,
    parallelThreshold: 100,
    unicodeAware: true
  },
  benchmark: {
    matrixPreallocation: true,
    useBufferOperations: true,
    parallelThreshold: 10,
    unicodeAware: false
  }
};

export const BUN_CACHE_STRATEGIES = {
  LRU: 'lru',
  FIFO: 'fifo',
  TTL: 'ttl'
} as const;

// ────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS - Internal (no BUN_ prefix needed)
// ────────────────────────────────────────────────────────────────
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

function calculateHash(a: string, b: string): Buffer {
  const combined = utf8Encoder.encode(`${a}|${b}`);
  const hash = new Bun.CryptoHasher('sha256').update(combined).digest();
  return Buffer.from(hash);
}

function normalizeUnicode(str: string): string {
  if (!str.isWellFormed?.()) {
    return str.normalize('NFC');
  }
  return str.normalize('NFC');
}

function countGraphemes(str: string): number {
  // Simple grapheme cluster counting using Intl.Segmenter when available
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str)).length;
  }
  
  // Fallback: count code points (approximation)
  let count = 0;
  for (const _ of str) {
    count++;
  }
  return count;
}

function calculateVisualWidth(str: string): number {
  // Use Bun's native stringWidth when available
  if (typeof Bun !== 'undefined' && 'stringWidth' in Bun) {
    return (Bun as any).stringWidth(str);
  }
  
  // Simplified fallback
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0);
    if (code !== undefined) {
      // East Asian Fullwidth characters
      if (
        (code >= 0x1100 && code <= 0x115F) || // Hangul Jamo
        (code >= 0x231A && code <= 0x231B) || // Miscellaneous Technical
        (code >= 0x2329 && code <= 0x232A) || // Miscellaneous Technical
        (code >= 0x23E9 && code <= 0x23EC) || // Miscellaneous Technical
        (code >= 0x23F0 && code <= 0x23F0) || // Miscellaneous Technical
        (code >= 0x23F3 && code <= 0x23F3) || // Miscellaneous Technical
        (code >= 0x25FD && code <= 0x25FE) || // Geometric Shapes
        (code >= 0x2614 && code <= 0x2615) || // Miscellaneous Symbols
        (code >= 0x2648 && code <= 0x2653) || // Miscellaneous Symbols
        (code >= 0x267F && code <= 0x267F) || // Miscellaneous Symbols
        (code >= 0x2693 && code <= 0x2693) || // Miscellaneous Symbols
        (code >= 0x26A1 && code <= 0x26A1) || // Miscellaneous Symbols
        (code >= 0x26AA && code <= 0x26AB) || // Miscellaneous Symbols
        (code >= 0x26BD && code <= 0x26BE) || // Miscellaneous Symbols
        (code >= 0x26C4 && code <= 0x26C5) || // Miscellaneous Symbols
        (code >= 0x26CE && code <= 0x26CE) || // Miscellaneous Symbols
        (code >= 0x26D4 && code <= 0x26D4) || // Miscellaneous Symbols
        (code >= 0x26EA && code <= 0x26EA) || // Miscellaneous Symbols
        (code >= 0x26F2 && code <= 0x26F3) || // Miscellaneous Symbols
        (code >= 0x26F5 && code <= 0x26F5) || // Miscellaneous Symbols
        (code >= 0x26FA && code <= 0x26FA) || // Miscellaneous Symbols
        (code >= 0x26FD && code <= 0x26FD) || // Miscellaneous Symbols
        (code >= 0x2705 && code <= 0x2705) || // Dingbats
        (code >= 0x270A && code <= 0x270B) || // Dingbats
        (code >= 0x2728 && code <= 0x2728) || // Dingbats
        (code >= 0x274C && code <= 0x274C) || // Dingbats
        (code >= 0x274E && code <= 0x274E) || // Dingbats
        (code >= 0x2753 && code <= 0x2755) || // Dingbats
        (code >= 0x2757 && code <= 0x2757) || // Dingbats
        (code >= 0x2795 && code <= 0x2797) || // Dingbats
        (code >= 0x27B0 && code <= 0x27B0) || // Dingbats
        (code >= 0x27BF && code <= 0x27BF) || // Dingbats
        (code >= 0x2B1B && code <= 0x2B1C) || // Miscellaneous Symbols and Arrows
        (code >= 0x2B50 && code <= 0x2B50) || // Miscellaneous Symbols and Arrows
        (code >= 0x2B55 && code <= 0x2B55)    // Miscellaneous Symbols and Arrows
      ) {
        width += 2;
      } else {
        width += 1;
      }
    }
  }
  return width;
}

// ────────────────────────────────────────────────────────────────
// CORE LEVENSHTEIN ENGINE
// ────────────────────────────────────────────────────────────────
export class LevenshteinEngine {
  private db: Database;
  private cache: Map<string, SimilarityResult>;
  private matrixBuffer: Buffer;
  private charCodeBuffer: Int32Array;
  private config: ProfileConfig;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config?: Partial<ProfileConfig>) {
    this.config = {
      name: 'default',
      environment: 'production',
      similarityThresholds: BUN_DEFAULT_SIMILARITY_THRESHOLDS,
      cacheConfig: {
        enabled: true,
        ttlSeconds: 3600,
        maxEntries: 10000,
        strategy: BUN_CACHE_STRATEGIES.LRU
      },
      performanceConfig: BUN_PERFORMANCE_CONFIGS.production,
      ...config
    };

    // Initialize buffers with optimal size
    this.matrixBuffer = Buffer.alloc(BUN_MAX_MATRIX_SIZE * BUN_MAX_MATRIX_SIZE * 4);
    this.charCodeBuffer = new Int32Array(BUN_MAX_MATRIX_SIZE * 2);

    // Initialize cache
    this.cache = new Map();

    // Initialize SQLite for persistent cache if needed
    if (this.config.cacheConfig.enabled) {
      this.db = new Database(':memory:', { create: true });
      this.initializeDatabase();
    }

    console.log(`🚀 Levenshtein Engine v${BUN_LEVENSHTEIN_VERSION} initialized`);
  }

  private initializeDatabase(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS similarity_cache (
        hash TEXT PRIMARY KEY,
        target TEXT NOT NULL,
        candidate TEXT NOT NULL,
        distance INTEGER NOT NULL,
        normalized_distance REAL NOT NULL,
        score REAL NOT NULL,
        operations TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      ) STRICT;
      
      CREATE INDEX IF NOT EXISTS idx_hash ON similarity_cache(hash);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON similarity_cache(timestamp);
      
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
    `);
  }

  private getCachedResult(hash: string): SimilarityResult | null {
    if (!this.config.cacheConfig.enabled) return null;

    // Check memory cache first
    const cached = this.cache.get(hash);
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    // Check database cache
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM similarity_cache 
        WHERE hash = ? 
        LIMIT 1
      `);
      
      const row = stmt.get(hash) as any;
      if (row) {
        const result: SimilarityResult = {
          target: row.target,
          candidate: row.candidate,
          distance: row.distance,
          normalizedDistance: row.normalized_distance,
          operations: JSON.parse(row.operations),
          latencyNs: 0, // Not stored in cache
          score: row.score,
          suggestion: this.generateSuggestion(row.score, row.target, row.candidate),
          hash: Buffer.from(hash, 'hex'),
          timestamp: row.timestamp
        };
        
        this.cache.set(hash, result);
        this.cacheHits++;
        return result;
      }
    } catch (error) {
      // Cache miss is okay
    }

    this.cacheMisses++;
    return null;
  }

  private cacheResult(hash: string, result: SimilarityResult): void {
    if (!this.config.cacheConfig.enabled) return;

    // Add to memory cache
    this.cache.set(hash, result);

    // Enforce cache limits
    if (this.cache.size > this.config.cacheConfig.maxEntries) {
      const keys = Array.from(this.cache.keys());
      const toRemove = keys.slice(0, keys.length - this.config.cacheConfig.maxEntries);
      toRemove.forEach(key => this.cache.delete(key));
    }

    // Async database write
    setTimeout(() => {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO similarity_cache 
          (hash, target, candidate, distance, normalized_distance, score, operations, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          hash,
          result.target,
          result.candidate,
          result.distance,
          result.normalizedDistance,
          result.score,
          JSON.stringify(result.operations),
          result.timestamp
        );
      } catch (error) {
        // Cache write errors are non-critical
      }
    }, 0);
  }

  // ────────────────────────────────────────────────────────────────
  // OPTIMIZED LEVENSHTEIN ALGORITHM
  // ────────────────────────────────────────────────────────────────
  private calculateLevenshteinDistance(
    a: string,
    b: string,
    options?: { useBufferOps?: boolean; unicodeAware?: boolean }
  ): { distance: number; operations: EditOperations } {
    const useBufferOps = options?.useBufferOps ?? this.config.performanceConfig.useBufferOperations;
    const unicodeAware = options?.unicodeAware ?? this.config.performanceConfig.unicodeAware;

    const processedA = unicodeAware ? normalizeUnicode(a) : a;
    const processedB = unicodeAware ? normalizeUnicode(b) : b;

    const n = processedA.length;
    const m = processedB.length;

    // Handle edge cases
    if (n === 0) return { distance: m, operations: { insertions: m, deletions: 0, substitutions: 0 } };
    if (m === 0) return { distance: n, operations: { insertions: 0, deletions: n, substitutions: 0 } };

    // Convert to char codes using optimized method
    let aCodes: Int32Array, bCodes: Int32Array;
    
    if (useBufferOps && n + m < BUN_MAX_MATRIX_SIZE) {
      aCodes = this.stringToCharCodesBuffer(processedA, 0);
      bCodes = this.stringToCharCodesBuffer(processedB, n);
    } else {
      aCodes = this.stringToCharCodesSimple(processedA);
      bCodes = this.stringToCharCodesSimple(processedB);
    }

    // Wagner-Fischer algorithm with space optimization
    if (useBufferOps) {
      return this.levenshteinWithBuffer(aCodes, bCodes, n, m);
    } else {
      return this.levenshteinSimple(aCodes, bCodes, n, m);
    }
  }

  private stringToCharCodesBuffer(str: string, offset: number): Int32Array {
    for (let i = 0; i < str.length && i + offset < this.charCodeBuffer.length; i++) {
      this.charCodeBuffer[i + offset] = str.charCodeAt(i);
    }
    return new Int32Array(this.charCodeBuffer.buffer, offset * 4, str.length);
  }

  private stringToCharCodesSimple(str: string): Int32Array {
    const codes = new Int32Array(str.length);
    for (let i = 0; i < str.length; i++) {
      codes[i] = str.charCodeAt(i);
    }
    return codes;
  }

  private levenshteinWithBuffer(
    a: Int32Array,
    b: Int32Array,
    n: number,
    m: number
  ): { distance: number; operations: EditOperations } {
    // Use two rows instead of full matrix
    const prevRow = new Int32Array(m + 1);
    const currRow = new Int32Array(m + 1);

    // Initialize first row
    for (let j = 0; j <= m; j++) {
      prevRow[j] = j;
    }

    const operations: EditOperations = {
      insertions: 0,
      deletions: 0,
      substitutions: 0
    };

    // Fill matrix
    for (let i = 1; i <= n; i++) {
      currRow[0] = i;
      const aChar = a[i - 1];

      for (let j = 1; j <= m; j++) {
        const bChar = b[j - 1];
        const cost = aChar === bChar ? 0 : 1;

        const insertCost = currRow[j - 1] + BUN_EDIT_OPERATION_WEIGHTS.insertion;
        const deleteCost = prevRow[j] + BUN_EDIT_OPERATION_WEIGHTS.deletion;
        const substituteCost = prevRow[j - 1] + cost * BUN_EDIT_OPERATION_WEIGHTS.substitution;

        currRow[j] = Math.min(insertCost, deleteCost, substituteCost);
      }

      // Swap rows
      const temp = prevRow;
      prevRow.set(currRow);
      currRow.set(temp);
    }

    // Backtrack to count operations (optional - can be skipped for performance)
    this.backtrackOperations(a, b, n, m, prevRow[m], operations);

    return {
      distance: prevRow[m],
      operations
    };
  }

  private levenshteinSimple(
    a: Int32Array,
    b: Int32Array,
    n: number,
    m: number
  ): { distance: number; operations: EditOperations } {
    // Traditional implementation
    const matrix = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      matrix[i] = new Array(m + 1);
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= n; i++) {
      const aChar = a[i - 1];
      
      for (let j = 1; j <= m; j++) {
        const bChar = b[j - 1];
        const cost = aChar === bChar ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + BUN_EDIT_OPERATION_WEIGHTS.deletion,
          matrix[i][j - 1] + BUN_EDIT_OPERATION_WEIGHTS.insertion,
          matrix[i - 1][j - 1] + cost * BUN_EDIT_OPERATION_WEIGHTS.substitution
        );
      }
    }

    const operations = this.backtrackOperationsSimple(a, b, n, m, matrix);

    return {
      distance: matrix[n][m],
      operations
    };
  }

  private backtrackOperations(
    a: Int32Array,
    b: Int32Array,
    n: number,
    m: number,
    distance: number,
    operations: EditOperations
  ): void {
    // Simplified backtracking - approximate operation counts
    // For exact counts, we'd need the full matrix
    const maxOps = Math.max(n, m);
    operations.insertions = Math.max(0, m - n);
    operations.deletions = Math.max(0, n - m);
    operations.substitutions = distance - operations.insertions - operations.deletions;
  }

  private backtrackOperationsSimple(
    a: Int32Array,
    b: Int32Array,
    n: number,
    m: number,
    matrix: number[][]
  ): EditOperations {
    const operations: EditOperations = {
      insertions: 0,
      deletions: 0,
      substitutions: 0
    };

    let i = n, j = m;
    
    while (i > 0 || j > 0) {
      if (i === 0) {
        operations.insertions++;
        j--;
      } else if (j === 0) {
        operations.deletions++;
        i--;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const current = matrix[i][j];
        
        if (current === matrix[i - 1][j - 1] + cost) {
          if (cost === 1) operations.substitutions++;
          i--; j--;
        } else if (current === matrix[i][j - 1] + 1) {
          operations.insertions++;
          j--;
        } else {
          operations.deletions++;
          i--;
        }
      }
    }

    return operations;
  }

  // ────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────
  public calculateSimilarity(
    target: string,
    candidate: string,
    options?: {
      unicodeAware?: boolean;
      useCache?: boolean;
      profileName?: string;
    }
  ): SimilarityResult {
    const startNs = Bun.nanoseconds();
    const hash = calculateHash(target, candidate).toString('hex');
    const useCache = options?.useCache ?? true;
    const unicodeAware = options?.unicodeAware ?? this.config.performanceConfig.unicodeAware;

    // Check cache
    if (useCache) {
      const cached = this.getCachedResult(hash);
      if (cached) {
        cached.latencyNs = Bun.nanoseconds() - startNs;
        return cached;
      }
    }

    // Calculate distance
    const { distance, operations } = this.calculateLevenshteinDistance(
      target,
      candidate,
      { unicodeAware }
    );

    // Calculate normalized distance (0-999 scale)
    const maxLen = Math.max(target.length, candidate.length);
    const normalizedDistance = maxLen === 0 ? 0 : Math.min(
      999,
      Math.floor((distance / maxLen) * 999)
    );

    // Calculate complexity-weighted operations
    const operationComplexity = 
      operations.insertions * BUN_EDIT_OPERATION_WEIGHTS.insertion +
      operations.deletions * BUN_EDIT_OPERATION_WEIGHTS.deletion +
      operations.substitutions * BUN_EDIT_OPERATION_WEIGHTS.substitution;

    // Determine category
    const category = this.categorizeSimilarity(normalizedDistance, target, candidate);

    // Calculate score: S = C + (N×10⁻³) + (E×10⁻⁶) + (T×10⁻⁹)
    const latencyNs = Bun.nanoseconds() - startNs;
    const score = category + 
                 (normalizedDistance * 0.001) + 
                 (operationComplexity * 0.000001) + 
                 (Number(latencyNs) * 0.000000001);

    const result: SimilarityResult = {
      target,
      candidate,
      distance,
      normalizedDistance,
      operations,
      latencyNs: Number(latencyNs),
      score: Math.round(score * 1e9) / 1e9, // 9 decimal precision
      suggestion: this.generateSuggestion(score, target, candidate),
      hash: Buffer.from(hash, 'hex'),
      timestamp: Number(startNs)
    };

    // Cache result
    if (useCache) {
      this.cacheResult(hash, result);
    }

    return result;
  }

  public batchCalculate(
    target: string,
    candidates: string[],
    options?: {
      concurrency?: number;
      unicodeAware?: boolean;
      profileName?: string;
    }
  ): Promise<SimilarityResult[]> {
    const concurrency = options?.concurrency ?? 
      (candidates.length > this.config.performanceConfig.parallelThreshold ? 4 : 1);

    const chunks: string[][] = [];
    for (let i = 0; i < candidates.length; i += concurrency) {
      chunks.push(candidates.slice(i, i + concurrency));
    }

    const results: SimilarityResult[] = [];

    return new Promise((resolve) => {
      const processChunk = async (chunk: string[], index: number) => {
        for (const candidate of chunk) {
          results[index] = this.calculateSimilarity(target, candidate, options);
        }
      };

      Promise.all(chunks.map(processChunk)).then(() => {
        // Sort by similarity score (ascending = more similar)
        results.sort((a, b) => a.score - b.score);
        resolve(results);
      });
    });
  }

  public analyzeUnicode(text: string): UnicodeMetrics {
    return {
      graphemeCount: countGraphemes(text),
      visualWidth: calculateVisualWidth(text),
      isWellFormed: text.isWellFormed?.() ?? true,
      normalizedForm: normalizeUnicode(text)
    };
  }

  // ────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ────────────────────────────────────────────────────────────────
  private categorizeSimilarity(
    normalizedDistance: number,
    target: string,
    candidate: string
  ): number {
    const thresholds = this.config.similarityThresholds;

    // Check for exact match
    if (target === candidate) return thresholds.exact;

    // Check for substring match
    if (candidate.includes(target) || target.includes(candidate)) {
      return normalizedDistance < 100 ? thresholds.exact : thresholds.close;
    }

    // Categorize based on normalized distance
    if (normalizedDistance < 100) return thresholds.exact;
    if (normalizedDistance < 300) return thresholds.close;
    if (normalizedDistance < 500) return thresholds.similar;
    if (normalizedDistance < 700) return thresholds.partial;
    return thresholds.unrelated;
  }

  private generateSuggestion(score: number, target: string, candidate: string): string {
    const thresholds = this.config.similarityThresholds;

    if (score < thresholds.close) return `✅ Exact match: ${candidate}`;
    if (score < thresholds.similar) return `💡 Did you mean: ${candidate}?`;
    if (score < thresholds.partial) return `📎 Similar: ${candidate}`;
    if (score < thresholds.unrelated) return `🔗 Related: ${candidate}`;
    return `❌ No match for: ${target}`;
  }

  public getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }

  public clearCache(): void {
    this.cache.clear();
    if (this.db) {
      this.db.run('DELETE FROM similarity_cache');
    }
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  public async exportCache(filePath: string): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      SELECT * FROM similarity_cache 
      ORDER BY timestamp DESC
    `);
    
    const rows = stmt.all() as any[];
    const data = {
      version: BUN_LEVENSHTEIN_VERSION,
      timestamp: Date.now(),
      entries: rows.map(row => ({
        ...row,
        operations: JSON.parse(row.operations)
      }))
    };

    await Bun.write(filePath, JSON.stringify(data, null, 2));
  }

  // ────────────────────────────────────────────────────────────────
  // PERFORMANCE UTILITIES
  // ────────────────────────────────────────────────────────────────
  public benchmark(
    iterations: number = 1000,
    stringLength: number = 32
  ): Promise<BenchmarkResult> {
    return new Promise((resolve) => {
      const times: number[] = [];
      const memorySamples: number[] = [];

      // Warm up
      for (let i = 0; i < Math.min(10, iterations); i++) {
        this.calculateSimilarity('a'.repeat(stringLength), 'b'.repeat(stringLength), {
          useCache: false
        });
      }

      // Benchmark
      for (let i = 0; i < iterations; i++) {
        const target = 't'.repeat(stringLength) + i;
        const candidate = 'c'.repeat(stringLength) + i;
        
        const start = Bun.nanoseconds();
        this.calculateSimilarity(target, candidate, { useCache: false });
        times.push(Bun.nanoseconds() - start);
        
        if (i % 100 === 0) {
          memorySamples.push(process.memoryUsage().heapUsed);
        }
      }

      const sortedTimes = [...times].sort((a, b) => a - b);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const p95Time = sortedTimes[Math.floor(times.length * 0.95)];
      const p99Time = sortedTimes[Math.floor(times.length * 0.99)];

      resolve({
        iterations,
        stringLength,
        averageTimeNs: avgTime,
        p95TimeNs: p95Time,
        p99TimeNs: p99Time,
        minTimeNs: sortedTimes[0],
        maxTimeNs: sortedTimes[times.length - 1],
        memoryUsage: memorySamples.length > 0 ? 
          memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length : 0,
        cacheStats: this.getCacheStats()
      });
    });
  }
}

// ────────────────────────────────────────────────────────────────
// TYPES FOR BENCHMARKING
// ────────────────────────────────────────────────────────────────
export interface BenchmarkResult {
  iterations: number;
  stringLength: number;
  averageTimeNs: number;
  p95TimeNs: number;
  p99TimeNs: number;
  minTimeNs: number;
  maxTimeNs: number;
  memoryUsage: number;
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// ────────────────────────────────────────────────────────────────
// ONE-LINER EXPORTS
// ────────────────────────────────────────────────────────────────
export const levenshtein = new LevenshteinEngine();
export const developmentEngine = new LevenshteinEngine({
  environment: 'development',
  performanceConfig: BUN_PERFORMANCE_CONFIGS.development
});
export const productionEngine = new LevenshteinEngine({
  environment: 'production',
  performanceConfig: BUN_PERFORMANCE_CONFIGS.production
});

// ────────────────────────────────────────────────────────────────
// EXAMPLE USAGE (when run directly)
// ────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  
  if (args[0] === 'compare' && args.length >= 3) {
    const engine = new LevenshteinEngine();
    const result = engine.calculateSimilarity(args[1], args[2]);
    
    console.log(`
┌─────────────────────────────────────────────┐
│ Levenshtein Similarity Result              │
├─────────────────────────────────────────────┤
│ Target:      ${result.target.padEnd(30)}│
│ Candidate:   ${result.candidate.padEnd(30)}│
│ Distance:    ${result.distance.toString().padEnd(30)}│
│ Score:       ${result.score.toFixed(9).padEnd(30)}│
│ Latency:     ${(result.latencyNs / 1000).toFixed(2)}µs${' '.repeat(22)}│
│ Suggestion:  ${result.suggestion.padEnd(30)}│
└─────────────────────────────────────────────┘
    `);
  } else if (args[0] === 'benchmark') {
    const iterations = parseInt(args[1]) || 1000;
    const length = parseInt(args[2]) || 32;
    
    const engine = new LevenshteinEngine({
      environment: 'benchmark',
      performanceConfig: BUN_PERFORMANCE_CONFIGS.benchmark
    });
    
    console.log(`Running benchmark: ${iterations} iterations, ${length} chars`);
    engine.benchmark(iterations, length).then(result => {
      console.log(`
┌─────────────────────────────────────────────┐
│ Benchmark Results                          │
├─────────────────────────────────────────────┤
│ Iterations:    ${result.iterations.toString().padEnd(30)}│
│ String Length: ${result.stringLength.toString().padEnd(30)}│
│ Average Time:  ${(result.averageTimeNs / 1000).toFixed(2)}µs${' '.repeat(22)}│
│ P95 Time:      ${(result.p95TimeNs / 1000).toFixed(2)}µs${' '.repeat(22)}│
│ P99 Time:      ${(result.p99TimeNs / 1000).toFixed(2)}µs${' '.repeat(22)}│
│ Memory:        ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB${' '.repeat(24)}│
│ Cache Hit Rate:${result.cacheStats.hitRate.toFixed(2)}%${' '.repeat(25)}│
└─────────────────────────────────────────────┘
      `);
    });
  } else {
    console.log(`
Usage:
  bun levenshtein-tier1380.ts compare <string1> <string2>
  bun levenshtein-tier1380.ts benchmark [iterations] [length]

Examples:
  bun levenshtein-tier1380.ts compare npm com.npm.registry
  bun levenshtein-tier1380.ts benchmark 10000 64
    `);
  }
}
