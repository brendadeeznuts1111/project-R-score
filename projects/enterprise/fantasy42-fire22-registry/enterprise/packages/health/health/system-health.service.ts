/**
 * System Health Service
 * Monitors CPU, memory, disk, and network system resources
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

interface SystemHealthMetrics {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  loadAverage: number[];
  cpuUsage: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  diskUsage: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  }[];
  networkInterfaces: any[];
}

export class SystemHealthService {
  private previousCpuUsage: NodeJS.CpuUsage | null = null;
  private readonly criticalThresholds = {
    cpuUsage: 90, // 90% CPU usage
    memoryUsage: 90, // 90% memory usage
    diskUsage: 90, // 90% disk usage
    loadAverage: os.cpus().length * 2, // 2x CPU count
  };

  private readonly warningThresholds = {
    cpuUsage: 70,
    memoryUsage: 75,
    diskUsage: 75,
    loadAverage: os.cpus().length * 1.5,
  };

  /**
   * Get overall system status
   */
  async getSystemStatus(): Promise<{
    status: string;
    message: string;
    timestamp: string;
  }> {
    try {
      const metrics = await this.getSystemMetrics();

      let status = 'healthy';
      let message = 'All systems operational';

      // Check critical thresholds
      if (metrics.cpuUsage > this.criticalThresholds.cpuUsage) {
        status = 'critical';
        message = `Critical CPU usage: ${metrics.cpuUsage.toFixed(1)}%`;
      } else if (metrics.memoryUsage.usagePercent > this.criticalThresholds.memoryUsage) {
        status = 'critical';
        message = `Critical memory usage: ${metrics.memoryUsage.usagePercent.toFixed(1)}%`;
      } else if (
        metrics.diskUsage.some(disk => disk.usagePercent > this.criticalThresholds.diskUsage)
      ) {
        status = 'critical';
        message = 'Critical disk usage detected';
      } else if (metrics.loadAverage[0] > this.criticalThresholds.loadAverage) {
        status = 'critical';
        message = `Critical load average: ${metrics.loadAverage[0].toFixed(2)}`;
      }
      // Check warning thresholds
      else if (
        metrics.cpuUsage > this.warningThresholds.cpuUsage ||
        metrics.memoryUsage.usagePercent > this.warningThresholds.memoryUsage ||
        metrics.diskUsage.some(disk => disk.usagePercent > this.warningThresholds.diskUsage) ||
        metrics.loadAverage[0] > this.warningThresholds.loadAverage
      ) {
        status = 'degraded';
        message = 'System under elevated load';
      }

      return {
        status,
        message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `System monitoring error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed system health information
   */
  async getDetailedSystemHealth(): Promise<SystemHealthMetrics> {
    const metrics = await this.getSystemMetrics();
    const status = await this.getSystemStatus();

    return {
      ...metrics,
      status: status.status as 'healthy' | 'degraded' | 'critical',
    };
  }

  /**
   * Get CPU health information
   */
  async getCPUHealth(): Promise<{
    status: string;
    usage: number;
    loadAverage: number[];
    cores: number;
    model: string;
    timestamp: string;
  }> {
    try {
      const usage = await this.getCPUUsage();
      const loadAverage = os.loadavg();
      const cores = os.cpus().length;
      const model = os.cpus()[0]?.model || 'Unknown';

      let status = 'healthy';
      if (
        usage > this.criticalThresholds.cpuUsage ||
        loadAverage[0] > this.criticalThresholds.loadAverage
      ) {
        status = 'critical';
      } else if (
        usage > this.warningThresholds.cpuUsage ||
        loadAverage[0] > this.warningThresholds.loadAverage
      ) {
        status = 'degraded';
      }

      return {
        status,
        usage,
        loadAverage,
        cores,
        model,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        usage: 0,
        loadAverage: [0, 0, 0],
        cores: 0,
        model: 'Error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get memory health information
   */
  async getMemoryHealth(): Promise<{
    status: string;
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    timestamp: string;
  }> {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      const usagePercent = (used / total) * 100;

      let status = 'healthy';
      if (usagePercent > this.criticalThresholds.memoryUsage) {
        status = 'critical';
      } else if (usagePercent > this.warningThresholds.memoryUsage) {
        status = 'degraded';
      }

      return {
        status,
        total,
        used,
        free,
        usagePercent,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get disk health information
   */
  async getDiskHealth(): Promise<{
    status: string;
    filesystems: Array<{
      mount: string;
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    }>;
    timestamp: string;
  }> {
    try {
      const filesystems = [];

      // Check common mount points
      const mountPoints = ['/', '/tmp', '/var', '/usr', '/home'];
      let hasCriticalDisk = false;
      let hasWarningDisk = false;

      for (const mountPoint of mountPoints) {
        try {
          const stats = fs.statSync(mountPoint);
          if (stats.isDirectory()) {
            // Note: In a real implementation, you'd use a library like 'diskusage' or 'systeminformation'
            // For now, we'll simulate disk usage
            const simulatedUsage = Math.random() * 100;
            const total = 1000000000; // 1GB simulated
            const used = (total * simulatedUsage) / 100;
            const free = total - used;

            filesystems.push({
              mount: mountPoint,
              total,
              used,
              free,
              usagePercent: simulatedUsage,
            });

            if (simulatedUsage > this.criticalThresholds.diskUsage) {
              hasCriticalDisk = true;
            } else if (simulatedUsage > this.warningThresholds.diskUsage) {
              hasWarningDisk = true;
            }
          }
        } catch (error) {
          // Mount point doesn't exist or isn't accessible
          continue;
        }
      }

      let status = 'healthy';
      if (hasCriticalDisk) {
        status = 'critical';
      } else if (hasWarningDisk) {
        status = 'degraded';
      }

      return {
        status,
        filesystems,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        filesystems: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get network health information
   */
  async getNetworkHealth(): Promise<{
    status: string;
    interfaces: Array<{
      name: string;
      mac: string;
      internal: boolean;
      addresses: string[];
    }>;
    timestamp: string;
  }> {
    try {
      const networkInterfaces = os.networkInterfaces();
      const interfaces = [];

      for (const [name, addresses] of Object.entries(networkInterfaces)) {
        if (addresses && addresses.length > 0) {
          const interfaceInfo = {
            name,
            mac: addresses[0].mac || 'Unknown',
            internal: addresses[0].internal,
            addresses: addresses.map(
              addr => `${addr.address}${addr.family === 'IPv6' ? '' : `:${addr.port || ''}`}`
            ),
          };
          interfaces.push(interfaceInfo);
        }
      }

      return {
        status: 'healthy', // Network interfaces are usually always "healthy" if they exist
        interfaces,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        interfaces: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Private method to get CPU usage
   */
  private async getCPUUsage(): Promise<number> {
    try {
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100)); // Sample for 100ms
      const endUsage = process.cpuUsage(startUsage);

      const totalUsage = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
      const elapsedTime = 100; // 100ms

      return Math.min((totalUsage / elapsedTime) * 100, 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Private method to get all system metrics
   */
  private async getSystemMetrics(): Promise<Omit<SystemHealthMetrics, 'status' | 'timestamp'>> {
    const [cpuUsage, memoryUsage, diskUsage] = await Promise.all([
      this.getCPUUsage(),
      this.getMemoryHealth(),
      this.getDiskHealth(),
    ]);

    return {
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      cpuUsage,
      memoryUsage: {
        total: memoryUsage.total,
        used: memoryUsage.used,
        free: memoryUsage.free,
        usagePercent: memoryUsage.usagePercent,
      },
      diskUsage: diskUsage.filesystems,
      networkInterfaces: Object.entries(os.networkInterfaces()).map(([name, addresses]) => ({
        name,
        addresses: addresses || [],
      })),
    };
  }
}
