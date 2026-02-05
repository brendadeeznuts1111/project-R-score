import { useState, useEffect } from "react";

// Environment variables with fallbacks for browser compatibility
const API_PORT = "3007"; // Hardcoded for browser compatibility
const FRONTEND_PORT = "3879"; // Hardcoded for browser compatibility
const API_URL = `http://localhost:${API_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

interface RequestInfo {
  status?: number;
  statusText?: string;
  ok?: boolean;
  url?: string;
  apiPort?: string;
  frontendPort?: string;
  error?: string;
  apiUrl?: string;
  frontendUrl?: string;
  type?: string;
  source?: string;
  fileAnalysis?: any;
  fileError?: string;
}

export const HTTPHeadersDemo = () => {
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [requestInfo, setRequestInfo] = useState<RequestInfo>({});
  const [corsStatus, setCORSStatus] = useState<string>("");

  const testAPIConnection = async () => {
    try {
      // Test the API health endpoint using environment variable
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setHeaders(responseHeaders);
      setRequestInfo({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        apiPort: API_PORT,
        frontendPort: FRONTEND_PORT,
      });

      // Check CORS status
      const corsHeaders = [
        "access-control-allow-origin",
        "access-control-allow-methods",
        "access-control-allow-headers",
      ];
      
      const corsEnabled = corsHeaders.some(header => responseHeaders[header]);
      setCORSStatus(corsEnabled ? "✅ CORS Enabled" : "❌ CORS Disabled");

      const data = await response.json();
      console.log("API Response:", data);

    } catch (error) {
      console.error("API Error:", error);
      setCORSStatus("❌ Connection Failed");
      setRequestInfo({
        error: error instanceof Error ? error.message : "Unknown error",
        apiPort: API_PORT,
        frontendPort: FRONTEND_PORT,
        apiUrl: API_URL,
      });
    }
  };

  const testFileUpload = async () => {
    try {
      // Create a test file
      const testContent = "Hello, Bun File Analyzer!";
      const blob = new Blob([testContent], { type: "text/plain" });
      const file = new File([blob], "test.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/files/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("File Analysis Response:", data);

      setRequestInfo((prev: RequestInfo) => ({
        ...prev,
        fileAnalysis: data,
      }));

    } catch (error) {
      console.error("File Upload Error:", error);
      setRequestInfo((prev: RequestInfo) => ({
        ...prev,
        fileError: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  const showBrowserHeaders = () => {
    // Show current browser request headers with correct ports
    const browserHeaders = {
      "accept": "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9",
      "connection": "keep-alive",
      "host": `localhost:${API_PORT}`,
      "origin": FRONTEND_URL,
      "referer": `${FRONTEND_URL}/`,
      "sec-ch-ua": `"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": `"macOS"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    };

    setHeaders(browserHeaders);
    setRequestInfo({
      type: "Browser Request Headers",
      source: "Your Browser",
      apiPort: API_PORT,
      frontendPort: FRONTEND_PORT,
      apiUrl: API_URL,
      frontendUrl: FRONTEND_URL,
    });
    setCORSStatus("📤 Outgoing Request");
  };

  useEffect(() => {
    showBrowserHeaders();
  }, []);

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
      }}>🌐 HTTP Headers & CORS Demo</h3>
      
      {/* CORS Status */}
      <div style={{
        background: "#fffbeb",
        border: "1px solid #fed7aa",
        borderRadius: "0.25rem",
        padding: "0.75rem",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", color: "#92400e" }}>
            CORS Status: {corsStatus}
          </span>
          <span style={{ fontSize: "0.875rem", color: "#92400e" }}>
            Frontend: {FRONTEND_PORT} → API: {API_PORT}
          </span>
        </div>
      </div>

      {/* Test Buttons */}
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        padding: "1rem",
        marginBottom: "1rem",
      }}>
        <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>Test API Connection:</h4>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={testAPIConnection}
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
            Test Health API
          </button>
          <button
            onClick={testFileUpload}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Test File Upload
          </button>
          <button
            onClick={showBrowserHeaders}
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
            Show Browser Headers
          </button>
        </div>
      </div>

      {/* Request Info */}
      {Object.keys(requestInfo).length > 0 && (
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          padding: "1rem",
          marginBottom: "1rem",
        }}>
          <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>Request Information:</h4>
          <pre style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "0.25rem",
            padding: "0.75rem",
            fontSize: "0.875rem",
            overflow: "auto",
            maxHeight: "150px",
          }}>
            {JSON.stringify(requestInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* HTTP Headers */}
      {Object.keys(headers).length > 0 && (
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          padding: "1rem",
          marginBottom: "1rem",
        }}>
          <h4 style={{ marginBottom: "0.75rem", color: "#374151" }}>
            HTTP Headers ({Object.keys(headers).length}):
          </h4>
          <div style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "0.25rem",
            padding: "0.75rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}>
            {Object.entries(headers).map(([key, value]) => (
              <div key={key} style={{
                marginBottom: "0.5rem",
                padding: "0.5rem",
                background: key.startsWith("access-control-") ? "#dcfce7" : 
                           key.startsWith("sec-") ? "#fef3c7" : "#f9fafb",
                borderRadius: "0.25rem",
                fontSize: "0.875rem",
              }}>
                <strong style={{ color: "#1f2937" }}>{key}:</strong>
                <br />
                <span style={{ color: "#6b7280", wordBreak: "break-all" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CORS Explanation */}
      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "0.25rem",
        fontSize: "0.875rem",
        color: "#1e3a8a",
      }}>
        <strong>🔧 CORS Configuration:</strong>
        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
          <li><strong>Origin:</strong> {FRONTEND_URL} (allowed)</li>
          <li><strong>Methods:</strong> GET, POST (allowed)</li>
          <li><strong>Headers:</strong> Content-Type, X-Requested-With (allowed)</li>
          <li><strong>Same-site:</strong> Both servers on localhost</li>
        </ul>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem" }}>
          <strong>📡 API Server:</strong> {API_URL} | <strong>🌐 Frontend:</strong> {FRONTEND_URL}
        </p>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", fontStyle: "italic" }}>
          <strong>🔧 Environment Variables:</strong> PORT={FRONTEND_PORT}, API_PORT={API_PORT}
        </p>
      </div>
    </div>
  );
};
