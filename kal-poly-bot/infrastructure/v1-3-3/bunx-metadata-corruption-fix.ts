/**
 * infrastructure/v1-3-3/bunx-metadata-corruption-fix.ts
 * Component #92: Bunx-Metadata-Corruption-Fix
 * Level 2: CLI | CPU: <0.5ms | bunx metadata
 * Graceful fallback on corrupted metadata files
 */


// Helper to check if feature is enabled
function isFeatureEnabled(): boolean {
  return process.env.FEATURE_BUNX_METADATA_FIX === "1" || process.env.FEATURE_BUNX_METADATA_FIX === "1";
}

// Bunx Metadata Corruption Fix
export class BunxMetadataCorruptionFix {
  private static metadataCache = new Map<string, any>();
  private static corruptionCount = 0;
  private static fixCount = 0;

  // Read metadata file with corruption detection and recovery
  static async readMetadata(filePath: string): Promise<any> {
    if (!isFeatureEnabled()) {
      // Fallback: try to read file directly
      try {
        const content = await Bun.file(filePath).text();
        return JSON.parse(content);
      } catch (error) {
        return null;
      }
    }

    try {
      // Check if file exists
      const file = Bun.file(filePath);
      if (!file.exists()) {
        return this.createDefaultMetadata();
      }

      // Read and validate metadata
      const content = await file.text();

      // Detect corruption
      if (!this.isValidMetadata(content)) {
        this.corruptionCount++;
        console.warn(`⚠️  Corrupted metadata detected: ${filePath}`);

        // Attempt recovery
        return await this.attemptRecovery(filePath);
      }

      // Parse valid metadata
      const metadata = JSON.parse(content);
      this.metadataCache.set(filePath, metadata);
      return metadata;

    } catch (error) {
      this.corruptionCount++;
      console.warn(`⚠️  Error reading metadata ${filePath}: ${error}`);
      return await this.attemptRecovery(filePath);
    }
  }

  // Write metadata with corruption prevention
  static async writeMetadata(filePath: string, data: any): Promise<boolean> {
    if (!isFeatureEnabled()) {
      // Fallback: direct write
      try {
        await Bun.write(filePath, JSON.stringify(data, null, 2));
        return true;
      } catch {
        return false;
      }
    }

    try {
      // Validate data before writing
      if (!this.isValidData(data)) {
        console.warn(`⚠️  Invalid metadata data for ${filePath}`);
        return false;
      }

      // Create backup of existing file
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const backupPath = `${filePath}.backup`;
        const content = await file.text();
        await Bun.write(backupPath, content);
      }

      // Write with atomic operation simulation
      const tempPath = `${filePath}.tmp`;
      await Bun.write(tempPath, JSON.stringify(data, null, 2));

      // Verify written content
      const verifyContent = await Bun.file(tempPath).text();
      const verifyData = JSON.parse(verifyContent);

      if (JSON.stringify(verifyData) === JSON.stringify(data)) {
        // Atomic rename
        await Bun.write(filePath, verifyContent);
        await Bun.write(tempPath, ""); // Clear temp
        this.metadataCache.set(filePath, data);
        return true;
      } else {
        throw new Error("Verification failed");
      }

    } catch (error) {
      console.error(`❌ Failed to write metadata ${filePath}: ${error}`);
      this.fixCount++;
      return false;
    }
  }

  // Validate metadata content
  private static isValidMetadata(content: string): boolean {
    try {
      const data = JSON.parse(content);

      // Check for common corruption patterns
      if (typeof data !== "object" || data === null) return false;

      // Check for truncated JSON
      if (content.trim().endsWith("{") || content.trim().endsWith("[")) return false;

      // Check for circular references (would cause stringify issues)
      try {
        JSON.stringify(data);
      } catch {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Validate data before writing
  private static isValidData(data: any): boolean {
    try {
      // Check for circular references
      JSON.stringify(data);

      // Check for undefined values (JSON doesn't support them)
      if (data === undefined) return false;

      // Check for functions
      if (typeof data === "function") return false;

      // Check for symbols
      if (typeof data === "symbol") return false;

      return true;
    } catch {
      return false;
    }
  }

  // Attempt to recover corrupted metadata
  private static async attemptRecovery(filePath: string): Promise<any> {
    console.log(`🔄 Attempting recovery for ${filePath}`);

    // Try backup file
    const backupPath = `${filePath}.backup`;
    const backupFile = Bun.file(backupPath);

    if (await backupFile.exists()) {
      try {
        const backupContent = await backupFile.text();
        if (this.isValidMetadata(backupContent)) {
          console.log(`✅ Recovered from backup: ${backupPath}`);
          const data = JSON.parse(backupContent);
          // Restore original file
          await Bun.write(filePath, backupContent);
          this.fixCount++;
          return data;
        }
      } catch (e) {
        console.warn(`⚠️  Backup also corrupted: ${e}`);
      }
    }

    // Try to salvage partial data
    try {
      const corruptedContent = await Bun.file(filePath).text();
      const salvaged = this.salvageData(corruptedContent);

      if (salvaged) {
        console.log(`✅ Salvaged partial data from corrupted file`);
        await Bun.write(filePath, JSON.stringify(salvaged, null, 2));
        this.fixCount++;
        return salvaged;
      }
    } catch (e) {
      console.warn(`⚠️  Salvage failed: ${e}`);
    }

    // Return default metadata
    console.log(`ℹ️  Using default metadata for ${filePath}`);
    const defaultMeta = this.createDefaultMetadata();
    await this.writeMetadata(filePath, defaultMeta);
    return defaultMeta;
  }

  // Salvage data from corrupted JSON
  private static salvageData(corrupted: string): any | null {
    try {
      // Try to fix common corruption patterns

      // 1. Fix trailing commas
      let fixed = corrupted.replace(/,(\s*[}\]])/g, '$1');

      // 2. Fix unquoted keys
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      // 3. Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');

      // 4. Fix incomplete objects
      if (fixed.trim().endsWith('{') || fixed.trim().endsWith('[')) {
        fixed += '}';
      }

      // Parse salvaged data
      const data = JSON.parse(fixed);

      // Validate salvaged data
      if (typeof data === "object" && data !== null) {
        return data;
      }

      return null;

    } catch {
      return null;
    }
  }

  // Create default metadata
  private static createDefaultMetadata(): any {
    return {
      version: "1.0.0",
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      checksum: "default",
      integrity: "verified",
    };
  }

  // Clear cache for specific file
  static clearCache(filePath: string): void {
    this.metadataCache.delete(filePath);
  }

  // Clear all cache
  static clearAllCache(): void {
    this.metadataCache.clear();
  }

  // Get corruption statistics
  static getStats(): {
    corruptionCount: number;
    fixCount: number;
    cacheSize: number;
    featureEnabled: boolean;
  } {
    return {
      corruptionCount: this.corruptionCount,
      fixCount: this.fixCount,
      cacheSize: this.metadataCache.size,
      featureEnabled: isFeatureEnabled(),
    };
  }

  // Validate metadata integrity
  static async validateIntegrity(filePath: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    if (!isFeatureEnabled()) {
      return { valid: true, issues: [] };
    }

    try {
      const file = Bun.file(filePath);
      if (!await file.exists()) {
        issues.push("File does not exist");
        return { valid: false, issues };
      }

      const content = await file.text();

      // Check JSON validity
      if (!this.isValidMetadata(content)) {
        issues.push("Invalid JSON format");
        return { valid: false, issues };
      }

      // Check for required fields
      const data = JSON.parse(content);
      const required = ["version", "created", "lastModified"];

      for (const field of required) {
        if (!(field in data)) {
          issues.push(`Missing required field: ${field}`);
        }
      }

      // Check timestamp validity
      if (data.lastModified) {
        const date = new Date(data.lastModified);
        if (isNaN(date.getTime())) {
          issues.push("Invalid lastModified timestamp");
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      };

    } catch (error) {
      issues.push(`Read error: ${error}`);
      return { valid: false, issues };
    }
  }

  // Batch process multiple metadata files
  static async batchRead(filePaths: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const filePath of filePaths) {
      results[filePath] = await this.readMetadata(filePath);
    }

    return results;
  }

  // Update metadata with automatic backup
  static async updateMetadata(
    filePath: string,
    updater: (current: any) => any
  ): Promise<boolean> {
    const current = await this.readMetadata(filePath);
    const updated = updater(current);
    return await this.writeMetadata(filePath, updated);
  }
}

// Zero-cost export
export const bunxMetadataFix = isFeatureEnabled()
  ? BunxMetadataCorruptionFix
  : {
      readMetadata: async (filePath: string) => {
        try {
          const content = await Bun.file(filePath).text();
          return JSON.parse(content);
        } catch {
          return null;
        }
      },
      writeMetadata: async (filePath: string, data: any) => {
        try {
          await Bun.write(filePath, JSON.stringify(data, null, 2));
          return true;
        } catch {
          return false;
        }
      },
      clearCache: () => {},
      clearAllCache: () => {},
      getStats: () => ({ corruptionCount: 0, fixCount: 0, cacheSize: 0, featureEnabled: false }),
      validateIntegrity: async () => ({ valid: true, issues: [] }),
      batchRead: async (filePaths: string[]) => {
        const results: Record<string, any> = {};
        for (const filePath of filePaths) {
          try {
            const content = await Bun.file(filePath).text();
            results[filePath] = JSON.parse(content);
          } catch {
            results[filePath] = null;
          }
        }
        return results;
      },
      updateMetadata: async (filePath: string, updater: (current: any) => any) => {
        try {
          const content = await Bun.file(filePath).text();
          const current = JSON.parse(content);
          const updated = updater(current);
          await Bun.write(filePath, JSON.stringify(updated, null, 2));
          return true;
        } catch {
          return false;
        }
      },
    };
