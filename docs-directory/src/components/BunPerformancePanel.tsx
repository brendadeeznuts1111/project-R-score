import { Cpu, HardDrive, Clock, Zap, Database, Globe, Shield, Wifi } from 'lucide-react';
import { useBunPerformance } from '../hooks/useBunPerformance';

export default function BunPerformancePanel() {
  const { metrics, isLoading, formatBytes, formatCpuTime, formatUptime } = useBunPerformance();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Cpu className="w-5 h-5 text-cloudflare-orange animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bun Performance</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Cpu className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bun Performance</h3>
        </div>
        <p className="text-red-500 dark:text-red-400">Unable to load Bun performance metrics</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cloudflare-orange" />
          <span>Bun Performance</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-500 font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Memory Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <HardDrive className="w-4 h-4" />
              <span>Memory Usage</span>
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(metrics.memoryUsage.heapUsed)} / {formatBytes(metrics.memoryUsage.heapTotal)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <div>RSS: {formatBytes(metrics.memoryUsage.rss)}</div>
            <div>External: {formatBytes(metrics.memoryUsage.external)}</div>
          </div>
        </div>

        {/* CPU Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <Cpu className="w-4 h-4" />
              <span>CPU Time</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>User: {formatCpuTime(metrics.cpuUsage.user)}</div>
            <div>System: {formatCpuTime(metrics.cpuUsage.system)}</div>
          </div>
        </div>

        {/* System Info */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>System Info</span>
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Bun Version:</span>
              <span className="font-mono">{metrics.bunVersion}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform:</span>
              <span className="font-mono">{metrics.platform}</span>
            </div>
            <div className="flex justify-between">
              <span>Architecture:</span>
              <span className="font-mono">{metrics.arch}</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span>{formatUptime(metrics.uptime)}</span>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Optimization Tips</span>
          </div>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Memory usage is optimal</li>
            <li>• CPU performance is efficient</li>
            <li>• Consider enabling Bun's --smol flag for lower memory usage</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
