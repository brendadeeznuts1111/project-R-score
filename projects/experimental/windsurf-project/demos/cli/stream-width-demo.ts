// src/cli/stream-width-demo.ts
/**
 * Advanced streaming demo with real-time Bun.stringWidth calculations
 * Demonstrates complex Unicode, ANSI, and OSC 8 combinations in streams
 */

import { HyperlinkFormatter } from './hyperlink-formatter';

interface StreamChunk {
  id: number;
  content: string;
  type: 'unicode' | 'ansi' | 'osc8' | 'combined';
  description: string;
}

class StreamingWidthDemo {
  private static getComplexChunks(): StreamChunk[] {
    return [
      {
        id: 1,
        content: '🇺🇸👨‍👩‍👧👋🏽',
        type: 'unicode',
        description: 'Complex emoji sequence'
      },
      {
        id: 2,
        content: '\x1b[31m🔥 Red Fire\x1b[0m',
        type: 'ansi',
        description: 'ANSI colored emoji'
      },
      {
        id: 3,
        content: '\x1b]8;;https://bun.sh\x1b\\👨‍💻 Bun\x1b]8;;\x1b\\',
        type: 'osc8',
        description: 'OSC 8 hyperlink with emoji'
      },
      {
        id: 4,
        content: '\x1b[1;34m\x1b]8;;https://empire.pro\x1b\\🏰 Empire\x1b]8;;\x1b\\\x1b[0m',
        type: 'combined',
        description: 'ANSI + OSC 8 + emoji'
      },
      {
        id: 5,
        content: 'नमस्ते 🇮🇳 Hindi',
        type: 'unicode',
        description: 'Indic script + flag'
      },
      {
        id: 6,
        content: '\u2060👨‍💻\u2060🏰\u2060',
        type: 'unicode',
        description: 'Zero-width separated emojis'
      },
      {
        id: 7,
        content: '\x1b[32m🌿 Green \x1b]8;;https://nature.com\x07🍃 Leaf\x1b]8;;\x07\x1b[0m',
        type: 'combined',
        description: 'Full ANSI + OSC 8 combo'
      },
      {
        id: 8,
        content: '🏴‍☠️👨‍⚕️👩‍🚀👮‍♀️',
        type: 'unicode',
        description: 'Profession ZWJ sequences'
      }
    ];
  }

  static async execute(): Promise<void> {
    console.info('🌊 STREAMING WIDTH CALCULATION DEMO\n' + '═'.repeat(60));
    
    const chunks = this.getComplexChunks();
    
    console.info('\n📊 REAL-TIME WIDTH PROCESSING:\n');
    
    // Create async iterable stream
    const stream = this.createWidthStream(chunks);
    
    // Process stream with real-time calculations
    for await (const result of stream) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.info(`Chunk ${result.id}: ${result.description}`);
      console.info(`  Content: ${result.content}`);
      console.info(`  Raw length: ${result.rawLength} chars`);
      console.info(`  Display width: ${result.displayWidth} columns`);
      console.info(`  Efficiency: ${result.efficiency.toFixed(2)}x compression`);
      console.info(`  Type: ${result.type}\n`);
    }
    
    // Summary statistics
    this.showSummary(chunks);
  }

  private static async *createWidthStream(chunks: StreamChunk[]): AsyncGenerator<{
    id: number;
    content: string;
    rawLength: number;
    displayWidth: number;
    efficiency: number;
    type: string;
    description: string;
  }, void, unknown> {
    for (const chunk of chunks) {
      const rawLength = chunk.content.length;
      const displayWidth = (globalThis as any).Bun?.stringWidth?.(chunk.content) ?? chunk.content.length;
      const efficiency = rawLength / displayWidth;
      
      yield {
        id: chunk.id,
        content: chunk.content,
        rawLength,
        displayWidth,
        efficiency,
        type: chunk.type,
        description: chunk.description
      };
    }
  }

  private static showSummary(chunks: StreamChunk[]): void {
    console.info('📈 SUMMARY STATISTICS:');
    
    const totalRaw = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    const totalDisplay = chunks.reduce((sum, chunk) => 
      sum + ((globalThis as any).Bun?.stringWidth?.(chunk.content) ?? chunk.content.length), 0
    );
    
    const typeStats = chunks.reduce((stats, chunk) => {
      if (!stats[chunk.type]) {
        stats[chunk.type] = { count: 0, raw: 0, display: 0 };
      }
      const typeStat = stats[chunk.type];
      if (typeStat) {
        typeStat.count++;
        typeStat.raw += chunk.content.length;
        typeStat.display += (globalThis as any).Bun?.stringWidth?.(chunk.content) ?? chunk.content.length;
      }
      return stats;
    }, {} as Record<string, { count: number; raw: number; display: number }>);
    
    console.info(`  Total raw characters: ${totalRaw}`);
    console.info(`  Total display columns: ${totalDisplay}`);
    console.info(`  Overall efficiency: ${(totalRaw / totalDisplay).toFixed(2)}x`);
    
    console.info('\n  By type:');
    Object.entries(typeStats).forEach(([type, stats]) => {
      const efficiency = stats.raw / stats.display;
      console.info(`    ${type}: ${stats.count} chunks, ${efficiency.toFixed(2)}x efficiency`);
    });
  }
}

// CLI usage
if ((import.meta as any).main) {
  StreamingWidthDemo.execute();
}

export { StreamingWidthDemo };
