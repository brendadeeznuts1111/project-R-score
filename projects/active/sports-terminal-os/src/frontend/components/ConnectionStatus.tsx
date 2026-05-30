/**
 * ConnectionStatus — WS/SSE Connection Status Indicator
 *
 * Shows colored indicators for WebSocket and SSE connection state.
 */

import React from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConnectionStatusProps {
  wsConnected: boolean;
  sseConnected?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ wsConnected, sseConnected = false }) => {
  return (
    <div className="connection-status-bar">
      <div className="connection-indicator" title="WebSocket">
        <span className={`status-dot ${wsConnected ? "online" : "offline"}`} />
        <span className="status-label">WS</span>
      </div>
      <div className="connection-indicator" title="Server-Sent Events">
        <span className={`status-dot ${sseConnected ? "online" : "offline"}`} />
        <span className="status-label">SSE</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
