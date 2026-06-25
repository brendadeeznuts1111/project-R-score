#!/usr/bin/env bun

// Comprehensive Network and Process Monitoring
import { colourKit } from "../quantum-toolkit-patch.ts";

console.info(colourKit(0.8).ansi + "🌐 Network & Process Monitor" + "\x1b[0m");
console.info("=".repeat(50));

// Process monitoring using Node.js process APIs
async function processMonitoring() {
  console.info(colourKit(0.6).ansi + "\n⚙️ Process Monitoring" + "\x1b[0m");

  try {
    // Current process information
    const currentProcess = {
      pid: process.pid,
      ppid: process.ppid,
      title: process.title,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };

    // Display process info in table format
    console.info("📊 Current Process Information:");
    console.info("┌─────────────┬─────────────────────────┐");
    console.info("│ Property    │ Value                   │");
    console.info("├─────────────┼─────────────────────────┤");
    console.info(
      `│ PID         │ ${currentProcess.pid.toString().padEnd(23)} │`
    );
    console.info(
      `│ PPID        │ ${currentProcess.ppid.toString().padEnd(23)} │`
    );
    console.info(`│ Title       │ ${currentProcess.title.padEnd(23)} │`);
    console.info(`│ Version     │ ${currentProcess.version.padEnd(23)} │`);
    console.info(`│ Platform    │ ${currentProcess.platform.padEnd(23)} │`);
    console.info(`│ Architecture│ ${currentProcess.arch.padEnd(23)} │`);
    console.info(
      `│ Uptime (s)  │ ${currentProcess.uptime.toFixed(2).padEnd(23)} │`
    );
    console.info("└─────────────┴─────────────────────────┘");

    // Memory usage details
    const mem = currentProcess.memoryUsage;
    console.info("\n💾 Memory Usage Details:");
    console.info("┌─────────────┬──────────┬──────────┐");
    console.info("│ Type        │ Used (MB)│ Total (MB)│");
    console.info("├─────────────┼──────────┼──────────┤");
    console.info(
      `│ RSS         │ ${(mem.rss / 1024 / 1024).toFixed(2)} │ N/A      │`
    );
    console.info(
      `│ Heap Used   │ ${(mem.heapUsed / 1024 / 1024).toFixed(2)} │ ${(
        mem.heapTotal /
        1024 /
        1024
      ).toFixed(2)} │`
    );
    console.info(
      `│ External    │ ${(mem.external / 1024 / 1024).toFixed(2)} │ N/A      │`
    );
    console.info("└─────────────┴──────────┴──────────┘");

    // CPU usage
    const cpu = currentProcess.cpuUsage;
    console.info("\n🖥️ CPU Usage:");
    console.info("┌─────────────┬──────────┐");
    console.info("│ Metric      │ Value    │");
    console.info("├─────────────┼──────────┤");
    console.info(`│ User (μs)   │ ${cpu.user.toString()} │`);
    console.info(`│ System (μs) │ ${cpu.system.toString()} │`);
    console.info("└─────────────┴──────────┘");

    // Process list using Bun.spawn for system commands
    console.info("\n📋 Running Processes (Top 10):");
    try {
      const psResult = Bun.spawn(["ps", "aux"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const psOutput = await new Response(psResult.stdout).text();
      const lines = psOutput.split("\n").slice(1, 11); // Skip header and take top 10

      console.info(
        "┌──────┬─────────┬─────────┬─────────┬──────────────────────────────────┐"
      );
      console.info(
        "│ PID  │ %CPU    │ %MEM    │ Command │ Details                           │"
      );
      console.info(
        "├──────┼─────────┼─────────┼─────────┼──────────────────────────────────┤"
      );

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const pid = parts[1];
          const cpu = parts[2];
          const mem = parts[3];
          const command = parts[10];
          const details = parts.slice(11).join(" ").substring(0, 35);

          console.info(
            `│ ${pid.padEnd(4)} │ ${cpu.padEnd(7)} │ ${mem.padEnd(
              7
            )} │ ${command.padEnd(7)} │ ${details.padEnd(35)} │`
          );
        }
      });

      console.info(
        "└──────┴─────────┴─────────┴─────────┴──────────────────────────────────┘"
      );
    } catch (error) {
      console.info(
        "⚠️ Could not retrieve process list (ps command not available)"
      );
    }
  } catch (error: unknown) {
    console.info(`❌ Process monitoring error: ${(error as Error).message}`);
  }
}

// Network monitoring using available tools
async function networkMonitoring() {
  console.info(colourKit(0.7).ansi + "\n🌐 Network Monitoring" + "\x1b[0m");

  try {
    // Network configuration
    console.info("🔧 Network Configuration:");

    // Get network interfaces using Node.js
    const os = await import("os");
    const interfaces = os.networkInterfaces();

    console.info(
      "┌─────────────┬─────────────┬─────────────────────────────────┐"
    );
    console.info(
      "│ Interface   │ Family      │ Address                        │"
    );
    console.info(
      "├─────────────┼─────────────┼─────────────────────────────────┤"
    );

    Object.entries(interfaces).forEach(([name, addrs]) => {
      if (addrs) {
        addrs.forEach((addr) => {
          if (!addr.internal) {
            console.info(
              `│ ${name.padEnd(11)} │ ${addr.family.padEnd(
                11
              )} │ ${addr.address.padEnd(31)} │`
            );
          }
        });
      }
    });

    console.info(
      "└─────────────┴─────────────┴─────────────────────────────────┘"
    );

    // DNS resolution test
    console.info("\n🌍 DNS Resolution Test:");
    const testDomains = ["google.com", "github.com", "bun.sh", "localhost"];

    console.info("┌─────────────┬──────────┬──────────┐");
    console.info("│ Domain      │ Status   │ Time (ms)│");
    console.info("├─────────────┼──────────┼──────────┤");

    for (const domain of testDomains) {
      try {
        const start = performance.now();
        const addresses = await Promise.race([
          import("dns").then((dns) => dns.promises.lookup(domain)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000)
          ),
        ]);
        const end = performance.now();

        console.info(
          `│ ${domain.padEnd(11)} │ ✅ Success │ ${(end - start).toFixed(0)} │`
        );
      } catch (error) {
        console.info(`│ ${domain.padEnd(11)} │ ❌ Failed │ N/A      │`);
      }
    }

    console.info("└─────────────┴──────────┴──────────┘");

    // HTTP connectivity test
    console.info("\n📡 HTTP Connectivity Test:");
    const testUrls = [
      "https://httpbin.org/status/200",
      "https://api.github.com",
      "https://bun.sh",
    ];

    console.info(
      "┌─────────────────────────────┬──────────┬──────────┬──────────┐"
    );
    console.info(
      "│ URL                         │ Status   │ Time (ms)│ Size (B)  │"
    );
    console.info(
      "├─────────────────────────────┼──────────┼──────────┼──────────┤"
    );

    for (const url of testUrls) {
      try {
        const start = performance.now();
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        const end = performance.now();
        const text = await response.text();

        console.info(
          `│ ${url
            .substring(0, 27)
            .padEnd(27)} │ ${response.status.toString()} │ ${(
            end - start
          ).toFixed(0)} │ ${text.length.toString()} │`
        );
      } catch (error) {
        console.info(
          `│ ${url
            .substring(0, 27)
            .padEnd(27)} │ ❌ Error  │ N/A      │ N/A      │`
        );
      }
    }

    console.info(
      "└─────────────────────────────┴──────────┴──────────┴──────────┘"
    );

    // Port scanning test
    console.info("\n🔍 Port Availability Test:");
    const commonPorts = [80, 443, 3000, 8000, 8080, 3001];

    console.info("┌──────┬─────────────┬──────────┐");
    console.info("│ Port │ Service     │ Status   │");
    console.info("├──────┼─────────────┼──────────┤");

    for (const port of commonPorts) {
      try {
        const start = performance.now();
        const socket = await import("net").then(
          (net) =>
            new Promise((resolve, reject) => {
              const socket = new net.Socket();
              socket.setTimeout(1000);

              socket.connect(port, "localhost", () => {
                socket.end();
                resolve("open");
              });

              socket.on("error", () => reject("closed"));
              socket.on("timeout", () => {
                socket.destroy();
                reject("timeout");
              });
            })
        );
        const end = performance.now();

        console.info(
          `│ ${port.toString().padEnd(4)} │ ${getServiceName(port).padEnd(
            11
          )} │ ✅ Open   │`
        );
      } catch (error) {
        console.info(
          `│ ${port.toString().padEnd(4)} │ ${getServiceName(port).padEnd(
            11
          )} │ ❌ Closed │`
        );
      }
    }

    console.info("└──────┴─────────────┴──────────┘");
  } catch (error: unknown) {
    console.info(`❌ Network monitoring error: ${(error as Error).message}`);
  }
}

// System resource monitoring
async function systemResourceMonitoring() {
  console.info(
    colourKit(0.5).ansi + "\n📊 System Resource Monitoring" + "\x1b[0m"
  );

  try {
    // OS Information
    const os = await import("os");
    const osInfo = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpus: os.cpus(),
    };

    console.info("💻 System Information:");
    console.info("┌─────────────┬─────────────────────────┐");
    console.info("│ Property    │ Value                   │");
    console.info("├─────────────┼─────────────────────────┤");
    console.info(`│ Platform    │ ${osInfo.platform.padEnd(23)} │`);
    console.info(`│ Architecture│ ${osInfo.arch.padEnd(23)} │`);
    console.info(`│ Release     │ ${osInfo.release.padEnd(23)} │`);
    console.info(`│ Hostname    │ ${osInfo.hostname.padEnd(23)} │`);
    console.info(
      `│ Total Memory│ ${
        (osInfo.totalmem / 1024 / 1024 / 1024).toFixed(2) + " GB".padEnd(23)
      } │`
    );
    console.info(
      `│ Free Memory │ ${
        (osInfo.freemem / 1024 / 1024 / 1024).toFixed(2) + " GB".padEnd(23)
      } │`
    );
    console.info(
      `│ Memory Usage│ ${
        ((1 - osInfo.freemem / osInfo.totalmem) * 100).toFixed(1) +
        "%".padEnd(23)
      } │`
    );
    console.info("└─────────────┴─────────────────────────┘");

    // CPU Information
    console.info("\n🖥️ CPU Information:");
    const cpuCount = osInfo.cpus.length;
    const cpuModel = osInfo.cpus[0]?.model || "Unknown";
    const cpuSpeed = osInfo.cpus[0]?.speed || 0;

    console.info("┌─────────────┬─────────────────────────┐");
    console.info("│ Property    │ Value                   │");
    console.info("├─────────────┼─────────────────────────┤");
    console.info(`│ Cores       │ ${cpuCount.toString().padEnd(23)} │`);
    console.info(`│ Model       │ ${cpuModel.substring(0, 23).padEnd(23)} │`);
    console.info(`│ Speed       │ ${cpuSpeed + " MHz".padEnd(23)} │`);
    console.info("└─────────────┴─────────────────────────┘");

    // Load Average (Unix-like systems)
    if (osInfo.loadavg) {
      console.info("\n📈 Load Average:");
      console.info("┌─────────────┬──────────┐");
      console.info("│ Period      │ Load     │");
      console.info("├─────────────┼──────────┤");
      console.info(`│ 1 min       │ ${osInfo.loadavg[0].toFixed(2)} │`);
      console.info(`│ 5 min       │ ${osInfo.loadavg[1].toFixed(2)} │`);
      console.info(`│ 15 min      │ ${osInfo.loadavg[2].toFixed(2)} │`);
      console.info("└─────────────┴──────────┘");
    }

    // Environment variables
    console.info("\n🌍 Environment Variables:");
    const envVars = {
      SHELL: process.env.SHELL,
      PATH: process.env.PATH?.split(":").length + " paths",
      NODE_ENV: process.env.NODE_ENV || "undefined",
      USER: process.env.USER,
      HOME: process.env.HOME,
      LANG: process.env.LANG,
    };

    console.info("┌─────────┬─────────────────────────────────┐");
    console.info("│ Variable│ Value                           │");
    console.info("├─────────┼─────────────────────────────────┤");
    Object.entries(envVars).forEach(([key, value]) => {
      const displayValue = value?.toString().substring(0, 33) || "undefined";
      console.info(`│ ${key.padEnd(7)} │ ${displayValue.padEnd(33)} │`);
    });
    console.info("└─────────┴─────────────────────────────────┘");
  } catch (error: unknown) {
    console.info(
      `❌ System resource monitoring error: ${(error as Error).message}`
    );
  }
}

// Helper function to get service name for port
function getServiceName(port: number): string {
  const services: { [key: number]: string } = {
    80: "HTTP",
    443: "HTTPS",
    3000: "Dev Server",
    8000: "Dev Server",
    8080: "Alt HTTP",
    3001: "Alt Dev",
  };
  return services[port] || "Unknown";
}

// Real-time monitoring
async function realTimeMonitoring() {
  console.info(colourKit(0.4).ansi + "\n📊 Real-time Monitoring" + "\x1b[0m");

  try {
    console.info("🔄 Monitoring system metrics for 5 seconds...");

    let iterations = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const current = Date.now();
      const elapsed = (current - startTime) / 1000;

      iterations++;
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      console.info(
        `${colourKit(Math.min(elapsed / 5, 1)).ansi}Iteration ${iterations}: ` +
          `Mem: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB, ` +
          `CPU: ${cpuUsage.user}μs\x1b[0m`
      );

      if (elapsed >= 5) {
        clearInterval(interval);
        console.info("\n✅ Real-time monitoring complete");
      }
    }, 1000);

    // Wait for monitoring to complete
    await new Promise((resolve) => setTimeout(resolve, 6000));
  } catch (error: unknown) {
    console.info(`❌ Real-time monitoring error: ${(error as Error).message}`);
  }
}

// Main execution
async function main() {
  console.info(
    "🎯 This demo provides comprehensive network and process monitoring:"
  );
  console.info("  • Process information and resource usage");
  console.info("  • Network configuration and connectivity");
  console.info("  • System resource monitoring");
  console.info("  • Real-time performance tracking");

  await processMonitoring();
  await networkMonitoring();
  await systemResourceMonitoring();
  await realTimeMonitoring();

  console.info(
    "\n" +
      colourKit(0.2).ansi +
      "🎉 Network & Process Monitoring Complete!" +
      "\x1b[0m"
  );
  console.info(
    "📊 Comprehensive system monitoring with enterprise-grade insights!"
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 Network & Process monitoring interrupted gracefully!");
  process.exit(0);
});

// Start the monitoring
main().catch(console.error);
