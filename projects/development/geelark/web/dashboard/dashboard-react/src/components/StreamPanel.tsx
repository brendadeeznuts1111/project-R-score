import React, { useState, useEffect } from 'react';
import { HardDrive, ArrowRight, AlertCircle, CheckCircle, Terminal, Activity } from 'lucide-react';

interface StreamStats {
  stdin: {
    size: number;
    available: boolean;
    isTTY: boolean;
  };
  stdout: {
    size: number;
    buffered: number;
  };
  stderr: {
    size: number;
    lastError?: string;
  };
}

interface FileIOMetrics {
  readOperations: number;
  writeOperations: number;
  totalBytesRead: number;
  totalBytesWritten: number;
  avgReadTime: number;
  avgWriteTime: number;
}

export const StreamPanel: React.FC = () => {
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [metrics, setMetrics] = useState<FileIOMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreamData = async () => {
      try {
        const [statsRes, metricsRes] = await Promise.all([
          fetch('/api/streams/stats'),
          fetch('/api/file-io/metrics')
        ]);

        if (statsRes.ok) {
          const streamData = await statsRes.json();
          setStats(streamData);
        }

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
      } catch (error) {
        console.error('Failed to fetch stream data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamData();
    const interval = setInterval(fetchStreamData, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  if (loading) {
    return (
      <div className="stream-panel loading">
        <Activity className="spinner" />
        <p>Loading stream statistics...</p>
      </div>
    );
  }

  return (
    <div className="stream-panel">
      <div className="panel-header">
        <Terminal className="icon" />
        <h2>BunFile Stream Management</h2>
      </div>

      {/* Standard Streams */}
      <div className="streams-grid">
        {/* Stdin */}
        <div className="stream-card stdin">
          <div className="card-header">
            <h3>Standard Input (stdin)</h3>
            {stats?.stdin.available ? (
              <CheckCircle className="status success" />
            ) : (
              <AlertCircle className="status warning" />
            )}
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="label">Buffer Size</span>
              <span className="value">
                {stats ? formatBytes(stats.stdin.size) : '0 B'}
              </span>
            </div>

            <div className="metric">
              <span className="label">TTY Mode</span>
              <span className={`value ${stats?.stdin.isTTY ? 'active' : 'inactive'}`}>
                {stats?.stdin.isTTY ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="metric">
              <span className="label">Status</span>
              <span className={`value ${stats?.stdin.available ? 'active' : 'inactive'}`}>
                {stats?.stdin.available ? 'Available' : 'Empty'}
              </span>
            </div>
          </div>
        </div>

        {/* Stdout */}
        <div className="stream-card stdout">
          <div className="card-header">
            <h3>Standard Output (stdout)</h3>
            <CheckCircle className="status success" />
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="label">Buffer Size</span>
              <span className="value">
                {stats ? formatBytes(stats.stdout.size) : '0 B'}
              </span>
            </div>

            <div className="metric">
              <span className="label">Buffered</span>
              <span className="value">
                {stats ? formatBytes(stats.stdout.buffered) : '0 B'}
              </span>
            </div>

            <div className="metric">
              <span className="label">Status</span>
              <span className="value active">Ready</span>
            </div>
          </div>
        </div>

        {/* Stderr */}
        <div className="stream-card stderr">
          <div className="card-header">
            <h3>Standard Error (stderr)</h3>
            {stats?.stderr.lastError ? (
              <AlertCircle className="status error" />
            ) : (
              <CheckCircle className="status success" />
            )}
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="label">Buffer Size</span>
              <span className="value">
                {stats ? formatBytes(stats.stderr.size) : '0 B'}
              </span>
            </div>

            <div className="metric">
              <span className="label">Status</span>
              <span className={`value ${stats?.stderr.lastError ? 'error' : 'active'}`}>
                {stats?.stderr.lastError || 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* File I/O Metrics */}
      {metrics && (
        <div className="file-io-metrics">
          <div className="section-header">
            <HardDrive className="icon" />
            <h3>File I/O Performance</h3>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <ArrowRight className="icon in" />
                <span>Read Operations</span>
              </div>
              <div className="metric-value">{metrics.readOperations.toLocaleString()}</div>
              <div className="metric-detail">
                {formatBytes(metrics.totalBytesRead)} total
              </div>
              <div className="metric-time">
                Avg: {formatTime(metrics.avgReadTime)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <ArrowRight className="icon out" />
                <span>Write Operations</span>
              </div>
              <div className="metric-value">{metrics.writeOperations.toLocaleString()}</div>
              <div className="metric-detail">
                {formatBytes(metrics.totalBytesWritten)} total
              </div>
              <div className="metric-time">
                Avg: {formatTime(metrics.avgWriteTime)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="stream-config">
        <h3>Stream Configuration</h3>

        <div className="config-section">
          <h4>Input Validation</h4>
          <div className="config-item">
            <label>Max Input Size</label>
            <select id="maxInputSize" name="maxInputSize">
              <option value="1048576">1 MB</option>
              <option value="10485760">10 MB</option>
              <option value="104857600">100 MB</option>
              <option value="1073741824">1 GB</option>
            </select>
          </div>
        </div>

        <div className="config-section">
          <h4>Output Buffering</h4>
          <div className="config-item">
            <label>Buffer Size</label>
            <select id="bufferSize" name="bufferSize">
              <option value="65536">64 KB</option>
              <option value="262144">256 KB</option>
              <option value="1048576">1 MB</option>
              <option value="4194304">4 MB</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamPanel;
