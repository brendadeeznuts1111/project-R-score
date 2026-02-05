import { useState, useEffect } from "react";

export const URLPatternDemo = () => {
  const [testUrl, setTestUrl] = useState("http://localhost:3005/api/files/analyze");
  const [patterns, setPatterns] = useState([
    { pattern: "/api/files/:action", description: "File operations API" },
    { pattern: "/api/users/:id/profile", description: "User profile API" },
    { pattern: "/docs/:category/:page", description: "Documentation pages" },
    { pattern: "/blog/:year/:month/:slug", description: "Blog posts" },
  ]);
  const [results, setResults] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Log colorful URLPattern info
    console.log("%c=== URLPattern Demo ===", "color: #3b82f6; font-size: 16px");
    console.log("%cTesting URLPattern routing with Bun", "color: #3b82f6");
  }, []);

  const testPatterns = () => {
    const testResults = patterns.map(({ pattern, description }) => {
      try {
        const urlPattern = new URLPattern({ pathname: pattern });
        const result = urlPattern.exec(testUrl);
        
        return {
          pattern,
          description,
          match: !!result,
          params: result ? Object.fromEntries(result.pathname.groups.entries()) : null,
          success: true,
        };
      } catch (error) {
        return {
          pattern,
          description,
          match: false,
          params: null,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    setResults(testResults);
    
    const matches = testResults.filter(r => r.match).length;
    setMessage(`🔍 Tested ${patterns.length} patterns, ${matches} matched`);
    setTimeout(() => setMessage(""), 3000);
  };

  const addPattern = () => {
    const newPattern = {
      pattern: "/new/:pattern",
      description: "New pattern example",
    };
    setPatterns([...patterns, newPattern]);
  };

  const removePattern = (index: number) => {
    setPatterns(patterns.filter((_, i) => i !== index));
    setResults(results.filter((_, i) => i !== index));
  };

  const demonstrateAPICall = async () => {
    try {
      const response = await fetch("http://localhost:3005/health");
      const data = await response.json();
      
      setMessage(`✅ API Response: ${data.status} (v${data.version})`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`❌ API Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div style={{
      background: "#dbeafe",
      border: "2px solid #3b82f6",
      borderRadius: "0.5rem",
      padding: "1.5rem",
      margin: "1rem 0",
    }}>
      <h3 style={{
        fontSize: "1.5rem",
        fontWeight: "bold",
        marginBottom: "1rem",
        color: "#1e3a8a",
      }}>🌐 URLPattern Routing Demo</h3>
      
      {message && (
        <div style={{
          background: message.includes("✅") ? "#d1fae5" : message.includes("❌") ? "#fee2e2" : "#fef3c7",
          border: `1px solid ${message.includes("✅") ? "#10b981" : message.includes("❌") ? "#ef4444" : "#f59e0b"}`,
          borderRadius: "0.25rem",
          padding: "0.75rem",
          marginBottom: "1rem",
          color: message.includes("✅") ? "#065f46" : message.includes("❌") ? "#991b1b" : "#92400e",
        }}>
          {message}
        </div>
      )}

      {/* URL Input */}
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        padding: "1rem",
        marginBottom: "1rem",
      }}>
        <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>Test URL</h4>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.25rem",
            }}
          />
          <button
            onClick={testPatterns}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Test Patterns
          </button>
        </div>
      </div>

      {/* Pattern Management */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4 style={{ color: "#374151" }}>
            URL Patterns ({patterns.length})
          </h4>
          <button
            onClick={addPattern}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Add Pattern
          </button>
        </div>
        
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {patterns.map((item, index) => (
            <div key={index} style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.25rem",
              padding: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <code style={{ color: "#1f2937", background: "#f3f4f6", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>
                  {item.pattern}
                </code>
                <br />
                <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  {item.description}
                </span>
              </div>
              <button
                onClick={() => removePattern(index)}
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
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Test Results */}
      {results.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ color: "#374151", marginBottom: "0.75rem" }}>Test Results</h4>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {results.map((result, index) => (
              <div key={index} style={{
                background: result.match ? "#ecfdf5" : "#fef2f2",
                border: `1px solid ${result.match ? "#10b981" : "#ef4444"}`,
                borderRadius: "0.25rem",
                padding: "0.75rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <code style={{ color: "#1f2937", fontSize: "0.875rem" }}>
                      {result.pattern}
                    </code>
                    <br />
                    <span style={{ color: result.match ? "#065f46" : "#991b1b", fontSize: "0.875rem", fontWeight: "bold" }}>
                      {result.match ? "✅ MATCH" : "❌ NO MATCH"}
                    </span>
                    {result.params && (
                      <div style={{ marginTop: "0.25rem" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                          Params: {JSON.stringify(result.params)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Demo */}
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        padding: "1rem",
        marginBottom: "1rem",
      }}>
        <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>Live API Demo</h4>
        <button
          onClick={demonstrateAPICall}
          style={{
            background: "#8b5cf6",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Test API Call (/health)
        </button>
      </div>

      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "0.25rem",
        fontSize: "0.875rem",
        color: "#1e3a8a",
      }}>
        <strong>🔧 Bun URLPattern Features:</strong>
        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
          <li>Native URLPattern API support</li>
          <li>Wildcard and parameter matching</li>
          <li>Protocol, hostname, and pathname patterns</li>
          <li>Integration with routing systems</li>
          <li>Type-safe parameter extraction</li>
        </ul>
      </div>
    </div>
  );
};
