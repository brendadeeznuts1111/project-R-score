/**
 * NotificationBell — Alert/Notification Dropdown
 *
 * Shows a bell icon with badge count. Click to see recent alerts.
 */

import React, { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  timestamp: number;
  read: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  count: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Risk Alert", message: "Player whale_42 risk score exceeded threshold (87)", severity: "warning", timestamp: Date.now() - 300000, read: false },
  { id: "n2", title: "System", message: "Sportsbook odds refreshed (42 events)", severity: "info", timestamp: Date.now() - 600000, read: false },
  { id: "n3", title: "Auto-Enforcement", message: "Limit applied to player sharp_bettor", severity: "error", timestamp: Date.now() - 900000, read: true },
  { id: "n4", title: "Prediction Market", message: "New arbitrage opportunity detected", severity: "info", timestamp: Date.now() - 1800000, read: true },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NotificationBell: React.FC<NotificationBellProps> = ({ count }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayCount = count > 0 ? count : unreadCount;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getSeverityColor = (s: Notification["severity"]) => {
    switch (s) {
      case "info": return "#4a9eff";
      case "warning": return "#ff9800";
      case "error": return "#f44336";
      case "critical": return "#ff1744";
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <span className="notification-bell-icon">🔔</span>
        {displayCount > 0 && <span className="notification-badge">{displayCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span>Notifications</span>
            <div className="notification-actions">
              <button onClick={markAllRead}>Mark all read</button>
              <button onClick={clearAll}>Clear</button>
            </div>
          </div>
          <div className="notification-list">
            {notifications.length === 0 && (
              <div className="notification-empty">No notifications</div>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`notification-item ${n.read ? "read" : "unread"}`}>
                <span
                  className="notification-severity"
                  style={{ background: getSeverityColor(n.severity) }}
                />
                <div className="notification-content">
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-time">{formatTime(n.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
