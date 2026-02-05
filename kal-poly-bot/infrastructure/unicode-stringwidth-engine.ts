// infrastructure/unicode-stringwidth-engine.ts
import { feature } from "bun:bundle";

// ZWJ sequences, ANSI CSI, zero-width characters
export class UnicodeStringWidthEngine {
  private static readonly ZERO_WIDTH_CHARS = new Set([
    0x00AD, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064,
    0x061C, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C
  ]);

  // Zero-cost when STRING_WIDTH_OPT is disabled
  static calculateWidth(text: string): number {
    if (!feature("STRING_WIDTH_OPT")) {
      // Fallback to Bun.native stringWidth
      return Bun.stringWidth(text);
    }

    let width = 0;
    let i = 0;

    while (i < text.length) {
      const codePoint = text.codePointAt(i)!;
      const charLen = this.charLength(codePoint);

      // Zero-width characters
      if (this.ZERO_WIDTH_CHARS.has(codePoint)) {
        i += charLen;
        continue;
      }

      // ANSI CSI sequences
      if (codePoint === 0x1B && text[i + 1] === '[') {
        i += this.skipANSISequence(text, i);
        continue;
      }

      // Emoji sequences
      const emojiWidth = this.calculateEmojiWidth(text, i);
      if (emojiWidth > 0) {
        width += emojiWidth;
        i += this.skipEmojiSequence(text, i);
        continue;
      }

      // Standard width
      width += this.getStandardWidth(codePoint);
      i += charLen;
    }

    // Component #12 audit for extreme widths (DoS detection)
    if (width > 1000) {
      this.logExcessiveWidth(text, width);
    }

    return width;
  }

  private static calculateEmojiWidth(text: string, index: number): number {
    // Flag emoji (regional indicators)
    if (this.isRegionalIndicator(text.codePointAt(index)!)) {
      return 2;
    }

    // ZWJ sequences (family, profession)
    if (this.isZWJSequenceStart(text, index)) {
      return 2;
    }

    // Skin tone modifiers
    if (this.isSkinToneSequence(text, index)) {
      return 2;
    }

    return 0;
  }

  private static skipEmojiSequence(text: string, index: number): number {
    let len = 0;
    while (index + len < text.length) {
      const cp = text.codePointAt(index + len)!;
      if (cp === 0x200D) { // ZWJ
        len += this.charLength(cp);
        continue;
      }
      if (cp >= 0x1F3FB && cp <= 0x1F3FF) { // Skin tone
        len += this.charLength(cp);
        continue;
      }
      if (this.isEmoji(cp)) {
        len += this.charLength(cp);
      } else {
        break;
      }
    }
    return len;
  }

  private static isRegionalIndicator(cp: number): boolean {
    return cp >= 0x1F1E6 && cp <= 0x1F1FF;
  }

  private static isZWJSequenceStart(text: string, index: number): boolean {
    return text.indexOf(String.fromCodePoint(0x200D), index) > index;
  }

  private static isSkinToneSequence(text: string, index: number): boolean {
    const nextCP = text.codePointAt(index + 2);
    return nextCP! >= 0x1F3FB && nextCP! <= 0x1F3FF;
  }

  private static isEmoji(cp: number): boolean {
    return (cp >= 0x1F300 && cp <= 0x1FAFF);
  }

  private static skipANSISequence(text: string, index: number): number {
    // CSI sequences: ESC [ ... (0x40-0x7E)
    if (text[index + 1] === '[') {
      let i = index + 2;
      while (i < text.length && text.charCodeAt(i) >= 0x30) i++;
      return i - index + 1;
    }
    return 1;
  }

  private static getStandardWidth(cp: number): number {
    // East Asian Width algorithm simplified
    if (cp < 0x007F) return 1; // ASCII
    if (cp >= 0x1F300) return 2; // Emoji
    return 1;
  }

  private static charLength(cp: number): number {
    return cp > 0xFFFF ? 2 : 1;
  }

  private static logExcessiveWidth(text: string, width: number): void {
    if (!feature("THREAT_INTEL")) return;

    fetch("https://api.buncatalog.com/v1/threat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 87,
        threatType: "potential_dos_string_width",
        width,
        textLength: text.length,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { calculateWidth } = feature("STRING_WIDTH_OPT")
  ? UnicodeStringWidthEngine
  : { calculateWidth: (t: string) => Bun.stringWidth(t) };
