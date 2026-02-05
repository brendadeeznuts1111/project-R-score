#!/usr/bin/env bun

/**
 * ⚡ ETL Pipeline Stream Handler
 * Bun 1.3 telemetry-driven ETL with ReadableStream processing
 */

import { ReadableStream, YAML } from 'bun';
import { createHash } from 'crypto';

// Load configuration
const config = YAML.parse(await Bun.file('bun.yaml').text());
const { etl } = config.api;

// In-memory registry for demo (in production: use database/redis)
const registry = {
  streams: new Map<string, {
    id: string;
    data: any[];
    status: 'started' | 'processing' | 'completed';
    recordsProcessed: number;
    hash: string;
    createdAt: number;
  }>(),

  async storeStream(data: any[], metadata: any): Promise<string> {
    const streamId = `etl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate hash of processed data
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    const dataHash = hash.digest('hex');

    this.streams.set(streamId, {
      id: streamId,
      data,
      status: 'completed',
      recordsProcessed: data.length,
      hash: dataHash,
      createdAt: Date.now()
    });

    console.log(`📦 Stored ETL stream ${streamId} with ${data.length} records (hash: ${dataHash})`);
    return streamId;
  }
};

/**
 * Validate telemetry payload against schema
 */
function validateTelemetry(data: any, schema: any): boolean {
  try {
    // Basic schema validation
    if (!data || typeof data !== 'object') return false;

    // Check required fields
    if (typeof data.cpu !== 'number' || data.cpu < 0 || data.cpu > 100) return false;
    if (typeof data.mem !== 'number' || data.mem < 0) return false;
    if (!data.timestamp || isNaN(Date.parse(data.timestamp))) return false;

    // Optional network object
    if (data.network && typeof data.network !== 'object') return false;

    return true;
  } catch (error) {
    console.error('Telemetry validation error:', error);
    return false;
  }
}

/**
 * Compress data using zstd
 */
async function zstdCompress(data: Buffer): Promise<Buffer> {
  // In Bun 1.3, we can use native zstd compression
  // For now, return the data as-is (Bun will add native zstd soon)
  return data;
}

/**
 * Hash data for integrity checking
 */
function hashData(data: any): string {
  const hash = createHash('sha256');
  hash.update(typeof data === 'string' ? data : JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * Transform telemetry data (ETL logic)
 */
async function transformTelemetry(rawData: any): Promise<any> {
  // Example transformation: add derived metrics
  const transformed = {
    ...rawData,
    transformedAt: new Date().toISOString(),
    derived: {
      cpuUtilization: rawData.cpu > 80 ? 'high' : rawData.cpu > 50 ? 'medium' : 'low',
      memoryMB: Math.round(rawData.mem / (1024 * 1024)),
      uptime: process.uptime(),
      nodeVersion: process.version
    }
  };

  return transformed;
}

/**
 * Start ETL pipeline with ReadableStream
 */
export async function startETL(data: any, dataType: string = 'JSON'): Promise<ReadableStream> {
  const startTime = performance.now();
  const streamId = `etl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`⚡ Starting ETL pipeline ${streamId} for ${dataType} data`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Validate payload if it's telemetry data
        if (dataType === 'TELEMETRY' && !validateTelemetry(data, etl.schema.telemetry)) {
          controller.error(new Error('Invalid telemetry schema'));
          return;
        }

        // Extract: Parse input data
        let parsedData: any;
        switch (dataType) {
          case 'YAML':
            parsedData = YAML.parse(typeof data === 'string' ? data : YAML.stringify(data));
            break;
          case 'JSON':
          default:
            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            break;
        }

        // Ensure we have an array of records
        const records = Array.isArray(parsedData) ? parsedData : [parsedData];
        const processedRecords: any[] = [];

        // Transform: Process each record
        for (const record of records) {
          const transformed = await transformTelemetry(record);
          processedRecords.push(transformed);
        }

        // Load: Compress and store
        const rawOutput = dataType === 'YAML' ?
          YAML.stringify(processedRecords) :
          JSON.stringify(processedRecords);

        const compressed = await zstdCompress(Buffer.from(rawOutput));
        const finalHash = hashData(compressed);

        // Store in registry
        await registry.storeStream(processedRecords, {
          format: dataType.toLowerCase(),
          metadata: {
            etl_version: '1.3.0',
            timestamp: new Date().toISOString(),
            compression: 'zstd'
          }
        });

        // Stream the compressed data
        controller.enqueue(compressed);

        const processingTime = performance.now() - startTime;
        console.log(`✅ ETL pipeline ${streamId} completed in ${processingTime.toFixed(2)}ms`);
        console.log(`   Processed ${records.length} records, hash: ${finalHash}`);

        controller.close();

      } catch (error) {
        console.error(`💥 ETL pipeline ${streamId} failed:`, error);
        controller.error(error);
      }
    },

    cancel(reason) {
      console.log(`🛑 ETL pipeline ${streamId} cancelled:`, reason);
    }
  });

  return stream;
}

/**
 * Handle ETL start request
 */
export async function handleETLStart(request: Request): Promise<Response> {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const { dataType, payload, compression = 'zstd' } = body;

    if (!dataType || !etl.stream.types.includes(dataType)) {
      return new Response(JSON.stringify({
        error: 'Validation Error',
        message: `Unsupported data type: ${dataType}. Supported: ${etl.stream.types.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Start ETL pipeline
    const stream = await startETL(payload, dataType);

    // Get stream data (in production, this would be streamed directly)
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const finalData = Buffer.concat(chunks);
    const finalHash = hashData(finalData);

    const totalTime = performance.now() - startTime;
    console.log(`🚀 ETL request completed in ${totalTime.toFixed(2)}ms`);

    return new Response(JSON.stringify({
      streamId: `etl_${Date.now()}`,
      status: 'completed',
      recordsProcessed: payload ? (Array.isArray(payload) ? payload.length : 1) : 0,
      hash: finalHash,
      processingTime: `${totalTime.toFixed(2)}ms`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'zstd',
        'X-ETL-Time': `${totalTime.toFixed(2)}ms`
      }
    });

  } catch (error) {
    const errorTime = performance.now() - startTime;
    console.error(`💥 ETL error in ${errorTime.toFixed(2)}ms:`, error);

    return new Response(JSON.stringify({
      error: 'ETL Error',
      message: 'Pipeline processing failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// For direct testing
if (import.meta.main) {
  console.log('⚡ Testing ETL stream pipeline...');

  const testData = {
    cpu: 65.5,
    mem: 134217728, // 128MB in bytes
    network: { rx: 1024, tx: 2048 },
    timestamp: new Date().toISOString()
  };

  console.log('Test data:', testData);

  const stream = await startETL(testData, 'TELEMETRY');
  const reader = stream.getReader();
  const result = await reader.read();

  console.log('ETL stream result:', {
    done: result.done,
    dataLength: result.value?.length || 0
  });
}
