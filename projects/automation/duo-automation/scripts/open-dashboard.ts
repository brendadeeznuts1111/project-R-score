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
    
    console.log('🚀 Opening DuoPlus Dashboard...');
    console.log(`📍 Location: ${fileUrl}`);
    console.log('');
    console.log('🛡️ RBAC Features Available:');
    console.log('• Toggle RBAC on/off in header');
    console.log('• Select roles (Admin, Operator, Viewer)');
    console.log('• View real-time permissions');
    console.log('• Monitor Windows Enterprise status');
    console.log('');
    
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
    
    console.log('✅ Dashboard opened successfully!');
    console.log('');
    console.log('🎯 Quick Start Guide:');
    console.log('1. Look for the RBAC toggle (🛡️) in the header');
    console.log('2. Toggle RBAC on to enable access control');
    console.log('3. Try different roles from the dropdown');
    console.log('4. Watch the status cards update in real-time');
    console.log('5. Check the activity log for all events');
    
  } catch (error: any) {
    console.error('❌ Failed to open dashboard:', error.message);
    
    // Fallback: Show the file URL for manual opening
    const dashboardPath = join(__dirname, '..', 'demos', 'duoplus-unified-dashboard.html');
    const fileUrl = `file://${dashboardPath}`;
    
    console.log('');
    console.log('📍 Manual Open Instructions:');
    console.log(`Copy and paste this URL into your browser:`);
    console.log(fileUrl);
  }
}

// Run if called directly
if (import.meta.main) {
  openDashboard();
}
