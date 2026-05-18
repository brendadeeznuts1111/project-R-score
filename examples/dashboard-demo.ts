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
    console.info('Available dashboards:', Object.keys(dashboards).join(', '));
    return;
  }
  
  console.info(`🎯 ${dashboard.name}`);
  console.info('═════════════════════════════════════════════════');
  console.info(`📝 ${dashboard.description}`);
  console.info('');
  
  if (dashboard.url) {
    console.info(`🌐 URL: ${dashboard.url}`);
    console.info(`📂 File: ${dashboard.url}`);
  }
  
  if (dashboard.command) {
    console.info(`⚡ Command: ${dashboard.command}`);
  }
  
  console.info('');
  console.info('✨ Features:');
  dashboard.features.forEach((feature, index) => {
    console.info(`   ${index + 1}. ${feature}`);
  });
  
  console.info('');
  
  // Provide access instructions
  if (dashboard.url) {
    console.info('🚀 Access Instructions:');
    console.info('   1. Make sure the dashboard server is running');
    console.info(`   2. Open your browser and navigate to: ${dashboard.url}`);
    console.info('   3. Or use the appropriate start command from package.json');
    console.info('');
    
    // Try to detect if file exists
    try {
      const file = Bun.file(dashboard.url);
      if (await file.exists()) {
        console.info('✅ Dashboard file exists locally');
        console.info(`📂 Path: ${Bun.resolveSync(dashboard.url)}`);
      } else {
        console.info('⚠️  Dashboard file not found - may need to start server first');
      }
    } catch (error) {
      console.info('ℹ️  Cannot verify dashboard file existence');
    }
  }
  
  if (dashboard.command) {
    console.info('🚀 Access Instructions:');
    console.info('   1. Run the command directly with Bun');
    console.info('   2. Or use: bun run dashboard:live');
    console.info('');
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
  
  console.info(`🚀 Launching ${dashboard.name}...`);
  console.info('═════════════════════════════════════════════════');
  
  if (dashboard.url) {
    // For web dashboards, provide instructions instead of trying to open
    console.info(`📂 Dashboard File: ${dashboard.url}`);
    console.info('');
    console.info('🌐 To access the web dashboard:');
    console.info('   1. Start the required server first');
    console.info('   2. Open your web browser');
    console.info(`   3. Navigate to: ${dashboard.url}`);
    console.info('');
    
    // Check if we can provide more specific instructions
    if (dashboardKey === 'web') {
      console.info('💡 Quick Start:');
      console.info('   bun run start:p2p-dashboard    # Start P2P dashboard server');
      console.info('   Then open: http://localhost:3000');
    } else if (dashboardKey === 'mcp') {
      console.info('💡 Quick Start:');
      console.info('   bun run mcp:security            # Start MCP server');
      console.info('   Then open: http://localhost:3000');
    }
  }
  
  if (dashboard.command) {
    console.info(`⚡ Executing: ${dashboard.command}`);
    console.info('');
    console.info('💡 Alternative: Use "bun run dashboard:live"');
    console.info('');
    
    // For live dashboard, we can't execute the complex inline command easily
    // so we provide the user with the exact command to run
    console.info('🔧 To run the live dashboard manually:');
    console.info(`   bun -e "${dashboard.command}"`);
  }
  
  console.info('');
  console.info('✨ Dashboard Information:');
  showDashboardInfo(dashboardKey);
}

/**
 * List all available dashboards
 */
function listDashboards(): void {
  const dashboards = getDashboards();
  
  console.info('🎯 Available Dashboards');
  console.info('═════════════════════════════════════════════════');
  console.info('');
  
  Object.entries(dashboards).forEach(([key, dashboard]) => {
    const type = dashboard.url ? '🌐 Web' : '⚡ Live';
    console.info(`${type} ${key.padEnd(8)} - ${dashboard.name}`);
    console.info(`     ${dashboard.description}`);
    console.info('');
  });
  
  console.info('🚀 Usage Examples:');
  console.info('   bun run examples/dashboard-demo.ts web     # Show web dashboard info');
  console.info('   bun run examples/dashboard-demo.ts live    # Show live dashboard info');
  console.info('   bun run examples/dashboard-demo.ts list    # List all dashboards');
  console.info('');
  console.info('📋 Package.json Aliases:');
  console.info('   bun run dashboard:web      # Web dashboard info');
  console.info('   bun run dashboard:live     # Live dashboard info');
  console.info('   bun run dashboard           # MCP dashboard status');
}

/**
 * Show help information
 */
function showHelp(): void {
  console.info('🎯 Dashboard Demo - FactoryWager Enterprise Platform');
  console.info('═════════════════════════════════════════════════');
  console.info('');
  console.info('USAGE:');
  console.info('  bun run examples/dashboard-demo.ts <command> [dashboard]');
  console.info('');
  console.info('COMMANDS:');
  console.info('  info <dashboard>    Show detailed dashboard information');
  console.info('  launch <dashboard>  Launch or show launch instructions');
  console.info('  list                List all available dashboards');
  console.info('  help                Show this help message');
  console.info('');
  console.info('DASHBOARDS:');
  console.info('  web                 Web-based dashboard');
  console.info('  live                Live terminal dashboard');
  console.info('  mcp                 MCP overview dashboard');
  console.info('  p2p                 P2P network dashboard');
  console.info('  business            Business registry dashboard');
  console.info('');
  console.info('ALIASES:');
  console.info('  bun run dashboard:web   Same as "info web"');
  console.info('  bun run dashboard:live  Same as "info live"');
  console.info('');
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
          console.info('Available dashboards:', Object.keys(getDashboards()).join(', '));
          process.exit(1);
        }
        await showDashboardInfo(dashboard);
        break;
        
      case 'launch':
        if (!dashboard) {
          console.error('❌ Please specify a dashboard');
          console.info('Available dashboards:', Object.keys(getDashboards()).join(', '));
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
