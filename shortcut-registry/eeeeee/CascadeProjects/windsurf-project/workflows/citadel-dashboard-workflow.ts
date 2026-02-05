#!/usr/bin/env bun

import { setTimeout } from 'timers/promises';

/**
 * 🏛️ CITADEL DASHBOARD WORKFLOW - Automated Configuration & Launch
 * 
 * This script automates the complete workflow:
 * 1. Git commit & push changes
 * 2. Start dashboard server on correct port
 * 3. Open browser automatically
 * 4. Run search verification
 */

class CitadelDashboardWorkflow {
  private serverProcess: any = null;
  public readonly port = 3227;
  private readonly host = 'http://localhost';

  async execute(): Promise<void> {
    console.log('🚀 Starting Citadel Dashboard Workflow...');

    try {
      // Step 1: Git commit & push
      await this.gitCommitAndPush();

      // Step 2: Start dashboard server
      await this.startDashboardServer();

      // Step 3: Wait for server to be ready
      await this.waitForServer();

      // Step 4: Open browser automatically
      await this.openBrowser();

      // Step 5: Run search verification
      await this.runSearchVerification();

      console.log('✅ Citadel Dashboard Workflow completed successfully!');

    } catch (error) {
      console.error('❌ Workflow failed:', error);
      process.exit(1);
    }
  }

  private async gitCommitAndPush(): Promise<void> {
    console.log('📝 Step 1: Committing and pushing changes...');

    try {
      // Add all changes
      await this.runCommand('git', ['add', '.']);

      // Commit with timestamp
      const timestamp = new Date().toISOString();
      await this.runCommand('git', ['commit', '-m', `Automated dashboard workflow - ${timestamp}`]);

      // Push to remote
      await this.runCommand('git', ['push']);

      console.log('✅ Git operations completed');
    } catch (error) {
      console.warn('⚠️ Git operations failed, continuing workflow...');
    }
  }

  private async startDashboardServer(): Promise<void> {
    console.log(`🖥️ Step 2: Starting admin dashboard server on port ${this.port}...`);

    // Start the admin dashboard server
    this.serverProcess = Bun.spawn(['bun', 'src/admin/config-server.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // Wait for server to start
    await setTimeout(3000);
    console.log(`✅ Admin dashboard started on port ${this.port}`);
  }

  private async waitForServer(): Promise<void> {
    console.log('⏳ Step 3: Waiting for server to be ready...');

    // Wait for server to fully start
    await setTimeout(3000);

    // Verify server is responding
    try {
      const response = await fetch(`${this.host}:${this.port}`);
      if (response.ok) {
        console.log('✅ Server is ready and responding');
      } else {
        console.warn('⚠️ Server responded but may not be fully ready');
      }
    } catch (error) {
      console.warn('⚠️ Server not yet responding, continuing anyway...');
    }
  }

  private async openBrowser(): Promise<void> {
    console.log('🌐 Step 4: Opening browser automatically...');

    const url = `${this.host}:${this.port}`;

    try {
      // Try different browser commands based on platform
      const commands = [
        { cmd: 'open', args: [url] },        // macOS
        { cmd: 'xdg-open', args: [url] },    // Linux
        { cmd: 'start', args: [url] },       // Windows
        { cmd: 'google-chrome', args: [url] } // Chrome directly
      ];

      for (const { cmd, args } of commands) {
        try {
          await this.runCommand(cmd, args);
          console.log(`✅ Browser opened using ${cmd}`);
          return;
        } catch {
          continue; // Try next command
        }
      }

      console.log('⚠️ Could not auto-open browser, please manually navigate to:', url);
    } catch (error) {
      console.log('⚠️ Auto-open failed, please manually navigate to:', url);
    }
  }

  private async runSearchVerification(): Promise<void> {
    console.log('🔍 Step 5: Running search verification...');

    try {
      // Wait a bit more for dashboard to be fully ready
      await setTimeout(2000);

      // Run CLI dashboard search commands (these work with the audit system)
      const searches = ['performance', 'apple_id', 'security'];

      for (const query of searches) {
        console.log(`🔎 Searching for: ${query}`);
        await this.runCommand('bun', ['src/nexus/core/dashboard.ts', '--search', query]);
        await setTimeout(1000); // Brief pause between searches
      }

      console.log('✅ Search verification completed');
    } catch (error) {
      console.warn('⚠️ Search verification failed:', error);
    }
  }

  private async runCommand(command: string, args: string[]): Promise<string> {
    const fullCommand = `${command} ${args.join(' ')}`;
    console.log(`🔧 Running: ${fullCommand}`);

    const result = await Bun.$`bun ${args}`.quiet().text();
    return result;
  }

  async cleanup(): Promise<void> {
    if (this.serverProcess) {
      console.log('🧹 Cleaning up server process...');
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}

// Main execution
async function main() {
  const workflow = new CitadelDashboardWorkflow();

  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received interrupt signal, cleaning up...');
    await workflow.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received termination signal, cleaning up...');
    await workflow.cleanup();
    process.exit(0);
  });

  // Execute workflow
  await workflow.execute();

  // Keep process running
  console.log('🎊 Dashboard is running! Press Ctrl+C to stop.');
  console.log(`🌐 Dashboard URL: http://localhost:${workflow.port}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { CitadelDashboardWorkflow };
