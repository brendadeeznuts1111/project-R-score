// Enhanced string width calculation with full Unicode support
// Based on Bun.stringWidth() but with additional Unicode handling

export class StringWidth {
  private static readonly FLAG_EMOJI_REGEX = /\p{Emoji}\uFE0F?\u200D?\p{Emoji}/u;
  private static readonly ZWJ_SEQUENCE_REGEX = /\p{Emoji}(\u200D\p{Emoji})+/u;
  private static readonly VARIATION_SELECTOR_REGEX = /\p{Emoji}\uFE0E|\p{Emoji}\uFE0F/gu;
  private static readonly ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[mG]/g;
  private static readonly ZERO_WIDTH_CHARS = /\u200B|\u200C|\u200D|\uFEFF/g;
  private static readonly SOFT_HYPHEN = /\u00AD/g;

  // East Asian Width characters (wide characters)
  private static readonly EAST_ASIAN_WIDE = /[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uA960-\uA97F\uAC00-\uD7AF\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]/g;

  // ANSI hyperlink sequences
  private static readonly ANSI_HYPERLINK_REGEX = /\x1b\]8;;[^\x1b]*\x1b\\\x1b\]8;;\x1b\\/g;

  /**
   * Calculate the display width of a string with full Unicode support
   */
  static calculate(str: string): number {
    if (!str) return 0;

    let width = 0;
    let i = 0;

    while (i < str.length) {
      const codePoint = str.codePointAt(i);
      if (codePoint === undefined) break;

      const char = String.fromCodePoint(codePoint);
      const charWidth = this.getCharWidth(char, str, i);

      width += charWidth;
      i += char.length;
    }

    return width;
  }

  private static getCharWidth(char: string, fullString: string, index: number): number {
    // Handle ANSI escape sequences (zero width)
    if (this.ANSI_ESCAPE_REGEX.test(char)) {
      return 0;
    }

    // Handle zero-width characters
    if (this.ZERO_WIDTH_CHARS.test(char)) {
      return 0;
    }

    // Handle ANSI hyperlinks (the visible text width, not the full sequence)
    const hyperlinkMatch = fullString.substring(index).match(this.ANSI_HYPERLINK_REGEX);
    if (hyperlinkMatch && hyperlinkMatch.index === 0) {
      // Extract the visible text between the hyperlink markers
      const linkText = hyperlinkMatch[0].replace(this.ANSI_HYPERLINK_REGEX, (match) => {
        const parts = match.split('\x1b\\');
        return parts.length > 1 ? parts[0].split(';')[2] || '' : '';
      });
      return this.calculate(linkText);
    }

    // Handle flag emojis (country flags, etc.)
    if (this.isFlagEmoji(char, fullString, index)) {
      return 2;
    }

    // Handle emoji ZWJ sequences (family, couples, etc.)
    if (this.isZWJSequence(fullString, index)) {
      return 2;
    }

    // Handle skin tone modifiers (they modify the previous emoji)
    if (this.isSkinToneModifier(char)) {
      return 0; // Skin tone modifiers don't add width
    }

    // Handle variation selectors (text vs emoji presentation)
    if (this.isVariationSelector(char)) {
      return 0; // Variation selectors don't add width
    }

    // Handle combining marks (diacritics, etc.)
    if (this.isCombiningMark(char)) {
      return 0; // Combining marks don't add width
    }

    // Handle soft hyphens
    if (char === '\u00AD') {
      return 0; // Soft hyphens are zero width
    }

    // Handle East Asian wide characters
    if (this.EAST_ASIAN_WIDE.test(char)) {
      return 2;
    }

    // Handle emoji (single emoji characters)
    if (this.isEmoji(char)) {
      return 2;
    }

    // Handle control characters
    if (this.isControlCharacter(char)) {
      return 0;
    }

    // Default: most characters are 1 column wide
    return 1;
  }

  private static isFlagEmoji(char: string, fullString: string, index: number): boolean {
    // Country flags are two regional indicator symbols
    if (index + 1 < fullString.length) {
      const nextChar = fullString[index + 1];
      const currentCode = char.codePointAt(0);
      const nextCode = nextChar.codePointAt(0);

      if (currentCode && nextCode &&
          currentCode >= 0x1F1E6 && currentCode <= 0x1F1FF &&
          nextCode >= 0x1F1E6 && nextCode <= 0x1F1FF) {
        return true;
      }
    }

    // Other flag emojis (check if it's a flag emoji)
    return /\p{Emoji_Presentation}\p{Emoji_Presentation}/u.test(char) ||
           /\p{Emoji}\uFE0F/u.test(char);
  }

  private static isZWJSequence(fullString: string, index: number): boolean {
    // Check if this is part of a ZWJ sequence
    let sequence = '';
    let i = index;

    while (i < fullString.length) {
      const codePoint = fullString.codePointAt(i);
      if (!codePoint) break;

      const char = String.fromCodePoint(codePoint);
      sequence += char;

      // If we find a ZWJ followed by another emoji, continue
      if (char === '\u200D' && i + 1 < fullString.length) {
        const nextCodePoint = fullString.codePointAt(i + 1);
        if (nextCodePoint && this.isEmoji(String.fromCodePoint(nextCodePoint))) {
          i += String.fromCodePoint(nextCodePoint).length;
          continue;
        }
      }

      // Stop if we hit a non-emoji character or space
      if (!this.isEmoji(char) && char !== '\u200D' && char !== '\uFE0F') {
        break;
      }

      i += char.length;

      // Limit sequence length to prevent infinite loops
      if (sequence.length > 20) break;
    }

    return sequence.includes('\u200D') && sequence.length > 1;
  }

  private static isSkinToneModifier(char: string): boolean {
    const code = char.codePointAt(0);
    return code !== undefined &&
           code >= 0x1F3FB && code <= 0x1F3FF; // Skin tone modifiers
  }

  private static isVariationSelector(char: string): boolean {
    const code = char.codePointAt(0);
    return code !== undefined &&
           (code === 0xFE0E || code === 0xFE0F); // Variation selectors
  }

  private static isCombiningMark(char: string): boolean {
    const code = char.codePointAt(0);
    if (!code) return false;

    // Unicode combining marks ranges
    return (code >= 0x0300 && code <= 0x036F) || // Combining Diacritical Marks
           (code >= 0x1AB0 && code <= 0x1AFF) || // Combining Diacritical Marks Extended
           (code >= 0x1DC0 && code <= 0x1DFF) || // Combining Diacritical Marks Supplement
           (code >= 0x20D0 && code <= 0x20FF) || // Combining Diacritical Marks for Symbols
           (code >= 0xFE20 && code <= 0xFE2F);   // Combining Half Marks
  }

  private static isEmoji(char: string): boolean {
    const code = char.codePointAt(0);
    if (!code) return false;

    // Basic emoji ranges
    return (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
           (code >= 0x1F300 && code <= 0x1F5FF) || // Misc Symbols and Pictographs
           (code >= 0x1F680 && code <= 0x1F6FF) || // Transport and Map
           (code >= 0x1F1E0 && code <= 0x1F1FF) || // Regional indicator symbols
           (code >= 0x2600 && code <= 0x26FF) ||   // Misc symbols
           (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
           (code >= 0x1f926 && code <= 0x1f937) || // Gestures
           (code >= 0x1f938 && code <= 0x1f93e) || // Sports
           (code >= 0x1f93f && code <= 0x1f94f) || // Activities
           (code >= 0x1f950 && code <= 0x1f96f) || // Food
           (code >= 0x1f970 && code <= 0x1f97f) || // Emotions
           (code >= 0x1f980 && code <= 0x1f9bf) || // Animals
           (code >= 0x1f9c0 && code <= 0x1f9cf) || // People
           (code >= 0x1f9d0 && code <= 0x1f9ff);   // More people
  }

  private static isControlCharacter(char: string): boolean {
    const code = char.codePointAt(0);
    return code !== undefined && code < 0x20;
  }

  /**
   * Truncate a string to a specific display width
   */
  static truncate(str: string, maxWidth: number, suffix: string = '...'): string {
    if (this.calculate(str) <= maxWidth) {
      return str;
    }

    let result = '';
    let width = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const charWidth = this.getCharWidth(char, str, i);

      if (width + charWidth + this.calculate(suffix) > maxWidth) {
        break;
      }

      result += char;
      width += charWidth;
    }

    return result + suffix;
  }

  /**
   * Pad a string to a specific display width
   */
  static padEnd(str: string, targetWidth: number, padChar: string = ' '): string {
    const currentWidth = this.calculate(str);
    if (currentWidth >= targetWidth) {
      return str;
    }

    const padding = targetWidth - currentWidth;
    return str + padChar.repeat(padding);
  }

  /**
   * Pad a string at the start to a specific display width
   */
  static padStart(str: string, targetWidth: number, padChar: string = ' '): string {
    const currentWidth = this.calculate(str);
    if (currentWidth >= targetWidth) {
      return str;
    }

    const padding = targetWidth - currentWidth;
    return padChar.repeat(padding) + str;
  }

  /**
   * Center a string within a specific display width
   */
  static center(str: string, targetWidth: number, padChar: string = ' '): string {
    const currentWidth = this.calculate(str);
    if (currentWidth >= targetWidth) {
      return str;
    }

    const totalPadding = targetWidth - currentWidth;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;

    return padChar.repeat(leftPadding) + str + padChar.repeat(rightPadding);
  }

  /**
   * Wrap text to fit within a maximum width
   */
  static wrap(str: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const words = str.split(/\s+/);

    let currentLine = '';
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = this.calculate(word);
      const spaceWidth = currentLine ? 1 : 0; // Space between words

      if (currentWidth + spaceWidth + wordWidth <= maxWidth) {
        if (currentLine) {
          currentLine += ' ' + word;
          currentWidth += spaceWidth + wordWidth;
        } else {
          currentLine = word;
          currentWidth = wordWidth;
        }
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
        currentWidth = wordWidth;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

// Export a convenience function that matches Bun's API
export const stringWidth = StringWidth.calculate;
