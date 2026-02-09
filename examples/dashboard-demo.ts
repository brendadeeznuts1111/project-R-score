#!/usr/bin/env bun
/**
 * Dashboard Demo - FactoryWager Enterprise Platform
 * 
 * Demonstrates various dashboard functionality and provides
 * cross-platform dashboard access methods
 */

interface DashboardInfo {
  name: string;
  description: string;
  url?: string;
  command?: string;
  features: string[];
}

/**
 * Get available dashboards
 */
function getDashboards(): Record<string, DashboardInfo> {
  return {
    web: {
      name: "Web Dashboard",
      description: "Modern web-based dashboard with full UI",
      url: "dashboard/web-dashboard.html",
      features: [
        "Interactive charts and graphs",
        "Real-time data updates",
        "Responsive design",
        "Modern UI/UX"
      ]
    },
    live: {
      name: "Live Dashboard",
      description: "Real-time dashboard with live data streaming",
      command: "import('../lib/cli/ansi-dashboard.ts').then(m=>m.startLiveDashboard())",
      features: [
        "Live data streaming",
        "ANSI terminal interface",
        "Real-time metrics",
        "Terminal-based UI"
      ]
    },
    mcp: {
      name: "MCP Overview Dashboard",
      description: "Model Context Protocol monitoring dashboard",
      url: "http://localhost:3000",
      features: [
        "MCP server status",
        "Connection monitoring",
        "Performance metrics",
        "Protocol analytics"
      ]
    },
    p2p: {
      name: "P2P Dashboard",
      description: "Peer-to-peer network monitoring dashboard",
      url: "http://localhost:3001",
      features: [
        "P2P network status",
        "Node monitoring",
        "Connection tracking",
        "Network analytics"
      ]
    },
    business: {
      name: "Business Registry Dashboard",
      description: "Business registry and analytics dashboard",
      url: "http://localhost:3002",
      features: [
        "Business metrics",
        "Registry analytics",
        "Performance tracking",
        "Data visualization"
      ]
    }
  };
}

/**
 * Display dashboard information
 */
async function showDashboardInfo(dashboardKey: string): Promise<void> {
  const dashboards = getDashboards();
  const dashboard = dashboards[dashboardKey];
  
  if (!dashboard) {
    console.error(`❌ Unknown dashboard: ${dashboardKey}`);
    console.log('Available dashboards:', Object.keys(dashboards).join(', '));
    return;
  }
  
  console.log(`🎯 ${dashboard.name}`);
  console.log('═════════════════════════════════════════════════');
  console.log(`📝 ${dashboard.description}`);
  console.log('');
  
  if (dashboard.url) {
    console.log(`🌐 URL: ${dashboard.url}`);
    console.log(`📂 File: ${dashboard.url}`);
  }
  
  if (dashboard.command) {
    console.log(`⚡ Command: ${dashboard.command}`);
  }
  
  console.log('');
  console.log('✨ Features:');
  dashboard.features.forEach((feature, index) => {
    console.log(`   ${index + 1}. ${feature}`);
  });
  
  console.log('');
  
  // Provide access instructions
  if (dashboard.url) {
    console.log('🚀 Access Instructions:');
    console.log('   1. Make sure the dashboard server is running');
    console.log(`   2. Open your browser and navigate to: ${dashboard.url}`);
    console.log('   3. Or use the appropriate start command from package.json');
    console.log('');
    
    // Try to detect if file exists
    try {
      const file = Bun.file(dashboard.url);
      if (await file.exists()) {
        console.log('✅ Dashboard file exists locally');
        console.log(`📂 Path: ${Bun.resolveSync(dashboard.url)}`);
      } else {
        console.log('⚠️  Dashboard file not found - may need to start server first');
      }
    } catch (error) {
      console.log('ℹ️  Cannot verify dashboard file existence');
    }
  }
  
  if (dashboard.command) {
    console.log('🚀 Access Instructions:');
    console.log('   1. Run the command directly with Bun');
    console.log('   2. Or use: bun run dashboard:live');
    console.log('');
  }
}

/**
 * Launch dashboard (cross-platform approach)
 */
function launchDashboard(dashboardKey: string): void {
  const dashboards = getDashboards();
  const dashboard = dashboards[dashboardKey];
  
  if (!dashboard) {
    console.error(`❌ Unknown dashboard: ${dashboardKey}`);
    return;
  }
  
  console.log(`🚀 Launching ${dashboard.name}...`);
  console.log('═════════════════════════════════════════════════');
  
  if (dashboard.url) {
    // For web dashboards, provide instructions instead of trying to open
    console.log(`📂 Dashboard File: ${dashboard.url}`);
    console.log('');
    console.log('🌐 To access the web dashboard:');
    console.log('   1. Start the required server first');
    console.log('   2. Open your web browser');
    console.log(`   3. Navigate to: ${dashboard.url}`);
    console.log('');
    
    // Check if we can provide more specific instructions
    if (dashboardKey === 'web') {
      console.log('💡 Quick Start:');
      console.log('   bun run start:p2p-dashboard    # Start P2P dashboard server');
      console.log('   Then open: http://localhost:3000');
    } else if (dashboardKey === 'mcp') {
      console.log('💡 Quick Start:');
      console.log('   bun run mcp:security            # Start MCP server');
      console.log('   Then open: http://localhost:3000');
    }
  }
  
  if (dashboard.command) {
    console.log(`⚡ Executing: ${dashboard.command}`);
    console.log('');
    console.log('💡 Alternative: Use "bun run dashboard:live"');
    console.log('');
    
    // For live dashboard, we can't execute the complex inline command easily
    // so we provide the user with the exact command to run
    console.log('🔧 To run the live dashboard manually:');
    console.log(`   bun -e "${dashboard.command}"`);
  }
  
  console.log('');
  console.log('✨ Dashboard Information:');
  showDashboardInfo(dashboardKey);
}

/**
 * List all available dashboards
 */
function listDashboards(): void {
  const dashboards = getDashboards();
  
  console.log('🎯 Available Dashboards');
  console.log('═════════════════════════════════════════════════');
  console.log('');
  
  Object.entries(dashboards).forEach(([key, dashboard]) => {
    const type = dashboard.url ? '🌐 Web' : '⚡ Live';
    console.log(`${type} ${key.padEnd(8)} - ${dashboard.name}`);
    console.log(`     ${dashboard.description}`);
    console.log('');
  });
  
  console.log('🚀 Usage Examples:');
  console.log('   bun run examples/dashboard-demo.ts web     # Show web dashboard info');
  console.log('   bun run examples/dashboard-demo.ts live    # Show live dashboard info');
  console.log('   bun run examples/dashboard-demo.ts list    # List all dashboards');
  console.log('');
  console.log('📋 Package.json Aliases:');
  console.log('   bun run dashboard:web      # Web dashboard info');
  console.log('   bun run dashboard:live     # Live dashboard info');
  console.log('   bun run dashboard           # MCP dashboard status');
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log('🎯 Dashboard Demo - FactoryWager Enterprise Platform');
  console.log('═════════════════════════════════════════════════');
  console.log('');
  console.log('USAGE:');
  console.log('  bun run examples/dashboard-demo.ts <command> [dashboard]');
  console.log('');
  console.log('COMMANDS:');
  console.log('  info <dashboard>    Show detailed dashboard information');
  console.log('  launch <dashboard>  Launch or show launch instructions');
  console.log('  list                List all available dashboards');
  console.log('  help                Show this help message');
  console.log('');
  console.log('DASHBOARDS:');
  console.log('  web                 Web-based dashboard');
  console.log('  live                Live terminal dashboard');
  console.log('  mcp                 MCP overview dashboard');
  console.log('  p2p                 P2P network dashboard');
  console.log('  business            Business registry dashboard');
  console.log('');
  console.log('ALIASES:');
  console.log('  bun run dashboard:web   Same as "info web"');
  console.log('  bun run dashboard:live  Same as "info live"');
  console.log('');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const dashboard = args[1];
  
  try {
    switch (command) {
      case 'info':
        if (!dashboard) {
          console.error('❌ Please specify a dashboard');
          console.log('Available dashboards:', Object.keys(getDashboards()).join(', '));
          process.exit(1);
        }
        await showDashboardInfo(dashboard);
        break;
        
      case 'launch':
        if (!dashboard) {
          console.error('❌ Please specify a dashboard');
          console.log('Available dashboards:', Object.keys(getDashboards()).join(', '));
          process.exit(1);
        }
        launchDashboard(dashboard);
        break;
        
      case 'web':
        await showDashboardInfo('web');
        break;
        
      case 'live':
        await showDashboardInfo('live');
        break;
        
      case 'list':
        listDashboards();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error executing ${command}:`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { main, showDashboardInfo, launchDashboard, listDashboards, showHelp };
