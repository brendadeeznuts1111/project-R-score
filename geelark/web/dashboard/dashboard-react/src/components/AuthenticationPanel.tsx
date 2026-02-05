import React, { useState, useEffect } from "react";
import { Lock, LogOut, Shield, User, Key, Eye } from "lucide-react";

interface AuthToken {
  token: string;
  name: string;
  role: "admin" | "viewer" | "auditor";
  permissions: string[];
  expiresAt: number;
}

interface LoginResponse {
  success: boolean;
  token: string;
  name: string;
  role: string;
  permissions: string[];
  expiresAt: number;
}

interface AuthAuditLog {
  id?: number;
  timestamp: number;
  token: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: string;
}

export const AuthenticationPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenData, setTokenData] = useState<AuthToken | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const API_BASE = "/api/auth";

  useEffect(() => {
    // Check if token exists in localStorage
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      validateToken(storedToken);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem("auth_token");
        setIsAuthenticated(false);
        setTokenData(null);
        return;
      }

      const data = await response.json();
      if (data.valid) {
        setIsAuthenticated(true);
        setTokenData(data.token);
        setError(null);
      }
    } catch (err) {
      console.error("Token validation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      if (data.success) {
        localStorage.setItem("auth_token", data.token);
        setIsAuthenticated(true);
        setTokenData({
          token: data.token,
          name: data.name,
          role: data.role as "admin" | "viewer" | "auditor",
          permissions: data.permissions,
          expiresAt: data.expiresAt,
        });
        setUsername("");
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }

    localStorage.removeItem("auth_token");
    setIsAuthenticated(false);
    setTokenData(null);
    setShowAuditLog(false);
  };

  const fetchAuditLogs = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/audit?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data = await response.json();
      setAuditLogs(data);
      setShowAuditLog(true);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-50 border-red-200";
      case "auditor":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-5 h-5" />;
      case "auditor":
        return <Eye className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h2>
            <p className="text-sm text-gray-600 mt-2">Sign in to access monitoring features</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Default credentials: admin / [check server console]</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${getRoleColor(tokenData?.role || "")}`}>
            {getRoleIcon(tokenData?.role || "")}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{tokenData?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(tokenData?.role || "")}`}>
                {tokenData?.role.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">
                Expires: {tokenData ? formatDate(tokenData.expiresAt) : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {tokenData?.role === "admin" && (
            <button
              onClick={fetchAuditLogs}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Audit Log
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
        <div className="flex flex-wrap gap-2">
          {tokenData?.permissions.map((permission) => (
            <span
              key={permission}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
            >
              {permission}
            </span>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      {showAuditLog && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
            <button
              onClick={() => setShowAuditLog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No audit events found</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id || log.timestamp}
                  className={`p-4 rounded-lg border ${
                    log.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-medium ${
                            log.success ? "text-green-800" : "text-red-800"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-600">{log.resource}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>IP: {log.ip}</span>
                        <span className="ml-4">{formatDate(log.timestamp)}</span>
                      </div>
                      {log.reason && (
                        <div className="text-sm text-red-600 mt-1">Reason: {log.reason}</div>
                      )}
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        log.success
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.success ? "SUCCESS" : "FAILED"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
