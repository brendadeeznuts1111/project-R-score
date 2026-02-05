#!/usr/bin/env bun

/**
 * Fire22 Dashboard Launch Script
 *
 * This script launches the complete dashboard system:
 * 1. Starts the DashboardBridge server
 * 2. Opens the real-time dashboard in the browser
 * 3. Provides status monitoring
 */

import { $ } from 'bun';
import { DashboardBridge } from './dashboard-bridge';

console.log('🔥 Fire22 Dashboard Launch Script');
console.log('!==!==!==!==!==!====');

async function launchDashboard() {
  try {
    // Check if DashboardBridge is already running
    console.log('🔍 Checking if DashboardBridge is already running...');

    try {
      const response = await fetch('http://localhost:3001/api/status');
      if (response.ok) {
        console.log('✅ DashboardBridge is already running on port 3001');
        openDashboard();
        return;
      }
    } catch (error) {
      // Bridge not running, continue with launch
    }

    // Start DashboardBridge
    console.log('🚀 Starting DashboardBridge...');

    // Start the bridge in the background
    const bridgeProcess = Bun.spawn(['bun', 'run', 'scripts/dashboard-bridge.ts'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      detached: true,
    });

    // Wait a moment for the bridge to start
    console.log('⏳ Waiting for DashboardBridge to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if bridge started successfully
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      try {
        const response = await fetch('http://localhost:3001/api/status');
        if (response.ok) {
          console.log('✅ DashboardBridge started successfully!');
          break;
        }
      } catch (error) {
        // Bridge not ready yet
      }

      retries++;
      if (retries < maxRetries) {
        console.log(`⏳ Waiting for bridge to start... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (retries >= maxRetries) {
      console.log('❌ Failed to start DashboardBridge after multiple attempts');
      console.log('💡 Try running manually: bun run scripts/dashboard-bridge.ts');
      return;
    }

    // Open the dashboard
    openDashboard();

    // Show status
    showStatus();
  } catch (error) {
    console.error('❌ Error launching dashboard:', error);
    console.log('💡 Try running manually: bun run scripts/dashboard-bridge.ts');
  }
}

function openDashboard() {
  console.log('🌐 Opening real-time dashboard...');

  // Open the enhanced dashboard
  try {
    $`open docs/real-time-dashboard.html`;
    console.log('✅ Dashboard opened in browser');
  } catch (error) {
    console.log('⚠️  Could not auto-open dashboard, please open manually:');
    console.log('   📁 docs/real-time-dashboard.html');
  }
}

async function showStatus() {
  console.log('\n📊 Dashboard System Status:');
  console.log('!==!==!==!==!===');

  try {
    const response = await fetch('http://localhost:3001/api/status');
    if (response.ok) {
      const status = await response.json();
      console.log(`🔌 Bridge Status: ${status.integrationStatus}`);
      console.log(`🏗️  Build Status: ${status.buildStatus}`);
      console.log(`🌐 WebSocket: ws://localhost:3001/dashboard`);
      console.log(`🌐 HTTP API: http://localhost:3001/api/*`);
    }
  } catch (error) {
    console.log('❌ Could not fetch status');
  }

  console.log('\n🎯 Next Steps:');
  console.log('   1. Dashboard should be open in your browser');
  console.log('   2. Click "Start Real Build" to test the system');
  console.log('   3. Monitor real-time updates in the terminal');
  console.log('   4. Use the dashboard to control your builds');

  console.log('\n🛑 To stop the dashboard:');
  console.log('   - Close the browser tab');
  console.log('   - Press Ctrl+C in this terminal');
  console.log('   - Or kill the bridge process manually');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dashboard...');
  console.log('💡 DashboardBridge will continue running in background');
  console.log('   To stop it completely, find and kill the process');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down dashboard...');
  process.exit(0);
});

// Launch the dashboard
launchDashboard();
