import type { CRC32Config } from "../types/crc32-config";

export class CRC32ConfigManager {
  private config: CRC32Config | null = null;
  private configPath = "./config/crc32-worker.config.jsonc";
  private watcher: Bun.FSWatcher | null = null;

  async loadConfig(): Promise<CRC32Config> {
    try {
      const configText = await Bun.file(this.configPath).text();
      this.config = Bun.JSONC.parse(configText) as CRC32Config;

      this.validateConfig(this.config);

      if (this.config.adaptiveThrottle.maxConcurrency === 0) {
        this.config.adaptiveThrottle.maxConcurrency = Math.min(
          4,
          navigator.hardwareConcurrency / 2 || 2
        );
      }

      return this.config;
    } catch (error) {
      console.error("Failed to load CRC32 config:", error);
      return this.getDefaultConfig();
    }
  }

  private validateConfig(config: CRC32Config): void {
    if (config.bufferSize < 1024 || config.bufferSize > 1024 * 1024) {
      throw new Error("bufferSize must be between 1KB and 1MB");
    }

    if (
      config.adaptiveThrottle.maxConcurrency < 1 ||
      config.adaptiveThrottle.maxConcurrency > 16
    ) {
      throw new Error("maxConcurrency must be between 1 and 16");
    }
  }

  private getDefaultConfig(): CRC32Config {
    return {
      version: "1.3.6",
      bufferSize: 65536,
      hardwareAcceleration: true,
      adaptiveThrottle: {
        enabled: true,
        maxConcurrency: Math.min(4, navigator.hardwareConcurrency / 2 || 2),
        backoffMs: 10,
      },
      verification: {
        tcp: "strict",
        http: "standard",
        benchmark: "relaxed",
      },
      features: {
        archiveOutput: true,
        websocketProxy: false,
        streamingMode: true,
      },
      performance: {
        throughputTarget: "50MB/s",
        maxMemoryUsage: "256MB",
        enableSIMD: true,
      },
    };
  }

  watchConfig(): void {
    const BunAny = Bun as unknown as Record<string, unknown>;
    if (typeof Bun !== "undefined" && "watch" in BunAny) {
      this.watcher = BunAny.watch(
        this.configPath,
        (event: string, filename: string) => {
          if (event === "change") {
            console.log(`Config file changed: ${filename}`);
            this.loadConfig().then(() => {
              console.log("CRC32 config reloaded successfully");
            });
          }
        }
      ) as Bun.FSWatcher;
    } else {
      console.log("⚠️ Bun.watch not available - config hot-reload disabled");
    }
  }

  getConfig(): CRC32Config {
    return this.config || this.getDefaultConfig();
  }
}

export const configManager = new CRC32ConfigManager();
