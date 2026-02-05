// src/utils/graphemeCluster.ts
/**
 * Grapheme clustering utility for proper Unicode text handling
 * Uses Intl.Segmenter when available, with fallback for older environments
 */

export interface GraphemeCluster {
  cluster: string;
  isEmoji?: boolean;
  isCombining?: boolean;
  displayWidth: number;
  codePoints: number[];
}

export interface GraphemeSegmenter {
  segment(text: string): GraphemeCluster[];
  getGraphemeCount(text: string): number;
  getGraphemeAt(text: string, index: number): string;
  truncate(text: string, maxLength: number, suffix?: string): string;
  reverse(text: string): string;
  slice(text: string, start: number, end?: number): string;
}

/**
 * Check if Intl.Segmenter is available in the current environment
 */
function hasIntlSegmenter(): boolean {
  return typeof Intl !== 'undefined' && 'Segmenter' in Intl;
}

/**
 * Fallback implementation using basic Unicode regex
 * This is less accurate than Intl.Segmenter but covers most common cases
 */
class FallbackSegmenter implements GraphemeSegmenter {
  // Basic regex for grapheme clusters (covers most emoji and combining marks)
  private readonly graphemeRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
  
  // Combining marks regex
  private readonly combiningRegex = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
  
  segment(text: string): GraphemeCluster[] {
    const clusters: GraphemeCluster[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      // Try to match emoji sequences first
      const emojiMatch = this.graphemeRegex.exec(remaining);
      if (emojiMatch && emojiMatch.index === 0) {
        const cluster = emojiMatch[0];
        clusters.push(this.createCluster(cluster));
        remaining = remaining.slice(cluster.length);
        this.graphemeRegex.lastIndex = 0; // Reset regex
        continue;
      }
      
      // Check for combining sequences
      const codePoint = remaining.codePointAt(0);
      const char = remaining[0];
      let cluster = char;
      
      // If the next character is a combining mark, include it
      if (remaining.length > 1 && this.combiningRegex.test(remaining[1])) {
        cluster += remaining[1];
        clusters.push(this.createCluster(cluster));
        remaining = remaining.slice(2);
      } else if (codePoint && codePoint > 0xFFFF) {
        // Surrogate pair for characters outside BMP
        cluster = remaining.slice(0, 2);
        clusters.push(this.createCluster(cluster));
        remaining = remaining.slice(2);
      } else {
        clusters.push(this.createCluster(cluster));
        remaining = remaining.slice(1);
      }
    }
    
    return clusters;
  }
  
  getGraphemeCount(text: string): number {
    return this.segment(text).length;
  }
  
  getGraphemeAt(text: string, index: number): string {
    const clusters = this.segment(text);
    return clusters[index]?.cluster || '';
  }
  
  truncate(text: string, maxLength: number, suffix: string = '...'): string {
    const clusters = this.segment(text);
    if (clusters.length <= maxLength) {
      return text;
    }
    
    const truncated = clusters.slice(0, maxLength).map(c => c.cluster).join('');
    return truncated + suffix;
  }
  
  reverse(text: string): string {
    const clusters = this.segment(text);
    return clusters.map(c => c.cluster).reverse().join('');
  }
  
  slice(text: string, start: number, end?: number): string {
    const clusters = this.segment(text);
    const sliced = clusters.slice(start, end);
    return sliced.map(c => c.cluster).join('');
  }
  
  private createCluster(cluster: string): GraphemeCluster {
    const codePoints: number[] = [];
    for (let i = 0; i < cluster.length; i++) {
      const codePoint = cluster.codePointAt(i);
      if (codePoint) {
        codePoints.push(codePoint);
        if (codePoint > 0xFFFF) i++; // Skip surrogate pair
      }
    }
    
    return {
      cluster,
      isEmoji: this.isEmoji(cluster),
      isCombining: this.combiningRegex.test(cluster),
      displayWidth: this.getDisplayWidth(cluster),
      codePoints
    };
  }
  
  private isEmoji(text: string): boolean {
    return this.graphemeRegex.test(text);
  }
  
  private getDisplayWidth(cluster: string): number {
    // Basic width calculation (can be enhanced with East Asian Width properties)
    if (this.isEmoji(cluster)) return 2; // Most emoji are wide
    if (cluster.length > 1 && cluster.codePointAt(0)! > 0xFFFF) return 2; // CJK characters
    return 1;
  }
}

/**
 * Intl.Segmenter implementation for modern environments
 */
class IntlSegmenter implements GraphemeSegmenter {
  private segmenter: Intl.Segmenter;
  
  constructor(locale: string = 'en') {
    this.segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  }
  
  segment(text: string): GraphemeCluster[] {
    const clusters: GraphemeCluster[] = [];
    
    for (const segment of this.segmenter.segment(text)) {
      clusters.push(this.createCluster(segment.segment));
    }
    
    return clusters;
  }
  
  getGraphemeCount(text: string): number {
    return [...this.segmenter.segment(text)].length;
  }
  
  getGraphemeAt(text: string, index: number): string {
    const segments = [...this.segmenter.segment(text)];
    return segments[index]?.segment || '';
  }
  
  truncate(text: string, maxLength: number, suffix: string = '...'): string {
    const segments = [...this.segmenter.segment(text)];
    if (segments.length <= maxLength) {
      return text;
    }
    
    const truncated = segments.slice(0, maxLength).map(s => s.segment).join('');
    return truncated + suffix;
  }
  
  reverse(text: string): string {
    const segments = [...this.segmenter.segment(text)];
    return segments.map(s => s.segment).reverse().join('');
  }
  
  slice(text: string, start: number, end?: number): string {
    const segments = [...this.segmenter.segment(text)];
    const sliced = segments.slice(start, end);
    return sliced.map(s => s.segment).join('');
  }
  
  private createCluster(cluster: string): GraphemeCluster {
    const codePoints: number[] = [];
    for (let i = 0; i < cluster.length; i++) {
      const codePoint = cluster.codePointAt(i);
      if (codePoint) {
        codePoints.push(codePoint);
        if (codePoint > 0xFFFF) i++; // Skip surrogate pair
      }
    }
    
    return {
      cluster,
      isEmoji: this.isEmoji(cluster),
      isCombining: this.hasCombiningMarks(cluster),
      displayWidth: this.getDisplayWidth(cluster),
      codePoints
    };
  }
  
  private isEmoji(text: string): boolean {
    // Emoji regex (simplified version)
    const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
    return emojiRegex.test(text);
  }
  
  private hasCombiningMarks(text: string): boolean {
    const combiningRegex = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/;
    return combiningRegex.test(text);
  }
  
  private getDisplayWidth(cluster: string): number {
    // Basic width calculation
    if (this.isEmoji(cluster)) return 2;
    if (cluster.length > 1 && cluster.codePointAt(0)! > 0xFFFF) return 2;
    return 1;
  }
}

/**
 * Create a grapheme segmenter based on environment capabilities
 */
export function createGraphemeSegmenter(locale: string = 'en'): GraphemeSegmenter {
  if (hasIntlSegmenter()) {
    return new IntlSegmenter(locale);
  } else {
    console.warn('Intl.Segmenter not available, using fallback implementation');
    return new FallbackSegmenter();
  }
}

/**
 * Default segmenter instance
 */
export const defaultSegmenter = createGraphemeSegmenter();

/**
 * Convenience functions for common operations
 */
export function getGraphemeCount(text: string): number {
  return defaultSegmenter.getGraphemeCount(text);
}

export function truncateText(text: string, maxLength: number, suffix?: string): string {
  return defaultSegmenter.truncate(text, maxLength, suffix);
}

export function reverseText(text: string): string {
  return defaultSegmenter.reverse(text);
}

export function sliceText(text: string, start: number, end?: number): string {
  return defaultSegmenter.slice(text, start, end);
}

export function getGraphemeAt(text: string, index: number): string {
  return defaultSegmenter.getGraphemeAt(text, index);
}

/**
 * React hook for grapheme clustering
 */
export function useGraphemeSegmenter(locale?: string): GraphemeSegmenter {
  return createGraphemeSegmenter(locale);
}
