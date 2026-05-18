#!/usr/bin/env bun
/**
 * Test Business Continuity System
 */

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3002';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-change-in-production';

async function testBusinessContinuity() {
  console.info('🧪 Testing Business Continuity System\n');
  
  // 1. Create a test business
  console.info('1. Creating test business...');
  const createBusiness = await fetch(`${PROXY_URL}/admin/business`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Golden Scissors Barbershop',
      alias: 'GoldenScissors',
      startDate: new Date().toISOString(),
      paymentHandles: {
        cashapp: '$GoldenScissors',
        venmo: '@GoldenScissors',
        paypal: 'paypal.me/GoldenScissors'
      },
      contact: 'contact@goldenscissors.com',
      location: '123 Main St'
    })
  });
  
  if (createBusiness.ok) {
    const result = await createBusiness.json();
    console.info(`   ✅ Business created: ${result.businessId}\n`);
  } else {
    const error = await createBusiness.text();
    console.info(`   ⚠️  ${error}\n`);
  }
  
  // 2. List businesses
  console.info('2. Listing businesses...');
  const listBusinesses = await fetch(`${PROXY_URL}/admin/businesses`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`
    }
  });
  
  if (listBusinesses.ok) {
    const businesses = await listBusinesses.json();
    console.info(`   ✅ Found ${businesses.length} business(es)\n`);
  }
  
  // 3. Test payment page with alias
  console.info('3. Testing payment page with alias...');
  const paymentPage = await fetch(`${PROXY_URL}/pay?alias=GoldenScissors&amount=30`);
  if (paymentPage.ok) {
    console.info(`   ✅ Payment page loaded (Status: ${paymentPage.status})\n`);
  }
  
  // 4. Test migration
  console.info('4. Testing business migration...');
  const migrate = await fetch(`${PROXY_URL}/admin/migrate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      oldAlias: 'GoldenScissors',
      newBusinessData: {
        name: 'Golden Scissors Barbershop Downtown',
        alias: 'GoldenScissorsDT',
        reason: 'relocation',
        forwardPayments: true,
        forwardDays: 180
      }
    })
  });
  
  if (migrate.ok) {
    const migrationResult = await migrate.json();
    console.info(`   ✅ Migration successful:`);
    console.info(`      Old: ${migrationResult.oldBusinessId}`);
    console.info(`      New: ${migrationResult.newBusinessId}`);
    console.info(`      Forwarding: ${migrationResult.redirectSetup ? 'Enabled' : 'Disabled'}\n`);
  } else {
    const error = await migrate.text();
    console.info(`   ⚠️  ${error}\n`);
  }
  
  // 5. Test payment page with old alias (should redirect)
  console.info('5. Testing payment page with old alias (should forward)...');
  const oldPaymentPage = await fetch(`${PROXY_URL}/pay?alias=GoldenScissors&amount=30`);
  if (oldPaymentPage.ok) {
    const html = await oldPaymentPage.text();
    if (html.includes('GoldenScissorsDT')) {
      console.info(`   ✅ Forwarding working - shows new business\n`);
    } else {
      console.info(`   ⚠️  Forwarding may not be working\n`);
    }
  }
  
  // 6. Test stats
  console.info('6. Testing business statistics...');
  const stats = await fetch(`${PROXY_URL}/admin/stats?alias=GoldenScissorsDT`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`
    }
  });
  
  if (stats.ok) {
    const statsData = await stats.json();
    console.info(`   ✅ Stats retrieved:`);
    console.info(`      Total Payments: ${statsData.totalPayments}`);
    console.info(`      Total Revenue: $${statsData.totalRevenue}\n`);
  }
  
  console.info('✨ Business Continuity Test Complete!');
}

testBusinessContinuity().catch(console.error);
