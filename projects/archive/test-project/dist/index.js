// ../levenshtein-tier1380.ts
import { Database } from "bun:sqlite";
var BUN_LEVENSHTEIN_VERSION = "1.3.7-enhanced";
var BUN_MAX_MATRIX_SIZE = 4096;
var BUN_DEFAULT_SIMILARITY_THRESHOLDS = {
  exact: 0,
  close: 1,
  similar: 2,
  partial: 3,
  unrelated: 4
};
var BUN_EDIT_OPERATION_WEIGHTS = {
  insertion: 1,
  deletion: 1,
  substitution: 2,
  transposition: 1
};
var BUN_PERFORMANCE_CONFIGS = {
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
var BUN_CACHE_STRATEGIES = {
  LRU: "lru",
  FIFO: "fifo",
  TTL: "ttl"
};
var utf8Encoder = new TextEncoder;
var utf8Decoder = new TextDecoder;
function calculateHash(a, b) {
  const combined = utf8Encoder.encode(`${a}|${b}`);
  const hash = new Bun.CryptoHasher("sha256").update(combined).digest();
  return Buffer.from(hash);
}
function normalizeUnicode(str) {
  if (!str.isWellFormed?.()) {
    return str.normalize("NFC");
  }
  return str.normalize("NFC");
}
function countGraphemes(str) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(str)).length;
  }
  let count = 0;
  for (const _ of str) {
    count++;
  }
  return count;
}
function calculateVisualWidth(str) {
  if (typeof Bun !== "undefined" && "stringWidth" in Bun) {
    return Bun.stringWidth(str);
  }
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0);
    if (code !== undefined) {
      if (code >= 4352 && code <= 4447 || code >= 8986 && code <= 8987 || code >= 9001 && code <= 9002 || code >= 9193 && code <= 9196 || code >= 9200 && code <= 9200 || code >= 9203 && code <= 9203 || code >= 9725 && code <= 9726 || code >= 9748 && code <= 9749 || code >= 9800 && code <= 9811 || code >= 9855 && code <= 9855 || code >= 9875 && code <= 9875 || code >= 9889 && code <= 9889 || code >= 9898 && code <= 9899 || code >= 9917 && code <= 9918 || code >= 9924 && code <= 9925 || code >= 9934 && code <= 9934 || code >= 9940 && code <= 9940 || code >= 9962 && code <= 9962 || code >= 9970 && code <= 9971 || code >= 9973 && code <= 9973 || code >= 9978 && code <= 9978 || code >= 9981 && code <= 9981 || code >= 9989 && code <= 9989 || code >= 9994 && code <= 9995 || code >= 10024 && code <= 10024 || code >= 10060 && code <= 10060 || code >= 10062 && code <= 10062 || code >= 10067 && code <= 10069 || code >= 10071 && code <= 10071 || code >= 10133 && code <= 10135 || code >= 10160 && code <= 10160 || code >= 10175 && code <= 10175 || code >= 11035 && code <= 11036 || code >= 11088 && code <= 11088 || code >= 11093 && code <= 11093) {
        width += 2;
      } else {
        width += 1;
      }
    }
  }
  return width;
}

class LevenshteinEngine {
  db;
  cache;
  matrixBuffer;
  charCodeBuffer;
  config;
  cacheHits = 0;
  cacheMisses = 0;
  constructor(config) {
    this.config = {
      name: "default",
      environment: "production",
      similarityThresholds: BUN_DEFAULT_SIMILARITY_THRESHOLDS,
      cacheConfig: {
        enabled: true,
        ttlSeconds: 3600,
        maxEntries: 1e4,
        strategy: BUN_CACHE_STRATEGIES.LRU
      },
      performanceConfig: BUN_PERFORMANCE_CONFIGS.production,
      ...config
    };
    this.matrixBuffer = Buffer.alloc(BUN_MAX_MATRIX_SIZE * BUN_MAX_MATRIX_SIZE * 4);
    this.charCodeBuffer = new Int32Array(BUN_MAX_MATRIX_SIZE * 2);
    this.cache = new Map;
    if (this.config.cacheConfig.enabled) {
      this.db = new Database(":memory:", { create: true });
      this.initializeDatabase();
    }
    console.log(`\uD83D\uDE80 Levenshtein Engine v${BUN_LEVENSHTEIN_VERSION} initialized`);
  }
  initializeDatabase() {
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
  getCachedResult(hash) {
    if (!this.config.cacheConfig.enabled)
      return null;
    const cached = this.cache.get(hash);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM similarity_cache 
        WHERE hash = ? 
        LIMIT 1
      `);
      const row = stmt.get(hash);
      if (row) {
        const result = {
          target: row.target,
          candidate: row.candidate,
          distance: row.distance,
          normalizedDistance: row.normalized_distance,
          operations: JSON.parse(row.operations),
          latencyNs: 0,
          score: row.score,
          suggestion: this.generateSuggestion(row.score, row.target, row.candidate),
          hash: Buffer.from(hash, "hex"),
          timestamp: row.timestamp
        };
        this.cache.set(hash, result);
        this.cacheHits++;
        return result;
      }
    } catch (error) {}
    this.cacheMisses++;
    return null;
  }
  cacheResult(hash, result) {
    if (!this.config.cacheConfig.enabled)
      return;
    this.cache.set(hash, result);
    if (this.cache.size > this.config.cacheConfig.maxEntries) {
      const keys = Array.from(this.cache.keys());
      const toRemove = keys.slice(0, keys.length - this.config.cacheConfig.maxEntries);
      toRemove.forEach((key) => this.cache.delete(key));
    }
    setTimeout(() => {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO similarity_cache 
          (hash, target, candidate, distance, normalized_distance, score, operations, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(hash, result.target, result.candidate, result.distance, result.normalizedDistance, result.score, JSON.stringify(result.operations), result.timestamp);
      } catch (error) {}
    }, 0);
  }
  calculateLevenshteinDistance(a, b, options) {
    const useBufferOps = options?.useBufferOps ?? this.config.performanceConfig.useBufferOperations;
    const unicodeAware = options?.unicodeAware ?? this.config.performanceConfig.unicodeAware;
    const processedA = unicodeAware ? normalizeUnicode(a) : a;
    const processedB = unicodeAware ? normalizeUnicode(b) : b;
    const n = processedA.length;
    const m = processedB.length;
    if (n === 0)
      return { distance: m, operations: { insertions: m, deletions: 0, substitutions: 0 } };
    if (m === 0)
      return { distance: n, operations: { insertions: 0, deletions: n, substitutions: 0 } };
    let aCodes, bCodes;
    if (useBufferOps && n + m < BUN_MAX_MATRIX_SIZE) {
      aCodes = this.stringToCharCodesBuffer(processedA, 0);
      bCodes = this.stringToCharCodesBuffer(processedB, n);
    } else {
      aCodes = this.stringToCharCodesSimple(processedA);
      bCodes = this.stringToCharCodesSimple(processedB);
    }
    if (useBufferOps) {
      return this.levenshteinWithBuffer(aCodes, bCodes, n, m);
    } else {
      return this.levenshteinSimple(aCodes, bCodes, n, m);
    }
  }
  stringToCharCodesBuffer(str, offset) {
    for (let i = 0;i < str.length && i + offset < this.charCodeBuffer.length; i++) {
      this.charCodeBuffer[i + offset] = str.charCodeAt(i);
    }
    return new Int32Array(this.charCodeBuffer.buffer, offset * 4, str.length);
  }
  stringToCharCodesSimple(str) {
    const codes = new Int32Array(str.length);
    for (let i = 0;i < str.length; i++) {
      codes[i] = str.charCodeAt(i);
    }
    return codes;
  }
  levenshteinWithBuffer(a, b, n, m) {
    const prevRow = new Int32Array(m + 1);
    const currRow = new Int32Array(m + 1);
    for (let j = 0;j <= m; j++) {
      prevRow[j] = j;
    }
    const operations = {
      insertions: 0,
      deletions: 0,
      substitutions: 0
    };
    for (let i = 1;i <= n; i++) {
      currRow[0] = i;
      const aChar = a[i - 1];
      for (let j = 1;j <= m; j++) {
        const bChar = b[j - 1];
        const cost = aChar === bChar ? 0 : 1;
        const insertCost = currRow[j - 1] + BUN_EDIT_OPERATION_WEIGHTS.insertion;
        const deleteCost = prevRow[j] + BUN_EDIT_OPERATION_WEIGHTS.deletion;
        const substituteCost = prevRow[j - 1] + cost * BUN_EDIT_OPERATION_WEIGHTS.substitution;
        currRow[j] = Math.min(insertCost, deleteCost, substituteCost);
      }
      const temp = prevRow;
      prevRow.set(currRow);
      currRow.set(temp);
    }
    this.backtrackOperations(a, b, n, m, prevRow[m], operations);
    return {
      distance: prevRow[m],
      operations
    };
  }
  levenshteinSimple(a, b, n, m) {
    const matrix = new Array(n + 1);
    for (let i = 0;i <= n; i++) {
      matrix[i] = new Array(m + 1);
      matrix[i][0] = i;
    }
    for (let j = 0;j <= m; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1;i <= n; i++) {
      const aChar = a[i - 1];
      for (let j = 1;j <= m; j++) {
        const bChar = b[j - 1];
        const cost = aChar === bChar ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + BUN_EDIT_OPERATION_WEIGHTS.deletion, matrix[i][j - 1] + BUN_EDIT_OPERATION_WEIGHTS.insertion, matrix[i - 1][j - 1] + cost * BUN_EDIT_OPERATION_WEIGHTS.substitution);
      }
    }
    const operations = this.backtrackOperationsSimple(a, b, n, m, matrix);
    return {
      distance: matrix[n][m],
      operations
    };
  }
  backtrackOperations(a, b, n, m, distance, operations) {
    const maxOps = Math.max(n, m);
    operations.insertions = Math.max(0, m - n);
    operations.deletions = Math.max(0, n - m);
    operations.substitutions = distance - operations.insertions - operations.deletions;
  }
  backtrackOperationsSimple(a, b, n, m, matrix) {
    const operations = {
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
          if (cost === 1)
            operations.substitutions++;
          i--;
          j--;
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
  calculateSimilarity(target, candidate, options) {
    const startNs = Bun.nanoseconds();
    const hash = calculateHash(target, candidate).toString("hex");
    const useCache = options?.useCache ?? true;
    const unicodeAware = options?.unicodeAware ?? this.config.performanceConfig.unicodeAware;
    if (useCache) {
      const cached = this.getCachedResult(hash);
      if (cached) {
        cached.latencyNs = Bun.nanoseconds() - startNs;
        return cached;
      }
    }
    const { distance, operations } = this.calculateLevenshteinDistance(target, candidate, { unicodeAware });
    const maxLen = Math.max(target.length, candidate.length);
    const normalizedDistance = maxLen === 0 ? 0 : Math.min(999, Math.floor(distance / maxLen * 999));
    const operationComplexity = operations.insertions * BUN_EDIT_OPERATION_WEIGHTS.insertion + operations.deletions * BUN_EDIT_OPERATION_WEIGHTS.deletion + operations.substitutions * BUN_EDIT_OPERATION_WEIGHTS.substitution;
    const category = this.categorizeSimilarity(normalizedDistance, target, candidate);
    const latencyNs = Bun.nanoseconds() - startNs;
    const score = category + normalizedDistance * 0.001 + operationComplexity * 0.000001 + Number(latencyNs) * 0.000000001;
    const result = {
      target,
      candidate,
      distance,
      normalizedDistance,
      operations,
      latencyNs: Number(latencyNs),
      score: Math.round(score * 1e9) / 1e9,
      suggestion: this.generateSuggestion(score, target, candidate),
      hash: Buffer.from(hash, "hex"),
      timestamp: Number(startNs)
    };
    if (useCache) {
      this.cacheResult(hash, result);
    }
    return result;
  }
  batchCalculate(target, candidates, options) {
    const concurrency = options?.concurrency ?? (candidates.length > this.config.performanceConfig.parallelThreshold ? 4 : 1);
    const chunks = [];
    for (let i = 0;i < candidates.length; i += concurrency) {
      chunks.push(candidates.slice(i, i + concurrency));
    }
    const results = [];
    return new Promise((resolve) => {
      const processChunk = async (chunk, index) => {
        for (const candidate of chunk) {
          results[index] = this.calculateSimilarity(target, candidate, options);
        }
      };
      Promise.all(chunks.map(processChunk)).then(() => {
        results.sort((a, b) => a.score - b.score);
        resolve(results);
      });
    });
  }
  analyzeUnicode(text) {
    return {
      graphemeCount: countGraphemes(text),
      visualWidth: calculateVisualWidth(text),
      isWellFormed: text.isWellFormed?.() ?? true,
      normalizedForm: normalizeUnicode(text)
    };
  }
  categorizeSimilarity(normalizedDistance, target, candidate) {
    const thresholds = this.config.similarityThresholds;
    if (target === candidate)
      return thresholds.exact;
    if (candidate.includes(target) || target.includes(candidate)) {
      return normalizedDistance < 100 ? thresholds.exact : thresholds.close;
    }
    if (normalizedDistance < 100)
      return thresholds.exact;
    if (normalizedDistance < 300)
      return thresholds.close;
    if (normalizedDistance < 500)
      return thresholds.similar;
    if (normalizedDistance < 700)
      return thresholds.partial;
    return thresholds.unrelated;
  }
  generateSuggestion(score, target, candidate) {
    const thresholds = this.config.similarityThresholds;
    if (score < thresholds.close)
      return `✅ Exact match: ${candidate}`;
    if (score < thresholds.similar)
      return `\uD83D\uDCA1 Did you mean: ${candidate}?`;
    if (score < thresholds.partial)
      return `\uD83D\uDCCE Similar: ${candidate}`;
    if (score < thresholds.unrelated)
      return `\uD83D\uDD17 Related: ${candidate}`;
    return `❌ No match for: ${target}`;
  }
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total * 100 : 0;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }
  clearCache() {
    this.cache.clear();
    if (this.db) {
      this.db.run("DELETE FROM similarity_cache");
    }
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  async exportCache(filePath) {
    if (!this.db)
      return;
    const stmt = this.db.prepare(`
      SELECT * FROM similarity_cache 
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all();
    const data = {
      version: BUN_LEVENSHTEIN_VERSION,
      timestamp: Date.now(),
      entries: rows.map((row) => ({
        ...row,
        operations: JSON.parse(row.operations)
      }))
    };
    await Bun.write(filePath, JSON.stringify(data, null, 2));
  }
  benchmark(iterations = 1000, stringLength = 32) {
    return new Promise((resolve) => {
      const times = [];
      const memorySamples = [];
      for (let i = 0;i < Math.min(10, iterations); i++) {
        this.calculateSimilarity("a".repeat(stringLength), "b".repeat(stringLength), {
          useCache: false
        });
      }
      for (let i = 0;i < iterations; i++) {
        const target = "t".repeat(stringLength) + i;
        const candidate = "c".repeat(stringLength) + i;
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
        memoryUsage: memorySamples.length > 0 ? memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length : 0,
        cacheStats: this.getCacheStats()
      });
    });
  }
}
var levenshtein = new LevenshteinEngine;
var developmentEngine = new LevenshteinEngine({
  environment: "development",
  performanceConfig: BUN_PERFORMANCE_CONFIGS.development
});
var productionEngine = new LevenshteinEngine({
  environment: "production",
  performanceConfig: BUN_PERFORMANCE_CONFIGS.production
});
if (false) {}

// src/index.ts
import { readFile } from "fs/promises";
import { join } from "path";
var __dirname = "/Users/nolarose/Projects/test-project/src";
console.log("Testing import tracking plugin");
var engine = new LevenshteinEngine;
var data = await readFile(join(__dirname, "data.txt"), "utf-8");
console.log("Loaded data:", data.length, "characters");
console.log("Engine version:", engine);
