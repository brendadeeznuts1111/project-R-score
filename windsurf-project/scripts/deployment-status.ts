// scripts/deployment-status.ts
/**
 * 🎯 EMPIRE PRO DEPLOYMENT STATUS
 * Shows current deployment state and what needs to be configured
 */

import { PhoneIntelligenceSystem } from '../src/core/filter/phone-intelligence-system.js';
import { registerPhoneIntelligencePatterns } from '../src/utils/pattern-matrix.js';
import { MASTER_MATRIX } from '../src/utils/master-matrix.js';
import { readFileSync, existsSync } from 'fs';

interface DeploymentCheck {
  name: string;
  status: '✅' | '⚠️' | '❌';
  description: string;
  action?: string;
}

class DeploymentStatus {
  private checks: DeploymentCheck[] = [];

  constructor() {
    this.runAllChecks();
  }

  private checkEnvironmentVariables(): DeploymentCheck {
    const requiredVars = [
      'IPQS_API_KEY',
      'R2_ACCOUNT_ID', 
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'TWILIO_SID',
      'TWILIO_TOKEN'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    return {
      name: 'Environment Variables',
      status: missingVars.length === 0 ? '✅' : '⚠️',
      description: missingVars.length === 0 
        ? 'All required API keys configured' 
        : `Missing: ${missingVars.join(', ')}`,
      action: missingVars.length > 0 ? 'Edit .env file with your API keys' : undefined
    };
  }

  private checkPhoneIntelligenceSystem(): DeploymentCheck {
    try {
      registerPhoneIntelligencePatterns();
      const system = new PhoneIntelligenceSystem();
      
      const phonePatterns = MASTER_MATRIX.getRows().filter(r => {
        const keywords = ['phone', 'ipqs', 'number', 'compliance'];
        return keywords.some(k => r.name.toLowerCase().includes(k));
      });

      return {
        name: 'Phone Intelligence System',
        status: phonePatterns.length === 8 ? '✅' : '❌',
        description: `${phonePatterns.length}/8 patterns registered`,
        action: phonePatterns.length < 8 ? 'Run pattern registration' : undefined
      };
    } catch (error) {
      return {
        name: 'Phone Intelligence System',
        status: '❌',
        description: 'System failed to initialize',
        action: 'Check dependencies and configuration'
      };
    }
  }

  private checkCLICommands(): DeploymentCheck {
    const requiredCommands = [
      'cli/commands/phone-deploy.ts',
      'cli/commands/phone-emergency.ts',
      'workflows/autonomic-controller.ts',
      'dashboards/grafana/import-dashboard.ts'
    ];

    const missingFiles = requiredCommands.filter(file => !existsSync(file));
    
    return {
      name: 'CLI Commands',
      status: missingFiles.length === 0 ? '✅' : '❌',
      description: missingFiles.length === 0 
        ? 'All CLI commands available' 
        : `Missing: ${missingFiles.length} files`,
      action: missingFiles.length > 0 ? 'Create missing command files' : undefined
    };
  }

  private checkDeploymentScripts(): DeploymentCheck {
    const scripts = [
      'deploy-phone-intelligence.sh',
      'DEPLOYMENT_GUIDE.md',
      'DEPLOYMENT_CHECKLIST.md'
    ];

    const missingScripts = scripts.filter(script => !existsSync(script));
    
    return {
      name: 'Deployment Scripts',
      status: missingScripts.length === 0 ? '✅' : '❌',
      description: missingScripts.length === 0 
        ? 'All deployment scripts ready' 
        : `Missing: ${missingScripts.join(', ')}`,
      action: missingScripts.length > 0 ? 'Create missing deployment files' : undefined
    };
  }

  private checkDNSConfiguration(): DeploymentCheck {
    // Check if DNS domains are configured (simulated check)
    const dnsDomains = [
      'api.apple',
      'dashboard.apple', 
      'status.apple',
      'metrics.apple',
      'admin.apple'
    ];

    // In a real deployment, this would check actual DNS records
    return {
      name: 'DNS Configuration',
      status: '⚠️',
      description: 'DNS records need to be configured',
      action: 'Configure A/CNAME records for *.apple domains'
    };
  }

  private checkR2Storage(): DeploymentCheck {
    const hasR2Config = process.env.S3_ACCESS_KEY_ID && process.env.S3_ENDPOINT;
    
    return {
      name: 'R2 Storage',
      status: hasR2Config ? '✅' : '⚠️',
      description: hasR2Config 
        ? 'R2 credentials configured' 
        : 'R2 storage needs configuration',
      action: !hasR2Config ? 'Configure R2 credentials in .env' : undefined
    };
  }

  private runAllChecks(): void {
    this.checks = [
      this.checkEnvironmentVariables(),
      this.checkPhoneIntelligenceSystem(),
      this.checkCLICommands(),
      this.checkDeploymentScripts(),
      this.checkDNSConfiguration(),
      this.checkR2Storage()
    ];
  }

  displayStatus(): void {
    console.log('🎯 EMPIRE PRO DEPLOYMENT STATUS');
    console.log('═'.repeat(60));
    
    let readyCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    
    this.checks.forEach(check => {
      console.log(`${check.status} ${check.name}`);
      console.log(`   ${check.description}`);
      
      if (check.action) {
        console.log(`   📝 Action: ${check.action}`);
      }
      
      if (check.status === '✅') readyCount++;
      else if (check.status === '⚠️') warningCount++;
      else errorCount++;
      
      console.log('');
    });

    // Summary
    console.log('📊 DEPLOYMENT SUMMARY:');
    console.log(`   ✅ Ready: ${readyCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    const totalChecks = this.checks.length;
    const completionRate = Math.round((readyCount / totalChecks) * 100);
    
    console.log(`   Completion: ${completionRate}%`);
    
    if (completionRate === 100) {
      console.log('\n🚀 DEPLOYMENT READY!');
      console.log('   All systems operational and ready for production');
    } else if (completionRate >= 66) {
      console.log('\n⚡ DEPLOYMENT NEARLY READY');
      console.log('   Most systems operational, address warnings to complete');
    } else {
      console.log('\n🔧 DEPLOYMENT SETUP NEEDED');
      console.log('   Configure required components before deployment');
    }

    // Next steps
    console.log('\n🎯 NEXT STEPS:');
    if (errorCount > 0) {
      console.log('   1. Fix all ❌ error items above');
    }
    if (warningCount > 0) {
      console.log('   2. Address ⚠️ warning items');
    }
    if (readyCount === totalChecks) {
      console.log('   1. Run: ./deploy-phone-intelligence.sh all');
      console.log('   2. Configure DNS records');
      console.log('   3. Verify with: bun run scripts/dns-validation.ts');
    }
    
    console.log('═'.repeat(60));
  }

  async testPhoneSystem(): Promise<void> {
    console.log('\n🧪 TESTING PHONE INTELLIGENCE SYSTEM...');
    
    try {
      registerPhoneIntelligencePatterns();
      const system = new PhoneIntelligenceSystem();
      const result = await system.process('+14155552671');
      
      console.log('✅ Phone Intelligence Test Results:');
      console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`   Trust Score: ${result.trustScore}/100`);
      console.log(`   Provider: ${result.recommendedProvider.name}`);
      console.log(`   Cost: $${result.recommendedProvider.cost.toFixed(4)}`);
      console.log(`   Patterns: ${result.matrixRows.length}/8`);
      console.log(`   Compliant: ${result.compliance.compliant ? '✅' : '❌'}`);
      
      // Performance evaluation
      if (result.duration <= 2.5) {
        console.log('   🚀 Performance: EXCELLENT (<2.5ms)');
      } else if (result.duration <= 5) {
        console.log('   ⚠️  Performance: ACCEPTABLE (<5ms)');
      } else {
        console.log('   ❌ Performance: NEEDS OPTIMIZATION (>5ms)');
      }
      
    } catch (error) {
      console.error('❌ Phone Intelligence test failed:', error);
    }
  }
}

// CLI interface
async function main() {
  const status = new DeploymentStatus();
  
  const command = process.argv[2];
  
  switch (command) {
    case '--test':
      await status.testPhoneSystem();
      break;
    case '--quick':
      // Just show the status without phone test
      status.displayStatus();
      break;
    default:
      status.displayStatus();
      await status.testPhoneSystem();
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DeploymentStatus };
