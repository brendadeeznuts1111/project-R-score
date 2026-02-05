import type { OddsTick, MarketData, ArbitrageOpportunity } from './schemas';
import { DataValidator } from './validators';

export class DataParser {
  private validator: DataValidator;

  constructor() {
    this.validator = new DataValidator();
  }

  // Parse odds tick from various formats
  public parseOddsTick(data: unknown, format: 'json' | 'csv' | 'binary' = 'json'): ParseResult<OddsTick> {
    try {
      let parsed: unknown;

      switch (format) {
        case 'json':
          parsed = this.parseJson(data);
          break;
        case 'csv':
          parsed = this.parseCsvTick(data);
          break;
        case 'binary':
          parsed = this.parseBinaryTick(data);
          break;
        default:
          return {
            success: false,
            data: null,
            error: `Unsupported format: ${format}`
          };
      }

      const validation = this.validator.validateOddsTick(parsed);
      
      if (validation.isValid) {
        return {
          success: true,
          data: validation.data!,
          error: null
        };
      } else {
        return {
          success: false,
          data: null,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Parse error: ${error}`
      };
    }
  }

  // Parse market data from JSON or binary formats
  public parseMarketData(data: unknown, format: 'json' | 'binary' = 'json'): ParseResult<MarketData> {
    try {
      let parsed: unknown;

      switch (format) {
        case 'json':
          parsed = this.parseJson(data);
          break;
        case 'binary':
          parsed = this.parseBinaryMarketData(data);
          break;
        default:
          return {
            success: false,
            data: null,
            error: `Unsupported format: ${format}`
          };
      }

      const validation = this.validator.validateMarketData(parsed);
      
      if (validation.isValid) {
        return {
          success: true,
          data: validation.data!,
          error: null
        };
      } else {
        return {
          success: false,
          data: null,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Parse error: ${error}`
      };
    }
  }

  // Parse arbitrage opportunity
  public parseArbitrageOpportunity(data: unknown): ParseResult<ArbitrageOpportunity> {
    try {
      const parsed = this.parseJson(data);
      const validation = this.validator.validateArbitrageOpportunity(parsed);
      
      if (validation.isValid) {
        return {
          success: true,
          data: validation.data!,
          error: null
        };
      } else {
        return {
          success: false,
          data: null,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Parse error: ${error}`
      };
    }
  }

  // Batch parsing
  public parseOddsTicksBatch(data: unknown[], format: 'json' | 'csv' | 'binary' = 'json'): BatchParseResult<OddsTick> {
    const results: OddsTick[] = [];
    const errors: ParseError[] = [];

    for (let i = 0; i < data.length; i++) {
      const result = this.parseOddsTick(data[i], format);
      if (result.success) {
        results.push(result.data!);
      } else {
        errors.push({
          index: i,
          error: result.error!
        });
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors,
      totalProcessed: data.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  // Format conversion utilities
  public toJson(data: OddsTick | MarketData | ArbitrageOpportunity): string {
    return JSON.stringify(data, null, 2);
  }

  public toCsv(ticks: OddsTick[]): string {
    if (ticks.length === 0) return '';
    
    const headers = ['id', 'timestamp', 'symbol', 'price', 'size', 'exchange', 'side'];
    const rows = ticks.map(tick => [
      tick.id,
      tick.timestamp.toString(),
      tick.symbol,
      tick.price.toString(),
      tick.size.toString(),
      tick.exchange,
      tick.side
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  public fromCsv(csvData: string): OddsTick[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',');
    const results: OddsTick[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const tickData: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        switch (header) {
          case 'timestamp':
          case 'price':
          case 'size':
            tickData[header] = parseFloat(value) || 0;
            break;
          default:
            tickData[header] = value || '';
        }
      });
      
      const result = this.parseOddsTick(tickData);
      if (result.success) {
        results.push(result.data!);
      }
    }
    
    return results;
  }

  // Private parsing methods
  private parseJson(data: unknown): unknown {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  }

  private parseCsvTick(data: unknown): unknown {
    if (typeof data === 'string') {
      const values = data.split(',').map(v => v.trim());
      return {
        id: values[0] || '',
        timestamp: parseInt(values[1]) || Date.now(),
        symbol: values[2] || '',
        price: parseFloat(values[3]) || 0,
        size: parseFloat(values[4]) || 0,
        exchange: values[5] || '',
        side: values[6] || 'buy'
      };
    }
    throw new Error('CSV data must be a string');
  }

  private parseBinaryTick(data: unknown): unknown {
    if (data instanceof Buffer || data instanceof Uint8Array) {
      // Simplified binary parsing - in production this would use proper binary protocols
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      
      return {
        id: this.readString(view, 0, 16),
        timestamp: view.getBigUint64(16, true),
        symbol: this.readString(view, 24, 8),
        price: view.getFloat64(32, true),
        size: view.getFloat64(40, true),
        exchange: this.readString(view, 48, 8),
        side: view.getUint8(56) === 0 ? 'buy' : 'sell'
      };
    }
    throw new Error('Binary data must be Buffer or Uint8Array');
  }

  private parseBinaryMarketData(data: unknown): unknown {
    if (data instanceof Buffer || data instanceof Uint8Array) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      
      // Simplified binary market data parsing
      const symbol = this.readString(view, 0, 8);
      const timestamp = view.getBigUint64(8, true);
      const sequence = view.getUint32(16, true);
      
      // Parse bids and asks (simplified)
      const bidCount = view.getUint16(20, true);
      const askCount = view.getUint16(22, true);
      
      const bids: [number, number][] = [];
      const asks: [number, number][] = [];
      
      let offset = 24;
      for (let i = 0; i < bidCount; i++) {
        const price = view.getFloat64(offset, true);
        const size = view.getFloat64(offset + 8, true);
        bids.push([price, size]);
        offset += 16;
      }
      
      for (let i = 0; i < askCount; i++) {
        const price = view.getFloat64(offset, true);
        const size = view.getFloat64(offset + 8, true);
        asks.push([price, size]);
        offset += 16;
      }
      
      return {
        symbol,
        bids,
        asks,
        timestamp: Number(timestamp),
        sequence
      };
    }
    throw new Error('Binary data must be Buffer or Uint8Array');
  }

  private readString(view: DataView, offset: number, maxLength: number): string {
    const bytes: number[] = [];
    for (let i = 0; i < maxLength; i++) {
      const byte = view.getUint8(offset + i);
      if (byte === 0) break; // Null terminator
      bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
}

// Type definitions
export interface ParseResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface BatchParseResult<T> {
  success: boolean;
  data: T[];
  errors: ParseError[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

export interface ParseError {
  index: number;
  error: string;
}
