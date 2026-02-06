#!/usr/bin/env bun

// scripts/redis-vault-demo.ts - Redis Vault Exposure Tracking Demo

// Simple styled text function
function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

import { RedisVault } from '../lib/security/redis-vault';

async function demoRedisVault() {
  console.log(styled('🏰 Redis Vault Exposure Tracking Demo', 'primary'));
  console.log(styled('=====================================', 'muted'));
  console.log();
  
  const systemId = 'factorywager-demo';
  
  try {
    // Step 1: Simulate secret access patterns
    console.log(styled('📡 Step 1: Simulating Secret Access Patterns...', 'info'));
    console.log();
    
    const secrets = [
      'api:github-token',
      'database:primary-password',
      'csrf:session-token',
      'vault:master-key',
      'session:user-token',
      'encryption:aes-key',
      'backup:restore-token',
      'audit:log-key'
    ];
    
    // Simulate multiple accesses
    for (let i = 0; i < 5; i++) {
      console.log(styled(`   Access round ${i + 1}/5:`, 'muted'));
      
      for (const secret of secrets) {
        try {
          // Fetch secret (this will track exposure)
          const value = await RedisVault.fetchSecret(secret, {
            cache: true,
            ttl: 3600
          });
          
          // Track access with context
          await RedisVault.trackSecretAccess(secret, {
            userId: `user-${i + 1}`,
            sessionId: `session-${crypto.randomUUID()}`,
            ipAddress: `192.168.1.${100 + i}`,
            userAgent: 'FactoryWager-Demo/1.0'
          });
          
          console.log(styled(`     ✅ ${secret}`, 'success'));
        } catch (error) {
          console.log(styled(`     ❌ ${secret}: ${error.message}`, 'error'));
        }
      }
      
      // Small delay between rounds
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log();
    console.log(styled('📊 Step 2: Getting Vault Exposures...', 'info'));
    console.log();
    
    // Get vault exposures
    const exposures = await RedisVault.getVaultExposures(systemId);
    const exposureTypes = ['API', 'Database', 'CSRF', 'Vault', 'Session', 'Encryption', 'Backup', 'Audit'];
    
    console.log(styled('   Exposure Counts:', 'accent'));
    exposures.forEach((count, index) => {
      const type = exposureTypes[index];
      const bar = '█'.repeat(Math.min(20, Math.ceil(count / 2)));
      console.log(styled(`   ${type.padEnd(12)}: ${bar.padEnd(20)} ${count}`, 'info'));
    });
    
    console.log();
    console.log(styled('📈 Step 3: Exposure Analytics...', 'info'));
    console.log();
    
    // Get analytics
    const analytics = await RedisVault.getExposureAnalytics(systemId, 7);
    
    console.log(styled(`   Total Exposures: ${analytics.total}`, 'primary'));
    console.log(styled(`   Risk Score: ${analytics.riskScore.toFixed(1)}/100`, 
      analytics.riskScore > 80 ? 'error' : analytics.riskScore > 60 ? 'warning' : 'success'));
    console.log();
    
    console.log(styled('   By Type:', 'accent'));
    Object.entries(analytics.byType).forEach(([type, count]) => {
      const percentage = analytics.total > 0 ? ((count / analytics.total) * 100).toFixed(1) : '0.0';
      console.log(styled(`   ${type.padEnd(12)}: ${count.toString().padEnd(4)} (${percentage}%)`, 'info'));
    });
    
    console.log();
    console.log(styled('📊 Step 4: 7-Day Trend...', 'info'));
    console.log();
    
    console.log(styled('   Daily Exposures:', 'accent'));
    analytics.trend.forEach((count, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (analytics.trend.length - 1 - index));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const bar = '█'.repeat(Math.min(15, Math.ceil(count / 10)));
      console.log(styled(`   ${dateStr.padEnd(8)}: ${bar.padEnd(15)} ${count}`, 'info'));
    });
    
    console.log();
    console.log(styled('🚨 Step 5: Anomaly Detection...', 'info'));
    console.log();
    
    // Detect anomalies
    const anomalyResult = await RedisVault.detectAnomalies(systemId);
    
    if (anomalyResult.hasAnomaly) {
      console.log(styled('   ⚠️  ANOMALIES DETECTED:', 'warning'));
      anomalyResult.anomalies.forEach((anomaly, index) => {
        const severityColor = anomaly.severity === 'CRITICAL' ? 'error' : 
                             anomaly.severity === 'HIGH' ? 'warning' : 'info';
        console.log(styled(`   ${index + 1}. ${anomaly.type} (${anomaly.severity})`, severityColor));
        console.log(styled(`      ${anomaly.description}`, 'muted'));
        console.log(styled(`      💡 ${anomaly.recommendation}`, 'accent'));
        console.log();
      });
    } else {
      console.log(styled('   ✅ No anomalies detected', 'success'));
    }
    
    console.log();
    console.log(styled('📈 Step 6: Exposure Trends (24h)...', 'info'));
    console.log();
    
    // Get hourly trends
    const trends = await RedisVault.getExposureTrends(systemId, 24);
    
    console.log(styled(`   Summary:`, 'accent'));
    console.log(styled(`   Peak: ${trends.summary.peak} exposures`, 'info'));
    console.log(styled(`   Average: ${trends.summary.average} exposures/hour`, 'info'));
    console.log(styled(`   Total: ${trends.summary.total} exposures`, 'primary'));
    console.log();
    
    // Show last 6 hours
    console.log(styled('   Recent Hours:', 'accent'));
    trends.timeline.slice(-6).forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      const bar = '█'.repeat(Math.min(10, Math.ceil(entry.total / 5)));
      console.log(styled(`   ${hour.toString().padStart(2)}:00 ${bar.padEnd(10)} ${entry.total}`, 'info'));
    });
    
    console.log();
    console.log(styled('🏰 FactoryWager Integration:', 'primary'));
    console.log(styled('   • Redis HyperLogLog exposure tracking', 'success'));
    console.log(styled('   • Real-time anomaly detection', 'success'));
    console.log(styled('   • Risk score calculation', 'success'));
    console.log(styled('   • Trend analysis and forecasting', 'success'));
    console.log(styled('   • Integration with Security Citadel', 'success'));
    
    console.log();
    console.log(styled('🎉 Redis Vault Demo Completed!', 'success'));
    console.log(styled('📊 All exposure data has been tracked and analyzed', 'info'));
    
  } catch (error) {
    console.error(styled(`❌ Demo failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Parse command line arguments
const args = Bun.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(styled('🏰 Redis Vault Demo CLI', 'primary'));
  console.log(styled('========================', 'muted'));
  console.log();
  console.log(styled('Usage:', 'info'));
  console.log('  bun run scripts/redis-vault-demo.ts');
  console.log();
  console.log(styled('Features:', 'info'));
  console.log('  • Redis HyperLogLog exposure tracking');
  console.log('  • Real-time secret access monitoring');
  console.log('  • Anomaly detection and risk scoring');
  console.log('  • Trend analysis and analytics');
  console.log('  • FactoryWager Security Citadel integration');
  console.log();
  console.log(styled('📚 Documentation:', 'accent'));
  console.log('  🔐 Bun Secrets: https://bun.sh/docs/runtime/secrets');
  console.log('  🏰 FactoryWager: https://docs.factory-wager.com/secrets');
  process.exit(0);
}

// Run the demo
demoRedisVault().catch(console.error);
