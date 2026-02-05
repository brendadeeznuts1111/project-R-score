import { useState, useEffect } from "react";
import { cookieManager } from "../api/cookie-manager-browser";

export const BunCookieMapDemo = () => {
  const [results, setResults] = useState<string[]>([]);
  const [cookieCount, setCookieCount] = useState(0);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const refreshCookieCount = () => {
    setCookieCount(cookieManager.size);
  };

  useEffect(() => {
    refreshCookieCount();
    addResult("🍪 Bun CookieMap Demo initialized");
  }, []);

  // Demonstrate Bun.CookieMap constructor behavior
  const demonstrateConstructors = () => {
    addResult("=== Demonstrating CookieMap Constructors ===");
    
    // From cookie string (simulated)
    const cookieString = "session=abc123; theme=dark; lang=en";
    addResult(`📝 Cookie string: "${cookieString}"`);
    
    // From object (simulated)
    const cookieObject = { user: "john", visited: "true" };
    addResult(`📝 Cookie object: ${JSON.stringify(cookieObject)}`);
    
    // From array (simulated)
    const cookieArray = [["token", "xyz789"], ["pref", "light"]];
    addResult(`📝 Cookie array: ${JSON.stringify(cookieArray)}`);
    
    refreshCookieCount();
  };

  // Demonstrate get() method (per Bun docs)
  const demonstrateGet = () => {
    addResult("=== Demonstrating get() method ===");
    
    // Get a specific cookie
    const sessionCookie = cookieManager.get("session");
    if (sessionCookie != null) {
      addResult(`✅ Found session cookie: ${sessionCookie.value}`);
    } else {
      addResult("❌ No session cookie found");
    }
    
    // Get theme with fallback
    const themeCookie = cookieManager.get("theme");
    const theme = themeCookie?.value || "light";
    addResult(`🎨 Current theme: ${theme}`);
    
    refreshCookieCount();
  };

  // Demonstrate has() method (per Bun docs)
  const demonstrateHas = () => {
    addResult("=== Demonstrating has() method ===");
    
    // Check if cookies exist
    if (cookieManager.has("session")) {
      addResult("✅ Session cookie exists");
    } else {
      addResult("❌ Session cookie does not exist");
    }
    
    if (cookieManager.has("theme")) {
      addResult("✅ Theme cookie exists");
    } else {
      addResult("❌ Theme cookie does not exist");
    }
    
    refreshCookieCount();
  };

  // Demonstrate set() method (per Bun docs)
  const demonstrateSet = () => {
    addResult("=== Demonstrating set() method ===");
    
    // Set by name and value
    cookieManager.set("session", "abc123");
    addResult("✅ Set session cookie by name/value");
    
    // Set using options object
    cookieManager.set("theme", "dark", {
      maxAge: 3600,
      secure: true,
      path: "/",
    });
    addResult("✅ Set theme cookie with options");
    
    // Set additional cookies
    cookieManager.set("user", "john_doe", {
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });
    
    cookieManager.set("visited", "true", {
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    
    addResult("✅ Set user and visited cookies");
    refreshCookieCount();
  };

  // Demonstrate delete() method (per Bun docs)
  const demonstrateDelete = () => {
    addResult("=== Demonstrating delete() method ===");
    
    // Delete by name
    if (cookieManager.has("visited")) {
      cookieManager.delete("visited");
      addResult("✅ Deleted visited cookie");
    } else {
      addResult("ℹ️ No visited cookie to delete");
    }
    
    // Delete with options (simulated)
    if (cookieManager.has("temp_cookie")) {
      cookieManager.delete("temp_cookie");
      addResult("✅ Deleted temp_cookie with domain/path options");
    } else {
      addResult("ℹ️ No temp_cookie to delete");
    }
    
    refreshCookieCount();
  };

  // Demonstrate iteration (per Bun docs)
  const demonstrateIteration = () => {
    addResult("=== Demonstrating iteration methods ===");
    
    // Iterate over [name, value] entries
    addResult("🔄 Using for...of loop:");
    for (const [name, cookie] of cookieManager) {
      addResult(`  ${name}: ${cookie.value}`);
    }
    
    // Using entries()
    addResult("🔄 Using entries():");
    for (const [name, cookie] of cookieManager.entries()) {
      addResult(`  ${name}: ${cookie.value}`);
    }
    
    // Using keys()
    addResult("🔄 Using keys():");
    for (const name of cookieManager.keys()) {
      addResult(`  ${name}`);
    }
    
    // Using values()
    addResult("🔄 Using values():");
    for (const cookie of cookieManager.values()) {
      addResult(`  ${cookie.value}`);
    }
    
    // Using forEach
    addResult("🔄 Using forEach():");
    cookieManager.forEach((cookie, name) => {
      addResult(`  ${name}: ${cookie.value}`);
    });
    
    refreshCookieCount();
  };

  // Demonstrate properties (per Bun docs)
  const demonstrateProperties = () => {
    addResult("=== Demonstrating properties ===");
    
    // Size property
    addResult(`📊 Cookie count (size property): ${cookieManager.size}`);
    
    // Convert to JSON (simulated)
    const cookieJson = {};
    for (const [name, cookie] of cookieManager) {
      cookieJson[name] = cookie.value;
    }
    addResult(`📋 toJSON(): ${JSON.stringify(cookieJson)}`);
    
    refreshCookieCount();
  };

  // Demonstrate real-world usage
  const demonstrateRealWorld = () => {
    addResult("=== Real-world usage example ===");
    
    // Simulate user login
    const sessionId = crypto.randomUUID();
    cookieManager.set("session", sessionId, {
      maxAge: 60 * 60 * 2, // 2 hours
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "strict",
    });
    addResult(`🔐 User logged in with session: ${sessionId.substring(0, 8)}...`);
    
    // Set user preferences
    cookieManager.set("theme", "dark");
    cookieManager.set("language", "en");
    cookieManager.set("timezone", "UTC");
    addResult("⚙️ User preferences saved");
    
    // Track page views
    const currentViews = parseInt(cookieManager.get("page_views")?.value || "0");
    cookieManager.set("page_views", String(currentViews + 1));
    addResult(`📈 Page views: ${currentViews + 1}`);
    
    refreshCookieCount();
  };

  const clearResults = () => {
    setResults([]);
    addResult("📋 Results cleared");
  };

  const clearAllCookies = () => {
    cookieManager.clear();
    addResult("🧹 All cookies cleared");
    refreshCookieCount();
  };

  return (
    <div style={{
      background: "#f0f9ff",
      border: "2px solid #0ea5e9",
      borderRadius: "0.5rem",
      padding: "1.5rem",
      margin: "1rem 0",
    }}>
      <h3 style={{
        fontSize: "1.5rem",
        fontWeight: "bold",
        marginBottom: "1rem",
        color: "#075985",
      }}>🍪 Bun.CookieMap API Demo</h3>
      
      <div style={{
        background: "#e0f2fe",
        border: "1px solid #bae6fd",
        borderRadius: "0.25rem",
        padding: "0.75rem",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", color: "#0c4a6e" }}>
            Active Cookies: {cookieCount}
          </span>
          <button
            onClick={refreshCookieCount}
            style={{
              background: "#0ea5e9",
              color: "white",
              border: "none",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Refresh Count
          </button>
        </div>
      </div>

      {/* Demo Buttons */}
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        padding: "1rem",
        marginBottom: "1rem",
      }}>
        <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>API Demonstrations:</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
          <button onClick={demonstrateConstructors} style={{ ...buttonStyle, background: "#8b5cf6" }}>
            Constructors
          </button>
          <button onClick={demonstrateGet} style={{ ...buttonStyle, background: "#10b981" }}>
            get() Method
          </button>
          <button onClick={demonstrateHas} style={{ ...buttonStyle, background: "#f59e0b" }}>
            has() Method
          </button>
          <button onClick={demonstrateSet} style={{ ...buttonStyle, background: "#ef4444" }}>
            set() Method
          </button>
          <button onClick={demonstrateDelete} style={{ ...buttonStyle, background: "#6366f1" }}>
            delete() Method
          </button>
          <button onClick={demonstrateIteration} style={{ ...buttonStyle, background: "#14b8a6" }}>
            Iteration
          </button>
          <button onClick={demonstrateProperties} style={{ ...buttonStyle, background: "#a855f7" }}>
            Properties
          </button>
          <button onClick={demonstrateRealWorld} style={{ ...buttonStyle, background: "#dc2626" }}>
            Real World
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        padding: "1rem",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4 style={{ color: "#374151" }}>Demo Results:</h4>
          <button
            onClick={clearResults}
            style={{
              background: "#6b7280",
              color: "white",
              border: "none",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Clear Results
          </button>
        </div>
        
        <div style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "0.25rem",
          padding: "0.75rem",
          maxHeight: "200px",
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: "0.875rem",
        }}>
          {results.length === 0 ? (
            <div style={{ color: "#6b7280", fontStyle: "italic" }}>
              Click a demo button to see results...
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} style={{ marginBottom: "0.25rem" }}>
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clear Cookies */}
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

      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "0.25rem",
        fontSize: "0.875rem",
        color: "#1e3a8a",
      }}>
        <strong>🔧 Bun.CookieMap API Features Demonstrated:</strong>
        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
          <li>Constructor patterns (string, object, array)</li>
          <li>Map-like methods (get, has, set, delete)</li>
          <li>Iteration support (for...of, entries, keys, values, forEach)</li>
          <li>Properties (size, toJSON)</li>
          <li>Real-world usage patterns</li>
        </ul>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem" }}>
          <strong>📖 Based on:</strong> https://bun.com/docs/runtime/cookies
        </p>
      </div>
    </div>
  );
};

const buttonStyle = {
  color: "white",
  border: "none",
  padding: "0.5rem 1rem",
  borderRadius: "0.25rem",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.875rem",
};
