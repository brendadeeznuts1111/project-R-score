#!/usr/bin/env bun
// scripts/open-dashboard.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function openDashboard() {
  try {
    // Get the absolute path to the dashboard HTML file
    const dashboardPath = join(__dirname, '..', 'demos', 'duoplus-unified-dashboard.html');
    
    // Convert to file:// URL
    const fileUrl = `file://${dashboardPath}`;
    
    console.info('🚀 Opening DuoPlus Dashboard...');
    console.info(`📍 Location: ${fileUrl}`);
    console.info('');
    console.info('🛡️ RBAC Features Available:');
    console.info('• Toggle RBAC on/off in header');
    console.info('• Select roles (Admin, Operator, Viewer)');
    console.info('• View real-time permissions');
    console.info('• Monitor Windows Enterprise status');
    console.info('');
    
    // Open in default browser based on platform
    const platform = process.platform;
    let command: string;
    
    switch (platform) {
      case 'darwin': // macOS
        command = `open "${fileUrl}"`;
        break;
      case 'win32': // Windows
        command = `start "" "${fileUrl}"`;
        break;
      default: // Linux and others
        command = `xdg-open "${fileUrl}"`;
        break;
    }
    
    await execAsync(command);
    
    console.info('✅ Dashboard opened successfully!');
    console.info('');
    console.info('🎯 Quick Start Guide:');
    console.info('1. Look for the RBAC toggle (🛡️) in the header');
    console.info('2. Toggle RBAC on to enable access control');
    console.info('3. Try different roles from the dropdown');
    console.info('4. Watch the status cards update in real-time');
    console.info('5. Check the activity log for all events');
    
  } catch (error: any) {
    console.error('❌ Failed to open dashboard:', error.message);
    
    // Fallback: Show the file URL for manual opening
    const dashboardPath = join(__dirname, '..', 'demos', 'duoplus-unified-dashboard.html');
    const fileUrl = `file://${dashboardPath}`;
    
    console.info('');
    console.info('📍 Manual Open Instructions:');
    console.info(`Copy and paste this URL into your browser:`);
    console.info(fileUrl);
  }
}

// Run if called directly
if (import.meta.main) {
  openDashboard();
}
