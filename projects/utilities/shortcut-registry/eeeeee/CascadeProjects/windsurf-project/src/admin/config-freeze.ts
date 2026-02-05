// src/admin/config-freeze.ts - Configuration Freeze/Lock System
// Prevents hot reloading and provides configuration locking mechanism

import { join } from "path";

interface FreezeState {
  frozen: boolean;
  timestamp: string;
  reason?: string;
  configHash?: string;
}

export class ConfigFreeze {
  private static readonly FREEZE_FILE = "./.config-freeze.json";
  private static instance: ConfigFreeze;
  private isFrozen: boolean = false;
  private freezeReason?: string;
  private freezeTimestamp?: string;

  private constructor() {
    this.loadFreezeState();
  }

  public static getInstance(): ConfigFreeze {
    if (!ConfigFreeze.instance) {
      ConfigFreeze.instance = new ConfigFreeze();
    }
    return ConfigFreeze.instance;
  }

  /**
   * Load freeze state from file
   */
  private async loadFreezeState(): Promise<void> {
    const file = Bun.file(ConfigFreeze.FREEZE_FILE);
    if (await file.exists()) {
      try {
        const data = await file.text();
        const state: FreezeState = JSON.parse(data);
        this.isFrozen = state.frozen;
        this.freezeReason = state.reason;
        this.freezeTimestamp = state.timestamp;

        if (this.isFrozen) {

          if (state.reason) {

          }
        }
      } catch (error) {

      }
    }
  }

  /**
   * Save freeze state to file
   */
  private async saveFreezeState(reason?: string): Promise<void> {
    const state: FreezeState = {
      frozen: this.isFrozen,
      timestamp: new Date().toISOString(),
      reason: reason || this.freezeReason,
      configHash: await this.getCurrentConfigHash(),
    };

    try {
      await Bun.write(ConfigFreeze.FREEZE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {

    }
  }

  /**
   * Freeze the configuration (prevent hot reloading)
   */
  public async freeze(reason?: string): Promise<void> {
    if (this.isFrozen) {

      return;
    }

    this.isFrozen = true;
    this.freezeReason = reason || "Manual freeze";
    this.freezeTimestamp = new Date().toISOString();
    await this.saveFreezeState();

  }

  /**
   * Unfreeze the configuration (enable hot reloading)
   */
  public async unfreeze(): Promise<void> {
    if (!this.isFrozen) {

      return;
    }

    this.isFrozen = false;
    const previousReason = this.freezeReason;
    this.freezeReason = undefined;
    this.freezeTimestamp = undefined;

    // Remove freeze file
    try {
      const file = Bun.file(ConfigFreeze.FREEZE_FILE);
      if (await file.exists()) {
        const { unlink } = await import("fs/promises");
        await unlink(ConfigFreeze.FREEZE_FILE);
      }
    } catch (error) {

    }

    if (previousReason) {

    }

  }

  /**
   * Check if configuration is frozen
   */
  public isConfigurationFrozen(): boolean {
    return this.isFrozen;
  }

  /**
   * Get freeze status
   */
  public async getFreezeStatus(): Promise<FreezeState | null> {
    if (!this.isFrozen) {
      return null;
    }

    return {
      frozen: this.isFrozen,
      timestamp: new Date().toISOString(),
      reason: this.freezeReason,
      configHash: await this.getCurrentConfigHash(),
    };
  }

  /**
   * Get current configuration hash
   */
  private async getCurrentConfigHash(): Promise<string> {
    const crypto = await import("crypto");
    const envContent = Object.entries(process.env)
      .filter(([key]) => key.startsWith("DUOPLUS_"))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    return crypto.createHash("sha256").update(envContent).digest("hex").substring(0, 8);
  }

  /**
   * Validate configuration changes (prevents changes when frozen)
   */
  public async validateConfigChange(newConfig: any): Promise<{ valid: boolean; reason?: string }> {
    if (!this.isFrozen) {
      return { valid: true };
    }

    const newHash = await this.getConfigHash(newConfig);
    const currentHash = await this.getCurrentConfigHash();

    if (newHash !== currentHash) {
      return {
        valid: false,
        reason: `Configuration is frozen. Cannot change configuration while frozen. Reason: ${this.freezeReason}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get configuration hash for any config object
   */
  private async getConfigHash(config: any): Promise<string> {
    const crypto = await import("crypto");
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash("sha256").update(configString).digest("hex").substring(0, 8);
  }

  /**
   * Generate freeze status HTML for web interface
   */
  public generateFreezeStatusHTML(): string {
    if (!this.isFrozen) {
      return `
        <div class="freeze-status unfrozen">
          <div class="freeze-indicator">🔓 Unfrozen</div>
          <div class="freeze-description">Configuration changes are allowed</div>
          <button class="freeze-btn" onclick="freezeConfig()">
            🔒 Freeze Configuration
          </button>
        </div>
      `;
    }

    const displayTimestamp = this.freezeTimestamp ? new Date(this.freezeTimestamp).toLocaleString() : new Date().toLocaleString();

    return `
      <div class="freeze-status frozen">
        <div class="freeze-indicator">🔒 Frozen</div>
        <div class="freeze-description">
          Configuration is locked (since ${displayTimestamp})
          ${this.freezeReason ? `<br>Reason: ${this.freezeReason}` : ""}
        </div>
        <button class="unfreeze-btn" onclick="unfreezeConfig()">
          🔓 Unfreeze Configuration
        </button>
      </div>
    `;
  }
}

// Export singleton instance
export const configFreeze = ConfigFreeze.getInstance();
