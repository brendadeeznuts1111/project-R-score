#!/usr/bin/env bun

// Comprehensive Network and Process Monitoring
import { colourKit } from "../quantum-toolkit-patch.ts";

console.log(colourKit(0.8).ansi + "🌐 Network & Process Monitor" + "\x1b[0m");
console.log("=".repeat(50));

// Process monitoring using Node.js process APIs
async function processMonitoring() {
  console.log(colourKit(0.6).ansi + "\n⚙️ Process Monitoring" + "\x1b[0m");

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
    console.log("📊 Current Process Information:");
    console.log("┌─────────────┬─────────────────────────┐");
    console.log("│ Property    │ Value                   │");
    console.log("├─────────────┼─────────────────────────┤");
    console.log(
      `│ PID         │ ${currentProcess.pid.toString().padEnd(23)} │`
    );
    console.log(
      `│ PPID        │ ${currentProcess.ppid.toString().padEnd(23)} │`
    );
    console.log(`│ Title       │ ${currentProcess.title.padEnd(23)} │`);
    console.log(`│ Version     │ ${currentProcess.version.padEnd(23)} │`);
    console.log(`│ Platform    │ ${currentProcess.platform.padEnd(23)} │`);
    console.log(`│ Architecture│ ${currentProcess.arch.padEnd(23)} │`);
    console.log(
      `│ Uptime (s)  │ ${currentProcess.uptime.toFixed(2).padEnd(23)} │`
    );
    console.log("└─────────────┴─────────────────────────┘");

    // Memory usage details
    const mem = currentProcess.memoryUsage;
    console.log("\n💾 Memory Usage Details:");
    console.log("┌─────────────┬──────────┬──────────┐");
    console.log("│ Type        │ Used (MB)│ Total (MB)│");
    console.log("├─────────────┼──────────┼──────────┤");
    console.log(
      `│ RSS         │ ${(mem.rss / 1024 / 1024).toFixed(2)} │ N/A      │`
    );
    console.log(
      `│ Heap Used   │ ${(mem.heapUsed / 1024 / 1024).toFixed(2)} │ ${(
        mem.heapTotal /
        1024 /
        1024
      ).toFixed(2)} │`
    );
    console.log(
      `│ External    │ ${(mem.external / 1024 / 1024).toFixed(2)} │ N/A      │`
    );
    console.log("└─────────────┴──────────┴──────────┘");

    // CPU usage
    const cpu = currentProcess.cpuUsage;
    console.log("\n🖥️ CPU Usage:");
    console.log("┌─────────────┬──────────┐");
    console.log("│ Metric      │ Value    │");
    console.log("├─────────────┼──────────┤");
    console.log(`│ User (μs)   │ ${cpu.user.toString()} │`);
    console.log(`│ System (μs) │ ${cpu.system.toString()} │`);
    console.log("└─────────────┴──────────┘");

    // Process list using Bun.spawn for system commands
    console.log("\n📋 Running Processes (Top 10):");
    try {
      const psResult = Bun.spawn(["ps", "aux"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const psOutput = await new Response(psResult.stdout).text();
      const lines = psOutput.split("\n").slice(1, 11); // Skip header and take top 10

      console.log(
        "┌──────┬─────────┬─────────┬─────────┬──────────────────────────────────┐"
      );
      console.log(
        "│ PID  │ %CPU    │ %MEM    │ Command │ Details                           │"
      );
      console.log(
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

          console.log(
            `│ ${pid.padEnd(4)} │ ${cpu.padEnd(7)} │ ${mem.padEnd(
              7
            )} │ ${command.padEnd(7)} │ ${details.padEnd(35)} │`
          );
        }
      });

      console.log(
        "└──────┴─────────┴─────────┴─────────┴──────────────────────────────────┘"
      );
    } catch (error) {
      console.log(
        "⚠️ Could not retrieve process list (ps command not available)"
      );
    }
  } catch (error: unknown) {
    console.log(`❌ Process monitoring error: ${(error as Error).message}`);
  }
}

// Network monitoring using available tools
async function networkMonitoring() {
  console.log(colourKit(0.7).ansi + "\n🌐 Network Monitoring" + "\x1b[0m");

  try {
    // Network configuration
    console.log("🔧 Network Configuration:");

    // Get network interfaces using Node.js
    const os = await import("os");
    const interfaces = os.networkInterfaces();

    console.log(
      "┌─────────────┬─────────────┬─────────────────────────────────┐"
    );
    console.log(
      "│ Interface   │ Family      │ Address                        │"
    );
    console.log(
      "├─────────────┼─────────────┼─────────────────────────────────┤"
    );

    Object.entries(interfaces).forEach(([name, addrs]) => {
      if (addrs) {
        addrs.forEach((addr) => {
          if (!addr.internal) {
            console.log(
              `│ ${name.padEnd(11)} │ ${addr.family.padEnd(
                11
              )} │ ${addr.address.padEnd(31)} │`
            );
          }
        });
      }
    });

    console.log(
      "└─────────────┴─────────────┴─────────────────────────────────┘"
    );

    // DNS resolution test
    console.log("\n🌍 DNS Resolution Test:");
    const testDomains = ["google.com", "github.com", "bun.sh", "localhost"];

    console.log("┌─────────────┬──────────┬──────────┐");
    console.log("│ Domain      │ Status   │ Time (ms)│");
    console.log("├─────────────┼──────────┼──────────┤");

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

        console.log(
          `│ ${domain.padEnd(11)} │ ✅ Success │ ${(end - start).toFixed(0)} │`
        );
      } catch (error) {
        console.log(`│ ${domain.padEnd(11)} │ ❌ Failed │ N/A      │`);
      }
    }

    console.log("└─────────────┴──────────┴──────────┘");

    // HTTP connectivity test
    console.log("\n📡 HTTP Connectivity Test:");
    const testUrls = [
      "https://httpbin.org/status/200",
      "https://api.github.com",
      "https://bun.sh",
    ];

    console.log(
      "┌─────────────────────────────┬──────────┬──────────┬──────────┐"
    );
    console.log(
      "│ URL                         │ Status   │ Time (ms)│ Size (B)  │"
    );
    console.log(
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

        console.log(
          `│ ${url
            .substring(0, 27)
            .padEnd(27)} │ ${response.status.toString()} │ ${(
            end - start
          ).toFixed(0)} │ ${text.length.toString()} │`
        );
      } catch (error) {
        console.log(
          `│ ${url
            .substring(0, 27)
            .padEnd(27)} │ ❌ Error  │ N/A      │ N/A      │`
        );
      }
    }

    console.log(
      "└─────────────────────────────┴──────────┴──────────┴──────────┘"
    );

    // Port scanning test
    console.log("\n🔍 Port Availability Test:");
    const commonPorts = [80, 443, 3000, 8000, 8080, 3001];

    console.log("┌──────┬─────────────┬──────────┐");
    console.log("│ Port │ Service     │ Status   │");
    console.log("├──────┼─────────────┼──────────┤");

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

        console.log(
          `│ ${port.toString().padEnd(4)} │ ${getServiceName(port).padEnd(
            11
          )} │ ✅ Open   │`
        );
      } catch (error) {
        console.log(
          `│ ${port.toString().padEnd(4)} │ ${getServiceName(port).padEnd(
            11
          )} │ ❌ Closed │`
        );
      }
    }

    console.log("└──────┴─────────────┴──────────┘");
  } catch (error: unknown) {
    console.log(`❌ Network monitoring error: ${(error as Error).message}`);
  }
}

// System resource monitoring
async function systemResourceMonitoring() {
  console.log(
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

    console.log("💻 System Information:");
    console.log("┌─────────────┬─────────────────────────┐");
    console.log("│ Property    │ Value                   │");
    console.log("├─────────────┼─────────────────────────┤");
    console.log(`│ Platform    │ ${osInfo.platform.padEnd(23)} │`);
    console.log(`│ Architecture│ ${osInfo.arch.padEnd(23)} │`);
    console.log(`│ Release     │ ${osInfo.release.padEnd(23)} │`);
    console.log(`│ Hostname    │ ${osInfo.hostname.padEnd(23)} │`);
    console.log(
      `│ Total Memory│ ${
        (osInfo.totalmem / 1024 / 1024 / 1024).toFixed(2) + " GB".padEnd(23)
      } │`
    );
    console.log(
      `│ Free Memory │ ${
        (osInfo.freemem / 1024 / 1024 / 1024).toFixed(2) + " GB".padEnd(23)
      } │`
    );
    console.log(
      `│ Memory Usage│ ${
        ((1 - osInfo.freemem / osInfo.totalmem) * 100).toFixed(1) +
        "%".padEnd(23)
      } │`
    );
    console.log("└─────────────┴─────────────────────────┘");

    // CPU Information
    console.log("\n🖥️ CPU Information:");
    const cpuCount = osInfo.cpus.length;
    const cpuModel = osInfo.cpus[0]?.model || "Unknown";
    const cpuSpeed = osInfo.cpus[0]?.speed || 0;

    console.log("┌─────────────┬─────────────────────────┐");
    console.log("│ Property    │ Value                   │");
    console.log("├─────────────┼─────────────────────────┤");
    console.log(`│ Cores       │ ${cpuCount.toString().padEnd(23)} │`);
    console.log(`│ Model       │ ${cpuModel.substring(0, 23).padEnd(23)} │`);
    console.log(`│ Speed       │ ${cpuSpeed + " MHz".padEnd(23)} │`);
    console.log("└─────────────┴─────────────────────────┘");

    // Load Average (Unix-like systems)
    if (osInfo.loadavg) {
      console.log("\n📈 Load Average:");
      console.log("┌─────────────┬──────────┐");
      console.log("│ Period      │ Load     │");
      console.log("├─────────────┼──────────┤");
      console.log(`│ 1 min       │ ${osInfo.loadavg[0].toFixed(2)} │`);
      console.log(`│ 5 min       │ ${osInfo.loadavg[1].toFixed(2)} │`);
      console.log(`│ 15 min      │ ${osInfo.loadavg[2].toFixed(2)} │`);
      console.log("└─────────────┴──────────┘");
    }

    // Environment variables
    console.log("\n🌍 Environment Variables:");
    const envVars = {
      SHELL: process.env.SHELL,
      PATH: process.env.PATH?.split(":").length + " paths",
      NODE_ENV: process.env.NODE_ENV || "undefined",
      USER: process.env.USER,
      HOME: process.env.HOME,
      LANG: process.env.LANG,
    };

    console.log("┌─────────┬─────────────────────────────────┐");
    console.log("│ Variable│ Value                           │");
    console.log("├─────────┼─────────────────────────────────┤");
    Object.entries(envVars).forEach(([key, value]) => {
      const displayValue = value?.toString().substring(0, 33) || "undefined";
      console.log(`│ ${key.padEnd(7)} │ ${displayValue.padEnd(33)} │`);
    });
    console.log("└─────────┴─────────────────────────────────┘");
  } catch (error: unknown) {
    console.log(
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
  console.log(colourKit(0.4).ansi + "\n📊 Real-time Monitoring" + "\x1b[0m");

  try {
    console.log("🔄 Monitoring system metrics for 5 seconds...");

    let iterations = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const current = Date.now();
      const elapsed = (current - startTime) / 1000;

      iterations++;
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      console.log(
        `${colourKit(Math.min(elapsed / 5, 1)).ansi}Iteration ${iterations}: ` +
          `Mem: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB, ` +
          `CPU: ${cpuUsage.user}μs\x1b[0m`
      );

      if (elapsed >= 5) {
        clearInterval(interval);
        console.log("\n✅ Real-time monitoring complete");
      }
    }, 1000);

    // Wait for monitoring to complete
    await new Promise((resolve) => setTimeout(resolve, 6000));
  } catch (error: unknown) {
    console.log(`❌ Real-time monitoring error: ${(error as Error).message}`);
  }
}

// Main execution
async function main() {
  console.log(
    "🎯 This demo provides comprehensive network and process monitoring:"
  );
  console.log("  • Process information and resource usage");
  console.log("  • Network configuration and connectivity");
  console.log("  • System resource monitoring");
  console.log("  • Real-time performance tracking");

  await processMonitoring();
  await networkMonitoring();
  await systemResourceMonitoring();
  await realTimeMonitoring();

  console.log(
    "\n" +
      colourKit(0.2).ansi +
      "🎉 Network & Process Monitoring Complete!" +
      "\x1b[0m"
  );
  console.log(
    "📊 Comprehensive system monitoring with enterprise-grade insights!"
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.log("\n\n👋 Network & Process monitoring interrupted gracefully!");
  process.exit(0);
});

// Start the monitoring
main().catch(console.error);
