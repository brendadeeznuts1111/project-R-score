export interface HardwareCapabilities {
  simd: boolean;
  crc32: boolean;
  threads: number;
  memory: {
    total: number;
    available: number;
    limit: number;
  };
  cpu: {
    architecture: string;
    model?: string;
    frequency?: number;
  };
}

export class HardwareCapabilityDetector {
  private readonly capabilities = new Map<string, boolean>();

  async detectCapabilities(): Promise<HardwareCapabilities> {
    return {
      simd: await this.detectSIMD(),
      crc32: await this.detectCRC32Hardware(),
      threads: navigator.hardwareConcurrency || 4,
      memory: this.getMemoryInfo(),
      cpu: await this.getCPUInfo(),
    };
  }

  private async detectSIMD(): Promise<boolean> {
    try {
      // Test SIMD support with a small operation
      const testData = new Uint8Array(1024);
      const start = performance.now();

      // Perform multiple operations to measure performance
      for (let i = 0; i < 100; i++) {
        Bun.hash.crc32(testData);
      }

      const duration = performance.now() - start;
      const avgTime = duration / 100;

      // SIMD should complete 1KB in under 1ms average
      return avgTime < 1.0;
    } catch {
      return false;
    }
  }

  private async detectCRC32Hardware(): Promise<boolean> {
    try {
      const testSize = 1024 * 1024; // 1MB
      const testData = new Uint8Array(testSize);

      const start = performance.now();
      Bun.hash.crc32(testData);
      const duration = performance.now() - start;

      // Hardware CRC32 should complete 1MB in under 200µs
      return duration < 0.2;
    } catch {
      return false;
    }
  }

  private getMemoryInfo(): { total: number; available: number; limit: number } {
    // Use process.memoryUsage() for Node.js/Bun environments
    const usage = process.memoryUsage();

    return {
      total: usage.heapTotal,
      available: usage.heapTotal - usage.heapUsed,
      limit: usage.heapTotal,
    };
  }

  private async getCPUInfo(): Promise<{
    architecture: string;
    model?: string;
    frequency?: number;
  }> {
    // Detect architecture
    const arch = process.arch || "unknown";

    // Try to detect CPU model (platform-specific)
    let model: string | undefined;
    let frequency: number | undefined;

    try {
      if (process.platform === "darwin") {
        // macOS: use sysctl
        const result = await Bun.$`sysctl -n machdep.cpu.brand_string`.text();
        model = result.trim();

        const freqResult = await Bun.$`sysctl -n hw.cpufrequency`.text();
        frequency = parseInt(freqResult.trim()) / 1000000; // Convert Hz to GHz
      } else if (process.platform === "linux") {
        // Linux: read from /proc/cpuinfo
        const cpuInfo = await Bun.file("/proc/cpuinfo").text();
        const modelMatch = cpuInfo.match(/model name\s*:\s*(.+)/i);
        if (modelMatch) model = modelMatch[1].trim();

        const freqMatch = cpuInfo.match(/cpu MHz\s*:\s*([\d.]+)/i);
        if (freqMatch) frequency = parseFloat(freqMatch[1]) / 1000; // Convert MHz to GHz
      }
    } catch {
      // Fallback: couldn't detect CPU info
    }

    return {
      architecture: arch,
      model,
      frequency,
    };
  }

  async benchmark(): Promise<{
    throughput: number;
    latency: number;
    efficiency: number;
  }> {
    const testSize = 10 * 1024 * 1024; // 10MB
    const testData = new Uint8Array(testSize);

    // Fill with pseudo-random data
    for (let i = 0; i < testSize; i++) {
      testData[i] = (i * 1103515245 + 12345) & 0xff;
    }

    // Measure throughput
    const start = performance.now();
    Bun.hash.crc32(testData);
    const duration = performance.now() - start;

    const throughput = testSize / (duration / 1000) / (1024 * 1024); // MB/s
    const latency = duration; // ms
    const efficiency = throughput / (navigator.hardwareConcurrency || 4); // MB/s per core

    return {
      throughput: Math.round(throughput * 100) / 100,
      latency: Math.round(latency * 1000) / 1000,
      efficiency: Math.round(efficiency * 100) / 100,
    };
  }

  generateReport(capabilities: HardwareCapabilities): string {
    const report = [
      "🔧 Hardware Capability Report",
      "=".repeat(40),
      "",
      `🧠 SIMD Support: ${capabilities.simd ? "✅ Enabled" : "❌ Disabled"}`,
      `🔒 CRC32 Hardware: ${
        capabilities.crc32 ? "✅ Available" : "❌ Software Only"
      }`,
      `🧵 CPU Threads: ${capabilities.threads}`,
      `💾 Memory: ${(capabilities.memory.total / 1024 / 1024).toFixed(
        1
      )}MB total`,
      `🖥️  Architecture: ${capabilities.cpu.architecture}`,
    ];

    if (capabilities.cpu.model) {
      report.push(`📦 CPU Model: ${capabilities.cpu.model}`);
    }

    if (capabilities.cpu.frequency) {
      report.push(`⚡ Frequency: ${capabilities.cpu.frequency.toFixed(1)}GHz`);
    }

    report.push("", "📊 Performance Recommendations:");

    if (capabilities.simd && capabilities.crc32) {
      report.push("  ✅ Optimal: Use SIMD batch processing");
    } else if (capabilities.crc32) {
      report.push("  ⚠️  Good: Hardware CRC32 available, SIMD limited");
    } else {
      report.push("  🐌 Slow: Software CRC32 only, consider optimization");
    }

    if (capabilities.threads >= 8) {
      report.push("  ✅ High concurrency: Use parallel processing");
    } else if (capabilities.threads >= 4) {
      report.push("  ⚠️  Medium: Moderate parallel processing");
    } else {
      report.push("  🐌 Low: Single-threaded optimization recommended");
    }

    return report.join("\n");
  }
}

// Singleton instance
export const hardwareDetector = new HardwareCapabilityDetector();
