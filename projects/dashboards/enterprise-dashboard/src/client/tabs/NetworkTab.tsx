import { useState, useEffect } from 'react';
import { showGlobalToast } from '../hooks/useToast';

interface DNSStats {
  cacheHitsCompleted: number;
  cacheHitsInflight: number;
  cacheMisses: number;
  size: number;
  errors: number;
  totalCount: number;
}

interface ConnectionPool {
  activeConnections: number;
  pendingRequests: number;
  maxConnections: number;
  queuedRequests: number;
}

interface NetworkHistoryPoint {
  timestamp: number;
  hitRatio: number;
  activeConnections: number;
  latency: number;
}

export const NetworkTab: React.FC = () => {
  const [dnsStats, setDnsStats] = useState<DNSStats>({
    cacheHitsCompleted: 0,
    cacheHitsInflight: 0,
    cacheMisses: 0,
    size: 0,
    errors: 0,
    totalCount: 0
  });

  const [connectionPool, setConnectionPool] = useState<ConnectionPool>({
    activeConnections: 0,
    pendingRequests: 0,
    maxConnections: 256,
    queuedRequests: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(true);
  const [networkHistory, setNetworkHistory] = useState<NetworkHistoryPoint[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [customHost, setCustomHost] = useState('');
  const [latencyTest, setLatencyTest] = useState<{ running: boolean; results: Array<{ host: string; latency: number; dnsTime?: number; connectTime?: number }> }>({
    running: false,
    results: []
  });

  const [metrics, setMetrics] = useState({
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    throughput: 0
  });

  const [startupOptimizations, setStartupOptimizations] = useState<{
    applied: boolean;
    timestamp: string | null;
    preconnectedHosts: string[];
    prefetchedHosts: string[];
    hostMatrix?: Array<{
      id: string;
      label: string;
      url: string;
      status: 'connected' | 'prefetched' | 'failed' | 'unconfigured';
      color: { hex: string; hsl: string };
    }>;
    errors: string[];
    platform: string;
    method: 'cli' | 'programmatic';
    config?: { dnsTtl: number; maxHttpRequests: number };
  } | null>(null);

  const hitRatio = dnsStats.totalCount > 0
    ? ((dnsStats.cacheHitsCompleted + dnsStats.cacheHitsInflight) / dnsStats.totalCount * 100).toFixed(1)
    : '0.0';

  // Fetch network stats on interval
  useEffect(() => {
    if (!isMonitoring) return;

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/network/stats');
        const data = await response.json();

        if (data.data) {
          // Map the API response to our state format
          const dns = data.data.dns;
          setDnsStats({
            cacheHitsCompleted: dns.hits?.completed ?? 0,
            cacheHitsInflight: dns.hits?.inflight ?? 0,
            cacheMisses: dns.misses ?? 0,
            size: dns.cache?.size ?? 0,
            errors: dns.errors ?? 0,
            totalCount: (dns.hits?.total ?? 0) + (dns.misses ?? 0)
          });

          setConnectionPool({
            activeConnections: 0, // Not tracked by Bun directly
            pendingRequests: 0,
            maxConnections: data.data.connectionPool?.maxHttpRequests ?? 256,
            queuedRequests: 0
          });

          // Update history for charts
          const now = Date.now();
          const currentHitRatio = dns.hitRatio ?? 0;

          setNetworkHistory(prev => [...prev.slice(-59), {
            timestamp: now,
            hitRatio: currentHitRatio,
            activeConnections: 0,
            latency: 0
          }]);
        }
      } catch (error) {
        console.error('Failed to fetch network stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Fetch startup optimizations on mount
  useEffect(() => {
    const fetchOptimizations = async () => {
      try {
        const response = await fetch('/api/network/optimizations');
        const data = await response.json();
        if (data.data) {
          setStartupOptimizations(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch startup optimizations:', error);
      }
    };
    fetchOptimizations();
  }, []);

  // Calculate metrics from history
  useEffect(() => {
    if (networkHistory.length === 0) return;

    const latencies = networkHistory.map(h => h.latency).filter(l => l > 0);
    if (latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      setMetrics({
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95Latency: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99Latency: sorted[Math.floor(sorted.length * 0.99)] || 0,
        throughput: dnsStats.totalCount / 60
      });
    }
  }, [networkHistory, dnsStats.totalCount]);

  // Prefetch handler
  const handlePrefetch = async () => {
    const hosts = [
      ...selectedHosts,
      ...(customHost ? customHost.split(',').map(h => h.trim()).filter(Boolean) : [])
    ];

    if (hosts.length === 0) {
      showGlobalToast('Please select or enter hosts to prefetch', 'info');
      return;
    }

    try {
      const results = await Promise.allSettled(
        hosts.map(host =>
          fetch('/api/network/prefetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port: 443 })
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      showGlobalToast(
        `Prefetched ${successful} of ${hosts.length} hosts`,
        successful === hosts.length ? 'success' : 'info'
      );
      setCustomHost('');
    } catch (error) {
      showGlobalToast('Failed to prefetch hosts', 'error');
    }
  };

  // Latency test
  const runLatencyTest = async () => {
    setLatencyTest({ running: true, results: [] });
    const testHosts = ['bun.sh', 'github.com', 'google.com', 'cloudflare.com'];
    const results: Array<{ host: string; latency: number; dnsTime?: number; connectTime?: number }> = [];

    for (const host of testHosts) {
      try {
        const res = await fetch(`/api/network/latency-test?host=${encodeURIComponent(host)}`);
        const data = await res.json();
        if (data.data) {
          results.push({
            host,
            latency: data.data.totalTime,
            dnsTime: data.data.dnsTime,
            connectTime: data.data.connectTime,
          });
        } else {
          results.push({ host, latency: -1 });
        }
      } catch {
        results.push({ host, latency: -1 });
      }
    }

    setLatencyTest({ running: false, results });
  };

  const commonHosts = ['bun.sh', 'github.com', 'google.com', 'registry.npmjs.org', 'api.github.com'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Network Performance</h2>
          <p className="text-sm text-theme-secondary">DNS cache and connection monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isMonitoring
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-gray-500/10 border border-gray-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className={`text-xs font-medium ${isMonitoring ? 'text-green-500' : 'text-gray-500'}`}>
              {isMonitoring ? 'Live' : 'Paused'}
            </span>
          </div>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isMonitoring
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DNS Cache Stats */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            DNS Cache
            <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
              parseFloat(hitRatio) >= 90 ? 'bg-green-500/20 text-green-500' :
              parseFloat(hitRatio) >= 70 ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-red-500/20 text-red-500'
            }`}>
              {parseFloat(hitRatio) >= 90 ? 'Optimal' : parseFloat(hitRatio) >= 70 ? 'Good' : 'Low'}
            </span>
          </h3>

          {/* Hit Ratio */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-theme-secondary">Hit Ratio</span>
              <span className={`font-mono font-semibold ${
                parseFloat(hitRatio) >= 90 ? 'text-green-500' :
                parseFloat(hitRatio) >= 70 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {hitRatio}%
              </span>
            </div>
            <div className="w-full h-3 bg-theme-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  parseFloat(hitRatio) >= 90 ? 'bg-green-500' :
                  parseFloat(hitRatio) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(parseFloat(hitRatio), 100)}%` }}
              />
            </div>
          </div>

          {/* Cache Size */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-theme-secondary">Cache Utilization</span>
              <span className="font-mono">{dnsStats.size}/255</span>
            </div>
            <div className="w-full h-3 bg-theme-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  (dnsStats.size / 255) >= 0.9 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(dnsStats.size / 255) * 100}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-theme-tertiary rounded-lg p-3">
              <div className="text-xs text-theme-secondary">Hits</div>
              <div className="text-lg font-mono font-semibold text-green-500">
                {dnsStats.cacheHitsCompleted.toLocaleString()}
              </div>
            </div>
            <div className="bg-theme-tertiary rounded-lg p-3">
              <div className="text-xs text-theme-secondary">In-flight</div>
              <div className="text-lg font-mono font-semibold text-blue-500">
                {dnsStats.cacheHitsInflight.toLocaleString()}
              </div>
            </div>
            <div className="bg-theme-tertiary rounded-lg p-3">
              <div className="text-xs text-theme-secondary">Misses</div>
              <div className="text-lg font-mono font-semibold text-yellow-500">
                {dnsStats.cacheMisses.toLocaleString()}
              </div>
            </div>
            <div className="bg-theme-tertiary rounded-lg p-3">
              <div className="text-xs text-theme-secondary">Errors</div>
              <div className={`text-lg font-mono font-semibold ${
                dnsStats.errors > 0 ? 'text-red-500' : 'text-theme-secondary'
              }`}>
                {dnsStats.errors.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Pool Stats */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connection Pool
          </h3>

          <div className="mb-4 p-4 bg-theme-tertiary rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-secondary">Max HTTP Requests</span>
              <span className="font-mono font-semibold text-xl">
                {connectionPool.maxConnections.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-theme-secondary mt-1">
              BUN_CONFIG_MAX_HTTP_REQUESTS
            </div>
          </div>

          {/* History Sparkline */}
          {networkHistory.length > 1 && (
            <div className="mb-4">
              <div className="text-sm text-theme-secondary mb-2">Hit Ratio History (last 60s)</div>
              <div className="h-16 bg-theme-tertiary rounded-lg p-2 overflow-hidden">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    className="text-green-500"
                    strokeWidth="2"
                    points={networkHistory.map((d, i) =>
                      `${(i / Math.max(networkHistory.length - 1, 1)) * 100},${100 - d.hitRatio}`
                    ).join(' ')}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Latency Test Results */}
          {latencyTest.results.length > 0 && (
            <div className="mt-4 pt-4 border-t border-theme">
              <div className="text-sm font-medium mb-2">Latency Test Results</div>
              <div className="grid grid-cols-2 gap-2">
                {latencyTest.results.map((result) => (
                  <div key={result.host} className="bg-theme-tertiary rounded p-2 text-sm">
                    <div className="text-xs text-theme-secondary truncate">{result.host}</div>
                    <div className={`font-mono font-semibold ${
                      result.latency === -1 ? 'text-red-500' :
                      result.latency < 100 ? 'text-green-500' :
                      result.latency < 500 ? 'text-yellow-500' : 'text-orange-500'
                    }`}>
                      {result.latency === -1 ? 'Failed' : `${result.latency.toFixed(0)}ms`}
                    </div>
                    {result.dnsTime !== undefined && (
                      <div className="text-xs text-theme-secondary mt-1">
                        DNS: <span className={result.dnsTime < 10 ? 'text-green-400' : 'text-yellow-400'}>{result.dnsTime.toFixed(1)}ms</span>
                        {' · '}
                        TCP: {result.connectTime?.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prefetch Controls */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          DNS Prefetch
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Common Hosts */}
          <div>
            <label className="block text-sm font-medium mb-2">Common Hosts</label>
            <div className="flex flex-wrap gap-2">
              {commonHosts.map(host => (
                <button
                  key={host}
                  onClick={() => {
                    if (selectedHosts.includes(host)) {
                      setSelectedHosts(selectedHosts.filter(h => h !== host));
                    } else {
                      setSelectedHosts([...selectedHosts, host]);
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedHosts.includes(host)
                      ? 'bg-blue-500 text-white'
                      : 'bg-theme-tertiary hover:bg-theme-tertiary/80'
                  }`}
                >
                  {host}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Host Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Custom Hosts</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="api.example.com, cdn.example.com"
                className="flex-1 px-3 py-2 rounded-lg bg-theme-tertiary border border-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePrefetch}
                disabled={selectedHosts.length === 0 && !customHost}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Prefetch
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Optimization (TCP+TLS Preconnect) */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Connection Optimization
          <span className="text-xs font-normal text-theme-secondary ml-2">(TCP + TLS warm-up)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custom Preconnect Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Pre-connect to Host</label>
            <input
              type="text"
              placeholder="https://api.example.com"
              className="w-full px-3 py-2 rounded-lg bg-theme-tertiary border border-theme focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const url = (e.target as HTMLInputElement).value.trim();
                  if (!url) return;
                  try {
                    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                    await fetch('/api/network/preconnect', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: fullUrl }),
                    });
                    showGlobalToast(`Pre-connected to ${fullUrl}`, 'success');
                    (e.target as HTMLInputElement).value = '';
                  } catch {
                    showGlobalToast('Failed to pre-connect', 'error');
                  }
                }
              }}
            />
            <p className="text-xs text-theme-secondary mt-1">Press Enter to warm connection</p>
          </div>

          {/* Quick Preconnect Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Warm</label>
            <div className="flex flex-wrap gap-2">
              {['api.github.com', 'registry.npmjs.org', 'bun.sh'].map(host => (
                <button
                  key={host}
                  onClick={async () => {
                    try {
                      await fetch('/api/network/preconnect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: `https://${host}` }),
                      });
                      showGlobalToast(`Warmed ${host}`, 'success');
                    } catch {
                      showGlobalToast(`Failed to warm ${host}`, 'error');
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  {host}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-sm text-emerald-300">
            <strong>Pro tip:</strong> Pre-connect saves ~40-50ms on first request by warming DNS + TCP + TLS ahead of time.
            Only use when idle {">"} 20ms before the actual request.
          </p>
        </div>
      </div>

      {/* Startup Optimizations Status */}
      {startupOptimizations && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Startup Optimizations
            {startupOptimizations.applied && (
              <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">
                Applied
              </span>
            )}
          </h3>

          {/* Host Matrix with Status and Colors */}
          {startupOptimizations.hostMatrix && startupOptimizations.hostMatrix.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-3">Enterprise Host Matrix</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {startupOptimizations.hostMatrix.map((host) => (
                  <div
                    key={host.id}
                    className="rounded-lg p-3 border transition-all"
                    style={{
                      backgroundColor: host.status !== 'unconfigured' ? `${host.color.hex}15` : undefined,
                      borderColor: host.status !== 'unconfigured' ? `${host.color.hex}40` : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: host.status === 'unconfigured' ? '#6b7280' : host.color.hex,
                        }}
                      />
                      <span className="text-sm font-medium">{host.label}</span>
                    </div>
                    <div className="text-xs text-theme-secondary truncate" title={host.url || 'Not configured'}>
                      {host.url || 'Not configured'}
                    </div>
                    <div className="mt-2">
                      <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: host.status === 'connected' ? '#10b98120' :
                                          host.status === 'prefetched' ? `${host.color.hex}30` :
                                          host.status === 'failed' ? '#ef444420' : '#6b728020',
                          color: host.status === 'connected' ? '#10b981' :
                                 host.status === 'prefetched' ? host.color.hex :
                                 host.status === 'failed' ? '#ef4444' : '#6b7280',
                        }}
                      >
                        {host.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DNS Prefetched Hosts (common hosts) */}
          {startupOptimizations.prefetchedHosts.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-blue-400">Common DNS Prefetch</span>
                <span className="text-xs text-theme-secondary">({startupOptimizations.prefetchedHosts.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {startupOptimizations.prefetchedHosts.map(host => (
                  <span key={host} className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">
                    {host}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Config & Meta */}
          <div className="mt-4 pt-4 border-t border-theme">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-theme-tertiary rounded-lg p-3">
                <div className="text-xs text-theme-secondary">Platform</div>
                <div className="font-mono font-semibold capitalize">{startupOptimizations.platform}</div>
              </div>
              <div className="bg-theme-tertiary rounded-lg p-3">
                <div className="text-xs text-theme-secondary">Method</div>
                <div className="font-mono font-semibold capitalize">{startupOptimizations.method}</div>
              </div>
              <div className="bg-theme-tertiary rounded-lg p-3">
                <div className="text-xs text-theme-secondary">DNS TTL</div>
                <div className="font-mono font-semibold">{startupOptimizations.config?.dnsTtl ?? 30}s</div>
              </div>
              <div className="bg-theme-tertiary rounded-lg p-3">
                <div className="text-xs text-theme-secondary">Max HTTP Requests</div>
                <div className="font-mono font-semibold">{startupOptimizations.config?.maxHttpRequests ?? 256}</div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {startupOptimizations.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-sm font-medium text-red-400 mb-2">Optimization Errors</div>
              <ul className="text-xs text-red-300 space-y-1">
                {startupOptimizations.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Refresh Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/network/optimizations', { method: 'POST' });
                  const data = await res.json();
                  if (data.data) {
                    setStartupOptimizations(data.data);
                    showGlobalToast('Startup optimizations refreshed', 'success');
                  }
                } catch {
                  showGlobalToast('Failed to refresh optimizations', 'error');
                }
              }}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Refresh Optimizations
            </button>
          </div>

          {/* Timestamp */}
          {startupOptimizations.timestamp && (
            <div className="mt-2 text-xs text-theme-secondary text-right">
              Applied at: {new Date(startupOptimizations.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runLatencyTest}
            disabled={latencyTest.running}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {latencyTest.running ? 'Testing...' : 'Run Latency Test'}
          </button>

          <button
            onClick={async () => {
              const currentLimit = startupOptimizations?.config?.maxHttpRequests ?? connectionPool.maxConnections;
              const limit = prompt(
                `Connection limit (1-65336)\n\nPresets:\n• 256 - Default\n• 512 - Enterprise (recommended)\n• 1024 - High throughput\n\nCurrent: ${currentLimit}`,
                '512'
              );
              if (!limit) return;
              const parsed = parseInt(limit, 10);
              if (isNaN(parsed) || parsed < 1 || parsed > 65336) {
                showGlobalToast('Invalid limit (must be 1-65336)', 'error');
                return;
              }
              try {
                await fetch('/api/network/limit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ limit: parsed }),
                });
                showGlobalToast(`Limit set to ${parsed} (restart required)`, 'success');
              } catch {
                showGlobalToast('Failed to set limit', 'error');
              }
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Set Connection Limit
          </button>

          <button
            onClick={async () => {
              const currentTtl = startupOptimizations?.config?.dnsTtl ?? 30;
              const ttl = prompt(
                `DNS TTL in seconds (1-300)\n\nPresets:\n• 5s - Service discovery (dynamic)\n• 30s - Default (balanced)\n• 60s - Stable hosts (recommended)\n\nCurrent: ${currentTtl}s`,
                '60'
              );
              if (!ttl) return;
              const parsed = parseInt(ttl, 10);
              if (isNaN(parsed) || parsed < 1 || parsed > 300) {
                showGlobalToast('Invalid TTL (must be 1-300)', 'error');
                return;
              }
              try {
                await fetch('/api/network/ttl', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ttl: parsed }),
                });
                showGlobalToast(`TTL set to ${parsed}s (restart required)`, 'success');
              } catch {
                showGlobalToast('Failed to set TTL', 'error');
              }
            }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Set DNS TTL
          </button>

          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/network/clear', { method: 'POST' });
                const data = await res.json();
                showGlobalToast(`Cache clearing (TTL: ${data.data?.ttlSeconds || 30}s)`, 'info');
              } catch {
                showGlobalToast('Failed to clear cache', 'error');
              }
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Clear DNS Cache
          </button>

          {selectedHosts.length > 0 && (
            <button
              onClick={async () => {
                try {
                  for (const host of selectedHosts) {
                    await fetch('/api/network/preconnect', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: `https://${host}` }),
                    });
                  }
                  showGlobalToast(`Warmed ${selectedHosts.length} socket(s) (TCP+TLS)`, 'success');
                } catch {
                  showGlobalToast('Failed to warm sockets', 'error');
                }
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Warm {selectedHosts.length} Socket{selectedHosts.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card p-6 bg-blue-500/5 border-blue-500/20">
        <h3 className="font-semibold mb-3 text-blue-400">Performance Tips</h3>
        <ul className="space-y-2 text-sm text-theme-secondary">
          <li><strong>DNS prefetch</strong> - removes ~20-120ms, auto-used by fetch/Bun.connect</li>
          <li><strong>Socket warming</strong> - only if idle {">"} 20ms before first request (measure first!)</li>
          <li><strong>Hit ratio</strong> - keep above 80% for optimal caching</li>
          <li><strong>TTL</strong> - 5s for service discovery, 30s default, 60s for stable hosts</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-blue-500/20 text-xs text-theme-secondary">
          <strong>When to warm sockets:</strong> SSR that finishes render before API call, CLI with 50-100ms bootstrap.
          <br />
          <strong>Skip warming:</strong> Immediate fetches (Bun warms on first call), user-provided URLs.
        </div>
      </div>
    </div>
  );
};
