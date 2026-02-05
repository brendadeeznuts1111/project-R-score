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
    console.log('🔍 Domain Diagnosis Report');
    console.log('========================');
    console.log('');

    for (const domain of this.domains) {
      console.log(`📊 ${domain}`);
      console.log(`   Status: Checking...`);
      
      try {
        const response = await fetch(`https://${domain}`, { 
          method: 'HEAD',
          timeout: 5000 
        });
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   ✅ Server: ${response.headers.get('server') || 'Unknown'}`);
        console.log(`   ✅ SSL: Valid`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message || 'Connection failed'}`);
        console.log(`   🔧 Action: Required`);
      }
      console.log('');
    }
  }

  generateFixCommands(): void {
    console.log('🔧 Domain Fix Commands');
    console.log('======================');
    console.log('');

    console.log('1️⃣ DNS Resolution Check:');
    console.log('   # Check DNS records');
    console.log('   dig security.factory-wager.com');
    console.log('   nslookup security.factory-wager.com');
    console.log('');

    console.log('2️⃣ SSL Certificate Check:');
    console.log('   # Check SSL certificate');
    console.log('   openssl s_client -connect security.factory-wager.com:443');
    console.log('   curl -I https://security.factory-wager.com');
    console.log('');

    console.log('3️⃣ Server Connectivity:');
    console.log('   # Test server response');
    console.log('   curl -v https://security.factory-wager.com');
    console.log('   ping security.factory-wager.com');
    console.log('');

    console.log('4️⃣ Alternative Endpoints:');
    console.log('   # Use working worker endpoint');
    console.log('   curl https://duoplus-registry.utahj4754.workers.dev/health');
    console.log('');

    console.log('5️⃣ Configuration Updates:');
    console.log('   # Update URLs config to use working endpoints');
    console.log('   # Replace security.factory-wager.com with worker endpoint');
    console.log('   # Test all endpoints after changes');
  }

  generateUpdatedConfig(): void {
    console.log('📝 Updated URL Configuration');
    console.log('=============================');
    console.log('');

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

    console.log(updatedUrls);
    console.log('');
    console.log('💡 Save this to: ./config/urls-updated.ts');
  }

  async runDiagnosis(): Promise<void> {
    console.log('🚀 Domain Troubleshooting Tool');
    console.log('==============================');
    console.log('');

    await this.diagnoseDomains();
    this.generateFixCommands();
    this.generateUpdatedConfig();

    console.log('🎯 Next Steps:');
    console.log('   1. Run DNS checks to identify the issue');
    console.log('   2. Update configuration to use working endpoints');
    console.log('   3. Test all endpoints after updates');
    console.log('   4. Monitor domain status regularly');
    console.log('');
    console.log('✅ Diagnosis complete - Use the commands above to fix issues');
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  const troubleshooter = new DomainTroubleshooter();
  troubleshooter.runDiagnosis().catch(console.error);
}

export { DomainTroubleshooter };
