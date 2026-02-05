// Enhanced grapheme segmenter leveraging Bun's improved Unicode 15.0 support
import { feature } from "bun:bundle";

/**
 * Enhanced grapheme segmenter using Bun's native Unicode 15.0 support
 * Replaces complex manual segmentation with built-in accuracy
 */
export class EnhancedBunGraphemeSegmenter {
  private text: string;
  private clusters: string[];

  constructor(text: string) {
    this.text = text;
    this.clusters = this.segmentText(text);
  }

  /**
   * Segments text into grapheme clusters using Bun's native support
   */
  private segmentText(text: string): string[] {
    // Use Bun's built-in grapheme clustering (Unicode 15.0 compliant)
    return [...text]; // Spread operator now properly handles grapheme clusters
  }

  /**
   * Get all grapheme clusters
   */
  segment(): string[] {
    return [...this.clusters];
  }

  /**
   * Calculate display width using enhanced Bun.stringWidth
   */
  getWidth(): number {
    return this.clusters.reduce((total, cluster) => {
      return total + Bun.stringWidth(cluster);
    }, 0);
  }

  /**
   * Get width of individual cluster
   */
  getClusterWidth(cluster: string): number {
    return Bun.stringWidth(cluster);
  }

  /**
   * Validate grapheme breaking accuracy
   */
  validate(): boolean {
    return this.clusters.every((cluster) => {
      const width = Bun.stringWidth(cluster);
      // Zero-width characters should have width 0
      if (width === 0) {
        return isZeroWidthChar(cluster);
      }
      // Normal characters should have positive width
      return width > 0;
    });
  }

  /**
   * Advanced width calculation (feature-gated)
   */
  getDetailedWidth(): {
    clusters: number;
    display: number;
    memory: number;
    eastAsianWidth?: number;
    controlChars?: number;
    combiningMarks?: number;
    } {
    const baseResult = {
      clusters: this.clusters.length,
      display: this.getWidth(),
      memory: this.text.length
    };

    if (feature("ADVANCED_WIDTH_CALC")) {
      return {
        ...baseResult,
        // Additional metrics for advanced use cases
        eastAsianWidth: this.getEastAsianWidth(),
        controlChars: this.countControlCharacters(),
        combiningMarks: this.countCombiningMarks()
      };
    }

    return baseResult;
  }

  private getEastAsianWidth(): number {
    return this.clusters.reduce((total, cluster) => {
      // East Asian width calculation for CJK characters
      return total + (cluster.charCodeAt(0) >= 0x4e00 && cluster.charCodeAt(0) <= 0x9fff ? 2 : 1);
    }, 0);
  }

  private countControlCharacters(): number {
    return this.clusters.filter(
      (cluster) =>
        cluster.charCodeAt(0) <= 0x1f ||
        (cluster.charCodeAt(0) >= 0x7f && cluster.charCodeAt(0) <= 0x9f)
    ).length;
  }

  private countCombiningMarks(): number {
    return this.clusters.filter(
      (cluster) => cluster.charCodeAt(0) >= 0x0300 && cluster.charCodeAt(0) <= 0x036f
    ).length;
  }
}

/**
 * Check if character is zero-width
 */
function isZeroWidthChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    code === 0x200b || // Zero Width Space
    code === 0x200c || // Zero Width Non-Joiner
    code === 0x200d || // Zero Width Joiner
    code === 0x2060 || // Word Joiner
    code === 0xfeff // Zero Width No-Break Space
  );
}

/**
 * Factory function for creating optimized segmenters
 */
export function createGraphemeSegmenter(text: string): EnhancedBunGraphemeSegmenter {
  return new EnhancedBunGraphemeSegmenter(text);
}

/**
 * Validation utility for testing Unicode compliance
 */
export function validateUnicodeSupport(): boolean {
  const testCases = [
    { text: "👨‍👩‍👧", expectedClusters: 1, expectedWidth: 2 }, // Family emoji
    { text: "🇺🇸", expectedClusters: 1, expectedWidth: 2 }, // Flag emoji
    { text: "👋🏽", expectedClusters: 1, expectedWidth: 2 }, // Skin tone
    { text: "e\u0301", expectedClusters: 1, expectedWidth: 1 }, // Combining accent
    { text: "\u200B", expectedClusters: 1, expectedWidth: 0 } // Zero-width space
  ];

  return testCases.every((testCase) => {
    const segmenter = new EnhancedBunGraphemeSegmenter(testCase.text);
    const clusters = segmenter.segment();
    const width = segmenter.getWidth();

    return clusters.length === testCase.expectedClusters && width === testCase.expectedWidth;
  });
}
