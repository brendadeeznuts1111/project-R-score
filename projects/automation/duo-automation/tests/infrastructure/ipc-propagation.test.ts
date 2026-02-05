// tests/infrastructure/ipc-propagation.test.ts
import { expect, test, describe, afterEach } from "bun:test";
import { UnifiedDashboardLauncher } from "../../utils/unified-dashboard-launcher";

describe("UnifiedDashboardLauncher IPC and Shutdown", () => {
  
  afterEach(async () => {
    await UnifiedDashboardLauncher.shutdownAll();
  });

  test("Should spawn a child with IPC and propagate scope", async () => {
    // We'll use a simple script that sends an IPC message and then hangs until killed
    const entryPoint = "-e";
    const domain = "apple.factory-wager.com"; // Should map to ENTERPRISE
    const script = `
      if (process.env.ENABLE_IPC === 'true') {
        process.send({ type: 'status', status: 'test-ready', pid: process.pid, scope: process.env.SCOPE });
      }
      // Keep alive for a bit
      setTimeout(() => {}, 2000);
    `;

    const proc = await UnifiedDashboardLauncher.launchDashboardChild(entryPoint, domain, [script]);
    
    expect(proc).toBeDefined();
    expect(proc.pid).toBeGreaterThan(0);
    
    // Give it a moment to send the IPC message
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if process is tracked
    expect(UnifiedDashboardLauncher.getActiveProcesses().length).toBe(1);
    
    proc.kill();
    await proc.exited;
    
    // Give onExit handler a chance to clean up the map
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(UnifiedDashboardLauncher.getActiveProcesses().length).toBe(0);
  });

  test("Should gracefully shutdown multiple children", async () => {
    const domains = ["apple.factory-wager.com", "dev.apple.factory-wager.com"];
    const procs = [];
    
    for (const domain of domains) {
      const proc = await UnifiedDashboardLauncher.launchDashboardChild("-e", domain, ["setInterval(()=>{},1000)"]);
      procs.push(proc);
    }

    expect(UnifiedDashboardLauncher.getActiveProcesses().length).toBe(2);

    await UnifiedDashboardLauncher.shutdownAll();
    
    expect(UnifiedDashboardLauncher.getActiveProcesses().length).toBe(0);
    
    for (const proc of procs) {
      expect(proc.killed).toBe(true);
    }
  });
});