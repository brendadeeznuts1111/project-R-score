#!/usr/bin/env bun

/**
 * 🐛 Debug QR Code Test
 */

import { VenmoFamilyAccountSystem } from '../../src/venmo/family-account-system';

async function debugQRTest() {
  console.log('🐛 Debug QR Code Test');
  
  const familySystem = new VenmoFamilyAccountSystem('debug-token');
  
  try {
    // Create a simple family
    const family = await familySystem.createFamilyAccount(
      'test@example.com',
      'Test User',
      [{ email: 'child@example.com', name: 'Child' }]
    );
    
    console.log(`✅ Family created: ${family.familyId}`);
    
    // Generate QR code
    const qrResult = await familySystem.generatePaymentQRCode(
      family.familyId,
      10.00,
      'child@example.com',
      'Test payment'
    );
    
    console.log('✅ QR Code generated:');
    console.log(`   Data: ${qrResult.qrCodeData}`);
    console.log(`   Amount: ${qrResult.amount}`);
    console.log(`   Recipient: ${qrResult.recipient}`);
    
    // Try to process the QR payment
    console.log('\n📷 Processing QR payment...');
    const transaction = await familySystem.processQRPayment(
      qrResult.qrCodeData,
      'test@example.com',
      'Test User'
    );
    
    console.log(`✅ Payment processed: ${transaction.transactionId}`);
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugQRTest().catch(console.error);
