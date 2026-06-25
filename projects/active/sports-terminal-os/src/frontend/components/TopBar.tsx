/**
 * TopBar — Application Top Bar
 *
 * - Page title
 * - Connection status indicator
 * - Notification bell with dropdown
 * - Server time display
 */

import React from "react";
import ConnectionStatus from "./ConnectionStatus";
import NotificationBell from "./NotificationBell";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopBarProps {
  title?: string;
  serverTime: string;
  activeAlerts: number;
  wsConnected: boolean;
  sseConnected?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TopBar: React.FC<TopBarProps> = ({
  title = "Sports Terminal OS",
  serverTime,
  activeAlerts,
  wsConnected,
  sseConnected = false,
}) => {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <h2 className="page-title">{title}</h2>
      </div>
      <div className="top-bar-center">
        <ConnectionStatus wsConnected={wsConnected} sseConnected={sseConnected} />
      </div>
      <div className="top-bar-right">
        <NotificationBell count={activeAlerts} />
        <div className="server-time">
          {new Date(serverTime).toLocaleTimeString()}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
