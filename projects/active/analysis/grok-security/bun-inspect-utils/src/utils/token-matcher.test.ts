/**
 * [TEST][TOKEN][MATCHER]{BUN-NATIVE}
 * Unit tests for token extraction and matching
 */

import { describe, it, expect } from "bun:test";
import { TokenMatcher } from "./token-matcher";

describe("[1.0.0.0] TokenMatcher", () => {
  describe("[1.1.0.0] Token Extraction", () => {
    it("[1.1.1.0] should extract tokens from text", () => {
      const matcher = new TokenMatcher();
      const analysis = matcher.extract("The quick brown fox jumps");

      expect(analysis.tokens.length).toBeGreaterThan(0);
      expect(analysis.uniqueCount).toBeGreaterThan(0);
      expect(analysis.totalTokens).toBeGreaterThan(0);
    });

    it("[1.1.2.0] should filter stop words", () => {
      const matcher = new TokenMatcher();
      const analysis = matcher.extract("the and or but in on at");

      expect(analysis.tokens.length).toBe(0);
    });

    it("[1.1.3.0] should respect minTokenLength", () => {
      const matcher = new TokenMatcher({ minTokenLength: 5 });
      const analysis = matcher.extract("cat dog elephant tiger");

      expect(analysis.tokens).toContain("elephant");
      expect(analysis.tokens).not.toContain("cat");
      expect(analysis.tokens).not.toContain("dog");
    });

    it("[1.1.4.0] should handle case sensitivity", () => {
      const caseSensitive = new TokenMatcher({ caseSensitive: true });
      const caseInsensitive = new TokenMatcher({ caseSensitive: false });

      const text = "Hello HELLO hello";
      const sensitive = caseSensitive.extract(text);
      const insensitive = caseInsensitive.extract(text);

      expect(sensitive.uniqueCount).toBeGreaterThan(insensitive.uniqueCount);
    });

    it("[1.1.5.0] should calculate token frequency", () => {
      const matcher = new TokenMatcher();
      const analysis = matcher.extract("apple apple banana apple cherry");

      expect(analysis.frequency.get("apple")).toBe(3);
      expect(analysis.frequency.get("banana")).toBe(1);
      expect(analysis.frequency.get("cherry")).toBe(1);
    });

    it("[1.1.6.0] should remove punctuation", () => {
      const matcher = new TokenMatcher();
      const analysis = matcher.extract("hello, world! how are you?");

      expect(analysis.tokens).toContain("hello");
      expect(analysis.tokens).toContain("world");
    });

    it("[1.1.7.0] should handle numbers based on config", () => {
      const withNumbers = new TokenMatcher({ includeNumbers: true });
      const withoutNumbers = new TokenMatcher({ includeNumbers: false });

      const text = "version 123 release 456";
      const with_ = withNumbers.extract(text);
      const without = withoutNumbers.extract(text);

      expect(with_.tokens.length).toBeGreaterThan(without.tokens.length);
    });
  });

  describe("[1.2.0.0] Token Comparison", () => {
    it("[1.2.1.0] should find common tokens", () => {
      const matcher = new TokenMatcher();
      const textA = "javascript typescript programming";
      const textB = "javascript python programming";

      const comparison = matcher.compare(textA, textB);

      expect(comparison.commonTokens).toContain("javascript");
      expect(comparison.commonTokens).toContain("programming");
      expect(comparison.commonTokens.length).toBe(2);
    });

    it("[1.2.2.0] should find unique tokens", () => {
      const matcher = new TokenMatcher();
      const textA = "javascript typescript";
      const textB = "python ruby";

      const comparison = matcher.compare(textA, textB);

      expect(comparison.uniqueToA).toContain("javascript");
      expect(comparison.uniqueToA).toContain("typescript");
      expect(comparison.uniqueToB).toContain("python");
      expect(comparison.uniqueToB).toContain("ruby");
    });

    it("[1.2.3.0] should calculate overlap score", () => {
      const matcher = new TokenMatcher();
      const identical = matcher.compare("hello world", "hello world");
      const different = matcher.compare("hello world", "goodbye moon");

      expect(identical.overlapScore).toBe(1);
      expect(different.overlapScore).toBeLessThan(1);
    });

    it("[1.2.4.0] should calculate Jaccard similarity", () => {
      const matcher = new TokenMatcher();
      const comparison = matcher.compare("apple banana cherry", "apple banana date");

      expect(comparison.jaccardSimilarity).toBeGreaterThan(0);
      expect(comparison.jaccardSimilarity).toBeLessThanOrEqual(1);
    });

    it("[1.2.5.0] should calculate cosine similarity", () => {
      const matcher = new TokenMatcher();
      const comparison = matcher.compare("hello world hello", "hello world hello");

      expect(comparison.cosineSimilarity).toBe(1);
    });

    it("[1.2.6.0] should handle empty texts", () => {
      const matcher = new TokenMatcher();
      const comparison = matcher.compare("", "hello world");

      expect(comparison.commonTokens.length).toBe(0);
      expect(comparison.overlapScore).toBe(0);
    });
  });

  describe("[1.3.0.0] Pattern Finding", () => {
    it("[1.3.1.0] should find common patterns", () => {
      const matcher = new TokenMatcher();
      const texts = [
        "javascript is great",
        "javascript programming",
        "javascript development",
      ];

      const patterns = matcher.findPatterns(texts, 5);

      expect(patterns).toContain("javascript");
    });

    it("[1.3.2.0] should respect topN parameter", () => {
      const matcher = new TokenMatcher();
      const texts = [
        "apple apple apple",
        "banana banana",
        "cherry",
      ];

      const patterns = matcher.findPatterns(texts, 2);

      expect(patterns.length).toBeLessThanOrEqual(2);
    });

    it("[1.3.3.0] should rank by frequency", () => {
      const matcher = new TokenMatcher();
      const texts = [
        "apple apple apple apple",
        "banana banana",
        "cherry",
      ];

      const patterns = matcher.findPatterns(texts, 3);

      expect(patterns[0]).toBe("apple");
      expect(patterns[1]).toBe("banana");
    });
  });

  describe("[1.4.0.0] Configuration", () => {
    it("[1.4.1.0] should use default stop words", () => {
      const matcher = new TokenMatcher();
      const analysis = matcher.extract("the quick brown fox");

      expect(analysis.tokens).not.toContain("the");
    });

    it("[1.4.2.0] should accept custom stop words", () => {
      const customStopWords = new Set(["custom", "words"]);
      const matcher = new TokenMatcher({ stopWords: customStopWords });
      const analysis = matcher.extract("custom words hello");

      expect(analysis.tokens).toContain("hello");
      expect(analysis.tokens).not.toContain("custom");
    });

    it("[1.4.3.0] should handle empty text", () => {
      const matcher = new TokenMatcher();
      const analysis = matcher.extract("");

      expect(analysis.tokens.length).toBe(0);
      expect(analysis.uniqueCount).toBe(0);
      expect(analysis.totalTokens).toBe(0);
    });
  });
});

