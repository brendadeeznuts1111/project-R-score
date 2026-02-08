/**
 * Metrics calculation functions for dashboard data aggregation
 */

import type {
  ProfileResult,
  ProfileMetrics,
  ProfileOperation,
  P2PGatewayResult,
  P2PMetrics,
  P2PGateway,
  P2POperation,
} from '../types.ts';

/**
 * Calculate aggregate metrics for profile operations
 */
export function calculateProfileMetrics(profileResults: ProfileResult[]): ProfileMetrics[] {
  const operationMap = new Map<ProfileOperation, ProfileResult[]>();
  
  // Group by operation
  profileResults.forEach(result => {
    if (!operationMap.has(result.operation)) {
      operationMap.set(result.operation, []);
    }
    operationMap.get(result.operation)!.push(result);
  });
  
  // Calculate metrics for each operation
  const metrics: ProfileMetrics[] = [];
  operationMap.forEach((results, operation) => {
    const totalOps = results.length;
    const successfulOps = results.filter(r => r.status === 'pass' || r.status === 'warning').length;
    const failedOps = totalOps - successfulOps;
    const successRate = totalOps > 0 ? (successfulOps / totalOps) * 100 : 0;
    
    const avgDurationMs = results.reduce((sum, r) => sum + r.time, 0) / totalOps;
    const avgCpuTimeMs = results.filter(r => r.cpuTimeMs !== undefined).length > 0
      ? results.filter(r => r.cpuTimeMs !== undefined).reduce((sum, r) => sum + (r.cpuTimeMs || 0), 0) / results.filter(r => r.cpuTimeMs !== undefined).length
      : undefined;
    const avgPeakMemoryMb = results.filter(r => r.peakMemoryMb !== undefined).length > 0
      ? results.filter(r => r.peakMemoryMb !== undefined).reduce((sum, r) => sum + (r.peakMemoryMb || 0), 0) / results.filter(r => r.peakMemoryMb !== undefined).length
      : undefined;
    const avgPersonalizationScore = results.filter(r => r.personalizationScore !== undefined).length > 0
      ? results.filter(r => r.personalizationScore !== undefined).reduce((sum, r) => sum + (r.personalizationScore || 0), 0) / results.filter(r => r.personalizationScore !== undefined).length
      : undefined;
    const avgModelAccuracy = results.filter(r => r.modelAccuracy !== undefined).length > 0
      ? results.filter(r => r.modelAccuracy !== undefined).reduce((sum, r) => sum + (r.modelAccuracy || 0), 0) / results.filter(r => r.modelAccuracy !== undefined).length
      : undefined;
    
    metrics.push({
      operation,
      totalOperations: totalOps,
      avgDurationMs,
      avgPersonalizationScore,
      avgModelAccuracy,
      successfulOps,
      failedOps,
      successRate,
      avgCpuTimeMs,
      avgPeakMemoryMb,
    });
  });
  
  return metrics;
}

/**
 * Calculate aggregate metrics for P2P operations
 */
export function calculateP2PMetrics(p2pResults: P2PGatewayResult[]): P2PMetrics[] {
  const operationMap = new Map<string, P2PGatewayResult[]>();
  
  // Group by gateway and operation
  p2pResults.forEach(result => {
    const key = `${result.gateway}-${result.operation}`;
    if (!operationMap.has(key)) {
      operationMap.set(key, []);
    }
    operationMap.get(key)!.push(result);
  });
  
  // Calculate metrics for each gateway-operation combination
  const metrics: P2PMetrics[] = [];
  operationMap.forEach((results, key) => {
    const [gateway, operation] = key.split('-') as [P2PGateway, P2POperation];
    const totalOps = results.length;
    const successfulOps = results.filter(r => r.success !== false && (r.status === 'pass' || r.status === 'warning')).length;
    const failedOps = totalOps - successfulOps;
    const successRate = totalOps > 0 ? (successfulOps / totalOps) * 100 : 0;
    
    const durations = results.map(r => r.time);
    const avgDurationMs = durations.reduce((sum, d) => sum + d, 0) / totalOps;
    const minDurationMs = Math.min(...durations);
    const maxDurationMs = Math.max(...durations);
    
    metrics.push({
      gateway,
      operation,
      totalOperations: totalOps,
      avgDurationMs,
      minDurationMs,
      maxDurationMs,
      successfulOps,
      failedOps,
      successRate,
    });
  });
  
  return metrics;
}
