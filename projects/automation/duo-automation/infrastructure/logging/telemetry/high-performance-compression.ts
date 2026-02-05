// telemetry/high-performance-compression.ts
export class HighPerformanceCompressor {
  // ZSTD is 2-3x faster than gzip with similar ratios
  static compressTelemetry(telemetry: any[]): Uint8Array {
    const json = JSON.stringify(telemetry);
    return Bun.zstdCompressSync(json, {
      level: 3, // Balanced speed/compression
      dict: this.getCompressionDictionary() // Reuse dictionary for efficiency
    });
  }

  private static compressionDictionary: Uint8Array | null = null;
  
  private static getCompressionDictionary(): Uint8Array {
    if (!this.compressionDictionary) {
      // Create dictionary from common patterns
      const commonPatterns = [
        'timestamp', 'category', 'type', 'value', 'properties',
        'securityScore', 'riskLevel', 'complianceStatus'
      ];
      this.compressionDictionary = Bun.zstdCompressSync(
        JSON.stringify(commonPatterns)
      );
    }
    return this.compressionDictionary;
  }

  // Batch compression for multiple telemetry entries
  static compressBatch(telemetryList: any[][]): Uint8Array[] {
    return telemetryList.map(data => this.compressTelemetry(data));
  }
}