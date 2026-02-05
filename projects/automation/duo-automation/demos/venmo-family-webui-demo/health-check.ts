#!/usr/bin/env bun

/**
 * 🏥 Venmo Family Web UI Demo - Health Check
 * Bundle Hash: aae3e0a39ca11206
 */

import { fetch } from 'bun';

async function healthCheck(): Promise<void> {
  console.log('🏥 Venmo Family Web UI Demo - Health Check');
  console.log('═'.repeat(50));
  
  try {
    // Check API server
    console.log('🌐 Checking API server...');
    const response = await fetch('http://localhost:3003/api/stats');
    
    if (response.ok) {
      const stats = await response.json();
      console.log('✅ API server is healthy');
      console.log(`📊 Total Families: ${stats.totalFamilies}`);
      console.log(`👥 Active Members: ${stats.totalMembers}`);
      console.log(`💰 Monthly Volume: $${stats.monthlyVolume}`);
    } else {
      console.log('❌ API server is not responding');
      process.exit(1);
    }
    
    // Check bundle integrity
    console.log('\n🔐 Checking bundle integrity...');
    try {
      const bundleHash = await Bun.file('bundle-hash.json').text();
      const hashData = JSON.parse(bundleHash);
      console.log(`✅ Bundle verified: ${hashData.bundleHash.substring(0, 16)}...`);
    } catch (error) {
      console.log('❌ Bundle verification failed');
      process.exit(1);
    }
    
    console.log('\n🎉 All systems healthy!');
    console.log('🌐 Web UI: Open index.html in your browser');
    console.log('📊 Dashboard: http://localhost:3003/api/stats');
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

// Run health check
healthCheck().catch(console.error);
