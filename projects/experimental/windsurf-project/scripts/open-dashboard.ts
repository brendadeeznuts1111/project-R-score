// scripts/open-dashboard.ts
/**
 * 🚀 EMPIRE PRO DASHBOARD LAUNCHER
 * Quick access to all dashboards and credentials
 */

import { execSync } from 'child_process';

class DashboardLauncher {
  private dashboards = [
    {
      name: '🔐 Credential Dashboard',
      path: 'dashboards/credentials/credential-dashboard.html',
      description: 'Secure credential management'
    },
    {
      name: '📊 Production Dashboard',
      url: 'https://dashboard.apple',
      description: 'Analytics and metrics'
    },
    {
      name: '🧠 Phone Intelligence API',
      url: 'https://api.apple',
      description: 'Main API endpoint'
    },
    {
      name: '📈 System Status',
      url: 'https://status.apple',
      description: 'Health monitoring'
    },
    {
      name: '📋 Metrics Dashboard',
      url: 'https://metrics.apple',
      description: 'Performance metrics'
    },
    {
      name: '⚙️ Admin Interface',
      url: 'https://admin.apple',
      description: 'System administration'
    }
  ];

  private openFile(filePath: string): void {
    try {
      const command = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
      
      execSync(`${command} ${filePath}`, { stdio: 'inherit' });
      console.log(`✅ Opened: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to open: ${filePath}`, error);
    }
  }

  private openUrl(url: string): void {
    try {
      const command = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
      
      execSync(`${command} ${url}`, { stdio: 'inherit' });
      console.log(`✅ Opened: ${url}`);
    } catch (error) {
      console.error(`❌ Failed to open: ${url}`, error);
    }
  }

  showMenu(): void {
    console.log('🚀 EMPIRE PRO DASHBOARD LAUNCHER');
    console.log('═'.repeat(50));
    console.log('');
    
    this.dashboards.forEach((dashboard, index) => {
      const location = dashboard.path || dashboard.url;
      console.log(`${index + 1}. ${dashboard.name}`);
      console.log(`   ${dashboard.description}`);
      console.log(`   📍 ${location}`);
      console.log('');
    });

    console.log('9. 📖 Open Credentials Guide');
    console.log('   Complete credential reference documentation');
    console.log('   📍 CREDENTIALS_GUIDE.md');
    console.log('');

    console.log('10. 🧪 Run System Validation');
    console.log('    Complete system health check');
    console.log('    💻 bun run scripts/validate-production.ts');
    console.log('');

    console.log('0. 🚪 Exit');
    console.log('');
  }

  async launch(choice: string): Promise<void> {
    const index = parseInt(choice);

    if (choice === '0') {
      console.log('👋 Goodbye!');
      process.exit(0);
    }

    if (choice === '9') {
      this.openFile('CREDENTIALS_GUIDE.md');
      return;
    }

    if (choice === '10') {
      console.log('🧪 Running system validation...');
      try {
        execSync('bun run scripts/validate-production.ts', { stdio: 'inherit', cwd: process.cwd() });
      } catch (error) {
        console.error('❌ Validation failed:', error);
      }
      return;
    }

    if (index >= 1 && index <= this.dashboards.length) {
      const dashboard = this.dashboards[index - 1];
      
      if (dashboard.path) {
        this.openFile(dashboard.path);
      } else if (dashboard.url) {
        this.openUrl(dashboard.url);
      }
    } else {
      console.log('❌ Invalid choice. Please try again.');
    }
  }

  async quickStart(): Promise<void> {
    console.log('🚀 Quick Start - Opening Essential Dashboards...');
    console.log('');

    // Open credential dashboard first
    console.log('🔐 Opening Credential Dashboard...');
    this.openFile('dashboards/credentials/credential-dashboard.html');

    // Wait a moment then open production dashboard
    setTimeout(() => {
      console.log('📊 Opening Production Dashboard...');
      this.openUrl('https://dashboard.apple');
    }, 1000);

    // Wait another moment then run validation
    setTimeout(() => {
      console.log('🧪 Running System Validation...');
      try {
        execSync('bun run scripts/validate-production.ts', { stdio: 'inherit', cwd: process.cwd() });
      } catch (error) {
        console.error('❌ Validation failed:', error);
      }
    }, 2000);

    console.log('');
    console.log('✅ All dashboards opened! Check your browser windows.');
    console.log('📖 For complete documentation, see: CREDENTIALS_GUIDE.md');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const launcher = new DashboardLauncher();

  if (args.length === 0) {
    // Interactive mode
    launcher.showMenu();
    
    // Simple input handling
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        const choice = chunk.toString().trim();
        launcher.launch(choice).then(() => {
          if (choice !== '0') {
            launcher.showMenu();
          }
        });
      }
    });
  } else if (args[0] === 'quick') {
    // Quick start mode
    await launcher.quickStart();
  } else {
    // Direct launch
    await launcher.launch(args[0]);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DashboardLauncher };
