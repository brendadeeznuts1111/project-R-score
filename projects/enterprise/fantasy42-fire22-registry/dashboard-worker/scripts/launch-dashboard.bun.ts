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

console.info('🔥 Fire22 Dashboard Launch Script');
console.info('!==!==!==!==!==!====');

async function launchDashboard() {
  try {
    // Check if DashboardBridge is already running
    console.info('🔍 Checking if DashboardBridge is already running...');

    try {
      const response = await fetch('http://localhost:3001/api/status');
      if (response.ok) {
        console.info('✅ DashboardBridge is already running on port 3001');
        openDashboard();
        return;
      }
    } catch (error) {
      // Bridge not running, continue with launch
    }

    // Start DashboardBridge
    console.info('🚀 Starting DashboardBridge...');

    // Start the bridge in the background
    const bridgeProcess = Bun.spawn(['bun', 'run', 'scripts/dashboard-bridge.ts'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      detached: true,
    });

    // Wait a moment for the bridge to start
    console.info('⏳ Waiting for DashboardBridge to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if bridge started successfully
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      try {
        const response = await fetch('http://localhost:3001/api/status');
        if (response.ok) {
          console.info('✅ DashboardBridge started successfully!');
          break;
        }
      } catch (error) {
        // Bridge not ready yet
      }

      retries++;
      if (retries < maxRetries) {
        console.info(`⏳ Waiting for bridge to start... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (retries >= maxRetries) {
      console.info('❌ Failed to start DashboardBridge after multiple attempts');
      console.info('💡 Try running manually: bun run scripts/dashboard-bridge.ts');
      return;
    }

    // Open the dashboard
    openDashboard();

    // Show status
    showStatus();
  } catch (error) {
    console.error('❌ Error launching dashboard:', error);
    console.info('💡 Try running manually: bun run scripts/dashboard-bridge.ts');
  }
}

function openDashboard() {
  console.info('🌐 Opening real-time dashboard...');

  // Open the enhanced dashboard
  try {
    $`open docs/real-time-dashboard.html`;
    console.info('✅ Dashboard opened in browser');
  } catch (error) {
    console.info('⚠️  Could not auto-open dashboard, please open manually:');
    console.info('   📁 docs/real-time-dashboard.html');
  }
}

async function showStatus() {
  console.info('\n📊 Dashboard System Status:');
  console.info('!==!==!==!==!===');

  try {
    const response = await fetch('http://localhost:3001/api/status');
    if (response.ok) {
      const status = await response.json();
      console.info(`🔌 Bridge Status: ${status.integrationStatus}`);
      console.info(`🏗️  Build Status: ${status.buildStatus}`);
      console.info(`🌐 WebSocket: ws://localhost:3001/dashboard`);
      console.info(`🌐 HTTP API: http://localhost:3001/api/*`);
    }
  } catch (error) {
    console.info('❌ Could not fetch status');
  }

  console.info('\n🎯 Next Steps:');
  console.info('   1. Dashboard should be open in your browser');
  console.info('   2. Click "Start Real Build" to test the system');
  console.info('   3. Monitor real-time updates in the terminal');
  console.info('   4. Use the dashboard to control your builds');

  console.info('\n🛑 To stop the dashboard:');
  console.info('   - Close the browser tab');
  console.info('   - Press Ctrl+C in this terminal');
  console.info('   - Or kill the bridge process manually');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('\n🛑 Shutting down dashboard...');
  console.info('💡 DashboardBridge will continue running in background');
  console.info('   To stop it completely, find and kill the process');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info('\n🛑 Shutting down dashboard...');
  process.exit(0);
});

// Launch the dashboard
launchDashboard();
