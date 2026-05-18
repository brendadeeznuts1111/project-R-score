/**
 * LiveActivityFeed - Real-time activity stream with WebSocket
 *
 * Features:
 * - Auto-reconnecting WebSocket connection
 * - Live activity updates via delta/full sync
 * - Connection status indicator
 * - Relative timestamps
 */

import { useState, useEffect, useCallback } from "react";
import { useActivityRealtime } from "../hooks";

// ============================================================================
// Types
// ============================================================================

interface Activity {
  id: string;
  type: "git" | "file" | "api" | "alert" | "system";
  project?: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface LiveActivityFeedProps {
  maxItems?: number;
  showConnectionStatus?: boolean;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const activityIcons: Record<Activity["type"], JSX.Element> = {
  git: (
    <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  file: (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  api: (
    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  alert: (
    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  system: (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

// ============================================================================
// Component
// ============================================================================

export function LiveActivityFeed({
  maxItems = 20,
  showConnectionStatus = true,
  className = "",
}: LiveActivityFeedProps) {
  const { data, connectionState, refresh } = useActivityRealtime();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Merge incoming activities
  useEffect(() => {
    if (data?.activities) {
      setActivities((prev) => {
        const existing = new Set(prev.map((a) => a.id));
        const newActivities = data.activities.filter((a: Activity) => !existing.has(a.id));

        if (newActivities.length === 0) {
          // Full refresh - replace all
          if (isInitialLoad) {
            setIsInitialLoad(false);
            return data.activities.slice(0, maxItems);
          }
          return prev;
        }

        // Delta - prepend new activities
        return [...newActivities, ...prev].slice(0, maxItems);
      });
    }
  }, [data, maxItems, isInitialLoad]);

  // Load initial activities from REST API
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const res = await fetch(`/api/realtime/activities?limit=${maxItems}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.activities) {
            setActivities(json.data.activities);
            setIsInitialLoad(false);
          }
        }
      } catch {
        // Will get activities via WebSocket
      }
    };
    loadInitial();
  }, [maxItems]);

  const getRelativeTime = useCallback((timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);

    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getConnectionStatusColor = () => {
    if (connectionState.connected) return "bg-green-500";
    if (connectionState.reconnecting) return "bg-yellow-500 animate-pulse";
    return "bg-red-500";
  };

  const getConnectionStatusText = () => {
    if (connectionState.connected) {
      return connectionState.latency > 0
        ? `Connected (${connectionState.latency}ms)`
        : "Connected";
    }
    if (connectionState.reconnecting) {
      return `Reconnecting... (${connectionState.reconnectAttempt})`;
    }
    return "Disconnected";
  };

  return (
    <div className={`activity-feed bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Live Activity
          </h3>
        </div>

        {showConnectionStatus && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getConnectionStatusText()}
            </span>
            {!connectionState.connected && (
              <button
                onClick={refresh}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-80 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Activities will appear here in real-time
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {activities.map((activity, index) => (
              <li
                key={activity.id}
                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {activityIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white leading-snug">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                      {activity.project && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                            {activity.project}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer with refresh hint */}
      {activities.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Live updates via WebSocket
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveActivityFeed;
