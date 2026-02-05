#!/usr/bin/env bun
/**
 * Test Business Continuity System
 */

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3002';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-change-in-production';

async function testBusinessContinuity() {
  console.log('🧪 Testing Business Continuity System\n');
  
  // 1. Create a test business
  console.log('1. Creating test business...');
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
    console.log(`   ✅ Business created: ${result.businessId}\n`);
  } else {
    const error = await createBusiness.text();
    console.log(`   ⚠️  ${error}\n`);
  }
  
  // 2. List businesses
  console.log('2. Listing businesses...');
  const listBusinesses = await fetch(`${PROXY_URL}/admin/businesses`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`
    }
  });
  
  if (listBusinesses.ok) {
    const businesses = await listBusinesses.json();
    console.log(`   ✅ Found ${businesses.length} business(es)\n`);
  }
  
  // 3. Test payment page with alias
  console.log('3. Testing payment page with alias...');
  const paymentPage = await fetch(`${PROXY_URL}/pay?alias=GoldenScissors&amount=30`);
  if (paymentPage.ok) {
    console.log(`   ✅ Payment page loaded (Status: ${paymentPage.status})\n`);
  }
  
  // 4. Test migration
  console.log('4. Testing business migration...');
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
    console.log(`   ✅ Migration successful:`);
    console.log(`      Old: ${migrationResult.oldBusinessId}`);
    console.log(`      New: ${migrationResult.newBusinessId}`);
    console.log(`      Forwarding: ${migrationResult.redirectSetup ? 'Enabled' : 'Disabled'}\n`);
  } else {
    const error = await migrate.text();
    console.log(`   ⚠️  ${error}\n`);
  }
  
  // 5. Test payment page with old alias (should redirect)
  console.log('5. Testing payment page with old alias (should forward)...');
  const oldPaymentPage = await fetch(`${PROXY_URL}/pay?alias=GoldenScissors&amount=30`);
  if (oldPaymentPage.ok) {
    const html = await oldPaymentPage.text();
    if (html.includes('GoldenScissorsDT')) {
      console.log(`   ✅ Forwarding working - shows new business\n`);
    } else {
      console.log(`   ⚠️  Forwarding may not be working\n`);
    }
  }
  
  // 6. Test stats
  console.log('6. Testing business statistics...');
  const stats = await fetch(`${PROXY_URL}/admin/stats?alias=GoldenScissorsDT`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`
    }
  });
  
  if (stats.ok) {
    const statsData = await stats.json();
    console.log(`   ✅ Stats retrieved:`);
    console.log(`      Total Payments: ${statsData.totalPayments}`);
    console.log(`      Total Revenue: $${statsData.totalRevenue}\n`);
  }
  
  console.log('✨ Business Continuity Test Complete!');
}

testBusinessContinuity().catch(console.error);
