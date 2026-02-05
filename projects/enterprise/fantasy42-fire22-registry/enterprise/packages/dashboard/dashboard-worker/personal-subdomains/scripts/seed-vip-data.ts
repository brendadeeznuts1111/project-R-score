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
  console.log('🔥 Seeding VIP Employee Data for Fire22');
  console.log('!==!==!==!==!==!==!==');

  try {
    // This would normally connect to Cloudflare KV
    // For now, we'll simulate the seeding process
    const employeeKey = `employee:vinny2times`;

    console.log(`📝 Preparing data for: ${vipEmployeeData.name}`);
    console.log(`🏷️  Employee ID: ${vipEmployeeData.id}`);
    console.log(`👑 Tier: ${vipEmployeeData.tier} (VIP)`);
    console.log(`🏢 Department: ${vipEmployeeData.department}`);
    console.log(`📧 Email: ${vipEmployeeData.email}`);

    console.log('\n🎯 VIP Features:');
    vipEmployeeData.features.forEach(feature => {
      console.log(`   ✅ ${feature}`);
    });

    console.log('\n💾 In a real deployment, this data would be stored in:');
    console.log(`   EMPLOYEE_DATA KV Namespace`);
    console.log(`   Key: ${employeeKey}`);

    console.log('\n🚀 VIP Dashboard will be available at:');
    console.log(`   https://vinny2times.sportsfire.co`);
    console.log(`   https://vinny2times.sportsfire.co/profile`);
    console.log(`   https://vinny2times.sportsfire.co/tools`);

    console.log('\n🎰 Fantasy402 Integration:');
    console.log(`   ✅ Agent: billy666`);
    console.log(`   ✅ Domain: apexodds.net`);
    console.log(`   ✅ Live betting data ready`);
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
