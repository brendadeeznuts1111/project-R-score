// src/price/realtimeFeed.ts
import { EventEmitter } from "events";

interface PriceData {
  btcUsd: number;
  timestamp: number;
  source: string;
}

export class RealtimePriceFeed extends EventEmitter {
  private readonly EXCHANGE_APIS = [
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
  ];

  private currentPrice: number = 45000;
  private lastUpdate: number = Date.now();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startPriceUpdates();
  }

  /**
   * Start real-time price updates
   */
  private startPriceUpdates(): void {
    // Update every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.fetchLatestPrice();
    }, 30000);

    // Initial fetch
    this.fetchLatestPrice();
  }

  /**
   * Fetch latest BTC price from multiple exchanges
   */
  private async fetchLatestPrice(): Promise<void> {
    try {
      const prices: number[] = [];

      for (const apiUrl of this.EXCHANGE_APIS) {
        try {
          const response = await fetch(apiUrl);
          const data = await response.json() as any;
          
          let price: number | undefined;
          
          if (apiUrl.includes("coinbase")) {
            price = parseFloat(data.data.rates.USD);
          } else if (apiUrl.includes("kraken")) {
            price = parseFloat(data.result.XBTUSD.c[0]);
          } else if (apiUrl.includes("binance")) {
            price = parseFloat(data.price);
          }

          if (price && price > 0) {
            prices.push(price);
          }
        } catch (error) {

        }
      }

      if (prices.length > 0) {
        // Use median price to avoid outliers
        const sortedPrices = prices.sort((a, b) => a - b);
        const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
        
        if (medianPrice) {
          this.currentPrice = medianPrice;
          this.lastUpdate = Date.now();
          
          this.emit("priceUpdate", {
            btcUsd: this.currentPrice,
            timestamp: this.lastUpdate,
            source: "median"
          });

          // Cache in Bun.env for fast access
          (process as any).BTC_USD_PRICE = this.currentPrice;
        }
      }
    } catch (error) {

    }
  }

  /**
   * Get current BTC price
   */
  getCurrentPrice(): number {
    // Check cache first
    const cached = (process as any).BTC_USD_PRICE;
    if (cached && Date.now() - this.lastUpdate < 60000) {
      return cached;
    }
    
    return this.currentPrice;
  }

  /**
   * Convert satoshis to USD using real-time price
   */
  satsToUsd(sats: number): number {
    return (sats / 100000000) * this.getCurrentPrice();
  }

  /**
   * Convert USD to satoshis using real-time price
   */
  usdToSats(usd: number): number {
    return Math.round((usd / this.getCurrentPrice()) * 100000000);
  }

  /**
   * Get price history for the last 24 hours
   */
  async get24hHistory(): Promise<PriceData[]> {
    // This would integrate with your price storage system
    const history = await this.fetchPriceHistory();
    return history;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.removeAllListeners();
  }

  private async fetchPriceHistory(): Promise<PriceData[]> {
    // Implementation would fetch from your database or S3
    return [];
  }
}

// Singleton instance
export const priceFeed = new RealtimePriceFeed();
