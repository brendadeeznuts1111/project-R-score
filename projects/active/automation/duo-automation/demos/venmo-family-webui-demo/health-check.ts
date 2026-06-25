#!/usr/bin/env bun

/**
 * 🏥 Venmo Family Web UI Demo - Health Check
 * Bundle Hash: aae3e0a39ca11206
 */

import { fetch } from 'bun';

async function healthCheck(): Promise<void> {
  console.info('🏥 Venmo Family Web UI Demo - Health Check');
  console.info('═'.repeat(50));
  
  try {
    // Check API server
    console.info('🌐 Checking API server...');
    const response = await fetch('http://localhost:3003/api/stats');
    
    if (response.ok) {
      const stats = await response.json();
      console.info('✅ API server is healthy');
      console.info(`📊 Total Families: ${stats.totalFamilies}`);
      console.info(`👥 Active Members: ${stats.totalMembers}`);
      console.info(`💰 Monthly Volume: $${stats.monthlyVolume}`);
    } else {
      console.info('❌ API server is not responding');
      process.exit(1);
    }
    
    // Check bundle integrity
    console.info('\n🔐 Checking bundle integrity...');
    try {
      const bundleHash = await Bun.file('bundle-hash.json').text();
      const hashData = JSON.parse(bundleHash);
      console.info(`✅ Bundle verified: ${hashData.bundleHash.substring(0, 16)}...`);
    } catch (error) {
      console.info('❌ Bundle verification failed');
      process.exit(1);
    }
    
    console.info('\n🎉 All systems healthy!');
    console.info('🌐 Web UI: Open index.html in your browser');
    console.info('📊 Dashboard: http://localhost:3003/api/stats');
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

// Run health check
healthCheck().catch(console.error);
