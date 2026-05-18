// src/cli/commands/hyper-stream.ts
/**
 * §Pattern:133 - Hyperlinked Stream Command with Depth
 * @pattern Pattern:133
 * @perf <10ms per stream chunk
 * @roi ∞ (streaming Unicode visualization)
 * @section §CLI
 */

import { HyperlinkFormatter } from './hyperlink-formatter';

interface StreamItem {
  depth: number;
  text: string;
  url?: string;
  emoji?: string;
  type: 'metric' | 'status' | 'alert' | 'debug';
}

export class HyperStreamCommand {
  private static getIndent(depth: number): string {
    return '  '.repeat(depth);
  }

  private static getDepthIndicator(depth: number): string {
    const indicators = ['─', '├─', '│ ├─', '│ │ ├─', '│ │ │ ├─'];
    return indicators[Math.min(depth, indicators.length - 1)] ?? '─';
  }

  private static getStreamData(): StreamItem[] {
    return [
      // Depth 0 - Root
      { depth: 0, text: 'Empire Pro Stream', emoji: '🏰', type: 'status', url: 'https://empire.pro' },
      
      // Depth 1 - Main branches
      { depth: 1, text: 'Core Metrics', emoji: '📊', type: 'metric', url: 'https://metrics.empire' },
      { depth: 1, text: 'Farm Control', emoji: '🚜', type: 'status', url: 'https://farm.empire' },
      { depth: 1, text: 'Security Shield', emoji: '🛡️', type: 'alert', url: 'https://security.empire' },
      
      // Depth 2 - Sub-items
      { depth: 2, text: '🇺🇸 Unicode Test', type: 'metric', url: 'https://unicode.empire' },
      { depth: 2, text: '👨‍👩‍👧 Family Demo', type: 'debug', url: 'https://family.empire' },
      { depth: 2, text: '👋🏽 Skin Tone Test', type: 'metric', url: 'https://skin.empire' },
      
      // Depth 3 - Deep items
      { depth: 3, text: 'नमस्ते Hindi', type: 'debug', url: 'https://hindi.empire' },
      { depth: 3, text: '\u2060 Zero Width', type: 'debug', url: 'https://zero.empire' },
      { depth: 3, text: '🔥 Fire Emoji', type: 'alert', url: 'https://fire.empire' },
      
      // Depth 4 - Deepest
      { depth: 4, text: '🏴‍☠️ Pirate Flag', type: 'debug', url: 'https://pirate.empire' },
      { depth: 4, text: '👨‍💻 Tech Worker', type: 'metric', url: 'https://tech.empire' }
    ];
  }

  static async execute(): Promise<void> {
    console.info('\n🌊 EMPIRE PRO HYPERLINK STREAM DEPTH VISUALIZATION\n' + '═'.repeat(80));
    
    const streamData = this.getStreamData();
    
    // Create async iterable stream
    const stream = this.createHyperlinkStream(streamData);
    
    // Process stream with width calculations
    console.info('\n📏 STREAM PROCESSING WITH WIDTH CALCULATIONS:\n');
    
    for await (const chunk of stream) {
      // Simulate async processing delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Calculate display width using improved Bun.stringWidth
      const displayWidth = (globalThis as any).Bun?.stringWidth?.(chunk.displayText) ?? chunk.displayText.length;
      const depthWidth = chunk.depth * 2; // 2 spaces per depth level
      
      console.info(`${chunk.prefix} ${chunk.displayText} │ depth:${chunk.depth} width:${displayWidth} indent:${depthWidth}`);
    }
    
    // Show width analysis
    console.info('\n📊 WIDTH ANALYSIS BY DEPTH LEVEL:');
    this.analyzeWidthsByDepth(streamData);
    
    // Demonstrate streaming with ANSI and OSC 8
    console.info('\n🎨 ANSI + OSC 8 STREAM DEMO:');
    await this.demonstrateAnsiStream();
  }

  private static async *createHyperlinkStream(items: StreamItem[]): AsyncGenerator<{
    prefix: string;
    displayText: string;
    depth: number;
    width: number;
  }, void, unknown> {
    for (const item of items) {
      const indent = this.getIndent(item.depth);
      const indicator = this.getDepthIndicator(item.depth);
      const prefix = `${indent}${indicator}`;
      
      let displayText: string;
      
      if (item.url) {
        if (item.emoji) {
          displayText = HyperlinkFormatter.emojiLink(item.emoji, item.text, item.url);
        } else {
          displayText = HyperlinkFormatter.create({ text: item.text, url: item.url });
        }
      } else {
        displayText = item.emoji ? `${item.emoji} ${item.text}` : item.text;
      }
      
      const width = (globalThis as any).Bun?.stringWidth?.(displayText) ?? displayText.length;
      
      yield { prefix, displayText, depth: item.depth, width };
    }
  }

  private static analyzeWidthsByDepth(items: StreamItem[]): void {
    const depthGroups = items.reduce((groups, item) => {
      const depth = item.depth;
      if (!groups[depth]) groups[depth] = [];
      
      const text = item.emoji ? `${item.emoji} ${item.text}` : item.text;
      const width = (globalThis as any).Bun?.stringWidth?.(text) ?? text.length;
      
      groups[depth].push({ text, width });
      return groups;
    }, {} as Record<number, { text: string; width: number }[]>);

    Object.entries(depthGroups).forEach(([depth, items]) => {
      console.info(`  Depth ${depth}:`);
      items.forEach(item => {
        console.info(`    "${item.text}" → ${item.width} columns`);
      });
    });
  }

  private static async demonstrateAnsiStream(): Promise<void> {
    const ansiExamples = [
      { text: '\x1b[31m🔥 Red Alert\x1b[0m', desc: 'Red emoji' },
      { text: '\x1b[1;34m🏰 Bold Castle\x1b[0m', desc: 'Bold blue emoji' },
      { text: '\x1b]8;;https://bun.sh\x1b\\👨‍💻 Bun Link\x1b]8;;\x1b\\', desc: 'Hyperlinked tech worker' },
      { text: '\x1b[32m🌿 Green Nature\x1b[0m \x1b]8;;https://nature.com\x07🍃 Leaf\x1b]8;;\x07', desc: 'Green + hyperlink' }
    ];

    for await (const example of ansiExamples) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const width = (globalThis as any).Bun?.stringWidth?.(example.text) ?? example.text.length;
      console.info(`  ${example.desc}: "${example.text}" → ${width} columns`);
    }
  }
}

// Usage: bun run cli hyper-stream
