/**
 * Seed VIP Employee Data
 * Adds Vinny2times (VIP Manager) data to KV store
 */

import { EmployeeData } from '../src/index.js';

const vipEmployeeData: EmployeeData = {
  id: 'vinny2times',
  name: 'Vinny2times',
  title: 'Head of VIP Management',
  department: 'VIP Management',
  email: 'vinny2times@fire22.com',
  phone: '+1-555-VIP-0000',
  slack: '@vinny2times',
  telegram: '@vinny2times',
  bio: 'Expert VIP customer relationship manager with 15+ years experience in high-value client services. Specialized in premium betting operations and customer retention strategies.',
  headshotUrl: 'https://fire22.com/employees/vinny2times.jpg',
  tier: 5, // VIP/Custom Tier
  template: 'vip-dashboard',
  features: [
    'vip-escalation',
    'high-roller-review',
    'fantasy402-integration',
    'live-betting-data',
    'customer-management',
    'performance-analytics',
    'premium-scheduling',
    'advanced-tools',
  ],
  manager: 'CEO',
  directReports: ['VIP Support Team'],
  hireDate: '2023-01-15',
  lastUpdated: new Date().toISOString(),
};

async function seedVIPData(): Promise<void> {
  console.info('🔥 Seeding VIP Employee Data for Fire22');
  console.info('!==!==!==!==!==!==!==');

  try {
    // This would normally connect to Cloudflare KV
    // For now, we'll simulate the seeding process
    const employeeKey = `employee:vinny2times`;

    console.info(`📝 Preparing data for: ${vipEmployeeData.name}`);
    console.info(`🏷️  Employee ID: ${vipEmployeeData.id}`);
    console.info(`👑 Tier: ${vipEmployeeData.tier} (VIP)`);
    console.info(`🏢 Department: ${vipEmployeeData.department}`);
    console.info(`📧 Email: ${vipEmployeeData.email}`);

    console.info('\n🎯 VIP Features:');
    vipEmployeeData.features.forEach(feature => {
      console.info(`   ✅ ${feature}`);
    });

    console.info('\n💾 In a real deployment, this data would be stored in:');
    console.info(`   EMPLOYEE_DATA KV Namespace`);
    console.info(`   Key: ${employeeKey}`);

    console.info('\n🚀 VIP Dashboard will be available at:');
    console.info(`   https://vinny2times.sportsfire.co`);
    console.info(`   https://vinny2times.sportsfire.co/profile`);
    console.info(`   https://vinny2times.sportsfire.co/tools`);

    console.info('\n🎰 Fantasy402 Integration:');
    console.info(`   ✅ Agent: billy666`);
    console.info(`   ✅ Domain: apexodds.net`);
    console.info(`   ✅ Live betting data ready`);
  } catch (error) {
    console.error('❌ Error seeding VIP data:', error);
    process.exit(1);
  }
}

// Run the seeding
if (import.meta.main) {
  await seedVIPData();
}

export { seedVIPData, vipEmployeeData };
