#!/usr/bin/env bun
/**
 * Component #135: Text-Processing
 * Primary API: Bun.stringWidth (primary)
 * Secondary API: Bun.escapeHTML (secondary)
 * Performance SLA: O(n) scan (Unicode 15.1)
 * Parity Lock: 7m8n...9o0p
 * Status: VERIFIED
 */

import { feature } from "bun:bundle";

export class TextProcessing {
  private static instance: TextProcessing;

  private constructor() {}

  static getInstance(): TextProcessing {
    if (!this.instance) {
      this.instance = new TextProcessing();
    }
    return this.instance;
  }

  stringWidth(text: string): number {
    if (!feature("TEXT_PROCESSING")) {
      return text.length;
    }

    return Bun.stringWidth(text);
  }

  escapeHTML(text: string): string {
    if (!feature("TEXT_PROCESSING")) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    return Bun.escapeHTML(text);
  }

  truncate(text: string, width: number): string {
    if (text.length <= width) return text;
    return text.slice(0, width - 3) + "...";
  }
}

export const textProcessing = feature("TEXT_PROCESSING")
  ? TextProcessing.getInstance()
  : {
      stringWidth: (text: string) => text.length,
      escapeHTML: (text: string) =>
        text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;"),
      truncate: (text: string, width: number) =>
        text.length <= width ? text : text.slice(0, width - 3) + "...",
    };

export default textProcessing;
