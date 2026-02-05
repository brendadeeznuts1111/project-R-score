// telemetry/log-compressor.ts
export class LogCompressor {
  // Compress security logs with 90%+ compression
  static compressLogs(logs: any[]): Uint8Array {
    const jsonString = JSON.stringify(logs, null, 2);
    return Bun.gzipSync(jsonString, {
      level: 9, // Maximum compression
      memLevel: 9 // Maximum memory for better compression
    });
  }

  // Decompress logs on demand
  static decompressLogs(compressed: Uint8Array): any[] {
    const decompressed = Bun.gunzipSync(compressed);
    const text = new TextDecoder().decode(decompressed);
    return JSON.parse(text);
  }

  // Compress files for R2 upload
  static async compressFileForR2(filePath: string): Promise<Uint8Array> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = await file.bytes();
    return Bun.gzipSync(content);
  }
}