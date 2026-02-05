import { useEffect, useState } from "react";
import { cookieManager } from "../api/cookie-manager";

export const DevDashboard = () => {
  const [stats, setStats] = useState({
    cookies: 0,
    archives: 0,
    configs: 0,
    bunVersion: "1.3.6", // Hardcoded for browser compatibility
    hmrEnabled: false,
  });
  
  const refresh = () => {
    setStats(prev => ({
      ...prev,
      cookies: cookieManager.size,
      archives: archives.size, // From global state
      configs: configs.size, // From global state
      hmrEnabled: !!import.meta.hot,
    }));
  };
  
  useEffect(() => {
    refresh();
    
    // Log colorful dev info (browser compatible)
    console.log("%c=== Bun Dev Dashboard ===", "color: #e67e22; font-size: 16px");
    console.log(
      `%cBun v${stats.bunVersion}`, 
      "color: #3b82f6" 
    );
    console.log(
      `%cHMR: ${import.meta.hot ? "enabled" : "disabled"}`,
      `color: ${import.meta.hot ? "#22c55e" : "#ef4444"}` 
    );
  }, []);
  
  return (
    <div style={{
      background: "#3b82f6",
      color: "#fff",
      padding: "1.5rem",
      borderRadius: "0.5rem",
      margin: "1rem 0",
    }}>
      <h2 style={{
        fontSize: "1.5rem",
        fontWeight: "bold",
        marginBottom: "1rem",
        color: "#fff",
      }}>📊 Bun Dev Dashboard</h2>
      
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <Stat label="🍪 Cookies" value={stats.cookies} color="#f59e0b" />
        <Stat label="📦 Archives" value={stats.archives} color="#22c55e" />
        <Stat label="⚙️ Configs" value={stats.configs} color="#06b6d4" />
        <Stat label="🔥 HMR Status" value={stats.hmrEnabled ? "ON" : "OFF"} color={stats.hmrEnabled ? "#22c55e" : "#ef4444"} />
      </div>
      
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "0.75rem",
        borderRadius: "0.25rem",
        marginBottom: "1rem",
      }}>
        <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          <strong>Bun Version:</strong> {stats.bunVersion}
        </div>
        <div style={{ fontSize: "0.875rem" }}>
          <strong>Environment:</strong> {import.meta.env?.MODE || "development"}
        </div>
      </div>
      
      <button 
        onClick={refresh}
        style={{
          background: "#10b981",
          color: "#fff",
          border: "none",
          padding: "0.75rem 1.5rem",
          borderRadius: "0.25rem",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "1rem",
        }}
      >
        🔄 Refresh Stats
      </button>
    </div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "0.25rem",
    border: `1px solid ${color}20`,
  }}>
    <span style={{ fontSize: "0.875rem" }}>{label}</span>
    <span style={{ 
      fontWeight: "bold", 
      fontSize: "1rem",
      color: color,
      textShadow: "0 1px 2px rgba(0,0,0,0.1)"
    }}>{value}</span>
  </div>
);

// Mock global state for demonstration
const archives = { size: 0 };
const configs = { size: 0 };
