import { createRoot } from "react-dom/client";
import { FileAnalyzer } from "./components/FileAnalyzer";
import { DOMAnalyzer } from "./components/DOMAnalyzer";
import { CookieManagerComponent } from "./components/CookieManager";
import { URLPatternDemo } from "./components/URLPatternDemo";
import { BunCookieMapDemo } from "./components/BunCookieMapDemo";
import { HTTPHeadersDemo } from "./components/HTTPHeadersDemo";
import { DevDashboard } from "./components/DevDashboard";
import React, { StrictMode } from "react";
import { getHMRPersistentRoot } from "./hmr-persistent-root";
import App from "./app";
import "./styles.css";

// Import configuration with HMR support
import { config, initConfigHMR } from "./config";
import { useConfigHMR } from "./config/hmr";

// Enhanced HMR-persistent root with config support
function HMRPersistentApp() {
  const [currentConfig, setCurrentConfig] = useConfigHMR(config);
  
  React.useEffect(() => {
    // Initialize config HMR
    initConfigHMR(currentConfig);
    
    // Listen for config updates
    const handleConfigUpdate = (event: CustomEvent) => {
      console.log("🔄 App: Configuration updated via HMR");
      setCurrentConfig(event.detail.config);
    };
    
    window.addEventListener('config-hmr-update', handleConfigUpdate as EventListener);
    
    return () => {
      window.removeEventListener('config-hmr-update', handleConfigUpdate as EventListener);
    };
  }, [currentConfig]);
  
  return (
    <StrictMode>
      <App config={currentConfig} />
    </StrictMode>
  );
}

// Get or create HMR-persistent root
const container = document.getElementById("root");
const root = getHMRPersistentRoot(container);

// Render with HMR support
if (import.meta.hot) {
  import.meta.hot.accept();
}

root.render(<HMRPersistentApp />);

// Professional themed application wrapper
const AppWithTheme = () => (
  <div style={{
    background: "linear-gradient(135deg, #3b82f6, #22c55e)",
    minHeight: "100vh",
    padding: "2rem",
  }}>
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "1rem",
      padding: "2rem",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    }}>
      <header style={{
        marginBottom: "2rem",
        textAlign: "center",
      }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          color: "#1f2937",
          background: "linear-gradient(135deg, #3b82f6, #22c55e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          🚀 Bun Enhanced File Analyzer v1.3.6+
        </h1>
        
        <nav style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}>
          <a 
            href="https://github.com/brendadeeznuts1111/bun-enhanced-file-analyzer"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "rgba(59, 130, 246, 0.1)",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            📚 Documentation
          </a>
          <a 
            href="https://bun.sh/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#22c55e",
              textDecoration: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "rgba(34, 197, 94, 0.1)",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
          🔗 Bun Docs
          </a>
          <a 
            href="https://github.com/brendadeeznuts1111/bun-enhanced-file-analyzer/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#f59e0b",
              textDecoration: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "rgba(245, 158, 11, 0.1)",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(245, 158, 11, 0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            🐛 Report Issues
          </a>
        </nav>
        
        <p style={{ 
          color: "#6b7280", 
          marginBottom: "2rem",
          fontSize: "1.1rem",
          lineHeight: "1.6",
        }}>
          🎯 <strong>Production-ready Bun v1.3.6+ Enhanced File Analyzer</strong> featuring Virtual Files, 
          Configuration Matrix, and Professional Dashboard. Explore native Bun APIs, 
          React Fast Refresh, and enterprise-grade architecture.
        </p>
      </header>
      
      <FileAnalyzer />
      
      <hr style={{ margin: "2rem 0", border: "1px solid #e5e7eb" }} />
      
      <DevDashboard />
      
      <hr style={{ margin: "2rem 0", border: "1px solid #e5e7eb" }} />
      
      <HTTPHeadersDemo />
      
      <hr style={{ margin: "2rem 0", border: "1px solid #e5e7eb" }} />
      
      <CookieManagerComponent />
      
      <hr style={{ margin: "2rem 0", border: "1px solid #e5e7eb" }} />
      
      <BunCookieMapDemo />
      
      <hr style={{ margin: "2rem 0", border: "1px solid #e5e7eb" }} />
      
      <URLPatternDemo />
      
      <hr style={{ margin: "2rem 0", border: "1px solid #e5e7eb" }} />
      
      <DOMAnalyzer />
    </div>
  </div>
);

root.render(<AppWithTheme />);

// HMR setup
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log("%c✅ App updated via HMR", "color: #22c55e");
  });
  
  import.meta.hot.dispose(() => {
    import.meta.hot.data.root = root;
  });
}

// Service worker registration (re-enabled)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(registration => {
    console.log("%c📡 SW registered", "color: #0ea5e9");
  });
}
