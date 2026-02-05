/**
 * 📱 PHONE MANAGEMENT SYSTEM
 * Implements high-performance phone automation with Bun 1.2+ optimizations.
 */

import { s3 } from "bun";
import { feature } from "bun:bundle";
import { S3Manager } from "../utils/s3-client";
import { SYSTEM_LIMITS } from "../config";

export class PhoneSystem {
  private activePhones = 0;
  private deviceStatus: Map<string, any> = new Map();

  constructor() {
    console.log(`🚀 Phone System Initialized`);
    console.log(`📊 Limits: Max Phones: ${SYSTEM_LIMITS.MAX_PHONES}, Batch Size: ${SYSTEM_LIMITS.BATCH_SIZE}`);
  }

  /**
   * Connect to phone via ADB in real-time interactive terminal
   * Uses "await using" for auto-cleanup of Bun.Terminal
   */
  async debugPhone(deviceId: string) {
    if (!feature("PHONE_AUTO")) {
      console.error("❌ Automation feature not enabled in this build.");
      return;
    }

    console.log(`📱 Entering interactive session for device: ${deviceId}`);
    
    await using terminal = new Bun.Terminal({
      cols: process.stdout.columns,
      rows: process.stdout.rows,
      data(term, data) {
        process.stdout.write(data);
        
        // Auto-capture errors to localized log
        if (data.includes("ERROR") || data.includes("Exception")) {
          Bun.write(`debug-${deviceId}.log`, data, { append: true });
        }
      },
    });
    
    const proc = Bun.spawn(["adb", "-s", deviceId, "shell"], { terminal });
    
    // Resize with window
    process.stdout.on("resize", () => {
      terminal.resize(process.stdout.columns, process.stdout.rows);
    });
    
    // Forward user input
    process.stdin.setRawMode(true);
    const inputReader = async () => {
      for await (const chunk of process.stdin) {
        terminal.write(chunk);
      }
    };
    
    inputReader(); // Run input loop
    
    const result = await proc.exited;
    process.stdin.setRawMode(false);
    return result;
  }

  /**
   * Check if device is connected and responding
   */
  async checkConnection(phoneId: string): Promise<boolean> {
    try {
      const proc = Bun.spawn(["adb", "-s", phoneId, "shell", "getprop", "sys.boot_completed"]);
      const out = await new Response(proc.stdout).text();
      return out.trim() === "1";
    } catch {
      return false;
    }
  }

  /**
   * Capture a screenshot and stream it directly to S3 with retry logic
   */
  async captureScreenshot(phoneId: string, attempts = SYSTEM_LIMITS.RETRY_ATTEMPTS) {
    console.log(`📸 Capturing screenshot for phone: ${phoneId} (Attempts remaining: ${attempts})`);
    
    for (let i = 0; i < attempts; i++) {
      try {
        if (!(await this.checkConnection(phoneId))) {
          throw new Error("Device not responsive");
        }

        const proc = Bun.spawn(["adb", "-s", phoneId, "exec-out", "screencap", "-p"], {
          stdout: "pipe",
        });

        const buffer = await new Response(proc.stdout).arrayBuffer();
        if (buffer.byteLength === 0) throw new Error("Empty screenshot captured");

        const filename = `screenshot-${phoneId}-${Date.now()}.png`;
        
        await S3Manager.uploadSnapshot(filename, Buffer.from(buffer));
        console.log(`✅ Screenshot saved: snapshots/${filename}`);
        return { success: true, filename };
      } catch (e) {
        console.error(`Attempt ${i + 1} failed: ${e instanceof Error ? e.message : e}`);
        if (i < attempts - 1) {
          await Bun.sleep(SYSTEM_LIMITS.RETRY_DELAY_MS);
        }
      }
    }
    
    return { success: false, error: "Max retries reached" };
  }

  /**
   * Install an application to the device with retry logic
   */
  async installApp(phoneId: string, apkPath: string, attempts = SYSTEM_LIMITS.RETRY_ATTEMPTS) {
    console.log(`📦 Installing ${apkPath} to ${phoneId}...`);
    
    for (let i = 0; i < attempts; i++) {
      try {
        const proc = Bun.spawn(["adb", "-s", phoneId, "install", "-r", apkPath]);
        const exitCode = await proc.exited;
        
        if (exitCode === 0) {
          console.log("✅ App installed successfully");
          return true;
        }
        throw new Error(`ADB install failed with code ${exitCode}`);
      } catch (e) {
        console.error(`Installation attempt ${i + 1} failed: ${e instanceof Error ? e.message : e}`);
        if (i < attempts - 1) {
          await Bun.sleep(SYSTEM_LIMITS.RETRY_DELAY_MS);
        }
      }
    }

    return false;
  }

  /**
   * Send text input to the device
   */
  async sendInput(phoneId: string, text: string) {
    console.log(`⌨️ Sending input to ${phoneId}: ${text}`);
    const sanitized = text.replace(/ /g, "%s");
    await Bun.spawn(["adb", "-s", phoneId, "shell", "input", "text", sanitized]).exited;
  }

  /**
   * Stream phone logs directly to S3 with zero-copy/low-memory usage
   */
  async startLogging(phoneId: string) {
    console.log(`📂 Starting memory-efficient logging for Phone: ${phoneId}`);

    await using terminal = new Bun.Terminal({
      async data(term, data) {
        try {
          await s3.write(`phones/${phoneId}/logs.txt.gz`, data, {
            append: true,
            compression: "gzip",
            // @ts-ignore v1.2+ metadata support
            metadata: {
              phoneId,
              timestamp: new Date().toISOString(),
              compliance: "GDPR"
            }
          });
        } catch (e) {
          console.error("Failed to stream log to S3", e);
        }
      }
    });

    const proc = Bun.spawn(["adb", "-s", phoneId, "logcat"], { terminal });
    return proc;
  }

  /**
   * Get current status of all managed devices
   */
  async getDeviceStatuses() {
    try {
      const proc = Bun.spawn(["adb", "devices"]);
      const output = await new Response(proc.stdout).text();
      const lines = output.split("\n").slice(1);
      
      const devices = lines
        .filter(line => line.trim() !== "")
        .map(line => {
          const [id, status] = line.split("\t");
          return { id: id.trim(), status: status.trim() };
        });

      // Update internal status map with extra metrics if possible
      for (const device of devices) {
        if (device.status === "device") {
          const battery = await this.getBatteryLevel(device.id);
          this.deviceStatus.set(device.id, { ...device, battery, lastSeen: Date.now() });
        } else {
          this.deviceStatus.set(device.id, { ...device, lastSeen: Date.now() });
        }
      }

      return Array.from(this.deviceStatus.values());
    } catch (e) {
      console.error("Failed to get device statuses", e);
      return [];
    }
  }

  private async getBatteryLevel(phoneId: string): Promise<number> {
    try {
      const proc = Bun.spawn(["adb", "-s", phoneId, "shell", "dumpsys", "battery", "|", "grep", "level"]);
      const out = await new Response(proc.stdout).text();
      const match = out.match(/level: (\d+)/);
      return match ? parseInt(match[1]) : -1;
    } catch {
      return -1;
    }
  }

  /**
   * Run a batch of commands across multiple devices in parallel
   */
  /**
   * Run a quality gate check on a specific device
   */
  async runQualityGate(phoneId: string) {
    console.log(`🛡️ Running Quality Gate for ${phoneId}...`);
    const checks = [
      { name: "Connection", status: await this.checkConnection(phoneId) },
      { name: "Disk Space", command: "df -h /data | grep /data" },
      { name: "Memory", command: "free -m" },
    ];
    
    const results = [];
    for (const check of checks) {
      if (check.command) {
        const proc = Bun.spawn(["adb", "-s", phoneId, "shell", check.command]);
        const output = await new Response(proc.stdout).text();
        results.push({ name: check.name, success: (await proc.exited) === 0, details: output.trim() });
      } else {
        results.push({ name: check.name, success: check.status });
      }
    }
    return results;
  }

  async runBatch(commands: { deviceId: string; command: string }[]) {
    console.log(`⚡ Processing batch of ${commands.length} tasks (Limit: ${SYSTEM_LIMITS.BATCH_SIZE})...`);
    
    const results = [];
    for (let i = 0; i < commands.length; i += SYSTEM_LIMITS.BATCH_SIZE) {
      const batch = commands.slice(i, i + SYSTEM_LIMITS.BATCH_SIZE);
      const batchPromises = batch.map(async (task) => {
        try {
          console.log(`  [Batch] Executing on ${task.deviceId}: ${task.command}`);
          const proc = Bun.spawn(["adb", "-s", task.deviceId, "shell", task.command]);
          const output = await new Response(proc.stdout).text();
          const exitCode = await proc.exited;
          return { 
            deviceId: task.deviceId, 
            command: task.command, 
            success: exitCode === 0, 
            output: output.trim() 
          };
        } catch (e) {
          return { 
            deviceId: task.deviceId, 
            command: task.command, 
            success: false, 
            error: e instanceof Error ? e.message : String(e) 
          };
        }
      });
      
      results.push(...(await Promise.all(batchPromises)));
    }
    
    return results;
  }
}
