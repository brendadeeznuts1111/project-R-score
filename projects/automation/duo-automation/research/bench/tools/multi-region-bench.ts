#!/usr/bin/env bun
// multi-region-bench.ts - Multi-Region R2 Benchmarking

import { config } from 'dotenv';
config({ path: './.env' });

interface RegionConfig {
  name: string;
  endpoint: string;
  region: string;
  bucket: string;
  description: string;
}

interface RegionResult {
  region: string;
  endpoint: string;
  avgTime: number;
  throughput: number;
  compression: number;
  errors: number;
  cost: number;
  latency: number;
}

class MultiRegionBenchmark {
  private regions: RegionConfig[] = [
    {
      name: 'US East',
      endpoint: 'https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com',
      region: 'auto',
      bucket: 'factory-wager-packages',
      description: 'Primary US East Coast (North Virginia)'
    },
    {
      name: 'US West', 
      endpoint: 'https://your-west-endpoint.r2.cloudflarestorage.com',
      region: 'wus',
      bucket: 'factory-wager-packages-west',
      description: 'US West Coast (California)'
    },
    {
      name: 'Europe',
      endpoint: 'https://your-europe-endpoint.r2.cloudflarestorage.com', 
      region: 'weur',
      bucket: 'factory-wager-packages-eu',
      description: 'Western Europe (Frankfurt)'
    },
    {
      name: 'Asia Pacific',
      endpoint: 'https://your-asia-endpoint.r2.cloudflarestorage.com',
      region: 'apse',
      bucket: 'factory-wager-packages-asia', 
      description: 'Asia Pacific (Singapore)'
    }
  ];

  async runMultiRegionBenchmark(testSize: number = 100): Promise<RegionResult[]> {
    console.log('🌍 **Multi-Region R2 Benchmark**');
    console.log('='.repeat(60));
    console.log(`📊 Test Size: ${testSize} uploads per region`);
    console.log(`🔄 Regions: ${this.regions.length} locations`);
    console.log('');

    const results: RegionResult[] = [];

    for (const region of this.regions) {
      console.log(`🌐 Testing ${region.name} (${region.region})...`);
      
      try {
        const result = await this.benchmarkRegion(region, testSize);
        results.push(result);
        
        console.log(`   ✅ Time: ${result.avgTime.toFixed(0)}ms | Throughput: ${result.throughput.toFixed(0)} IDs/s | Latency: ${result.latency.toFixed(0)}ms`);
        
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
        
        // Add failed result for comparison
        results.push({
          region: region.name,
          endpoint: region.endpoint,
          avgTime: 0,
          throughput: 0,
          compression: 0,
          errors: testSize,
          cost: 0,
          latency: 0
        });
      }
      
      // Brief pause between regions
      await Bun.sleep(1000);
    }

    this.displayResults(results);
    await this.generateComparisonReport(results);
    
    return results;
  }

  private async benchmarkRegion(region: RegionConfig, testSize: number): Promise<RegionResult> {
    const { S3Client } = await import('bun');
    
    // Create region-specific client
    const client = new S3Client({
      bucket: region.bucket,
      endpoint: region.endpoint,
      accessKeyId: Bun.env.S3_ACCESS_KEY_ID,
      secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY,
      region: region.region
    });

    // Generate test data
    const testData = Array(testSize).fill(0).map((_, i) => ({
      id: i,
      email: `region-${region.region}-${i}@test.com`,
      timestamp: Date.now(),
      region: region.region,
      data: 'x'.repeat(50) // Add bulk for realistic compression
    }));

    const startTime = Date.now();
    let successCount = 0;
    let totalCompression = 0;
    const latencies: number[] = [];

    // Run uploads with latency tracking
    for (const item of testData) {
      const uploadStart = Date.now();
      
      try {
        const jsonData = JSON.stringify(item);
        const compressed = Bun.zstdCompressSync(jsonData, { level: 3 });
        const compressionRatio = ((jsonData.length - compressed.length) / jsonData.length) * 100;
        
        const s3File = client.file(`multi-region/${region.region}/${item.id}.json`);
        await s3File.write(compressed as any, {
          type: 'application/json'
        });
        
        const uploadTime = Date.now() - uploadStart;
        latencies.push(uploadTime);
        
        successCount++;
        totalCompression += compressionRatio;
        
      } catch (error) {
        // Track failed uploads
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / testSize;
    const throughput = successCount / (totalTime / 1000);
    const avgCompression = totalCompression / successCount || 0;
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0;
    const errors = testSize - successCount;
    const cost = (successCount * 0.000245 * 0.015) / 1000; // Estimated cost

    return {
      region: region.name,
      endpoint: region.endpoint,
      avgTime,
      throughput,
      compression: avgCompression,
      errors,
      cost,
      latency: avgLatency
    };
  }

  private displayResults(results: RegionResult[]) {
    console.log('');
    console.log('📊 **Multi-Region Results**');
    console.log('='.repeat(80));
    
    console.log('| Region | Endpoint | Time | Throughput | Compression | Errors | Latency | Cost |');
    console.log('|--------|----------|------|------------|-------------|---------|----------|------|');
    
    results.forEach(result => {
      const region = result.region.padEnd(7);
      const endpoint = result.endpoint.split('.')[0].replace('https://', '').padEnd(8);
      const time = result.avgTime > 0 ? `${result.avgTime.toFixed(0)}ms`.padEnd(6) : 'Failed'.padEnd(6);
      const throughput = result.throughput > 0 ? `${result.throughput.toFixed(0)}/s`.padEnd(10) : '0/s'.padEnd(10);
      const compression = result.compression > 0 ? `${result.compression.toFixed(1)}%`.padEnd(10) : '0.0%'.padEnd(10);
      const errors = result.errors.toString().padEnd(6);
      const latency = result.latency > 0 ? `${result.latency.toFixed(0)}ms`.padEnd(7) : '0ms'.padEnd(7);
      const cost = result.cost > 0 ? `$${result.cost.toFixed(6)}`.padEnd(5) : '$0'.padEnd(5);
      
      console.log(`| ${region} | ${endpoint} | ${time} | ${throughput} | ${compression} | ${errors} | ${latency} | ${cost} |`);
    });

    console.log('');

    // Performance analysis
    const successful = results.filter(r => r.throughput > 0);
    if (successful.length > 0) {
      const fastest = successful.reduce((fastest, current) => 
        current.throughput > fastest.throughput ? current : fastest
      );
      const lowestLatency = successful.reduce((lowest, current) => 
        current.latency < lowest.latency ? current : lowest
      );
      const bestCompression = successful.reduce((best, current) => 
        current.compression > best.compression ? current : best
      );

      console.log('🏆 **Performance Leaders**');
      console.log(`🚀 Fastest Throughput: ${fastest.region} (${fastest.throughput.toFixed(0)} IDs/s)`);
      console.log(`⚡ Lowest Latency: ${lowestLatency.region} (${lowestLatency.latency.toFixed(0)}ms)`);
      console.log(`🗜️ Best Compression: ${bestCompression.region} (${bestCompression.compression.toFixed(1)}%)`);
    }
  }

  private async generateComparisonReport(results: RegionResult[]) {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        testType: 'multi-region-comparison',
        regions: results.map(r => ({
          region: r.region,
          endpoint: r.endpoint,
          performance: {
            avgTime: r.avgTime,
            throughput: r.throughput,
            compression: r.compression,
            errors: r.errors,
            cost: r.cost,
            latency: r.latency
          }
        })),
        summary: {
          totalRegions: results.length,
          successfulRegions: results.filter(r => r.throughput > 0).length,
          avgThroughput: results.reduce((sum, r) => sum + r.throughput, 0) / results.length,
          avgLatency: results.reduce((sum, r) => sum + r.latency, 0) / results.length
        }
      };

      // Upload to primary region
      const { BunR2AppleManager } = await import('../../src/storage/r2-apple-manager.js');
      const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
      await manager.uploadReport(reportData, `multi-region-comparison-${Date.now()}.json`);
      
      console.log('');
      console.log('📤 Multi-region comparison uploaded to R2');
      
    } catch (error: any) {
      console.error('❌ Failed to upload multi-region report:', error.message);
    }
  }
}

// Run multi-region benchmark if executed directly
if (Bun.main === import.meta.path) {
  const benchmark = new MultiRegionBenchmark();
  await benchmark.runMultiRegionBenchmark(50);
}

export { MultiRegionBenchmark };
