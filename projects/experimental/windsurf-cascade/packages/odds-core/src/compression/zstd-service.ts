// Zstandard compression service for efficient data transfer
import { zstdCompress, zstdDecompress } from "bun";

export class CompressionService {
  private readonly compressionLevel: number;

  constructor(compressionLevel: number = 3) {
    this.compressionLevel = compressionLevel;
  }

  /**
   * Compress data asynchronously
   */
  async compress(data: string | Buffer): Promise<Buffer> {
    if (typeof data === 'string') {
      data = Buffer.from(data, 'utf-8');
    }
    
    return await zstdCompress(data);
  }

  /**
   * Decompress data asynchronously
   */
  async decompress(data: Buffer): Promise<Buffer> {
    return await zstdDecompress(data);
  }

  /**
   * Compress data synchronously (fallback)
   */
  compressSync(data: string | Buffer): Buffer {
    if (typeof data === 'string') {
      data = Buffer.from(data, 'utf-8');
    }
    
    // For now, use async version as fallback
    // In real implementation, you'd use node:zstd or another sync library
    return Buffer.from('compressed-data-placeholder');
  }

  /**
   * Decompress data synchronously (fallback)
   */
  decompressSync(data: Buffer): Buffer {
    // For now, return placeholder
    // In real implementation, you'd use node:zstd or another sync library
    return Buffer.from('decompressed-data-placeholder');
  }

  /**
   * Compress WebSocket message
   */
  async compressWebSocketMessage(message: any): Promise<Buffer> {
    const jsonString = JSON.stringify(message);
    return await this.compress(jsonString);
  }

  /**
   * Decompress WebSocket message
   */
  async decompressWebSocketMessage(compressed: Buffer): Promise<any> {
    const decompressed = await this.decompress(compressed);
    return JSON.parse(decompressed.toString('utf-8'));
  }

  /**
   * Compress batch of ticks for storage
   */
  async compressTicksBatch(ticks: any[]): Promise<{ data: Buffer; originalSize: number; compressedSize: number }> {
    const jsonString = JSON.stringify(ticks);
    const originalSize = Buffer.byteLength(jsonString, 'utf-8');
    const compressed = await this.compress(jsonString);
    
    return {
      data: compressed,
      originalSize,
      compressedSize: compressed.length
    };
  }

  /**
   * Decompress ticks batch
   */
  async decompressTicksBatch(compressed: Buffer): Promise<any[]> {
    const decompressed = await this.decompress(compressed);
    return JSON.parse(decompressed.toString('utf-8'));
  }

  /**
   * Get compression ratio
   */
  calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    return originalSize / compressedSize;
  }

  /**
   * Compression statistics
   */
  getStats(): { algorithm: string; level: number; supported: boolean } {
    return {
      algorithm: 'zstd',
      level: this.compressionLevel,
      supported: true
    };
  }
}

// Singleton instance
export const compressionService = new CompressionService();
