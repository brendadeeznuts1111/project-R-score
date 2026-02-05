// Demonstration of IP-based device and timezone configuration
import { APIAppleIDCreator, ConfigManager } from './readmeauth';

async function demonstrateIPBasedConfig() {
  console.log('🌍 Demonstrating IP-based Device and Timezone Configuration\n');

  // Test different IP addresses from various regions
  const testIPs = [
    { ip: '73.45.123.67', expected: 'US East Coast - iPhone 14 Pro Max' },
    { ip: '104.78.234.89', expected: 'US West Coast - iPhone 14 Pro' },
    { ip: '81.23.45.67', expected: 'Europe - iPhone 14 Plus' },
    { ip: '126.34.56.78', expected: 'Asia - iPhone 15' },
    { ip: '127.0.0.1', expected: 'Test Environment' }
  ];

  for (const test of testIPs) {
    console.log(`\n📍 Testing IP: ${test.ip}`);
    console.log(`Expected: ${test.expected}`);
    
    // Show configuration details
    const config = ConfigManager.load(test.ip);
    console.log(`📱 Device: ${config.deviceProfile?.deviceModel || 'Default'}`);
    console.log(`🌍 Timezone: ${config.deviceProfile?.timezone || config.timezone}`);
    console.log(`🌐 Locale: ${config.deviceProfile?.locale || config.locale}`);
    console.log(`📡 Carrier: ${config.deviceProfile?.carrier || 'Default'}`);
    console.log(`🧪 ATE: ${config.ateProfile?.environment || 'Production'}`);
    
    // Initialize creator with IP
    const creator = new APIAppleIDCreator({}, test.ip);
    console.log('✅ Configuration loaded successfully');
  }

  console.log('\n🎯 IP-based configuration demonstration complete!');
}

// Export for use
export { demonstrateIPBasedConfig };

// Run if called directly
if (require.main === module) {
  demonstrateIPBasedConfig().catch(console.error);
}
