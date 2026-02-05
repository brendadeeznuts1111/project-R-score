import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';

export interface BuildEntry {
  id: string;
  config: string;
  flags: string[];
  status: 'success' | 'failed' | 'running';
  exitCode?: number;
  timestamp: number;
  duration?: number;
}

const STORAGE_KEY = 'geelark-build-history';

export const BuildHistory: React.FC = () => {
  const [builds, setBuilds] = useState<BuildEntry[]>([]);

  useEffect(() => {
    // Load build history from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setBuilds(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse build history:', e);
      }
    }
  }, []);

  const addBuild = (build: Omit<BuildEntry, 'id' | 'timestamp'>) => {
    const newBuild: BuildEntry = {
      ...build,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updated = [newBuild, ...builds].slice(0, 50); // Keep last 50 builds
    setBuilds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newBuild.id;
  };

  const clearHistory = () => {
    setBuilds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Build History
          </span>
          <span className="text-[9px] text-slate-600 font-bold px-2 py-0.5 bg-slate-800 rounded-full">
            {builds.length}
          </span>
        </div>
        <button
          onClick={clearHistory}
          disabled={builds.length === 0}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
          title="Clear history"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Build List */}
      <div className="divide-y divide-slate-800/50 max-h-64 overflow-y-auto">
        {builds.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            No builds yet. Trigger a build to see history here.
          </div>
        ) : (
          builds.map(build => (
            <div
              key={build.id}
              className="px-4 py-3 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {build.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {build.status === 'failed' && (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    {build.status === 'running' && (
                      <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                    )}
                  </div>

                  {/* Build Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-300">
                        {build.config}
                      </span>
                      <span className="text-[9px] text-slate-600">
                        {formatTimestamp(build.timestamp)}
                      </span>
                    </div>

                    {/* Flags */}
                    <div className="flex flex-wrap gap-1">
                      {build.flags.slice(0, 3).map(flag => (
                        <span
                          key={flag}
                          className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-mono text-slate-500"
                        >
                          {flag}
                        </span>
                      ))}
                      {build.flags.length > 3 && (
                        <span className="text-[9px] text-slate-600">
                          +{build.flags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exit Code / Duration */}
                <div className="text-right">
                  {build.exitCode !== undefined && (
                    <div className={`text-[9px] font-mono ${
                      build.exitCode === 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      exit: {build.exitCode}
                    </div>
                  )}
                  {build.duration && (
                    <div className="text-[9px] text-slate-600">
                      {formatDuration(build.duration)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Export a function to add builds from outside the component
export let addBuildToHistory: (build: Omit<BuildEntry, 'id' | 'timestamp'>) => string = () => '';

// This will be called when the component mounts
export const BuildHistoryWithExport: React.FC = () => {
  const buildHistory = BuildHistory();

  // @ts-ignore - we're adding a method to the component
  addBuildToHistory = buildHistory.props?.addBuild || (() => '');

  return buildHistory;
};
