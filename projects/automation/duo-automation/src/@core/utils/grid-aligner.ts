/**
 * §Bun:134 - Perfect Grid Alignment
 * @pattern Filter:134
 * @perf <10μs
 * @roi 100x
 * @section §Bun
 */

import type { FilterPattern, FilterResult } from '../types/pattern-definitions';

export class GridAligner implements FilterPattern<string, number> {
  readonly id = "§Bun:134";
  readonly category = "Filter";
  readonly perfBudget = "<10μs";
  readonly roi = "100x";
  readonly semantics = ["unicode", "alignment", "ui"];
  readonly config = {};
  readonly hasRegex = false;

  test(input: string): boolean {
    return typeof input === 'string';
  }

  /**
   * Calculates visual width of string using Bun.stringWidth
   * ensures perfect alignment for Emoji/Unicode
   */
  exec(input: string): FilterResult<number> {
    const width = (Bun as any).stringWidth ? (Bun as any).stringWidth(input) : input.length;
    
    return {
      result: width,
      groups: {
        raw: input,
        isUnicode: /[^\x00-\x7F]/.test(input)
      }
    };
  }

  /**
   * Pad a string to target width, accounting for Unicode visual width
   */
  pad(input: string, target: number, char = ' '): string {
    const currentWidth = this.exec(input).result;
    const diff = target - currentWidth;
    return diff > 0 ? input + char.repeat(diff) : input;
  }
}
