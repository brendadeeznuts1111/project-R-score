/**
 * [UTILITY][TOKEN][MATCHER]{BUN-NATIVE}
 * Token extraction and similarity matching for content analysis
 * Zero-npm, enterprise-grade token processing
 */

/**
 * [1.0.0.0] Token Analysis Result
 * Represents extracted tokens and their metrics
 *
 * @tags token,analysis,metrics
 */
export interface TokenAnalysis {
  tokens: string[];
  uniqueTokens: Set<string>;
  frequency: Map<string, number>;
  totalTokens: number;
  uniqueCount: number;
}

/**
 * [1.1.0.0] Token Comparison Result
 * Results from comparing two token sets
 *
 * @tags token,comparison,similarity
 */
export interface TokenComparison {
  commonTokens: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  overlapScore: number;
  jaccardSimilarity: number;
  cosineSimilarity: number;
}

/**
 * [1.2.0.0] Token Matcher Configuration
 * Options for token extraction and matching
 *
 * @tags token,config,options
 */
export interface TokenMatcherConfig {
  minTokenLength?: number;
  stopWords?: Set<string>;
  caseSensitive?: boolean;
  includeNumbers?: boolean;
}

/**
 * [1.3.0.0] Token Matcher Class
 * Extracts and compares tokens from text content
 *
 * @tags token,matcher,analyzer,enterprise
 */
export class TokenMatcher {
  private config: Required<TokenMatcherConfig>;
  private defaultStopWords: Set<string>;

  /**
   * [1.3.1.0] Constructor
   * Initialize token matcher with configuration
   */
  constructor(config: TokenMatcherConfig = {}) {
    this.defaultStopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
    ]);

    this.config = {
      minTokenLength: config.minTokenLength ?? 3,
      stopWords: config.stopWords ?? this.defaultStopWords,
      caseSensitive: config.caseSensitive ?? false,
      includeNumbers: config.includeNumbers ?? false,
    };
  }

  /**
   * [1.3.2.0] Extract tokens from text
   * @param text - Input text to tokenize
   * @returns Token analysis with frequency metrics
   */
  extract(text: string): TokenAnalysis {
    // Normalize text
    let normalized = text;
    if (!this.config.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    // Split into tokens
    const tokens = normalized
      .split(/\s+/)
      .map((token) => token.replace(/[^\w-]/g, ""))
      .filter((token) => {
        if (token.length < this.config.minTokenLength) return false;
        if (this.config.stopWords.has(token)) return false;
        if (!this.config.includeNumbers && /^\d+$/.test(token)) return false;
        return true;
      });

    // Calculate frequency
    const frequency = new Map<string, number>();
    for (const token of tokens) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }

    return {
      tokens,
      uniqueTokens: new Set(tokens),
      frequency,
      totalTokens: tokens.length,
      uniqueCount: new Set(tokens).size,
    };
  }

  /**
   * [1.3.3.0] Compare two token sets
   * @param textA - First text
   * @param textB - Second text
   * @returns Comparison metrics
   */
  compare(textA: string, textB: string): TokenComparison {
    const analysisA = this.extract(textA);
    const analysisB = this.extract(textB);

    const setA = analysisA.uniqueTokens;
    const setB = analysisB.uniqueTokens;

    // Common tokens
    const commonTokens = Array.from(setA).filter((t) => setB.has(t));

    // Unique tokens
    const uniqueToA = Array.from(setA).filter((t) => !setB.has(t));
    const uniqueToB = Array.from(setB).filter((t) => !setA.has(t));

    // Overlap score (0-1)
    const overlapScore =
      commonTokens.length /
      Math.max(Math.max(setA.size, setB.size), 1);

    // Jaccard similarity
    const intersection = commonTokens.length;
    const union = setA.size + setB.size - intersection;
    const jaccardSimilarity = union > 0 ? intersection / union : 0;

    // Cosine similarity
    const cosineSimilarity = this.calculateCosineSimilarity(
      analysisA.frequency,
      analysisB.frequency,
    );

    return {
      commonTokens,
      uniqueToA,
      uniqueToB,
      overlapScore,
      jaccardSimilarity,
      cosineSimilarity,
    };
  }

  /**
   * [1.3.4.0] Calculate cosine similarity
   * @private
   */
  private calculateCosineSimilarity(
    freqA: Map<string, number>,
    freqB: Map<string, number>,
  ): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    // Calculate dot product and magnitude A
    for (const [token, freq] of freqA) {
      magnitudeA += freq * freq;
      if (freqB.has(token)) {
        dotProduct += freq * (freqB.get(token) ?? 0);
      }
    }

    // Calculate magnitude B
    for (const freq of freqB.values()) {
      magnitudeB += freq * freq;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * [1.3.5.0] Find keyword patterns
   * @param texts - Array of texts to analyze
   * @returns Most common tokens across all texts
   */
  findPatterns(texts: string[], topN: number = 10): string[] {
    const globalFrequency = new Map<string, number>();

    for (const text of texts) {
      const analysis = this.extract(text);
      for (const [token, freq] of analysis.frequency) {
        globalFrequency.set(
          token,
          (globalFrequency.get(token) ?? 0) + freq,
        );
      }
    }

    return Array.from(globalFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([token]) => token);
  }
}

