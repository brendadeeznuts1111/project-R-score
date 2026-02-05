// matrix-automation.ts
import { $ } from "bun";
import { secrets } from "bun";
import { DuoPlusSDK } from "../duoplus/sdk.js";
import { DuoPlusCloudPhone } from "../duoplus/config.js";
import { NotificationService } from "./notifications.js";
import { CostTracker } from "./cost-tracker.js";
import type { MatrixProfile, ProvisioningMetadata } from "./types.js";
import { TIMEOUTS, PATHS, DEFAULTS, SERVICE_NAMES } from "./utils/constants.js";

export interface AutomationConfig {
  duoplus: {
    apiKey: string;
    apiEndpoint: string;
    defaultRegion: string;
  };
  matrix: {
    enterpriseId: string;
    gitRemote?: string;
  };
  notifications?: {
    slack?: {
      webhookUrl: string;
      channel?: string;
    };
    teams?: {
      webhookUrl: string;
    };
  };
  costTracking?: {
    enabled: boolean;
    budgetLimit?: number;
    alertThreshold?: number;
  };
}

export interface DeviceProvisionOptions {
  os?: "android" | "ios";
  region?: string;
  profile?: string;
  count?: number;
  androidVersion?: "10" | "11" | "12B";
}

export interface BulkProvisionConfig {
  profile: string;
  count: number;
  region?: string;
  os?: "android" | "ios";
}

export interface PipelineConfig {
  name: string;
  devices: BulkProvisionConfig[];
  test_profile?: string;
  cleanup?: boolean;
  notifications?: {
    slack?: string;
    teams?: string;
  };
}

export class MatrixAutomation {
  private config: AutomationConfig;
  private sdk: DuoPlusSDK;
  private notificationService?: NotificationService;
  private costTracker?: CostTracker;
  private readonly SERVICE_NAME = SERVICE_NAMES.MATRIX;

  constructor(config: AutomationConfig) {
    this.config = config;
    this.sdk = new DuoPlusSDK(config.duoplus.apiKey);
    
    // Initialize notification service if configured
    if (config.notifications) {
      this.notificationService = this.createNotificationService(config.notifications);
    }
    
    // Initialize cost tracker if enabled
    if (config.costTracking?.enabled) {
      this.costTracker = this.createCostTracker(config.costTracking);
    }
  }

  /**
   * Automated DuoPlus Signup & Onboarding
   * Note: Requires manual CAPTCHA completion
   */
  async signupDuoPlus(email: string, password: string, company?: string): Promise<string> {
    console.log(`🚀 Automating DuoPlus signup for ${email}...`);
    
    // Check if playwright is available
    let playwright: any;
    try {
      playwright = await import("playwright");
    } catch {
      throw new Error("playwright not installed. Run: bun add playwright && bunx playwright install chromium");
    }

    const browser = await playwright.chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
      // Navigate to signup
      await page.goto("https://www.duoplus.net/signup");
      
      // Fill registration form
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirm_password"]', password);
      if (company) {
        await page.fill('input[name="company"]', company);
      }
      
      // Handle CAPTCHA (pause for manual input)
      console.log("⏳ Please complete CAPTCHA if present...");
      await page.waitForTimeout(TIMEOUTS.CAPTCHA_WAIT_MS);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for email verification or dashboard
      await page.waitForURL(/verify-email|dashboard/, { timeout: 60000 });
      
      // Extract API key from dashboard
      await page.goto("https://www.duoplus.net/dashboard/api-keys");
      await page.click('button:has-text("Generate New Key")');
      
      const apiKey = await page.inputValue('input[name="api_key"]');
      
      // Store securely in Matrix
      await secrets.set({
        service: this.SERVICE_NAME,
        name: `ent.${this.config.matrix.enterpriseId}:duoplus:api_key`,
        value: apiKey
      });
      
      console.log(`✓ DuoPlus account created and API key stored`);
      
      // Send notification
      await this.notificationService?.send({
        title: "DuoPlus Signup Complete",
        message: `Account created for ${email}`,
        level: "success"
      });
      
      return apiKey;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Signup failed: ${message}`);
      
      await this.notificationService?.send({
        title: "DuoPlus Signup Failed",
        message: `Failed to create account for ${email}: ${message}`,
        level: "error"
      });
      
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Automated Cloud Phone Provisioning
   */
  async provisionDevice(options: DeviceProvisionOptions = {}): Promise<DuoPlusCloudPhone[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("DuoPlus API key not found. Run signup first.");
    }
    
    const region = options.region || this.config.duoplus.defaultRegion || DEFAULTS.REGION;
    const count = options.count || DEFAULTS.DEVICE_COUNT;
    const androidVersion = options.androidVersion || DEFAULTS.ANDROID_VERSION;
    
    console.log(`📱 Provisioning ${count} ${options.os || "android"} device(s) in ${region}...`);
    
    const devices: DuoPlusCloudPhone[] = [];
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < count; i++) {
        // Use existing SDK to provision device
        const device = await this.sdk.phones.create({
          androidVersion,
          region,
          proxy: {
            type: "residential",
            host: "",
            port: 0
          },
          phoneCountry: "US",
          phoneType: "Non-VOIP",
          warmupDays: 0,
          platform: "tiktok",
          autoRenew: false
        });
        
        devices.push(device);
        
        // Store device credentials in Matrix
        const adbConnection = device.connections?.adb || "";
        const [adbHost, adbPort] = adbConnection.split(":");
        
        if (adbHost && adbPort) {
          await secrets.set({
            service: this.SERVICE_NAME,
            name: `ent.${this.config.matrix.enterpriseId}:device:${device.deviceId}:adb_host`,
            value: adbHost
          });
          await secrets.set({
            service: this.SERVICE_NAME,
            name: `ent.${this.config.matrix.enterpriseId}:device:${device.deviceId}:adb_port`,
            value: adbPort
          });
        }
        
        // Track cost
        await this.costTracker?.recordProvisioning({
          deviceId: device.deviceId,
          region,
          androidVersion,
          timestamp: new Date()
        });
        
        console.log(`  ✓ Device ${device.deviceId} created (${adbConnection})`);
        
        // Auto-configure if profile specified
        if (options.profile) {
          await this.configureDevice(device.deviceId, options.profile);
        }
      }
      
      const duration = Date.now() - startTime;
      const totalCost = await this.costTracker?.getEstimatedCost(devices.length, region) || 0;
      
      // Send notification
      await this.notificationService?.send({
        title: "Device Provisioning Complete",
        message: `Provisioned ${devices.length} device(s) in ${region}`,
        details: {
          count: devices.length,
          region,
          duration: `${(duration / 1000).toFixed(1)}s`,
          estimatedCost: `$${totalCost.toFixed(2)}`
        },
        level: "success"
      });
      
      return devices;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Provisioning failed: ${message}`);
      
      await this.notificationService?.send({
        title: "Device Provisioning Failed",
        message: `Failed to provision devices: ${message}`,
        level: "error"
      });
      
      throw error;
    }
  }

  /**
   * Automated Device Configuration
   */
  async configureDevice(deviceId: string, profileName: string): Promise<void> {
    console.log(`⚙️  Configuring ${deviceId} with profile ${profileName}...`);
    
    // Get device connection details
    const adbHost = await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_host`
    });
    const adbPort = await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_port`
    });
    
    if (!adbHost || !adbPort) {
      throw new Error(`Device ${deviceId} connection details not found`);
    }
    
    // Connect ADB
    await $`adb connect ${adbHost}:${adbPort}`.quiet();
    
    // Load Matrix profile
    const profile = await this.loadProfile(profileName);
    
    // Push environment file
    const envContent = Object.entries(profile.env || {})
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    
    await $`adb -s ${adbHost}:${adbPort} shell mkdir -p /data/local/tmp/matrix`.quiet();
    await $`adb -s ${adbHost}:${adbPort} shell "echo '${envContent}' > /data/local/tmp/matrix/.env"`.quiet();
    
    // Install required apps if specified in profile
    if (profile.mobile?.apps) {
      for (const app of profile.mobile.apps) {
        console.log(`  📥 Installing ${app.name}...`);
        
        // Download APK if URL provided
        if (app.url) {
          await $`adb -s ${adbHost}:${adbPort} shell "wget -O /data/local/tmp/${app.package}.apk '${app.url}' > /dev/null 2>&1 &"`.quiet();
          await Bun.sleep(5000); // Wait for download
          await $`adb -s ${adbHost}:${adbPort} install /data/local/tmp/${app.package}.apk`.quiet();
        }
        
        // Configure app with profile env vars
        if (app.configurable) {
          await this.configureApp(adbHost, parseInt(adbPort), app.package, profile.env || {});
        }
      }
    }
    
    // Grant permissions
    if (profile.mobile?.permissions && profile.mobile?.package_name) {
      for (const perm of profile.mobile.permissions) {
        await $`adb -s ${adbHost}:${adbPort} shell pm grant ${profile.mobile.package_name} android.permission.${perm.toUpperCase()}`.quiet();
      }
    }
    
    // Start app if specified
    if (profile.mobile?.auto_start && profile.mobile?.package_name && profile.mobile?.main_activity) {
      await $`adb -s ${adbHost}:${adbPort} shell am start -n ${profile.mobile.package_name}/${profile.mobile.main_activity}`.quiet();
    }
    
    // Update device metadata
    await this.updateDeviceMetadata(deviceId, { profile: profileName, configured: true });
    
    console.log(`  ✓ Device ${deviceId} configured`);
  }

  /**
   * Automated App Configuration via ADB
   */
  private async configureApp(host: string, port: number, packageName: string, env: Record<string, string>): Promise<void> {
    const config = JSON.stringify(env);
    
    // Write config to app data directory
    await $`adb -s ${host}:${port} shell "echo '${config}' > /data/data/${packageName}/shared_prefs/matrix_config.xml"`.quiet();
    
    // Restart app to pick up new config
    await $`adb -s ${host}:${port} shell am force-stop ${packageName}`.quiet();
    await $`adb -s ${host}:${port} shell am start -n ${packageName}/.MainActivity`.quiet();
  }

  /**
   * Automated Verification Code Retrieval
   */
  async getVerificationCode(deviceId: string, service: string, timeout = TIMEOUTS.SMS_DEFAULT_TIMEOUT_MS): Promise<string> {
    console.log(`⏳ Waiting for ${service} verification code on ${deviceId}...`);
    
    const adbHost = await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_host`
    });
    const adbPort = await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_port`
    });
    
    if (!adbHost || !adbPort) {
      throw new Error(`Device ${deviceId} connection details not found`);
    }
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check SMS inbox
      const smsList = await $`adb -s ${adbHost}:${adbPort} shell content query --uri content://sms/inbox --projection body`.text().catch(() => "");
      
      // Parse for verification codes (common patterns)
      const patterns = [
        /(\d{6})/, // 6-digit code
        /code[:\s]+(\d+)/i,
        /verification[:\s]+(\d+)/i,
        new RegExp(`${service}.*?(\\d{4,8})`, "i")
      ];
      
      for (const pattern of patterns) {
        const match = smsList.match(pattern);
        if (match) {
          console.log(`  ✓ Found code: ${match[1]}`);
          return match[1];
        }
      }
      
      // Check notifications if no SMS
      const notifications = await $`adb -s ${adbHost}:${adbPort} shell dumpsys notification`.text().catch(() => "");
      for (const pattern of patterns) {
        const match = notifications.match(pattern);
        if (match) {
          console.log(`  ✓ Found code in notification: ${match[1]}`);
          return match[1];
        }
      }
      
      await Bun.sleep(TIMEOUTS.SMS_POLL_INTERVAL_MS); // Poll every 2s
    }
    
    throw new Error(`Timeout waiting for ${service} verification code`);
  }

  /**
   * Bulk Operations
   */
  async bulkProvision(configs: BulkProvisionConfig[]): Promise<Array<{ profile: string; devices: DuoPlusCloudPhone[] }>> {
    const totalCount = configs.reduce((a, c) => a + c.count, 0);
    console.log(`🚀 Bulk provisioning ${totalCount} devices...`);
    
    const results: Array<{ profile: string; devices: DuoPlusCloudPhone[] }> = [];
    let totalCost = 0;
    
    for (const config of configs) {
      const devices = await this.provisionDevice({
        profile: config.profile,
        region: config.region,
        count: config.count,
        os: config.os
      });
      results.push({ profile: config.profile, devices });
      
      // Calculate cost
      const cost = await this.costTracker?.getEstimatedCost(config.count, config.region || this.config.duoplus.defaultRegion) || 0;
      totalCost += cost;
    }
    
    // Generate report
    console.log("\n📊 Provisioning Report:");
    const reportData = results.map(r => ({
      profile: r.profile,
      count: r.devices.length,
      ids: r.devices.map((d) => d.deviceId).join(", ")
    }));
    console.log(Bun.inspect.table(reportData, undefined, { colors: true }));
    
    // Send notification with cost summary
    await this.notificationService?.send({
      title: "Bulk Provisioning Complete",
      message: `Provisioned ${totalCount} devices across ${configs.length} profiles`,
      details: {
        totalDevices: totalCount,
        profiles: configs.length,
        estimatedCost: `$${totalCost.toFixed(2)}`
      },
      level: "success"
    });
    
    // Check budget limits
    if (this.config.costTracking?.budgetLimit && totalCost > this.config.costTracking.budgetLimit) {
      await this.notificationService?.send({
        title: "⚠️ Budget Exceeded",
        message: `Total cost ($${totalCost.toFixed(2)}) exceeds budget limit ($${this.config.costTracking.budgetLimit})`,
        level: "warning"
      });
    }
    
    return results;
  }

  /**
   * Automated Testing Workflow
   */
  async runTestSuite(deviceId: string, testProfile: string): Promise<{
    passed: boolean;
    failures: number;
    screenshot?: string;
  }> {
    console.log(`🧪 Running test suite on ${deviceId}...`);
    
    // Configure with test profile
    await this.configureDevice(deviceId, testProfile);
    
    // Get device connection details
    const adbHost = await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_host`
    });
    const adbPort = await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_port`
    });
    
    if (!adbHost || !adbPort) {
      throw new Error(`Device ${deviceId} connection details not found`);
    }
    
    // Execute test runner
    const result = await $`adb -s ${adbHost}:${adbPort} shell am instrument -w com.example.test/androidx.test.runner.AndroidJUnitRunner`.text().catch(() => "");
    
    // Parse results
    const passed = result.includes("OK (");
    const failed = result.match(/Failures: (\d+)/)?.[1] || "0";
    const failures = parseInt(failed);
    
    console.log(`  ${passed ? "✓" : "✗"} Tests completed (${failures} failures)`);
    
    // Capture screenshot of results
    const screenshotPath = `/tmp/test-result-${deviceId}.png`;
    await $`adb -s ${adbHost}:${adbPort} exec-out screencap -p > ${screenshotPath}`.quiet().catch(() => {});
    
    // Send notification
    await this.notificationService?.send({
      title: `Test Suite ${passed ? "Passed" : "Failed"}`,
      message: `Device ${deviceId}: ${failures} failure(s)`,
      level: passed ? "success" : "error"
    });
    
    return { passed: failures === 0, failures, screenshot: screenshotPath };
  }

  /**
   * Cleanup & Decommission
   */
  async decommissionDevice(deviceId: string): Promise<void> {
    console.log(`🗑️  Decommissioning ${deviceId}...`);
    
    try {
      // Remove from DuoPlus
      await this.sdk.phones.delete(deviceId);
      
      // Clear Matrix secrets
      await secrets.delete({
        service: this.SERVICE_NAME,
        name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_host`
      }).catch(() => null);
      await secrets.delete({
        service: this.SERVICE_NAME,
        name: `ent.${this.config.matrix.enterpriseId}:device:${deviceId}:adb_port`
      }).catch(() => null);
      
      // Record decommissioning cost (negative)
      await this.costTracker?.recordDecommissioning(deviceId);
      
      console.log(`  ✓ Device ${deviceId} decommissioned`);
      
      await this.notificationService?.send({
        title: "Device Decommissioned",
        message: `Device ${deviceId} has been removed`,
        level: "info"
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Decommissioning failed: ${message}`);
      throw error;
    }
  }

  /**
   * Full automation pipeline
   */
  async runPipeline(pipeline: PipelineConfig): Promise<{
    devices: Array<{ profile: string; devices: DuoPlusCloudPhone[] }>;
    testResults: Array<{ device: string; passed: boolean; failures: number }>;
    totalCost: number;
  }> {
    console.log(`🚀 Starting pipeline: ${pipeline.name}`);
    
    // 1. Provision devices
    const devices = await this.bulkProvision(pipeline.devices);
    
    // 2. Run tests on each device if test profile specified
    const testResults: Array<{ device: string; passed: boolean; failures: number }> = [];
    if (pipeline.test_profile) {
      for (const group of devices) {
        for (const device of group.devices) {
          const result = await this.runTestSuite(device.deviceId, pipeline.test_profile);
          testResults.push({ device: device.deviceId, ...result });
        }
      }
    }
    
    // 3. Calculate total cost
    const totalCost = await this.costTracker?.getTotalCost() || 0;
    
    // 4. Report
    console.log("\n📊 Pipeline Results:");
    const resultsData = testResults.map(r => ({
      device: r.device,
      passed: r.passed ? "✓" : "✗",
      failures: r.failures
    }));
    console.log(Bun.inspect.table(resultsData, undefined, { colors: true }));
    
    // 5. Cleanup if configured
    if (pipeline.cleanup) {
      console.log("\n🧹 Cleaning up devices...");
      for (const group of devices) {
        for (const device of group.devices) {
          await this.decommissionDevice(device.deviceId);
        }
      }
    }
    
    // Send final notification
    await this.notificationService?.send({
      title: `Pipeline Complete: ${pipeline.name}`,
      message: `Processed ${devices.reduce((a, g) => a + g.devices.length, 0)} devices`,
      details: {
        totalDevices: devices.reduce((a, g) => a + g.devices.length, 0),
        testResults: `${testResults.filter(r => r.passed).length}/${testResults.length} passed`,
        totalCost: `$${totalCost.toFixed(2)}`
      },
      level: "success"
    });
    
    return { devices, testResults, totalCost };
  }

  /**
   * Get cost report
   */
  async getCostReport(period: "day" | "week" | "month" = "month"): Promise<{
    total: number;
    byRegion: Record<string, number>;
    byProfile: Record<string, number>;
    breakdown: Array<{ deviceId: string; cost: number; region: string; timestamp: Date }>;
  }> {
    if (!this.costTracker) {
      throw new Error("Cost tracking is not enabled");
    }
    
    return await this.costTracker.getReport(period);
  }

  // Helpers
  private async getApiKey(): Promise<string | null> {
    return await secrets.get({
      service: this.SERVICE_NAME,
      name: `ent.${this.config.matrix.enterpriseId}:duoplus:api_key`
    });
  }

  private async loadProfile(name: string): Promise<MatrixProfile> {
    // Try JSON5 first (Bun v1.3.7+), fallback to JSON
    const json5Path = `${PATHS.PROFILES_DIR}/${name}.json5`;
    const jsonPath = `${PATHS.PROFILES_DIR}/${name}.json`;
    
    const json5File = Bun.file(json5Path);
    const jsonFile = Bun.file(jsonPath);
    
    if (await json5File.exists()) {
      // Use Bun.JSON5.parse() for JSON5 files (supports comments, trailing commas)
      const text = await json5File.text();
      return Bun.JSON5.parse(text) as MatrixProfile;
    }
    
    if (await jsonFile.exists()) {
      return await jsonFile.json() as MatrixProfile;
    }
    
    throw new Error(`Profile ${name} not found at ${json5Path} or ${jsonPath}`);
  }

  private async updateDeviceMetadata(deviceId: string, metadata: ProvisioningMetadata): Promise<void> {
    // Store in local SQLite or API
    const dbPath = `${process.env.HOME}/.matrix/devices.db`;
    
    // Log to JSONL file (Bun v1.3.7+)
    const logPath = PATHS.DEVICE_LOGS;
    const logEntry = {
      deviceId,
      timestamp: new Date().toISOString(),
      event: "metadata_updated",
      metadata
    };
    
    const file = Bun.file(logPath);
    const existing = await file.exists() ? await file.text() : "";
    const line = JSON.stringify(logEntry) + "\n";
    await Bun.write(logPath, existing + line);
    
    console.log(`  📝 Metadata for ${deviceId}:`, JSON.stringify(metadata));
  }

  private createNotificationService(config: NonNullable<AutomationConfig["notifications"]>): NotificationService {
    return new NotificationService(config);
  }

  private createCostTracker(config: NonNullable<AutomationConfig["costTracking"]>): CostTracker {
    return new CostTracker({
      enterpriseId: this.config.matrix.enterpriseId,
      serviceName: this.SERVICE_NAME,
      budgetLimit: config.budgetLimit,
      alertThreshold: config.alertThreshold
    });
  }
}
