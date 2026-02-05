import type { OddsTick, ArbitrageOpportunity } from 'odds-core';

export class ArbitrageDetector {
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private minProfitThreshold: number = 0.001; // 0.1%

  constructor(minProfitThreshold: number = 0.001) {
    this.minProfitThreshold = minProfitThreshold;
  }

  public detectOpportunities(ticks: OddsTick[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const symbolGroups = this.groupBySymbol(ticks);

    for (const [symbol, symbolTicks] of symbolGroups.entries()) {
      const symbolOpportunities = this.detectForSymbol(symbol, symbolTicks);
      opportunities.push(...symbolOpportunities);
    }

    return opportunities;
  }

  private groupBySymbol(ticks: OddsTick[]): Map<string, OddsTick[]> {
    const groups = new Map<string, OddsTick[]>();
    
    for (const tick of ticks) {
      if (!groups.has(tick.symbol)) {
        groups.set(tick.symbol, []);
      }
      groups.get(tick.symbol)!.push(tick);
    }

    return groups;
  }

  private detectForSymbol(symbol: string, ticks: OddsTick[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const exchangeGroups = this.groupByExchange(ticks);

    if (exchangeGroups.size < 2) return opportunities;

    const exchanges = Array.from(exchangeGroups.keys());
    
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const exchange1 = exchanges[i];
        const exchange2 = exchanges[j];
        
        const opp = this.calculateArbitrage(
          symbol,
          exchange1,
          exchange2,
          Array.from(exchangeGroups.get(exchange1)!)[0],
          Array.from(exchangeGroups.get(exchange2)!)[0]
        );
        
        if (opp && opp.profit > this.minProfitThreshold) {
          opportunities.push(opp);
        }
      }
    }

    return opportunities;
  }

  private groupByExchange(ticks: OddsTick[]): Map<string, OddsTick> {
    const groups = new Map<string, OddsTick>();
    
    for (const tick of ticks) {
      if (!groups.has(tick.exchange) || 
          tick.timestamp > groups.get(tick.exchange)!.timestamp) {
        groups.set(tick.exchange, tick);
      }
    }

    return groups;
  }

  private calculateArbitrage(
    symbol: string,
    exchange1: string,
    exchange2: string,
    tick1: OddsTick,
    tick2: OddsTick
  ): ArbitrageOpportunity | null {
    const profit = this.calculateProfit(tick1, tick2);
    
    if (profit <= this.minProfitThreshold) return null;

    return {
      id: this.generateOpportunityId(symbol, exchange1, exchange2),
      symbol,
      exchange1,
      exchange2,
      price1: tick1.price,
      price2: tick2.price,
      profit,
      confidence: this.calculateConfidence(tick1, tick2),
      timestamp: Math.max(tick1.timestamp, tick2.timestamp)
    };
  }

  private calculateProfit(tick1: OddsTick, tick2: OddsTick): number {
    const fees = 0.001; // 0.1% trading fees per side
    
    if (tick1.side === 'buy' && tick2.side === 'sell') {
      return (tick2.price - tick1.price) - (tick1.price * fees + tick2.price * fees);
    } else if (tick1.side === 'sell' && tick2.side === 'buy') {
      return (tick1.price - tick2.price) - (tick1.price * fees + tick2.price * fees);
    }
    
    return 0;
  }

  private calculateConfidence(tick1: OddsTick, tick2: OddsTick): number {
    const timeDiff = Math.abs(tick1.timestamp - tick2.timestamp);
    const maxTimeDiff = 1000; // 1 second
    
    const timeScore = Math.max(0, 1 - (timeDiff / maxTimeDiff));
    const sizeScore = Math.min(tick1.size, tick2.size) / Math.max(tick1.size, tick2.size);
    
    return (timeScore + sizeScore) / 2;
  }

  private generateOpportunityId(symbol: string, exchange1: string, exchange2: string): string {
    return `${symbol}-${exchange1}-${exchange2}-${Date.now()}`;
  }

  public setMinProfitThreshold(threshold: number): void {
    this.minProfitThreshold = threshold;
  }

  public getOpportunities(): ArbitrageOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  public clearOpportunities(): void {
    this.opportunities.clear();
  }
}
