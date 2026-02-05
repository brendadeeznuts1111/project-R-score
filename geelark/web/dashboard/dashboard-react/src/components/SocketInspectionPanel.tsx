import React, { useState, useEffect } from "react";
import { Network, Globe, Activity, AlertTriangle, TrendingUp, Search, Database } from "lucide-react";

interface DNSQuery {
  id?: number;
  timestamp: number;
  hostname: string;
  queryType: string;
  resolvedAddresses: string[];
  responseTime: number;
  nameserver: string;
  sourceIP: string;
  environment: string;
  success: boolean;
  error?: string;
  ttl?: number;
}

interface TCPConnection {
  id?: number;
  timestamp: number;
  sourceIP: string;
  sourcePort: number;
  destIP: string;
  destPort: number;
  protocol: string;
  state: string;
  duration: number;
  bytesSent: number;
  bytesReceived: number;
  environment: string;
  userAgent?: string;
  latency?: number;
  tlsVersion?: string;
  tlsCipher?: string;
}

interface SocketStats {
  totalDNSQueries: number;
  totalTCPConnections: number;
  activeConnections: number;
  topDomains: Array<{ domain: string; queryCount: number }>;
  topDestinations: Array<{ ip: string; port: number; connectionCount: number }>;
  avgDNSTime: number;
  avgConnectionTime: number;
  failureRate: number;
}

interface DNSPatterns {
  slowQueries: DNSQuery[];
  failedQueries: DNSQuery[];
  frequentQueries: Array<{ hostname: string; count: number }>;
}

interface TCPPatterns {
  longConnections: TCPConnection[];
  failedConnections: TCPConnection[];
  highVolumeConnections: Array<{ destIP: string; destPort: number; totalBytes: number }>;
}

interface SuspiciousDNS {
  dnsTunneling?: Array<{ hostname: string; queryCount: number; avgLength: number }>;
  fastFlux?: Array<{ hostname: string; ipCount: number; changeRate: number }>;
  domainGenerationAlgorithms?: Array<{ pattern: string; matchCount: number }>;
  suspiciousTLDs?: Array<{ tld: string; queryCount: number }>;
}

export const SocketInspectionPanel: React.FC = () => {
  const [stats, setStats] = useState<SocketStats | null>(null);
  const [dnsPatterns, setDNSPatterns] = useState<DNSPatterns | null>(null);
  const [tcpPatterns, setTCPPatterns] = useState<TCPPatterns | null>(null);
  const [suspicious, setSuspicious] = useState<SuspiciousDNS | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "dns" | "tcp" | "suspicious">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = "/api/sockets";

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [statsRes, dnsRes, tcpRes, suspiciousRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/dns/patterns`),
        fetch(`${API_BASE}/tcp/patterns`),
        fetch(`${API_BASE}/dns/suspicious`),
      ]);

      if (!statsRes.ok || !dnsRes.ok || !tcpRes.ok) {
        throw new Error("Failed to fetch socket data");
      }

      const [statsData, dnsData, tcpData, suspiciousData] = await Promise.all([
        statsRes.json(),
        dnsRes.json(),
        tcpRes.json(),
        suspiciousRes.json(),
      ]);

      setStats(statsData);
      setDNSPatterns(dnsData);
      setTCPPatterns(tcpData);
      setSuspicious(suspiciousData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch socket data");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatBytes = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Socket Inspection</h2>
          <p className="text-sm text-gray-600 mt-1">Deep DNS and TCP connection analysis</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              <Network className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("dns")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "dns"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              DNS
            </button>
            <button
              onClick={() => setActiveTab("tcp")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "tcp"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              TCP
            </button>
            <button
              onClick={() => setActiveTab("suspicious")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "suspicious"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Suspicious
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">DNS Queries</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalDNSQueries)}</p>
                    </div>
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Avg: {stats.avgDNSTime.toFixed(1)}ms</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">TCP Connections</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalTCPConnections)}</p>
                    </div>
                    <Activity className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Active: {stats.activeConnections}</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Connection</p>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgConnectionTime)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Failure Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{(stats.failureRate * 100).toFixed(1)}%</p>
                    </div>
                    <AlertTriangle className={`w-8 h-8 ${stats.failureRate > 0.1 ? "text-red-600" : "text-green-600"}`} />
                  </div>
                </div>
              </div>

              {/* Top Domains */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Domains</h3>
                <div className="space-y-2">
                  {stats.topDomains.slice(0, 10).map((domain, index) => (
                    <div key={domain.domain} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-600 w-6">{index + 1}.</span>
                        <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                      </div>
                      <span className="text-sm text-gray-600">{formatNumber(domain.queryCount)} queries</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Destinations */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top TCP Destinations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Connections</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.topDestinations.slice(0, 10).map((dest) => (
                        <tr key={`${dest.ip}:${dest.port}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-mono text-gray-900">{dest.ip}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{dest.port}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatNumber(dest.connectionCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DNS Tab */}
          {activeTab === "dns" && dnsPatterns && (
            <div className="space-y-6">
              {/* Slow Queries */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Slow DNS Queries</h3>
                {dnsPatterns.slowQueries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No slow queries recorded</p>
                ) : (
                  <div className="space-y-2">
                    {dnsPatterns.slowQueries.map((query) => (
                      <div key={query.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{query.hostname}</span>
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            {query.responseTime.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Type: {query.queryType} | Addresses: {query.resolvedAddresses.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Failed Queries */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Failed DNS Queries</h3>
                {dnsPatterns.failedQueries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No failed queries recorded</p>
                ) : (
                  <div className="space-y-2">
                    {dnsPatterns.failedQueries.map((query) => (
                      <div key={query.id} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{query.hostname}</span>
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                            FAILED
                          </span>
                        </div>
                        {query.error && <div className="text-xs text-red-600">{query.error}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Frequent Queries */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Frequent Queries</h3>
                <div className="space-y-2">
                  {dnsPatterns.frequentQueries.map((domain) => (
                    <div key={domain.hostname} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-900">{domain.hostname}</span>
                      <span className="text-sm text-gray-600">{formatNumber(domain.count)} queries</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TCP Tab */}
          {activeTab === "tcp" && tcpPatterns && (
            <div className="space-y-6">
              {/* Long Connections */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Longest Connections</h3>
                {tcpPatterns.longConnections.length === 0 ? (
                  <p className="text-gray-500 text-sm">No long connections recorded</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bytes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tcpPatterns.longConnections.map((conn) => (
                          <tr key={conn.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{conn.sourceIP}:{conn.sourcePort}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{conn.destIP}:{conn.destPort}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{formatDuration(conn.duration)}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              ↓{formatBytes(conn.bytesSent)} ↑{formatBytes(conn.bytesReceived)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Failed Connections */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Failed Connections</h3>
                {tcpPatterns.failedConnections.length === 0 ? (
                  <p className="text-gray-500 text-sm">No failed connections recorded</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Protocol</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tcpPatterns.failedConnections.map((conn) => (
                          <tr key={conn.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{conn.destIP}:{conn.destPort}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{conn.protocol}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">{conn.state}</span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(conn.timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* High Volume */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Highest Volume Connections</h3>
                <div className="space-y-2">
                  {tcpPatterns.highVolumeConnections.map((dest) => (
                    <div key={`${dest.destIP}:${dest.destPort}`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{dest.destIP}:{dest.destPort}</div>
                        <div className="text-xs text-gray-500">Total data transferred</div>
                      </div>
                      <span className="text-sm font-mono text-gray-900">{formatBytes(dest.totalBytes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suspicious Tab */}
          {activeTab === "suspicious" && suspicious && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Security Analysis</p>
                  <p className="mt-1">This panel shows potentially suspicious DNS and network activity patterns that may indicate security threats.</p>
                </div>
              </div>

              {/* DNS Tunneling */}
              {suspicious.dnsTunneling && suspicious.dnsTunneling.length > 0 && (
                <div className="bg-white rounded-lg border border-red-200 p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4">Potential DNS Tunneling</h3>
                  <p className="text-sm text-gray-600 mb-4">Unusually high query rates with long hostnames</p>
                  <div className="space-y-2">
                    {suspicious.dnsTunneling.map((item) => (
                      <div key={item.hostname} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{item.hostname}</span>
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">SUSPICIOUS</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatNumber(item.queryCount)} queries | Avg length: {item.avgLength.toFixed(0)} chars
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Flux */}
              {suspicious.fastFlux && suspicious.fastFlux.length > 0 && (
                <div className="bg-white rounded-lg border border-orange-200 p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Fast Flux Networks</h3>
                  <p className="text-sm text-gray-600 mb-4">Domains with rapidly changing IP addresses</p>
                  <div className="space-y-2">
                    {suspicious.fastFlux.map((item) => (
                      <div key={item.hostname} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{item.hostname}</span>
                          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">FAST FLUX</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.ipCount} unique IPs | Change rate: {item.changeRate.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspicious TLDs */}
              {suspicious.suspiciousTLDs && suspicious.suspiciousTLDs.length > 0 && (
                <div className="bg-white rounded-lg border border-yellow-200 p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-4">Suspicious TLDs</h3>
                  <p className="text-sm text-gray-600 mb-4">Top-level domains with high query rates</p>
                  <div className="space-y-2">
                    {suspicious.suspiciousTLDs.map((item) => (
                      <div key={item.tld} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-900">.{item.tld}</span>
                        <span className="text-sm text-gray-600">{formatNumber(item.queryCount)} queries</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!suspicious.dnsTunneling || suspicious.dnsTunneling.length === 0) &&
               (!suspicious.fastFlux || suspicious.fastFlux.length === 0) && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-600">No suspicious activity detected</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
