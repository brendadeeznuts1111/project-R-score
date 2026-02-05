export interface CRC32Config {
  version: string;
  bufferSize: number;
  hardwareAcceleration: boolean;
  adaptiveThrottle: {
    enabled: boolean;
    maxConcurrency: number;
    backoffMs: number;
  };
  verification: {
    tcp: "strict" | "standard" | "relaxed";
    http: "strict" | "standard" | "relaxed";
    benchmark: "strict" | "standard" | "relaxed";
  };
  features: {
    archiveOutput: boolean;
    websocketProxy: boolean;
    streamingMode: boolean;
  };
  performance: {
    throughputTarget: string;
    maxMemoryUsage: string;
    enableSIMD: boolean;
  };
}
