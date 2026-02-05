/**
 * Unicode Text Segmentation (UAX #29) Grapheme Cluster Boundary Detection
 * https://www.unicode.org/reports/tr29/
 */

// Unicode property data for grapheme cluster breaks
const UNICODE_DATA = {
  // Extended Pictographic (for emojis)
  EXTENDED_PICTOGRAPHIC: new Set<number>([
    0x1F600, 0x1F603, 0x1F604, 0x1F601, 0x1F606, 0x1F605, 0x1F923, 0x1F602,
    0x1F642, 0x1F643, 0x1F609, 0x1F60A, 0x1F607, 0x1F60F, 0x1F612, 0x1F624,
    // ... (complete list would be extensive, use Intl.Segmenter where available)
  ]),
  
  // Regional Indicator Symbols (country flags)
  REGIONAL_INDICATOR: new Set<number>([
    0x1F1E6, 0x1F1E7, 0x1F1E8, 0x1F1E9, 0x1F1EA, 0x1F1EB, 0x1F1EC, 0x1F1ED,
    0x1F1EE, 0x1F1EF, 0x1F1F0, 0x1F1F1, 0x1F1F2, 0x1F1F3, 0x1F1F4, 0x1F1F5,
    0x1F1F6, 0x1F1F7, 0x1F1F8, 0x1F1F9, 0x1F1FA, 0x1F1FB, 0x1F1FC, 0x1F1FD,
    0x1F1FE, 0x1F1FF
  ]),
  
  // Zero Width Joiner
  ZWJ: 0x200D,
  
  // Variation Selectors
  VARIATION_SELECTOR: new Set<number>([
    0xFE00, 0xFE01, 0xFE02, 0xFE03, 0xFE04, 0xFE05, 0xFE06, 0xFE07, 0xFE08,
    0xFE09, 0xFE0A, 0xFE0B, 0xFE0C, 0xFE0D, 0xFE0E, 0xFE0F
  ]),
  
  // Emoji Variation Selector
  EMOJI_VARIATION_SELECTOR: 0xFE0F,
  
  // Text Variation Selector
  TEXT_VARIATION_SELECTOR: 0xFE0E,
  
  // Skin Tone Modifiers
  SKIN_TONE_MODIFIERS: new Set<number>([
    0x1F3FB, // Light
    0x1F3FC, // Medium-Light
    0x1F3FD, // Medium
    0x1F3FE, // Medium-Dark
    0x1F3FF  // Dark
  ]),
  
  // Combining marks
  COMBINING_MARKS: new Set<number>([
    // Combining Diacritical Marks
    0x0300, 0x0301, 0x0302, 0x0303, 0x0304, 0x0305, 0x0306, 0x0307, 0x0308,
    0x0309, 0x030A, 0x030B, 0x030C, 0x030D, 0x030E, 0x030F, 0x0310, 0x0311,
    0x0312, 0x0313, 0x0314, 0x0315, 0x0316, 0x0317, 0x0318, 0x0319, 0x031A,
    0x031B, 0x031C, 0x031D, 0x031E, 0x031F, 0x0320, 0x0321, 0x0322, 0x0323,
    0x0324, 0x0325, 0x0326, 0x0327, 0x0328, 0x0329, 0x032A, 0x032B, 0x032C,
    0x032D, 0x032E, 0x032F, 0x0330, 0x0331, 0x0332, 0x0333, 0x0334, 0x0335,
    0x0336, 0x0337, 0x0338, 0x0339, 0x033A, 0x033B, 0x033C, 0x033D, 0x033E,
    0x033F, 0x0340, 0x0341, 0x0342, 0x0343, 0x0344, 0x0345, 0x0346, 0x0347,
    0x0348, 0x0349, 0x034A, 0x034B, 0x034C, 0x034D, 0x034E, 0x034F, 0x0350,
    0x0351, 0x0352, 0x0353, 0x0354, 0x0355, 0x0356, 0x0357, 0x0358, 0x0359,
    0x035A, 0x035B, 0x035C, 0x035D, 0x035E, 0x035F, 0x0360, 0x0361, 0x0362
  ])
};

// Unicode character property classification
enum CharType {
  CONTROL = 'Control',
  CR = 'CR',
  LF = 'LF',
  EXTEND = 'Extend',
  REGIONAL_INDICATOR = 'Regional_Indicator',
  PREPEND = 'Prepend',
  SPACING_MARK = 'SpacingMark',
  L = 'L',  // Hangul L (leading consonant)
  V = 'V',  // Hangul V (vowel)
  T = 'T',  // Hangul T (trailing consonant)
  LV = 'LV', // Hangul LV syllable
  LVT = 'LVT', // Hangul LVT syllable
  ZWJ = 'ZWJ',
  EXTENDED_PICTOGRAPHIC = 'Extended_Pictographic',
  OTHER = 'Other'
}

export class GraphemeClusterer {
  private segmenter: Intl.Segmenter | null = null;
  private useNativeSegmenter: boolean = false;
  
  constructor(locale: string = 'en', granularity: 'grapheme' = 'grapheme') {
    try {
      // Try to use native Intl.Segmenter if available
      if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        this.segmenter = new Intl.Segmenter(locale, { granularity });
        this.useNativeSegmenter = true;
      }
    } catch (error) {
      console.warn('Intl.Segmenter not available, using fallback implementation');
    }
  }
  
  /**
   * Get grapheme clusters from a string
   */
  getClusters(text: string): string[] {
    if (this.useNativeSegmenter && this.segmenter) {
      return this.nativeGetClusters(text);
    }
    return this.fallbackGetClusters(text);
  }
  
  /**
   * Get the number of grapheme clusters (not code points)
   */
  getClusterLength(text: string): number {
    return this.getClusters(text).length;
  }
  
  /**
   * Get a substring by grapheme cluster boundaries
   */
  substringByClusters(text: string, start: number, end?: number): string {
    const clusters = this.getClusters(text);
    if (end === undefined) {
      end = clusters.length;
    }
    return clusters.slice(start, end).join('');
  }
  
  /**
   * Slice a string by grapheme cluster boundaries
   */
  sliceByClusters(text: string, start: number, end?: number): string {
    const clusters = this.getClusters(text);
    if (end === undefined) {
      end = clusters.length;
    }
    return clusters.slice(start, end).join('');
  }
  
  /**
   * Reverse a string preserving grapheme clusters
   */
  reverseByClusters(text: string): string {
    return this.getClusters(text).reverse().join('');
  }
  
  /**
   * Truncate text to a maximum number of grapheme clusters
   */
  truncate(text: string, maxClusters: number, ellipsis: string = '…'): string {
    const clusters = this.getClusters(text);
    if (clusters.length <= maxClusters) {
      return text;
    }
    return clusters.slice(0, maxClusters).join('') + ellipsis;
  }
  
  /**
   * Get the visual width of text (accounting for full-width characters)
   */
  getVisualWidth(text: string): number {
    const clusters = this.getClusters(text);
    let width = 0;
    
    for (const cluster of clusters) {
      // Check if cluster is full-width
      if (this.isFullWidthCluster(cluster)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    
    return width;
  }
  
  /**
   * Align text to a specific visual width
   */
  padToWidth(text: string, width: number, align: 'left' | 'right' | 'center' = 'left', padChar: string = ' '): string {
    const visualWidth = this.getVisualWidth(text);
    const padWidth = width - visualWidth;
    
    if (padWidth <= 0) return text;
    
    switch (align) {
      case 'left':
        return text + padChar.repeat(padWidth);
      case 'right':
        return padChar.repeat(padWidth) + text;
      case 'center':
        const leftPad = Math.floor(padWidth / 2);
        const rightPad = padWidth - leftPad;
        return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
    }
  }
  
  /**
   * Check if a grapheme cluster is an emoji
   */
  isEmoji(cluster: string): boolean {
    // Quick check for common emoji patterns
    const codePoint = cluster.codePointAt(0);
    if (!codePoint) return false;
    
    // Check for emoji ranges
    if (
      (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
      (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) || // Miscellaneous Symbols and Pictographs
      (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport and Map Symbols
      (codePoint >= 0x1F700 && codePoint <= 0x1F77F) || // Alchemical Symbols
      (codePoint >= 0x1F780 && codePoint <= 0x1F7FF) || // Geometric Shapes Extended
      (codePoint >= 0x1F800 && codePoint <= 0x1F8FF) || // Supplemental Arrows-C
      (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) || // Supplemental Symbols and Pictographs
      (codePoint >= 0x1FA00 && codePoint <= 0x1FA6F) || // Chess Symbols
      (codePoint >= 0x1FA70 && codePoint <= 0x1FAFF) || // Symbols and Pictographs Extended-A
      (codePoint >= 0x2600 && codePoint <= 0x26FF) ||   // Miscellaneous Symbols
      (codePoint >= 0x2700 && codePoint <= 0x27BF)      // Dingbats
    ) {
      return true;
    }
    
    // Check for emoji sequences with ZWJ
    if (cluster.includes('\u200D')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get emoji presentation (text vs emoji)
   */
  getEmojiPresentation(cluster: string): 'text' | 'emoji' | 'unknown' {
    // Check for Variation Selector-16 (emoji presentation)
    if (cluster.includes('\uFE0F')) {
      return 'emoji';
    }
    
    // Check for Variation Selector-15 (text presentation)
    if (cluster.includes('\uFE0E')) {
      return 'text';
    }
    
    // Check if it's in an emoji block
    if (this.isEmoji(cluster)) {
      return 'emoji';
    }
    
    return 'unknown';
  }
  
  /**
   * Normalize emoji to text presentation
   */
  normalizeToTextPresentation(cluster: string): string {
    // Remove emoji variation selector
    return cluster.replace(/\uFE0F/g, '');
  }
  
  /**
   * Normalize emoji to emoji presentation
   */
  normalizeToEmojiPresentation(cluster: string): string {
    // Add emoji variation selector if not present and it's an emoji
    if (this.isEmoji(cluster) && !cluster.includes('\uFE0F')) {
      return cluster + '\uFE0F';
    }
    return cluster;
  }
  
  /**
   * Get skin tone from emoji cluster
   */
  getSkinTone(cluster: string): string | null {
    const skinTones = ['🏻', '🏼', '🏽', '🏾', '🏿'];
    for (const tone of skinTones) {
      if (cluster.includes(tone)) {
        return tone;
      }
    }
    return null;
  }
  
  /**
   * Remove skin tone from emoji cluster
   */
  removeSkinTone(cluster: string): string {
    const skinTones = ['🏻', '🏼', '🏽', '🏾', '🏿'];
    let result = cluster;
    for (const tone of skinTones) {
      result = result.replace(tone, '');
    }
    return result;
  }
  
  /**
   * Apply skin tone to emoji cluster
   */
  applySkinTone(cluster: string, skinTone: string): string {
    const base = this.removeSkinTone(cluster);
    return base + skinTone;
  }
  
  // Private methods
  
  private nativeGetClusters(text: string): string[] {
    if (!this.segmenter) return [text];
    
    const segments = Array.from(this.segmenter.segment(text));
    return segments.map(segment => segment.segment);
  }
  
  private fallbackGetClusters(text: string): string[] {
    const clusters: string[] = [];
    let i = 0;
    
    while (i < text.length) {
      const cluster = this.getNextCluster(text, i);
      clusters.push(cluster);
      i += cluster.length;
    }
    
    return clusters;
  }
  
  private getNextCluster(text: string, start: number): string {
    if (start >= text.length) return '';
    
    // Get the first code point
    const firstCodePoint = text.codePointAt(start)!;
    let clusterEnd = start + (firstCodePoint > 0xFFFF ? 2 : 1);
    
    // Check for regional indicator pairs (country flags)
    if (UNICODE_DATA.REGIONAL_INDICATOR.has(firstCodePoint)) {
      const nextCodePoint = text.codePointAt(clusterEnd);
      if (nextCodePoint && UNICODE_DATA.REGIONAL_INDICATOR.has(nextCodePoint)) {
        clusterEnd += (nextCodePoint > 0xFFFF ? 2 : 1);
      }
      return text.substring(start, clusterEnd);
    }
    
    // Check for emoji sequences
    if (this.isEmojiStart(firstCodePoint)) {
      return this.getEmojiCluster(text, start);
    }
    
    // Regular grapheme cluster
    while (clusterEnd < text.length) {
      const nextCodePoint = text.codePointAt(clusterEnd)!;
      const prevCodePoint = text.codePointAt(clusterEnd - 1)!;
      
      // Check for break opportunity
      if (this.shouldBreak(prevCodePoint, nextCodePoint)) {
        break;
      }
      
      clusterEnd += (nextCodePoint > 0xFFFF ? 2 : 1);
    }
    
    return text.substring(start, clusterEnd);
  }
  
  private getEmojiCluster(text: string, start: number): string {
    let i = start;
    let cluster = '';
    
    while (i < text.length) {
      const codePoint = text.codePointAt(i)!;
      const charSize = codePoint > 0xFFFF ? 2 : 1;
      
      // Add current character to cluster
      cluster += text.substring(i, i + charSize);
      i += charSize;
      
      // Check if we should continue the cluster
      if (i < text.length) {
        const nextCodePoint = text.codePointAt(i)!;
        
        // Continue for ZWJ sequences, variation selectors, skin tones
        if (
          nextCodePoint === UNICODE_DATA.ZWJ ||
          UNICODE_DATA.VARIATION_SELECTOR.has(nextCodePoint) ||
          UNICODE_DATA.SKIN_TONE_MODIFIERS.has(nextCodePoint) ||
          UNICODE_DATA.COMBINING_MARKS.has(nextCodePoint)
        ) {
          continue;
        }
        
        // Check for regional indicator continuation (flags)
        if (UNICODE_DATA.REGIONAL_INDICATOR.has(codePoint) && 
            UNICODE_DATA.REGIONAL_INDICATOR.has(nextCodePoint)) {
          continue;
        }
      }
      
      break;
    }
    
    return cluster;
  }
  
  private isEmojiStart(codePoint: number): boolean {
    // Check common emoji ranges
    return (
      (codePoint >= 0x1F600 && codePoint <= 0x1F64F) ||
      (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) ||
      (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) ||
      (codePoint >= 0x2600 && codePoint <= 0x26FF) ||
      (codePoint >= 0x2700 && codePoint <= 0x27BF) ||
      UNICODE_DATA.EXTENDED_PICTOGRAPHIC.has(codePoint) ||
      UNICODE_DATA.REGIONAL_INDICATOR.has(codePoint)
    );
  }
  
  private shouldBreak(prev: number, next: number): boolean {
    // Simplified break rules for demonstration
    // In a full implementation, this would include all UAX #29 rules
    
    // GB3: CR × LF
    if (prev === 0x000D && next === 0x000A) {
      return false;
    }
    
    // GB4: (Control|CR|LF) ÷
    if (prev <= 0x1F || prev === 0x000D || prev === 0x000A) {
      return true;
    }
    
    // GB5: ÷ (Control|CR|LF)
    if (next <= 0x1F || next === 0x000D || next === 0x000A) {
      return true;
    }
    
    // GB9: × (Extend|ZWJ)
    if (
      UNICODE_DATA.COMBINING_MARKS.has(next) ||
      UNICODE_DATA.VARIATION_SELECTOR.has(next) ||
      UNICODE_DATA.SKIN_TONE_MODIFIERS.has(next) ||
      next === UNICODE_DATA.ZWJ
    ) {
      return false;
    }
    
    // GB12: Regional_Indicator × Regional_Indicator
    if (UNICODE_DATA.REGIONAL_INDICATOR.has(prev) &&
        UNICODE_DATA.REGIONAL_INDICATOR.has(next)) {
      return false;
    }
    
    // GB999: Any ÷ Any
    return true;
  }
  
  private isFullWidthCluster(cluster: string): boolean {
    // Check for East Asian Fullwidth characters
    const codePoint = cluster.codePointAt(0);
    if (!codePoint) return false;
    
    // Fullwidth ranges
    return (
      (codePoint >= 0x1100 && codePoint <= 0x115F) || // Hangul Jamo
      (codePoint >= 0x2329 && codePoint <= 0x232A) || // Angle brackets
      (codePoint >= 0x2E80 && codePoint <= 0xA4CF) || // CJK Radicals, etc.
      (codePoint >= 0xAC00 && codePoint <= 0xD7A3) || // Hangul Syllables
      (codePoint >= 0xF900 && codePoint <= 0xFAFF) || // CJK Compatibility Ideographs
      (codePoint >= 0xFE10 && codePoint <= 0xFE19) || // Vertical Forms
      (codePoint >= 0xFE30 && codePoint <= 0xFE6F) || // CJK Compatibility Forms
      (codePoint >= 0xFF00 && codePoint <= 0xFF60) || // Fullwidth Forms
      (codePoint >= 0xFFE0 && codePoint <= 0xFFE6)    // Fullwidth Symbols
    );
  }
}

/**
 * Utility functions for common grapheme operations
 */
export const GraphemeUtils = {
  /**
   * Safe substring that respects grapheme boundaries
   */
  safeSubstring(text: string, start: number, end?: number): string {
    const clusterer = new GraphemeClusterer();
    return clusterer.substringByClusters(text, start, end);
  },
  
  /**
   * Safe truncate with ellipsis
   */
  safeTruncate(text: string, maxLength: number, ellipsis: string = '…'): string {
    const clusterer = new GraphemeClusterer();
    return clusterer.truncate(text, maxLength, ellipsis);
  },
  
  /**
   * Get visual display length
   */
  visualLength(text: string): number {
    const clusterer = new GraphemeClusterer();
    return clusterer.getVisualWidth(text);
  },
  
  /**
   * Split text into visual lines of specified width
   */
  wrapText(text: string, width: number): string[] {
    const clusterer = new GraphemeClusterer();
    const clusters = clusterer.getClusters(text);
    const lines: string[] = [];
    let currentLine: string[] = [];
    let currentWidth = 0;
    
    for (const cluster of clusters) {
      const clusterWidth = clusterer.getVisualWidth(cluster);
      
      if (currentWidth + clusterWidth > width) {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(''));
          currentLine = [cluster];
          currentWidth = clusterWidth;
        } else {
          // Single cluster wider than width
          lines.push(cluster);
          currentLine = [];
          currentWidth = 0;
        }
      } else {
        currentLine.push(cluster);
        currentWidth += clusterWidth;
      }
    }
    
    if (currentLine.length > 0) {
      lines.push(currentLine.join(''));
    }
    
    return lines;
  },
  
  /**
   * Normalize emoji for consistent storage
   */
  normalizeEmoji(text: string): string {
    const clusterer = new GraphemeClusterer();
    const clusters = clusterer.getClusters(text);
    
    return clusters.map(cluster => {
      if (clusterer.isEmoji(cluster)) {
        return clusterer.normalizeToEmojiPresentation(cluster);
      }
      return cluster;
    }).join('');
  },
  
  /**
   * Count emojis in text
   */
  countEmojis(text: string): number {
    const clusterer = new GraphemeClusterer();
    const clusters = clusterer.getClusters(text);
    
    return clusters.filter(cluster => clusterer.isEmoji(cluster)).length;
  },
  
  /**
   * Extract emojis from text
   */
  extractEmojis(text: string): string[] {
    const clusterer = new GraphemeClusterer();
    const clusters = clusterer.getClusters(text);
    
    return clusters.filter(cluster => clusterer.isEmoji(cluster));
  },
  
  /**
   * Check if text contains complex Unicode (emoji, combining marks, etc.)
   */
  hasComplexUnicode(text: string): boolean {
    const clusterer = new GraphemeClusterer();
    const clusters = clusterer.getClusters(text);
    
    // Check if any cluster has more than one code point
    return clusters.some(cluster => {
      // Count code points in cluster
      let count = 0;
      for (let i = 0; i < cluster.length; i++) {
        const codePoint = cluster.codePointAt(i)!;
        count++;
        if (codePoint > 0xFFFF) {
          i++; // Skip the second part of surrogate pair
        }
      }
      return count > 1;
    });
  },
  
  /**
   * Get Unicode version information
   */
  getUnicodeInfo(): {
    version: string;
    hasSegmenter: boolean;
    hasNormalization: boolean;
  } {
    return {
      version: '15.0.0', // Current Unicode version
      hasSegmenter: typeof Intl !== 'undefined' && 'Segmenter' in Intl,
      hasNormalization: typeof String.prototype.normalize === 'function'
    };
  }
};
