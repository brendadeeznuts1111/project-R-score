#!/usr/bin/env bun
// scripts/security-dashboard.ts - One-liner security metrics dashboard
import { PerfMetric, withInspector } from '../types/perf-metric';

async function showSecurityDashboard() {
  try {
    // Fetch from telemetry endpoint
    const response = await fetch('https://duo-npm-registry.utahj4754.workers.dev/-/metrics', {
      headers: {
        'Authorization': `Bearer ${process.env.NPM_TOKEN || 'demo-token'}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }
    
    const metrics: PerfMetric[] = await response.json();
    
    // Filter security metrics
    const securityMetrics = metrics.filter(m => m.category === 'Security');
    
    console.log('🔒 Security Configuration Dashboard');
    console.log('===================================');
    
    console.log('\n📊 All Security Features:');
    const enhancedSecurityMetrics = securityMetrics.map(m => withInspector(m));
    console.log(Bun.inspect.table(enhancedSecurityMetrics, { colors: true }));
    
    console.log('\n✅ ENABLED Features:');
    const enabledFeatures = securityMetrics.filter(m => m.value === 'ENABLED' || m.value === 'ENFORCED');
    const enhancedEnabledFeatures = enabledFeatures.map(m => withInspector(m));
    console.log(Bun.inspect.table(enhancedEnabledFeatures, { colors: true }));
    
    console.log('\n📈 Security Status Summary:');
    const summary = {
      totalSecurity: securityMetrics.length,
      enabled: enabledFeatures.length,
      categories: [...new Set(securityMetrics.map(m => m.type))],
      locations: [...new Set(securityMetrics.map(m => m.locations))]
    };
    
    console.log(`• Total Security Features: ${summary.totalSecurity}`);
    console.log(`• Enabled Features: ${summary.enabled}`);
    console.log(`• Categories: ${summary.categories.join(', ')}`);
    console.log(`• Implementation Locations: ${summary.locations.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Dashboard Error:', error instanceof Error ? error.message : String(error));
    console.log('Falling back to local metrics...');
    
    // Fallback to local file
    try {
      const localMetrics: PerfMetric[] = JSON.parse(require('fs').readFileSync('./perf-metrics.json', 'utf-8'));
      const securityMetrics = localMetrics.filter(m => m.category === 'Security');
      
      console.log('🔒 Local Security Metrics:');
      const enhancedLocalMetrics = securityMetrics.map(m => withInspector(m));
      console.log(Bun.inspect.table(enhancedLocalMetrics, { colors: true }));
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
    }
  }
}

showSecurityDashboard().catch(console.error);
