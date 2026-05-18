#!/usr/bin/env bun

/**
 * 🔧 Domain Troubleshooting & Fix Script
 * 
 * Helps diagnose and fix domain configuration issues
 */

class DomainTroubleshooter {
  private domains: string[] = [
    'security.factory-wager.com',
    'factory-wager.com',
    'registry.factory-wager.com',
    'duoplus-registry.utahj4754.workers.dev'
  ];

  async diagnoseDomains(): Promise<void> {
    console.info('🔍 Domain Diagnosis Report');
    console.info('========================');
    console.info('');

    for (const domain of this.domains) {
      console.info(`📊 ${domain}`);
      console.info(`   Status: Checking...`);
      
      try {
        const response = await fetch(`https://${domain}`, { 
          method: 'HEAD',
          timeout: 5000 
        });
        console.info(`   ✅ Status: ${response.status}`);
        console.info(`   ✅ Server: ${response.headers.get('server') || 'Unknown'}`);
        console.info(`   ✅ SSL: Valid`);
      } catch (error: any) {
        console.info(`   ❌ Error: ${error.message || 'Connection failed'}`);
        console.info(`   🔧 Action: Required`);
      }
      console.info('');
    }
  }

  generateFixCommands(): void {
    console.info('🔧 Domain Fix Commands');
    console.info('======================');
    console.info('');

    console.info('1️⃣ DNS Resolution Check:');
    console.info('   # Check DNS records');
    console.info('   dig security.factory-wager.com');
    console.info('   nslookup security.factory-wager.com');
    console.info('');

    console.info('2️⃣ SSL Certificate Check:');
    console.info('   # Check SSL certificate');
    console.info('   openssl s_client -connect security.factory-wager.com:443');
    console.info('   curl -I https://security.factory-wager.com');
    console.info('');

    console.info('3️⃣ Server Connectivity:');
    console.info('   # Test server response');
    console.info('   curl -v https://security.factory-wager.com');
    console.info('   ping security.factory-wager.com');
    console.info('');

    console.info('4️⃣ Alternative Endpoints:');
    console.info('   # Use working worker endpoint');
    console.info('   curl https://duoplus-registry.utahj4754.workers.dev/health');
    console.info('');

    console.info('5️⃣ Configuration Updates:');
    console.info('   # Update URLs config to use working endpoints');
    console.info('   # Replace security.factory-wager.com with worker endpoint');
    console.info('   # Test all endpoints after changes');
  }

  generateUpdatedConfig(): void {
    console.info('📝 Updated URL Configuration');
    console.info('=============================');
    console.info('');

    const updatedUrls = `
// Updated URLs configuration with working endpoints
export const URLS = {
  // 🔒 Security URLs - Updated to use working endpoints
  SECURITY: {
    AUTH: 'https://duoplus-registry.utahj4754.workers.dev/auth',
    TOKEN_VALIDATION: 'https://duoplus-registry.utahj4754.workers.dev/validate-token',
    SECURITY_AUDIT: 'https://duoplus-registry.utahj4754.workers.dev/audit',
    HEALTH: 'https://duoplus-registry.utahj4754.workers.dev/health'
  },
  
  // 📊 Analytics URLs - Updated
  ANALYTICS: {
    USAGE: 'https://duoplus-registry.utahj4754.workers.dev/analytics',
    METRICS: 'https://duoplus-registry.utahj4754.workers.dev/metrics',
    HEALTH: 'https://duoplus-registry.utahj4754.workers.dev/health'
  }
};
    `.trim();

    console.info(updatedUrls);
    console.info('');
    console.info('💡 Save this to: ./config/urls-updated.ts');
  }

  async runDiagnosis(): Promise<void> {
    console.info('🚀 Domain Troubleshooting Tool');
    console.info('==============================');
    console.info('');

    await this.diagnoseDomains();
    this.generateFixCommands();
    this.generateUpdatedConfig();

    console.info('🎯 Next Steps:');
    console.info('   1. Run DNS checks to identify the issue');
    console.info('   2. Update configuration to use working endpoints');
    console.info('   3. Test all endpoints after updates');
    console.info('   4. Monitor domain status regularly');
    console.info('');
    console.info('✅ Diagnosis complete - Use the commands above to fix issues');
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  const troubleshooter = new DomainTroubleshooter();
  troubleshooter.runDiagnosis().catch(console.error);
}

export { DomainTroubleshooter };
