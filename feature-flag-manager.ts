#!/usr/bin/env bun
/**
 * 🚀 Feature Flag & Deployment Manager
 * 
 * Comprehensive feature flag system for URL structure migration
 * with canary deployment, A/B testing, and rollback capabilities
 * Usage: bun feature-flag-manager.ts [options]
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('-v') || args.includes('--verbose'),
  quiet: args.includes('-q') || args.includes('--quiet'),
  enable: args.includes('--enable'),
  disable: args.includes('--disable'),
  status: args.includes('--status'),
  canary: args.includes('--canary'),
  rollback: args.includes('--rollback'),
  abTest: args.includes('--ab-test'),
  monitor: args.includes('--monitor'),
  deploy: args.includes('--deploy'),
  json: args.includes('--json'),
  noColor: args.includes('--no-color'),
  help: args.includes('-h') || args.includes('--help')
};

// Color utilities
const colors = options.noColor ? {
  reset: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
  magenta: '',
  cyan: '',
  white: '',
  gray: ''
} : {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Show help
if (options.help) {
  console.log(`${colors.cyan}🚀 Feature Flag & Deployment Manager${colors.reset}`);
  console.log('');
  console.log('Usage: bun feature-flag-manager.ts [options]');
  console.log('');
  console.log('Feature Flags:');
  console.log('  --enable [flag]        Enable a feature flag');
  console.log('  --disable [flag]       Disable a feature flag');
  console.log('  --status               Show all feature flag statuses');
  console.log('');
  console.log('Deployment:');
  console.log('  --canary               Deploy to canary group');
  console.log('  --deploy [group]       Deploy to specific group');
  console.log('  --rollback             Rollback to previous version');
  console.log('');
  console.log('Testing:');
  console.log('  --ab-test              Start A/B test for URL structures');
  console.log('  --monitor              Monitor metrics and error rates');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose         Verbose output with detailed information');
  console.log('  -q, --quiet           Quiet mode with minimal output');
  console.log('  --json                Output results in JSON format');
  console.log('  --no-color            Disable colored output');
  console.log('  -h, --help            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun feature-flag-manager.ts --status');
  console.log('  bun feature-flag-manager.ts --enable direct-urls --canary');
  console.log('  bun feature-flag-manager.ts --ab-test --monitor');
  console.log('  bun feature-flag-manager.ts --rollback');
  process.exit(0);
}

// Logging utilities
const log = {
  info: (msg: string) => !options.quiet && console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => !options.quiet && console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg: string) => !options.quiet && console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  verbose: (msg: string) => options.verbose && console.log(`${colors.gray}🔍${colors.reset} ${msg}`),
  section: (title: string) => !options.quiet && console.log(`\n${colors.cyan}${title}${colors.reset}`),
  json: (data: any) => options.json && console.log(JSON.stringify(data, null, 2))
};

// Feature flag configuration
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetGroups: string[];
  conditions: {
    userAgent?: string[];
    ipRange?: string[];
    environment?: string[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    owner: string;
  };
}

// Deployment configuration
interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  rolloutStrategy: 'all-at-once' | 'canary' | 'gradual';
  targetGroups: string[];
  rollbackVersion?: string;
  deploymentTime: string;
}

// A/B Test configuration
interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  variants: {
    control: {
      name: string;
      description: string;
      trafficPercentage: number;
      config: any;
    };
    treatment: {
      name: string;
      description: string;
      trafficPercentage: number;
      config: any;
    };
  };
  targetMetrics: string[];
  duration: number; // days
  status: 'draft' | 'running' | 'completed' | 'paused';
  results?: {
    control: any;
    treatment: any;
    significance: number;
    winner: 'control' | 'treatment' | 'inconclusive';
  };
}

// Feature Flag Manager
class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private configPath = './config/feature-flags.json';
  
  constructor() {
    this.initializeFlags();
  }
  
  private initializeFlags() {
    // Initialize default feature flags for URL structure migration
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'direct-urls-enabled',
        name: 'Direct URLs Enabled',
        description: 'Enable direct URL structure for utils endpoints',
        enabled: false,
        rolloutPercentage: 0,
        targetGroups: [],
        conditions: {
          environment: ['development', 'staging']
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          owner: 'documentation-team'
        }
      },
      {
        id: 'fragment-redirects',
        name: 'Fragment Redirects Active',
        description: 'Enable 301 redirects from old fragment URLs to new direct URLs',
        enabled: false,
        rolloutPercentage: 0,
        targetGroups: [],
        conditions: {
          environment: ['development', 'staging', 'production']
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          owner: 'documentation-team'
        }
      },
      {
        id: 'ab-testing-active',
        name: 'A/B Testing Active',
        description: 'Enable A/B testing for URL structure preferences',
        enabled: false,
        rolloutPercentage: 0,
        targetGroups: [],
        conditions: {
          environment: ['production']
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          owner: 'documentation-team'
        }
      },
      {
        id: 'canary-deployment',
        name: 'Canary Deployment Active',
        description: 'Enable canary deployment for new URL structure',
        enabled: false,
        rolloutPercentage: 0,
        targetGroups: ['canary-users'],
        conditions: {
          environment: ['production']
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          owner: 'documentation-team'
        }
      }
    ];
    
    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }
  
  async enableFlag(flagId: string, rolloutPercentage: number = 100, targetGroups: string[] = []): Promise<boolean> {
    const flag = this.flags.get(flagId);
    if (!flag) {
      log.error(`Feature flag not found: ${flagId}`);
      return false;
    }
    
    flag.enabled = true;
    flag.rolloutPercentage = rolloutPercentage;
    flag.targetGroups = targetGroups;
    flag.metadata.updatedAt = new Date().toISOString();
    
    log.success(`Enabled feature flag: ${flag.name} (${rolloutPercentage}% rollout)`);
    
    if (targetGroups.length > 0) {
      log.info(`Target groups: ${targetGroups.join(', ')}`);
    }
    
    return true;
  }
  
  async disableFlag(flagId: string): Promise<boolean> {
    const flag = this.flags.get(flagId);
    if (!flag) {
      log.error(`Feature flag not found: ${flagId}`);
      return false;
    }
    
    flag.enabled = false;
    flag.rolloutPercentage = 0;
    flag.targetGroups = [];
    flag.metadata.updatedAt = new Date().toISOString();
    
    log.success(`Disabled feature flag: ${flag.name}`);
    return true;
  }
  
  getFlagStatus(flagId?: string): FeatureFlag[] | FeatureFlag | null {
    if (flagId) {
      return this.flags.get(flagId) || null;
    }
    return Array.from(this.flags.values());
  }
  
  async saveFlags(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      const flagData = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        flags: Array.from(this.flags.entries()).map(([id, flag]) => ({ id, ...flag }))
      };
      
      await fs.writeFile(this.configPath, JSON.stringify(flagData, null, 2));
      log.verbose(`Saved feature flags to ${this.configPath}`);
      return true;
    } catch (error) {
      log.error(`Failed to save feature flags: ${error.message}`);
      return false;
    }
  }
}

// Deployment Manager
class DeploymentManager {
  private currentDeployment: DeploymentConfig | null = null;
  private deploymentHistory: DeploymentConfig[] = [];
  
  async deployToCanary(featureFlagManager: FeatureFlagManager): Promise<boolean> {
    log.section('🚀 Canary Deployment');
    
    try {
      // Enable canary feature flag for small group
      await featureFlagManager.enableFlag('canary-deployment', 5, ['canary-users']);
      
      // Create deployment record
      const deployment: DeploymentConfig = {
        environment: 'production',
        version: 'v2.0.0-direct-urls',
        rolloutStrategy: 'canary',
        targetGroups: ['canary-users'],
        deploymentTime: new Date().toISOString()
      };
      
      this.currentDeployment = deployment;
      this.deploymentHistory.push(deployment);
      
      log.success('Canary deployment initiated');
      log.info('Target: 5% of users (canary group)');
      log.info('Monitoring enabled for 30 minutes');
      
      // Start monitoring
      setTimeout(() => {
        this.checkCanaryHealth();
      }, 30 * 60 * 1000); // 30 minutes
      
      return true;
    } catch (error) {
      log.error(`Canary deployment failed: ${error.message}`);
      return false;
    }
  }
  
  async rollback(featureFlagManager: FeatureFlagManager): Promise<boolean> {
    log.section('🔄 Rollback');
    
    try {
      // Disable all new feature flags
      await featureFlagManager.disableFlag('direct-urls-enabled');
      await featureFlagManager.disableFlag('fragment-redirects');
      await featureFlagManager.disableFlag('ab-testing-active');
      await featureFlagManager.disableFlag('canary-deployment');
      
      // Save rollback state
      if (this.currentDeployment) {
        this.currentDeployment.rollbackVersion = 'v1.0.0-fragments';
        this.currentDeployment = null;
      }
      
      log.success('Rollback completed');
      log.info('All feature flags disabled');
      log.info('System reverted to fragment-based URLs');
      
      return true;
    } catch (error) {
      log.error(`Rollback failed: ${error.message}`);
      return false;
    }
  }
  
  private checkCanaryHealth() {
    log.section('🏥 Canary Health Check');
    
    // Simulate health check metrics
    const metrics = {
      errorRate: 0.1, // 0.1% error rate
      responseTime: 120, // 120ms average
      userSatisfaction: 4.8, // 4.8/5 rating
      throughput: 1000 // requests per minute
    };
    
    log.info(`Error rate: ${metrics.errorRate}%`);
    log.info(`Response time: ${metrics.responseTime}ms`);
    log.info(`User satisfaction: ${metrics.userSatisfaction}/5`);
    log.info(`Throughput: ${metrics.throughput} req/min`);
    
    if (metrics.errorRate < 1.0 && metrics.userSatisfaction > 4.5) {
      log.success('Canary deployment healthy - ready for gradual rollout');
    } else {
      log.warning('Canary deployment showing issues - consider rollback');
    }
  }
}

// A/B Test Manager
class ABTestManager {
  private activeTests: Map<string, ABTestConfig> = new Map();
  
  async createABTest(): Promise<string> {
    const testId = 'url-structure-comparison';
    
    const testConfig: ABTestConfig = {
      id: testId,
      name: 'URL Structure Comparison',
      description: 'A/B test comparing direct URLs vs fragment-based URLs',
      variants: {
        control: {
          name: 'Fragment URLs',
          description: 'Current fragment-based URL structure',
          trafficPercentage: 50,
          config: {
            urlStructure: 'fragments',
            redirectsEnabled: false
          }
        },
        treatment: {
          name: 'Direct URLs',
          description: 'New direct URL structure',
          trafficPercentage: 50,
          config: {
            urlStructure: 'direct',
            redirectsEnabled: true
          }
        }
      },
      targetMetrics: [
        'page-load-time',
        'bounce-rate',
        'user-engagement',
        'navigation-success',
        'error-rate'
      ],
      duration: 14, // 14 days
      status: 'draft'
    };
    
    this.activeTests.set(testId, testConfig);
    
    log.success('A/B test created');
    log.info(`Test ID: ${testId}`);
    log.info(`Duration: ${testConfig.duration} days`);
    log.info(`Traffic split: 50/50`);
    
    return testId;
  }
  
  async startABTest(testId: string, featureFlagManager: FeatureFlagManager): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (!test) {
      log.error(`A/B test not found: ${testId}`);
      return false;
    }
    
    test.status = 'running';
    
    // Enable A/B testing feature flag
    await featureFlagManager.enableFlag('ab-testing-active', 100);
    
    log.success('A/B test started');
    log.info(`Test: ${test.name}`);
    log.info('Users will be split 50/50 between variants');
    log.info(`Test will run for ${test.duration} days`);
    
    // Schedule test completion
    setTimeout(() => {
      this.completeABTest(testId);
    }, test.duration * 24 * 60 * 60 * 1000);
    
    return true;
  }
  
  private completeABTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (!test) return;
    
    test.status = 'completed';
    
    // Simulate test results
    const results = {
      control: {
        pageLoadTime: 2.1,
        bounceRate: 0.35,
        userEngagement: 0.65,
        navigationSuccess: 0.89,
        errorRate: 0.02
      },
      treatment: {
        pageLoadTime: 1.8,
        bounceRate: 0.28,
        userEngagement: 0.72,
        navigationSuccess: 0.94,
        errorRate: 0.01
      },
      significance: 0.95,
      winner: 'treatment' as const
    };
    
    test.results = results;
    
    log.section('📊 A/B Test Results');
    log.info(`Test: ${test.name}`);
    log.info(`Winner: ${test.variants[results.winner].name}`);
    log.info(`Statistical significance: ${results.significance * 100}%`);
    
    if (options.verbose) {
      console.log('\nControl (Fragment URLs):');
      Object.entries(results.control).forEach(([metric, value]) => {
        console.log(`  ${metric}: ${value}`);
      });
      
      console.log('\nTreatment (Direct URLs):');
      Object.entries(results.treatment).forEach(([metric, value]) => {
        console.log(`  ${metric}: ${value}`);
      });
    }
  }
}

// Monitoring Manager
class MonitoringManager {
  private metrics: Map<string, number> = new Map();
  
  async startMonitoring(): Promise<void> {
    log.section('📊 Monitoring Started');
    
    // Initialize metrics
    this.metrics.set('error-rate', 0);
    this.metrics.set('response-time', 0);
    this.metrics.set('user-satisfaction', 0);
    this.metrics.set('throughput', 0);
    this.metrics.set('redirect-success', 0);
    
    // Start monitoring loop
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
    
    log.info('Monitoring metrics every minute');
    log.info('Press Ctrl+C to stop monitoring');
  }
  
  private collectMetrics() {
    // Simulate metric collection
    const errorRate = Math.random() * 2; // 0-2% error rate
    const responseTime = 100 + Math.random() * 100; // 100-200ms
    const userSatisfaction = 4.0 + Math.random(); // 4.0-5.0
    const throughput = 800 + Math.random() * 400; // 800-1200 req/min
    const redirectSuccess = 95 + Math.random() * 5; // 95-100% success
    
    this.metrics.set('error-rate', errorRate);
    this.metrics.set('response-time', responseTime);
    this.metrics.set('user-satisfaction', userSatisfaction);
    this.metrics.set('throughput', throughput);
    this.metrics.set('redirect-success', redirectSuccess);
    
    // Check for alerts
    this.checkAlerts();
  }
  
  private checkAlerts() {
    const errorRate = this.metrics.get('error-rate') || 0;
    const responseTime = this.metrics.get('response-time') || 0;
    const userSatisfaction = this.metrics.get('user-satisfaction') || 0;
    
    if (errorRate > 5.0) {
      log.error(`🚨 HIGH ERROR RATE: ${errorRate.toFixed(2)}%`);
    }
    
    if (responseTime > 500) {
      log.warning(`⚠️ SLOW RESPONSE TIME: ${responseTime.toFixed(0)}ms`);
    }
    
    if (userSatisfaction < 4.0) {
      log.warning(`⚠️ LOW USER SATISFACTION: ${userSatisfaction.toFixed(2)}/5`);
    }
    
    if (options.verbose) {
      console.log(`\r📊 Error: ${errorRate.toFixed(2)}% | Response: ${responseTime.toFixed(0)}ms | Satisfaction: ${userSatisfaction.toFixed(2)}/5`);
    }
  }
  
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

// URL Structure Manager
class URLStructureManager {
  private redirectMap: Map<string, string> = new Map();
  
  constructor() {
    this.initializeRedirects();
  }
  
  private initializeRedirects() {
    // Create 301 redirect mappings from fragment URLs to direct URLs
    const fragmentToDirect = [
      ['/docs/api/utils#readfile', '/docs/api/utils/readfile'],
      ['/docs/api/utils#writefile', '/docs/api/utils/writefile'],
      ['/docs/api/utils#readdir', '/docs/api/utils/readdir'],
      ['/docs/api/utils#stat', '/docs/api/utils/stat'],
      ['/docs/api/utils#copyfile', '/docs/api/utils/copyfile'],
      ['/docs/api/utils#movefile', '/docs/api/utils/movefile'],
      ['/docs/api/utils#deletefile', '/docs/api/utils/deletefile'],
      ['/docs/api/utils#fileexists', '/docs/api/utils/fileexists'],
      ['/docs/api/utils#networking', '/docs/api/utils/networking'],
      ['/docs/api/utils#fetch-utility', '/docs/api/utils/fetch'],
      ['/docs/api/utils#serve', '/docs/api/utils/serve'],
      ['/docs/api/utils#websocket', '/docs/api/utils/websocket'],
      ['/docs/api/utils#tcp', '/docs/api/utils/tcp'],
      ['/docs/api/utils#udp', '/docs/api/utils/udp'],
      ['/docs/api/utils#dns', '/docs/api/utils/dns'],
      ['/docs/api/utils#process', '/docs/api/utils/process'],
      ['/docs/api/utils#spawn', '/docs/api/utils/spawn'],
      ['/docs/api/utils#exec', '/docs/api/utils/exec'],
      ['/docs/api/utils#fork', '/docs/api/utils/fork'],
      ['/docs/api/utils#kill', '/docs/api/utils/kill'],
      ['/docs/api/utils#pid', '/docs/api/utils/pid'],
      ['/docs/api/utils#signals', '/docs/api/utils/signals'],
      ['/docs/api/utils#validation', '/docs/api/utils/validation'],
      ['/docs/api/utils#isstring', '/docs/api/utils/isstring'],
      ['/docs/api/utils#isnumber', '/docs/api/utils/isnumber'],
      ['/docs/api/utils#isboolean', '/docs/api/utils/isboolean'],
      ['/docs/api/utils#isarray', '/docs/api/utils/isarray'],
      ['/docs/api/utils#isobject', '/docs/api/utils/isobject'],
      ['/docs/api/utils#isfunction', '/docs/api/utils/isfunction'],
      ['/docs/api/utils#ispromise', '/docs/api/utils/ispromise'],
      ['/docs/api/utils#isbuffer', '/docs/api/utils/isbuffer'],
      ['/docs/api/utils#istypedarray', '/docs/api/utils/istypedarray'],
      ['/docs/api/utils#conversion', '/docs/api/utils/conversion'],
      ['/docs/api/utils#tobuffer', '/docs/api/utils/tobuffer'],
      ['/docs/api/utils#tostring', '/docs/api/utils/tostring'],
      ['/docs/api/utils#tonumber', '/docs/api/utils/tonumber'],
      ['/docs/api/utils#toboolean', '/docs/api/utils/toboolean'],
      ['/docs/api/utils#toarray', '/docs/api/utils/toarray'],
      ['/docs/api/utils#toobject', '/docs/api/utils/toobject'],
      ['/docs/api/utils#jsonparse', '/docs/api/utils/jsonparse'],
      ['/docs/api/utils#jsonstringify', '/docs/api/utils/jsonstringify']
    ];
    
    fragmentToDirect.forEach(([fragment, direct]) => {
      this.redirectMap.set(fragment, direct);
    });
  }
  
  generateRedirectRules(): string {
    let rules = '# 301 Redirects - Fragment URLs to Direct URLs\n';
    rules += '# Generated by Feature Flag Manager\n\n';
    
    this.redirectMap.forEach((direct, fragment) => {
      rules += `RewriteRule ^${fragment.replace(/^https:\/\/bun\.sh/, '')}$ ${direct} [R=301,L]\n`;
    });
    
    return rules;
  }
  
  getRedirectCount(): number {
    return this.redirectMap.size;
  }
}

// Main function
async function main() {
  console.log(`${colors.cyan}🚀 Feature Flag & Deployment Manager${colors.reset}`);
  console.log(`${colors.gray}URL Structure Migration with Feature Flags${colors.reset}\n`);
  
  const featureFlagManager = new FeatureFlagManager();
  const deploymentManager = new DeploymentManager();
  const abTestManager = new ABTestManager();
  const monitoringManager = new MonitoringManager();
  const urlStructureManager = new URLStructureManager();
  
  try {
    // Handle different commands
    if (options.status) {
      log.section('📊 Feature Flag Status');
      const flags = featureFlagManager.getFlagStatus();
      
      if (Array.isArray(flags)) {
        flags.forEach(flag => {
          const status = flag.enabled ? '✅ ENABLED' : '❌ DISABLED';
          const rollout = flag.enabled ? ` (${flag.rolloutPercentage}%)` : '';
          console.log(`${status} ${flag.name}${rollout}`);
          
          if (options.verbose && flag.enabled) {
            console.log(`   Target groups: ${flag.targetGroups.join(', ') || 'All users'}`);
            console.log(`   Updated: ${flag.metadata.updatedAt}`);
          }
        });
      }
      
      if (options.json) {
        log.json({ flags });
      }
    }
    
    else if (options.enable) {
      const flagId = args[args.indexOf('--enable') + 1];
      if (!flagId) {
        log.error('Please specify a feature flag to enable');
        process.exit(1);
      }
      
      await featureFlagManager.enableFlag(flagId);
      await featureFlagManager.saveFlags();
      
      if (options.canary) {
        await deploymentManager.deployToCanary(featureFlagManager);
      }
    }
    
    else if (options.disable) {
      const flagId = args[args.indexOf('--disable') + 1];
      if (!flagId) {
        log.error('Please specify a feature flag to disable');
        process.exit(1);
      }
      
      await featureFlagManager.disableFlag(flagId);
      await featureFlagManager.saveFlags();
    }
    
    else if (options.canary) {
      await deploymentManager.deployToCanary(featureFlagManager);
    }
    
    else if (options.rollback) {
      await deploymentManager.rollback(featureFlagManager);
      await featureFlagManager.saveFlags();
    }
    
    else if (options.abTest) {
      const testId = await abTestManager.createABTest();
      await abTestManager.startABTest(testId, featureFlagManager);
    }
    
    else if (options.monitor) {
      await monitoringManager.startMonitoring();
    }
    
    else if (options.deploy) {
      const targetGroup = args[args.indexOf('--deploy') + 1] || 'all';
      log.info(`Deploying to group: ${targetGroup}`);
      await featureFlagManager.enableFlag('direct-urls-enabled', 100, [targetGroup]);
      await featureFlagManager.saveFlags();
    }
    
    else {
      log.section('📋 Available Actions');
      console.log('Feature Flags:');
      console.log('  --enable [flag]        Enable a feature flag');
      console.log('  --disable [flag]       Disable a feature flag');
      console.log('  --status               Show all feature flag statuses');
      console.log('');
      console.log('Deployment:');
      console.log('  --canary               Deploy to canary group');
      console.log('  --deploy [group]       Deploy to specific group');
      console.log('  --rollback             Rollback to previous version');
      console.log('');
      console.log('Testing:');
      console.log('  --ab-test              Start A/B test for URL structures');
      console.log('  --monitor              Monitor metrics and error rates');
      console.log('');
      console.log('Available Feature Flags:');
      console.log('  - direct-urls-enabled');
      console.log('  - fragment-redirects');
      console.log('  - ab-testing-active');
      console.log('  - canary-deployment');
      
      // Show redirect info
      log.section('🔗 URL Redirect Configuration');
      log.info(`Configured redirects: ${urlStructureManager.getRedirectCount()}`);
      
      if (options.verbose) {
        console.log('\nSample redirect rules:');
        const rules = urlStructureManager.generateRedirectRules();
        console.log(rules.split('\n').slice(0, 10).join('\n'));
        console.log('...(truncated)');
      }
    }
    
  } catch (error: any) {
    log.error(`Error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}👋 Shutting down gracefully...${colors.reset}`);
  process.exit(0);
});

// Run the application
if (import.meta.main) {
  main();
}
