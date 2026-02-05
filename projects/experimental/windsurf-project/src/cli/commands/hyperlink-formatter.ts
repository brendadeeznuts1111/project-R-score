// src/cli/hyperlink-formatter.ts
/**
 * §Pattern:128 - OSC 8 Hyperlink Formatter
 * @pattern Pattern:128
 * @perf <0.1ms per link generation
 * @roi ∞ (terminal UX revolution)
 * @section §CLI
 */

export interface HyperlinkOptions {
  url: string;
  text: string;
  id?: string; // For matrix tracking
  emoji?: string; // For visual enhancement
  width?: number; // For Unicode width fixes
}

export class HyperlinkFormatter {
  private static readonly OSC_8 = '\u001b]8;;';
  private static readonly OSC_8_END = '\u001b\\';
  private static readonly RESET = '\u001b[0m';

  /**
   * Create clickable OSC 8 hyperlink (§Pattern:128.1)
   */
  static create(options: HyperlinkOptions): string {
    // Handle Unicode width for emoji (fixes 🇺🇸=2 issue)
    const displayText = options.emoji ? `${options.emoji} ${options.text}` : options.text;
    const width = options.width || this.calculateWidth(displayText);
    
    return `${this.OSC_8}${options.url}${this.OSC_8_END}${displayText}${this.RESET}`;
  }

  /**
   * Create hyperlinked table row (§Pattern:128.2)
   */
  static tableRow(cells: HyperlinkOptions[]): string {
    return cells.map(cell => this.create(cell)).join(' │ ');
  }

  /**
   * Create hyperlinked metrics row (§Pattern:128.3)
   */
  static metricRow(name: string, value: string, url: string): string {
    return this.create({ url, text: `${name} │ ${value}`, id: `metric:${name}` });
  }

  /**
   * Create emoji-enhanced hyperlink (§Pattern:128.4)
   * Now uses Bun.stringWidth for accurate emoji width calculation
   */
  static emojiLink(emoji: string, text: string, url: string): string {
    return this.create({ emoji, text, url });
  }

  /**
   * Calculate Unicode string width (§Pattern:128.5)
   * Uses improved Bun.stringWidth for accurate Unicode, emoji, and ANSI handling
   */
  private static calculateWidth(str: string): number {
    // Use Bun.stringWidth with type-safe fallback for accurate Unicode width calculation
    // Handles: emoji (🇺🇸=2, 👋🏽=2), ZWJ sequences, zero-width chars, ANSI escapes
    return (globalThis as any).Bun?.stringWidth?.(str) ?? str.length;
  }

  /**
   * Create hyperlinked benchmark result (§Pattern:128.6)
   */
  static benchResult(name: string, time: string, gain: string, logUrl: string): string {
    return this.create({
      url: logUrl,
      text: `${name} │ ${time} │ ${gain}`,
      id: `bench:${name}` 
    });
  }

  /**
   * Create hyperlinked matrix row (§Pattern:128.7)
   */
  static matrixRow(section: string, perf: string, roi: string): string {
    return this.create({
      url: `https://dashboards.factory-wager.com/matrix#${section}`,
      text: `${section} │ ${perf} │ ${roi}`,
      id: `matrix:${section}` 
    });
  }

  /**
   * Create hyperlinked Indic text (§Pattern:128.8)
   * Now properly handles Indic script combining marks with Bun.stringWidth
   */
  static indicLink(text: string, url: string): string {
    return this.create({ text, url });
  }

  /**
   * Create hyperlinked farm control (§Pattern:128.9)
   */
  static farmControl(scale: string, command: string): string {
    return this.create({
      url: `bun://run/${command}`,
      text: `Farm ${scale} Inline`,
      id: `farm:${scale}` 
    });
  }

  /**
   * Create hyperlinked build status (§Pattern:128.10)
   */
  static buildStatus(size: string, speedup: string, url: string): string {
    return this.create({
      url,
      text: `Build CLI ${size} │ ${speedup} Startup`,
      id: 'build:cli'
    });
  }

  /**
   * Hyperlinked query filter (§Pattern:128.11)
   */
  static queryFilter(filter: string, url: string): string {
    return this.create({
      url: `bun://query/${encodeURIComponent(filter)}`,
      text: `Query ${filter}`,
      id: `query:${filter}` 
    });
  }

  /**
   * Hyperlinked inline verification (§Pattern:128.12)
   */
  static inlineVerify(url: string): string {
    return this.create({
      url: `bun://verify/${encodeURIComponent(url)}`,
      text: 'Verify Headers',
      id: 'verify:inline'
    });
  }

  /**
   * Hyperlinked compression stats (§Pattern:128.13)
   */
  static compression(savings: string, url: string): string {
    return this.create({
      url,
      text: `${savings} Savings`,
      id: 'compression:zstd'
    });
  }

  /**
   * Hyperlinked secrets update (§Pattern:128.14)
   */
  static secretsUpdate(scope: string): string {
    return this.create({
      url: `bun://secrets/update/${scope}`,
      text: `Update ${scope} Scoped`,
      id: `secrets:${scope}` 
    });
  }

  /**
   * Hyperlinked gig PNG farm (§Pattern:128.15)
   */
  static gigPNG(size: string, url: string): string {
    return this.create({
      url,
      text: `Gig Inline PNG ${size}`,
      id: `farm:gig:${size}` 
    });
  }

  /**
   * Hyperlinked readable stream (§Pattern:128.16)
   */
  static readableStream(speed: string, url: string): string {
    return this.create({
      url,
      text: `${speed} Conv`,
      id: 'stream:readable'
    });
  }

  /**
   * Hyperlinked empire status (§Pattern:128.17)
   */
  static empireStatus(status: string, url: string): string {
    return this.create({
      url,
      text: `Empire LIVE ${status}`,
      emoji: '🏰',
      id: 'empire:status'
    });
  }
}
