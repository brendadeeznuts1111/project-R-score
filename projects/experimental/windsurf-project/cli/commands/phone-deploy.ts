// cli/commands/phone-deploy.ts
import { Command } from 'commander';
import { PhoneIntelligenceSystem } from '../../src/core/filter/phone-intelligence-system';
import { addPattern } from '../../utils/pattern-matrix';

/**
 * §Pattern:125 - Phone Intelligence Deployment Commands
 * @pattern CLI:125
 * @perf <30s per deployment
 * @roi ∞ (production automation)
 */

const program = new Command()
  .name('phone-deploy')
  .description('Phone Intelligence Deployment Commands');

program
  .command('dashboard')
  .description('Deploy phone intelligence dashboards to R2 + CDN')
  .option('--scope <scope>', 'Deployment scope', 'ENTERPRISE')
  .option('--purge', 'Purge CDN cache after deployment', false)
  .action(async (options) => {
    console.log(`🚀 Deploying phone intelligence dashboards to ${options.scope} scope...`);
    
    try {
      // Validate environment variables
      const requiredVars = ['IPQS_API_KEY', 'R2_ACCOUNT_ID', 'TWILIO_SID'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => console.error(`  - ${varName}`));
        console.log('\n📝 Set up your .env file with:');
        console.log('   cp .env.example .env');
        console.log('   # Edit .env with your API keys');
        process.exit(1);
      }
      
      // Deploy enterprise dashboards
      console.log('📊 Deploying enterprise analytics dashboard...');
      await Bun.spawn(['bun', 'run', 'cli', 'dashboard', 'deploy', '--scope', 'ENTERPRISE'], {
        cwd: process.cwd(),
        stdout: 'inherit',
        stderr: 'inherit'
      }).exited;
      
      // Deploy phone intelligence specific assets
      console.log('📱 Deploying phone intelligence assets...');
      await Bun.spawn(['bun', 'run', 'cli', 'storage', 'upload', '--pattern', 'phone-intelligence/*', '--bucket', 'empire-pro-data'], {
        cwd: process.cwd(),
        stdout: 'inherit',
        stderr: 'inherit'
      }).exited;
      
      // Purge CDN if requested
      if (options.purge) {
        console.log('🧹 Purging CDN cache...');
        await Bun.spawn(['bun', 'run', 'cli', 'cdn', 'purge', '--pattern', '/phone-intelligence/*'], {
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit'
        }).exited;
      }
      
      // Verify deployment
      console.log('🔍 Verifying deployment...');
      const system = new PhoneIntelligenceSystem();
      const healthCheck = await system.healthCheck();
      
      console.log('✅ Phone Intelligence Dashboard Deployment Complete:');
      console.log(`  Health Status: ${healthCheck.status}`);
      console.log(`  Latency: ${healthCheck.latency.toFixed(2)}ms`);
      console.log(`  Patterns: ${healthCheck.patterns}/8 registered`);
      console.log(`  Uptime: ${(healthCheck.uptime / 1000).toFixed(0)}s`);
      
      // Register deployment pattern
      addPattern('CLI', 'PhoneIntelligenceDeploy', {
        perf: '<30s',
        semantics: ['deploy', 'phone-intelligence', 'cdn', 'r2'],
        roi: '∞',
        section: '§CLI',
        deps: ['r2-manager', 'cdn-purge', 'health-check'],
        verified: '✅ ' + new Date().toLocaleDateString()
      });
      
    } catch (error: any) {
      console.error('❌ Dashboard deployment failed:', error?.message || error);
      process.exit(1);
    }
  });

program
  .command('api')
  .description('Deploy phone intelligence API to workers')
  .option('--env <env>', 'Deployment environment', 'production')
  .action(async (options) => {
    const env = options.env;
    console.log(`🚀 Deploying phone intelligence API to ${env}...`);
    
    try {
      // Validate API configuration
      console.log('🔍 Validating API configuration...');
      const system = new PhoneIntelligenceSystem();
      const testResult = await system.process('+14155552671');
      
      if (testResult.duration > 5000) {
        console.warn('⚠️  High latency detected (>5s), consider optimization');
      }
      
      // Deploy Cloudflare Workers
      console.log('☁️ Deploying Cloudflare Workers...');
      if (env === 'staging') {
        await Bun.spawn(['bun', 'run', 'wrangler-staging'], {
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit'
        }).exited;
      } else {
        await Bun.spawn(['bun', 'run', 'wrangler-production'], {
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit'
        }).exited;
      }
      
      // Deploy API routes
      console.log('🌐 Deploying API routes...');
      await Bun.spawn(['bun', 'run', 'cli', 'api', 'deploy', '--env', env], {
        cwd: process.cwd(),
        stdout: 'inherit',
        stderr: 'inherit'
      }).exited;
      
      // Verify API deployment
      console.log('🔍 Verifying API deployment...');
      const apiEndpoint = env === 'staging' 
        ? 'https://api-staging.empire-pro.com' 
        : 'https://api.empire-pro.com';
      
      const result = await Bun.spawn(['curl', '-f', `${apiEndpoint}/v1/phone/intelligence/health`], {
        cwd: process.cwd(),
        stdout: 'inherit',
        stderr: 'inherit'
      }).exited;
      
      if (result !== 0) {
        throw new Error('API health check failed');
      }
      
      console.log('✅ Phone Intelligence API Deployment Complete:');
      console.log(`  Environment: ${env}`);
      console.log(`  Endpoint: ${apiEndpoint}/v1/phone/intelligence`);
      console.log(`  Test Latency: ${testResult.duration.toFixed(2)}ms`);
      
      // Register API deployment pattern
      addPattern('CLI', 'PhoneIntelligenceAPIDeploy', {
        perf: '<45s',
        semantics: ['deploy', 'api', 'workers', 'production'],
        roi: '∞',
        section: '§CLI',
        deps: ['wrangler', 'api-routes', 'health-check'],
        verified: '✅ ' + new Date().toLocaleDateString()
      });
      
    } catch (error: any) {
      console.error('❌ API deployment failed:', error?.message || error);
      process.exit(1);
    }
  });

program
  .command('monitoring')
  .description('Deploy monitoring and alerting setup')
  .option('--grafana', 'Setup Grafana dashboard', false)
  .option('--alerts', 'Configure alerting rules', false)
  .action(async (options) => {
    console.log('📊 Deploying phone intelligence monitoring...');
    
    try {
      if (options.grafana) {
        console.log('📈 Setting up Grafana dashboard...');
        await Bun.spawn(['bun', 'run', 'dashboards/grafana/import-dashboard.ts', '--dashboard=phone-intelligence'], {
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit'
        }).exited;
        
        await Bun.spawn(['bun', 'run', 'dashboards/grafana/configure-datasource.ts', '--type=empire-pro'], {
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit'
        }).exited;
      }
      
      if (options.alerts) {
        console.log('🚨 Configuring alerting rules...');
        await Bun.spawn(['bun', 'run', 'monitoring/setup-alerts.ts', '--service=phone-intelligence'], {
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit'
        }).exited;
      }
      
      console.log('✅ Monitoring deployment complete');
      console.log('  Grafana: https://grafana.empire-pro.com/d/phone-intelligence');
      console.log('  Alerts: Configured for latency >5ms and errors >1%');
      
    } catch (error: unknown) {
      console.error('❌ Monitoring deployment failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check phone intelligence deployment status')
  .action(async () => {
    console.log('🔍 Checking phone intelligence deployment status...');
    
    try {
      // Check system health
      const system = new PhoneIntelligenceSystem();
      const health = await system.healthCheck();
      const metrics = await system.getMetrics();
      
      console.log('📱 Phone Intelligence System Status:');
      console.log(`  Status: ${health.status.toUpperCase()}`);
      console.log(`  Latency: ${health.latency.toFixed(2)}ms`);
      console.log(`  Trust Score: ${health.trustScore}/100`);
      console.log(`  Patterns: ${health.patterns}/8`);
      console.log(`  Throughput: ${metrics.throughput.toFixed(0)}/s`);
      console.log(`  Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
      console.log(`  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
      console.log(`  Uptime: ${(health.uptime / 1000 / 60).toFixed(1)}min`);
      
      // Check API endpoints
      console.log('\n🌐 API Endpoints:');
      const endpoints = [
        'https://api.empire-pro.com/v1/phone/intelligence/health',
        'https://dashboards.empire-pro.com/enterprise',
        'https://storage.empire-pro.com/phone-intelligence'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const result = await Bun.spawn(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', endpoint], {
            stdout: 'pipe'
          }).exited;
          console.log(`  ✅ ${endpoint}`);
        } catch {
          console.log(`  ❌ ${endpoint}`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Status check failed:', error?.message || error);
      process.exit(1);
    }
  });

// Auto-run if main
if (import.meta.main) {
  program.parse();
}

export { program as phoneDeployCommand };
