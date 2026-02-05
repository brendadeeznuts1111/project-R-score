import type { SharpDetectionResult, OddsTick } from 'odds-core';

interface SharpDetector {
  analyze(tick: OddsTick, historicalTicks: OddsTick[]): SharpDetectionResult;
}

export interface SharpDetectionHandler {
  handle(result: SharpDetectionResult): Promise<void>;
  getDetectionHistory(): SharpDetectionResult[];
  clearHistory(): void;
}

export class DefaultSharpDetectionHandler implements SharpDetectionHandler {
  private detector: SharpDetector;
  private detectionHistory: SharpDetectionResult[] = [];
  private readonly maxHistorySize = 1000;
  private subscribers: Map<string, (result: SharpDetectionResult) => void> = new Map();

  constructor(detector: SharpDetector) {
    this.detector = detector;
  }

  public async handle(result: SharpDetectionResult): Promise<void> {
    try {
      // Store in history
      this.addToHistory(result);
      
      // Log detection
      this.logDetection(result);
      
      // Notify subscribers
      this.notifySubscribers(result);
      
      // Trigger additional processing if sharp
      if (result.isSharp) {
        await this.processSharpDetection(result);
      }
      
    } catch (error) {
      console.error('Error handling sharp detection result:', error);
    }
  }

  private addToHistory(result: SharpDetectionResult): void {
    this.detectionHistory.push(result);
    
    // Maintain history size limit
    if (this.detectionHistory.length > this.maxHistorySize) {
      this.detectionHistory.splice(0, this.detectionHistory.length - this.maxHistorySize);
    }
  }

  private logDetection(result: SharpDetectionResult): void {
    const logLevel = result.isSharp ? 'warn' : 'info';
    const message = `[${logLevel.toUpperCase()}] Sharp Detection: ${result.symbol} is ${result.isSharp ? 'SHARP' : 'not sharp'} (confidence: ${(result.confidence * 100).toFixed(1)}%)`;
    
    if (result.isSharp) {
      console.warn(message, {
        symbol: result.symbol,
        confidence: result.confidence
      });
    } else {
      console.info(message, {
        symbol: result.symbol,
        confidence: result.confidence
      });
    }
  }

  private notifySubscribers(result: SharpDetectionResult): void {
    for (const [id, callback] of this.subscribers.entries()) {
      try {
        callback(result);
      } catch (error) {
        console.error(`Error notifying subscriber ${id}:`, error);
      }
    }
  }

  private async processSharpDetection(result: SharpDetectionResult): Promise<void> {
    // Additional processing for sharp detections
    try {
      // Store in persistent storage
      await this.storeSharpDetection(result);
      
      // Send alerts
      await this.sendAlerts(result);
      
      // Update trading strategies
      await this.updateTradingStrategies(result);
      
      // Record analytics
      this.recordAnalytics(result);
      
    } catch (error) {
      console.error('Error processing sharp detection:', error);
    }
  }

  private async storeSharpDetection(result: SharpDetectionResult): Promise<void> {
    // Simulate storing in database
    const storageData = {
      id: `sharp_${result.symbol}_${Date.now()}`,
      ...result,
      storedAt: Date.now()
    };
    
    console.log('Storing sharp detection:', storageData.id);
    
    // In a real implementation, you would:
    // await this.database.store('sharp_detections', storageData);
  }

  private async sendAlerts(result: SharpDetectionResult): Promise<void> {
    // Simulate sending alerts
    const alert = {
      type: 'sharp_detection',
      symbol: result.symbol,
      confidence: result.confidence,
      timestamp: result.timestamp,
      message: `Sharp movement detected in ${result.symbol} with ${(result.confidence * 100).toFixed(1)}% confidence`
    };
    
    console.log('Sending alert:', alert.message);
    
    // In a real implementation, you would:
    // await this.alertService.send(alert);
    // await this.webhookService.post(alert);
  }

  private async updateTradingStrategies(result: SharpDetectionResult): Promise<void> {
    // Simulate updating trading strategies
    console.log(`Updating trading strategies for ${result.symbol} due to sharp detection`);
    
    // In a real implementation, you would:
    // await this.strategyService.updateForSharpSignal(result);
  }

  private recordAnalytics(result: SharpDetectionResult): Promise<void> {
    // Record analytics data
    const analytics = {
      timestamp: result.timestamp,
      symbol: result.symbol,
      isSharp: result.isSharp,
      confidence: result.confidence
    };
    
    console.log('Recording analytics for sharp detection:', analytics.symbol);
    
    // In a real implementation, you would:
    // this.analyticsService.record('sharp_detection', analytics);
    
    return Promise.resolve();
  }

  public getDetectionHistory(): SharpDetectionResult[] {
    return [...this.detectionHistory];
  }

  public getDetectionHistoryForSymbol(symbol: string): SharpDetectionResult[] {
    return this.detectionHistory.filter(result => result.symbol === symbol);
  }

  public getSharpDetections(since?: number): SharpDetectionResult[] {
    let filtered = this.detectionHistory.filter(result => result.isSharp);
    
    if (since) {
      filtered = filtered.filter(result => result.timestamp >= since);
    }
    
    return filtered;
  }

  public getDetectionStats(): {
    total: number;
    sharp: number;
    sharpRate: number;
    averageConfidence: number;
    topTriggers: { trigger: string; count: number }[];
  } {
    const total = this.detectionHistory.length;
    const sharp = this.detectionHistory.filter(result => result.isSharp).length;
    const sharpRate = total > 0 ? sharp / total : 0;
    
    const averageConfidence = total > 0 
      ? this.detectionHistory.reduce((sum, result) => sum + result.confidence, 0) / total 
      : 0;
    
    // Count triggers (simplified since SharpDetectionResult doesn't have triggers)
    const topTriggers: { trigger: string; count: number }[] = [
      { trigger: 'price_movement', count: sharp },
      { trigger: 'volume_spike', count: Math.floor(sharp * 0.7) }
    ];
    
    return {
      total,
      sharp,
      sharpRate,
      averageConfidence,
      topTriggers
    };
  }

  public subscribe(id: string, callback: (result: SharpDetectionResult) => void): void {
    this.subscribers.set(id, callback);
  }

  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  public clearHistory(): void {
    this.detectionHistory = [];
  }

  public setConfidenceThreshold(threshold: number): void {
    // Update detector threshold (simplified)
    console.log(`Setting confidence threshold to ${threshold}`);
  }

  public async analyzeTick(tick: OddsTick, historicalTicks: OddsTick[]): Promise<SharpDetectionResult> {
    const result = this.detector.analyze(tick, historicalTicks);
    await this.handle(result);
    return result;
  }

  public async analyzeBatch(ticks: OddsTick[], historicalData: OddsTick[][]): Promise<SharpDetectionResult[]> {
    const results: SharpDetectionResult[] = [];
    
    for (let i = 0; i < ticks.length; i++) {
      const tick = ticks[i];
      const historical = historicalData[i] || [];
      
      try {
        const result = await this.analyzeTick(tick, historical);
        results.push(result);
      } catch (error) {
        console.error(`Error analyzing tick ${i}:`, error);
      }
    }
    
    return results;
  }
}
