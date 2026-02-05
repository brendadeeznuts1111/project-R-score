#!/usr/bin/env bun
// Enhanced DuoPlus ADB Command Integration
// Implements comprehensive ADB command support based on DuoPlus documentation

// Define response interface since it doesn't exist in duoplus.ts
export interface DuoPlusCommandResponse {
  success?: boolean;
  output?: string;
  error?: string;
  code?: number;
}

export interface ADBCommandOptions {
  background?: boolean;
  logPath?: string;
}

export interface FileTransferOptions {
  source: string;
  destination: string;
  background?: boolean;
  logProgress?: boolean;
}

export interface AppManagementOptions {
  packageName: string;
  permission?: string;
  force?: boolean;
}

export class EnhancedADBManager {
  private apiKey: string;
  private baseUrl = "https://openapi.duoplus.cn/api/v1/cloudPhone";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Execute any ADB command on a cloud phone
   */
  async executeCommand(
    phoneId: string,
    command: string,
    options: ADBCommandOptions = {}
  ): Promise<DuoPlusCommandResponse> {
    const { background = false } = options;

    // Add background execution suffix if requested
    const finalCommand = background ? `${command} > /dev/null 2>&1 &` : command;

    const response = await fetch(`${this.baseUrl}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DuoPlus-API-Key": this.apiKey
      },
      body: JSON.stringify({
        image_id: phoneId,
        command: finalCommand
      })
    });

    if (!response.ok) {
      throw new Error(`ADB command failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Accessibility Services Management
   */
  async getAccessibilityServices(phoneId: string): Promise<string> {
    const response = await this.executeCommand(
      phoneId,
      "settings get secure enabled_accessibility_services"
    );
    return response.output || "";
  }

  async setAccessibilityServices(phoneId: string, serviceNames: string | string[]): Promise<void> {
    const services = Array.isArray(serviceNames) ? serviceNames.join(":") : serviceNames;
    await this.executeCommand(
      phoneId,
      `settings put secure enabled_accessibility_services ${services}`
    );
  }

  /**
   * File Transfer Operations
   */
  async downloadFromURL(
    phoneId: string,
    url: string,
    destination: string = "/sdcard/",
    options: ADBCommandOptions = {}
  ): Promise<void> {
    const filename = url.split("/").pop() || "download";
    const fullPath = `${destination}${filename}`;

    const command = `wget --no-check-certificate -O ${fullPath} ${url}`;
    await this.executeCommand(phoneId, command, { ...options, background: true });
  }

  async uploadToRelayStation(
    phoneId: string,
    filePath: string,
    options: ADBCommandOptions = {}
  ): Promise<string> {
    const logPath = options.logPath || "/sdcard/upload.log";
    const command = `curl -F "file=@${filePath}" https://temp.sh/upload > ${logPath} 2>&1 &`;

    await this.executeCommand(phoneId, command, { ...options, background: true });

    // Return log path for checking upload progress
    return logPath;
  }

  async getUploadProgress(
    phoneId: string,
    logPath: string = "/sdcard/upload.log"
  ): Promise<string> {
    const response = await this.executeCommand(phoneId, `cat ${logPath}`);
    return response.output || "";
  }

  async captureScreenshot(phoneId: string, filename: string = "screenshot.png"): Promise<void> {
    const command = `screencap -p > /sdcard/${filename}`;
    await this.executeCommand(phoneId, command);
  }

  /**
   * Application Management
   */
  async getInstalledPackages(phoneId: string): Promise<string[]> {
    const response = await this.executeCommand(phoneId, 'pm list packages -3 | cut -d ":" -f 2');

    return response.output ? response.output.split("\n").filter((pkg: string) => pkg.trim()) : [];
  }

  async installApplication(phoneId: string, apkPath: string): Promise<void> {
    const command = `pm install ${apkPath}`;
    await this.executeCommand(phoneId, command);
  }

  async uninstallApplication(phoneId: string, packageName: string): Promise<void> {
    const command = `pm uninstall ${packageName}`;
    await this.executeCommand(phoneId, command);
  }

  async startApplication(phoneId: string, packageName: string): Promise<void> {
    const command = `am start -n $(dumpsys package ${packageName} | grep -A 1 'MAIN' | grep '${packageName}' | sed -n 's/.*\\(${packageName}\\/[^ ]*\\).*/\\1/p')`;
    await this.executeCommand(phoneId, command);
  }

  async stopApplication(phoneId: string, packageName: string): Promise<void> {
    const command = `am force-stop ${packageName}`;
    await this.executeCommand(phoneId, command);
  }

  async clearApplicationData(phoneId: string, packageName: string): Promise<void> {
    const command = `pm clear ${packageName}`;
    await this.executeCommand(phoneId, command);
  }

  async grantPermission(phoneId: string, packageName: string, permission: string): Promise<void> {
    const command = `pm grant ${packageName} android.permission.${permission}`;
    await this.executeCommand(phoneId, command);
  }

  /**
   * System Operations
   */
  async clearSystemLogs(phoneId: string): Promise<void> {
    await this.executeCommand(phoneId, "logcat -c");
  }

  async uploadSystemLogs(phoneId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFile = `/sdcard/system-logs-${timestamp}.txt`;

    // Capture logs to file
    await this.executeCommand(phoneId, `logcat -d > ${logFile}`);
    return logFile;
  }

  /**
   * Simulate Key Presses and Touch Events
   */
  async pressKey(phoneId: string, keyCode: number): Promise<void> {
    const command = `input keyevent ${keyCode}`;
    await this.executeCommand(phoneId, command);
  }

  async tapScreen(phoneId: string, x: number, y: number): Promise<void> {
    const command = `input tap ${x} ${y}`;
    await this.executeCommand(phoneId, command);
  }

  async swipeScreen(
    phoneId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 300
  ): Promise<void> {
    const command = `input swipe ${startX} ${startY} ${endX} ${endY} ${duration}`;
    await this.executeCommand(phoneId, command);
  }

  /**
   * Common Automation Workflows
   */
  async setupAutoJsAccessibility(phoneId: string): Promise<void> {
    const autoJsService =
      "org.autojs.autojs6/org.autojs.autojs.core.accessibility.AccessibilityServiceUsher";
    await this.setAccessibilityServices(phoneId, autoJsService);
  }

  async downloadAndInstallAPK(
    phoneId: string,
    apkUrl: string,
    packageName?: string
  ): Promise<void> {
    // Download APK
    await this.downloadFromURL(phoneId, apkUrl);

    // Get filename from URL
    const filename = apkUrl.split("/").pop() || "app.apk";
    const apkPath = `/sdcard/${filename}`;

    // Install APK
    await this.installApplication(phoneId, apkPath);

    // If packageName provided, grant common permissions
    if (packageName) {
      const commonPermissions = [
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE",
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ];

      for (const permission of commonPermissions) {
        try {
          await this.grantPermission(phoneId, packageName, permission);
        } catch (error) {
          console.warn(`Failed to grant ${permission}:`, error);
        }
      }
    }
  }

  async getDeviceInfo(phoneId: string): Promise<Record<string, string>> {
    const commands = [
      "getprop ro.product.model",
      "getprop ro.product.brand",
      "getprop ro.build.version.release",
      "getprop ro.build.version.sdk",
      "wm size",
      "getprop ro.product.cpu.abi"
    ];

    const results: Record<string, string> = {};

    for (const command of commands) {
      try {
        const response = await this.executeCommand(phoneId, command);
        const key = command.split(" ").pop() || command;
        results[key] = response.output?.trim() || "Unknown";
      } catch (error) {
        console.warn(`Failed to get ${command}:`, error);
      }
    }

    return results;
  }
}

// Export singleton instance
export const enhancedADBManager = new EnhancedADBManager(process.env.DUOPLUS_API_KEY || "");
