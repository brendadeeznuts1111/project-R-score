/**
 * 🛰️ NETWORK MATRIX VISUALIZATION
 * Enterprise Host Monitoring Panel
 *
 * Displays real-time connection status for all configured hosts
 * with color-coded indicators from network-matrix.toml
 */

import React, { useState, useEffect } from "react";

interface Host {
  id: string;
  label: string;
  env: string;
  color_hex: string;
  color_hsl: string;
  status: "connected" | "prefetched" | "failed" | "unconfigured";
  url?: string;
  latency?: number;
}

interface NetworkStatus {
  hosts: Host[];
  integrity: string;
  ceiling: number;
}

const STATUS_ICONS: Record<string, string> = {
  connected: "🟢",
  prefetched: "🔵",
  failed: "🔴",
  unconfigured: "⚫",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "TCP+TLS",
  prefetched: "DNS",
  failed: "FAILED",
  unconfigured: "N/A",
};

export const NetworkMatrix: React.FC<{
  onProbe?: (hostId: string) => void;
  onBenchmark?: (hostId: string, result: any) => void;
  className?: string;
}> = ({ onProbe, onBenchmark, className = "" }) => {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState<string | null>(null);
  const [benchmarking, setBenchmarking] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/network/status");
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      console.error("Failed to fetch network status");
    } finally {
      setLoading(false);
    }
  };

  const handleProbe = async (hostId: string) => {
    setProbing(hostId);
    try {
      const res = await fetch(`/api/network/probe/${hostId}`, { method: "POST" });
      if (res.ok) {
        const { data } = await res.json();
        // Update only the probed host's status locally (avoid N+1 refetch)
        setStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hosts: prev.hosts.map((host) =>
              host.id === hostId
                ? {
                    ...host,
                    status: data.status === "ok" ? "connected" : "failed",
                    latency: data.latency,
                  }
                : host
            ),
          };
        });
      }
      onProbe?.(hostId);
    } finally {
      setProbing(null);
    }
  };

  const handleBenchmark = async (hostId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering probe
    setBenchmarking(hostId);
    try {
      const res = await fetch(`/api/benchmarks/hosts/${hostId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iterations: 50 }),
      });
      if (res.ok) {
        const { data } = await res.json();
        onBenchmark?.(hostId, data);
        // Update latency with benchmark result
        setStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hosts: prev.hosts.map((host) =>
              host.id === hostId
                ? {
                    ...host,
                    latency: data.responseTime,
                  }
                : host
            ),
          };
        });
      }
    } catch (error) {
      console.error("Benchmark failed:", error);
    } finally {
      setBenchmarking(null);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 bg-black border border-gray-800 rounded-xl ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-gray-900 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`p-4 bg-black border border-red-800 rounded-xl ${className}`}>
        <p className="text-red-400 text-sm">Failed to load network matrix</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-black border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-black uppercase text-gray-500 tracking-tighter">
          Enterprise Host Matrix
        </h2>
        <div className="flex items-center gap-3">
          <code className="text-[10px] text-blue-400 font-mono">
            CRC:{status.integrity.slice(0, 8)}
          </code>
          <code className="text-[10px] text-gray-600 font-mono">
            MAX:{status.ceiling}
          </code>
        </div>
      </div>

      {/* Host Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {status.hosts.map((host) => (
          <div
            key={host.id}
            className="relative p-3 rounded border border-gray-900 bg-gray-950 hover:border-gray-700
                       transition-all group"
            style={{ borderLeft: `4px solid ${host.color_hex}` }}
          >
            <button
              onClick={() => handleProbe(host.id)}
              disabled={probing === host.id || benchmarking === host.id}
              className="w-full text-left disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-gray-300">
                  {host.label}
                </span>
                <span
                  className={`text-xs ${probing === host.id ? "animate-spin" : ""}`}
                >
                  {probing === host.id ? "⏳" : STATUS_ICONS[host.status]}
                </span>
              </div>
              <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wide">
                {STATUS_LABELS[host.status]}
              </div>
              {host.latency !== undefined && host.status === "connected" && (
                <div className="text-[9px] text-green-500 font-mono mt-1">
                  {host.latency.toFixed(0)}ms
                </div>
              )}
              {host.url && (
                <div className="text-[8px] text-gray-700 font-mono truncate mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {new URL(host.url).hostname}
                </div>
              )}
            </button>
            {/* Benchmark button */}
            {host.status === "connected" && (
              <button
                onClick={(e) => handleBenchmark(host.id, e)}
                disabled={benchmarking === host.id}
                className="absolute top-1 right-1 p-1 text-[8px] bg-blue-600 hover:bg-blue-700 
                         text-white rounded opacity-0 group-hover:opacity-100 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed"
                title="Run benchmark"
              >
                {benchmarking === host.id ? "⏳" : "⚡"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-900">
        {Object.entries(STATUS_ICONS).map(([status, icon]) => (
          <div key={status} className="flex items-center gap-1">
            <span className="text-[10px]">{icon}</span>
            <span className="text-[9px] text-gray-600 uppercase">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Compact inline version for status bars
 */
export const NetworkStatusBar: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [status, setStatus] = useState<NetworkStatus | null>(null);

  useEffect(() => {
    fetch("/api/network/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const connected = status.hosts.filter((h) => h.status === "connected").length;
  const total = status.hosts.length;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] text-gray-500">NET</span>
      <div className="flex gap-0.5">
        {status.hosts.map((host) => (
          <div
            key={host.id}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                host.status === "connected"
                  ? host.color_hex
                  : host.status === "failed"
                    ? "#ef4444"
                    : "#374151",
            }}
            title={`${host.label}: ${host.status}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-600 font-mono">
        {connected}/{total}
      </span>
    </div>
  );
};

export default NetworkMatrix;
