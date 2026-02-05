import type { OddsTick } from 'odds-core';

export class TickSequencer {
  private sequences: Map<string, number> = new Map();
  private lastTimestamps: Map<string, number> = new Map();
  private outOfOrderThreshold: number = 1000; // 1 second

  public assignSequence(tick: OddsTick): OddsTick {
    const key = `${tick.symbol}-${tick.exchange}`;
    const lastSeq = this.sequences.get(key) || 0;
    const lastTimestamp = this.lastTimestamps.get(key) || 0;
    
    let sequence: number;
    
    if (tick.timestamp < lastTimestamp - this.outOfOrderThreshold) {
      // Out of order tick, assign a lower sequence
      sequence = Math.max(0, lastSeq - 1000);
    } else if (tick.timestamp >= lastTimestamp) {
      // Normal order, increment sequence
      sequence = lastSeq + 1;
    } else {
      // Slightly out of order but within threshold, use same sequence
      sequence = lastSeq;
    }
    
    this.sequences.set(key, sequence);
    this.lastTimestamps.set(key, tick.timestamp);
    
    return {
      ...tick,
      sequence
    } as OddsTick & { sequence: number };
  }

  public validateSequence(ticks: OddsTick[]): ValidationResult {
    const issues: SequenceIssue[] = [];
    
    for (let i = 1; i < ticks.length; i++) {
      const current = ticks[i];
      const previous = ticks[i - 1];
      
      if (current.symbol === previous.symbol && 
          current.exchange === previous.exchange) {
        
        const currentSeq = (current as any).sequence || 0;
        const prevSeq = (previous as any).sequence || 0;
        
        if (currentSeq < prevSeq) {
          issues.push({
            type: 'out_of_order',
            symbol: current.symbol,
            exchange: current.exchange,
            expected: prevSeq + 1,
            actual: currentSeq,
            timestamp: current.timestamp
          });
        } else if (currentSeq > prevSeq + 1) {
          issues.push({
            type: 'missing_ticks',
            symbol: current.symbol,
            exchange: current.exchange,
            expected: prevSeq + 1,
            actual: currentSeq,
            timestamp: current.timestamp
          });
        }
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      totalTicks: ticks.length
    };
  }

  public getSequenceStats(symbol: string, exchange: string): SequenceStats {
    const key = `${symbol}-${exchange}`;
    const sequence = this.sequences.get(key) || 0;
    const lastTimestamp = this.lastTimestamps.get(key) || 0;
    
    return {
      currentSequence: sequence,
      lastTimestamp,
      ticksPerSecond: this.calculateTicksPerSecond(key)
    };
  }

  private calculateTicksPerSecond(key: string): number {
    // This would be implemented with actual timing data
    // For now, return a placeholder
    return 0;
  }

  public resetSequences(): void {
    this.sequences.clear();
    this.lastTimestamps.clear();
  }

  public setOutOfOrderThreshold(threshold: number): void {
    this.outOfOrderThreshold = threshold;
  }
}

interface SequenceIssue {
  type: 'out_of_order' | 'missing_ticks' | 'duplicate';
  symbol: string;
  exchange: string;
  expected: number;
  actual: number;
  timestamp: number;
}

interface ValidationResult {
  isValid: boolean;
  issues: SequenceIssue[];
  totalTicks: number;
}

interface SequenceStats {
  currentSequence: number;
  lastTimestamp: number;
  ticksPerSecond: number;
}
