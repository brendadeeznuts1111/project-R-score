// types.ts - Type definitions for Matrix Automation Suite

export interface MatrixProfile {
  env?: Record<string, string>;
  mobile?: {
    package_name?: string;
    main_activity?: string;
    apps?: Array<{
      name: string;
      package: string;
      url?: string;
      configurable?: boolean;
    }>;
    permissions?: string[];
    auto_start?: boolean;
  };
  metadata?: {
    created?: string;
    version?: string;
    description?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow additional properties
}

export interface DeviceLogEntry {
  deviceId: string;
  timestamp: string;
  event: string;
  [key: string]: any;
}

export interface ProvisioningMetadata {
  profile: string;
  configured: boolean;
  configuredAt?: string;
  region?: string;
  androidVersion?: string;
  [key: string]: any;
}
