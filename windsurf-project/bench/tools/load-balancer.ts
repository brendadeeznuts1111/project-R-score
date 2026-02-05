#!/usr/bin/env bun
// load-balancer.ts - Intelligent Load Balancing and Failover

import { config } from 'dotenv';
config({ path: './.env' });

interface Endpoint {
  id: string;
  name: string;
  endpoint: string;
  bucket: string;
  region: string;
  priority: number;
  healthy: boolean;
  lastCheck: number;
  responseTime: number;
  errorCount: number;
  successCount: number;
}

interface LoadBalancingResult {
  endpoint: string;
  uploadTime: number;
  success: boolean;
  failoverUsed: boolean;
  totalAttempts: number;
}

class IntelligentLoadBalancer {
  private endpoints: Endpoint[] = [
    {
      id: 'primary',
      name: 'Primary R2',
      endpoint: 'https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com',
      bucket: 'apple-ids-bucket',
      region: 'enam',
      priority: 1,
      healthy: true,
      lastCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      successCount: 0
    },
    {
      id: 'secondary',
      name: 'Secondary R2',
      endpoint: 'https://backup-r2-endpoint.r2.cloudflarestorage.com',
      bucket: 'apple-ids-backup',
      region: 'wus',
      priority: 2,
      healthy: true,
      lastCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      successCount: 0
    },
    {
      id: 'tertiary',
      name: 'Tertiary R2', 
      endpoint: 'https://tertiary-r2-endpoint.r2.cloudflarestorage.com',
      bucket: 'apple-ids-tertiary',
      region: 'weur',
      priority: 3,
      healthy: true,
      lastCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      successCount: 0
    }
  ];

  private healthCheckInterval = 30000; // 30 seconds
  private maxRetries = 3;
  private circuitBreakerThreshold = 5; // Fail after 5 consecutive errors

  async startHealthMonitoring() {
    console.log('🏥 **Starting Intelligent Load Balancer**');
    console.log('='.repeat(50));
    console.log(`📊 Monitoring ${this.endpoints.length} endpoints`);
    console.log(`🔄 Health check interval: ${this.healthCheckInterval / 1000}s`);
    console.log('');

    // Initial health check
    await this.performHealthChecks();

    // Start continuous monitoring
    setInterval(() => this.performHealthChecks(), this.healthCheckInterval);
    
    console.log('✅ Load balancer active with intelligent failover');
  }

  async uploadWithFailover(data: any, filename: string): Promise<LoadBalancingResult> {
    const healthyEndpoints = this.endpoints
      .filter(e => e.healthy)
      .sort((a, b) => a.priority - b.priority);

    if (healthyEndpoints.length === 0) {
      throw new Error('No healthy endpoints available');
    }

    let attempts = 0;
    let lastError: Error | null = null;

    for (const endpoint of healthyEndpoints) {
      attempts++;
      
      try {
        const result = await this.uploadToEndpoint(endpoint, data, filename);
        
        // Update success metrics
        endpoint.successCount++;
        endpoint.errorCount = 0; // Reset error count on success
        
        return {
          endpoint: endpoint.name,
          uploadTime: result.uploadTime,
          success: true,
          failoverUsed: endpoint.priority > 1,
          totalAttempts: attempts
        };
        
      } catch (error: any) {
        lastError = error;
        endpoint.errorCount++;
        
        console.warn(`⚠️ Upload failed on ${endpoint.name}: ${error.message}`);
        
        // Mark endpoint as unhealthy if too many errors
        if (endpoint.errorCount >= this.circuitBreakerThreshold) {
          endpoint.healthy = false;
          console.log(`🔴 Circuit breaker activated for ${endpoint.name}`);
        }
        
        // Continue to next endpoint if available
        if (attempts < this.maxRetries && healthyEndpoints.indexOf(endpoint) < healthyEndpoints.length - 1) {
          console.log(`🔄 Failing over to next endpoint...`);
          continue;
        }
      }
    }

    // All endpoints failed
    return {
      endpoint: 'none',
      uploadTime: 0,
      success: false,
      failoverUsed: false,
      totalAttempts: attempts
    };
  }

  private async uploadToEndpoint(endpoint: Endpoint, data: any, filename: string): Promise<{ uploadTime: number }> {
    const startTime = Date.now();
    
    const { S3Client } = await import('bun');
    const client = new S3Client({
      bucket: endpoint.bucket,
      endpoint: endpoint.endpoint,
      accessKeyId: Bun.env.S3_ACCESS_KEY_ID,
      secretAccessKey: config.getSecret('s3').secretAccessKey,
      region: endpoint.region
    });

    const jsonData = JSON.stringify(data);
    const compressed = Bun.zstdCompressSync(jsonData, { level: 3 });
    
    const s3File = client.file(`load-balancer/${filename}`);
    await s3File.write(compressed as any, {
      type: 'application/json'
    });

    const uploadTime = Date.now() - startTime;
    endpoint.responseTime = uploadTime;
    
    return { uploadTime };
  }

  private async performHealthChecks() {
    console.log('🏥 Performing health checks...');
    
    for (const endpoint of this.endpoints) {
      try {
        const isHealthy = await this.checkEndpointHealth(endpoint);
        endpoint.healthy = isHealthy;
        endpoint.lastCheck = Date.now();
        
        const status = isHealthy ? '✅' : '❌';
        const responseTime = endpoint.responseTime > 0 ? `${endpoint.responseTime}ms` : 'N/A';
        console.log(`${status} ${endpoint.name}: ${responseTime} | Success: ${endpoint.successCount} | Errors: ${endpoint.errorCount}`);
        
      } catch (error: any) {
        endpoint.healthy = false;
        endpoint.lastCheck = Date.now();
        console.log(`❌ ${endpoint.name}: Health check failed - ${error.message}`);
      }
    }
    
    console.log('');
  }

  private async checkEndpointHealth(endpoint: Endpoint): Promise<boolean> {
    try {
      const { S3Client } = await import('bun');
      const client = new S3Client({
        bucket: endpoint.bucket,
        endpoint: endpoint.endpoint,
        accessKeyId: Bun.env.S3_ACCESS_KEY_ID,
        secretAccessKey: config.getSecret('s3').secretAccessKey,
        region: endpoint.region
      });

      // Simple health check - try to list bucket (very lightweight)
      const startTime = Date.now();
      const testFile = client.file('health-check-test');
      await testFile.exists();
      const responseTime = Date.now() - startTime;
      
      endpoint.responseTime = responseTime;
      
      // Consider healthy if response time is reasonable (< 5 seconds)
      return responseTime < 5000;
      
    } catch (error) {
      return false;
    }
  }

  getLoadBalancingStats() {
    const healthy = this.endpoints.filter(e => e.healthy);
    const totalSuccess = this.endpoints.reduce((sum, e) => sum + e.successCount, 0);
    const totalErrors = this.endpoints.reduce((sum, e) => sum + e.errorCount, 0);
    
    return {
      totalEndpoints: this.endpoints.length,
      healthyEndpoints: healthy.length,
      totalSuccess,
      totalErrors,
      successRate: totalSuccess + totalErrors > 0 ? (totalSuccess / (totalSuccess + totalErrors)) * 100 : 0,
      endpoints: this.endpoints.map(e => ({
        name: e.name,
        healthy: e.healthy,
        responseTime: e.responseTime,
        successRate: e.successCount + e.errorCount > 0 ? 
          (e.successCount / (e.successCount + e.errorCount)) * 100 : 0
      }))
    };
  }

  displayStats() {
    const stats = this.getLoadBalancingStats();
    
    console.log('📊 **Load Balancer Statistics**');
    console.log('='.repeat(40));
    console.log(`🌐 Endpoints: ${stats.healthyEndpoints}/${stats.totalEndpoints} healthy`);
    console.log(`✅ Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`📈 Total Success: ${stats.totalSuccess}`);
    console.log(`❌ Total Errors: ${stats.totalErrors}`);
    console.log('');
    
    console.log('**Endpoint Details**:');
    stats.endpoints.forEach(endpoint => {
      const status = endpoint.healthy ? '🟢' : '🔴';
      const responseTime = endpoint.responseTime > 0 ? `${endpoint.responseTime}ms` : 'N/A';
      console.log(`${status} ${endpoint.name}: ${responseTime} | ${endpoint.successRate.toFixed(1)}% success`);
    });
  }
}

// Demo and testing
if (Bun.main === import.meta.path) {
  const loadBalancer = new IntelligentLoadBalancer();
  
  // Start monitoring
  await loadBalancer.startHealthMonitoring();
  
  // Test failover with sample uploads
  console.log('🧪 Testing intelligent failover...');
  
  const testData = {
    test: 'load-balancer',
    timestamp: Date.now(),
    data: 'x'.repeat(100)
  };
  
  for (let i = 0; i < 5; i++) {
    try {
      const result = await loadBalancer.uploadWithFailover(testData, `test-${i}.json`);
      const status = result.success ? '✅' : '❌';
      const failover = result.failoverUsed ? ' (failover)' : '';
      console.log(`${status} Upload ${i + 1}: ${result.endpoint}${failover} - ${result.uploadTime}ms`);
    } catch (error: any) {
      console.log(`❌ Upload ${i + 1} failed: ${error.message}`);
    }
    
    await Bun.sleep(1000);
  }
  
  // Display final stats
  console.log('');
  loadBalancer.displayStats();
}

export { IntelligentLoadBalancer };
