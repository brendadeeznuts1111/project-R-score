import { useState, useEffect } from "react";
import { cookieManager } from "../api/cookie-manager-browser";

export const CookieManagerComponent = () => {
  const [cookies, setCookies] = useState<Array<{name: string, value: string, domain?: string, path?: string}>>([]);
  const [newCookie, setNewCookie] = useState({ name: "", value: "", domain: "localhost", path: "/" });
  const [message, setMessage] = useState("");

  const refreshCookies = () => {
    const cookieList = Array.from(cookieManager.entries()).map(([name, cookie]) => ({
      name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
    }));
    setCookies(cookieList);
  };

  useEffect(() => {
    refreshCookies();
    
    // Log colorful cookie info
    console.log("%c=== Cookie Manager ===", "color: #e67e22; font-size: 16px");
    console.log(`%cActive cookies: ${cookieManager.size}`, "color: #e67e22");
  }, []);

  const addCookie = () => {
    if (!newCookie.name || !newCookie.value) {
      setMessage("⚠️ Name and value are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    cookieManager.set(newCookie.name, {
      value: newCookie.value,
      domain: newCookie.domain,
      path: newCookie.path,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    setNewCookie({ name: "", value: "", domain: "localhost", path: "/" });
    refreshCookies();
    setMessage("✅ Cookie added successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const deleteCookie = (name: string) => {
    cookieManager.delete(name);
    refreshCookies();
    setMessage(`🗑️ Cookie "${name}" deleted`);
    setTimeout(() => setMessage(""), 3000);
  };

  const clearAllCookies = () => {
    cookieManager.clear();
    refreshCookies();
    setMessage("🧹 All cookies cleared");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div style={{
      background: "#fef3c7",
      border: "2px solid #f59e0b",
      borderRadius: "0.5rem",
      padding: "1.5rem",
      margin: "1rem 0",
    }}>
      <h3 style={{
        fontSize: "1.5rem",
        fontWeight: "bold",
        marginBottom: "1rem",
        color: "#92400e",
      }}>🍪 Cookie Manager (Bun.CookieMap)</h3>
      
      {message && (
        <div style={{
          background: message.includes("✅") ? "#d1fae5" : message.includes("⚠️") ? "#fed7aa" : "#fee2e2",
          border: `1px solid ${message.includes("✅") ? "#10b981" : message.includes("⚠️") ? "#f59e0b" : "#ef4444"}`,
          borderRadius: "0.25rem",
          padding: "0.75rem",
          marginBottom: "1rem",
          color: message.includes("✅") ? "#065f46" : message.includes("⚠️") ? "#92400e" : "#991b1b",
        }}>
          {message}
        </div>
      )}

      {/* Add Cookie Form */}
      <div style={{
        background: "#fff",
        border: "1px solid #f3f4f6",
        borderRadius: "0.375rem",
        padding: "1rem",
        marginBottom: "1rem",
      }}>
        <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>Add New Cookie</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            type="text"
            placeholder="Cookie name"
            value={newCookie.name}
            onChange={(e) => setNewCookie({...newCookie, name: e.target.value})}
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.25rem",
            }}
          />
          <input
            type="text"
            placeholder="Cookie value"
            value={newCookie.value}
            onChange={(e) => setNewCookie({...newCookie, value: e.target.value})}
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.25rem",
            }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input
            type="text"
            placeholder="Domain (default: localhost)"
            value={newCookie.domain}
            onChange={(e) => setNewCookie({...newCookie, domain: e.target.value})}
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.25rem",
            }}
          />
          <input
            type="text"
            placeholder="Path (default: /)"
            value={newCookie.path}
            onChange={(e) => setNewCookie({...newCookie, path: e.target.value})}
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.25rem",
            }}
          />
        </div>
        <button
          onClick={addCookie}
          style={{
            background: "#f59e0b",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Add Cookie
        </button>
      </div>

      {/* Cookie List */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4 style={{ color: "#374151" }}>
            Active Cookies ({cookies.length})
          </h4>
          <button
            onClick={refreshCookies}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Refresh
          </button>
        </div>
        
        {cookies.length === 0 ? (
          <p style={{ color: "#6b7280", fontStyle: "italic" }}>No cookies set</p>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {cookies.map((cookie) => (
              <div key={cookie.name} style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.25rem",
                padding: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <strong style={{ color: "#1f2937" }}>{cookie.name}</strong>
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                    Value: {cookie.value}
                  </span>
                  {cookie.domain && (
                    <span style={{ color: "#6b7280", fontSize: "0.875rem", marginLeft: "1rem" }}>
                      Domain: {cookie.domain}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteCookie(cookie.name)}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {cookies.length > 0 && (
        <button
          onClick={clearAllCookies}
          style={{
            background: "#dc2626",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Clear All Cookies
        </button>
      )}

      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        background: "#fffbeb",
        border: "1px solid #fed7aa",
        borderRadius: "0.25rem",
        fontSize: "0.875rem",
        color: "#92400e",
      }}>
        <strong>🔧 Bun.CookieMap API Features:</strong>
        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
          <li>Map-like interface (get, set, delete, clear)</li>
          <li>HMR persistence across hot reloads</li>
          <li>Domain and path specification</li>
          <li>Expiration management</li>
          <li>Type-safe cookie handling</li>
        </ul>
      </div>
    </div>
  );
};
