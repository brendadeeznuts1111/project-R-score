import React from "react";
import { FileAnalyzer } from "./components/FileAnalyzer";
import { DOMAnalyzer } from "./components/DOMAnalyzer";
import { CookieManagerComponent } from "./components/CookieManager";
import { URLPatternDemo } from "./components/URLPatternDemo";
import { BunCookieMapDemo } from "./components/BunCookieMapDemo";
import { HTTPHeadersDemo } from "./components/HTTPHeadersDemo";
import { DevDashboard } from "./components/DevDashboard";
import type { Config } from "./config/types";

interface AppProps {
  config?: Config;
}

export default function App({ config: appConfig }: AppProps = {}) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #3b82f6, #22c55e)",
      minHeight: "100vh",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        background: "white",
        borderRadius: "1rem",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <header style={{
          background: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
          color: "white",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}>
            Bun Enhanced File Analyzer
          </h1>
          <p style={{
            fontSize: "1.1rem",
            margin: 0,
            opacity: 0.9,
          }}>
            v{appConfig?.version || "1.3.6+"} with HMR Configuration Support
          </p>
          {appConfig && (
            <div style={{
              marginTop: "1rem",
              fontSize: "0.9rem",
              opacity: 0.8,
            }}>
              Features: {appConfig.features?.join(", ")}
            </div>
          )}
        </header>

        {/* Navigation */}
        <nav style={{
          background: "#f8fafc",
          padding: "1rem 2rem",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
          }}>
            <a href="#file-analyzer" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
              "&:hover": {
                textDecoration: "underline",
              },
            }}>
              📁 File Analyzer
            </a>
            <a href="#dom-analyzer" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}>
              🌐 DOM Analyzer
            </a>
            <a href="#cookie-manager" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}>
              🍪 Cookie Manager
            </a>
            <a href="#urlpattern-demo" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}>
              🔗 URLPattern
            </a>
            <a href="#bun-cookiemap" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}>
              🍯 Bun.CookieMap
            </a>
            <a href="#http-headers" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}>
              📡 HTTP Headers
            </a>
            <a href="#dev-dashboard" style={{
              color: appConfig?.virtualFiles?.theme?.primary || "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}>
              📊 Dashboard
            </a>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ padding: "2rem" }}>
          <div style={{
            display: "grid",
            gap: "2rem",
            gridTemplateColumns: "1fr",
          }}>
            {/* File Analyzer */}
            <section id="file-analyzer">
              <FileAnalyzer config={appConfig} />
            </section>

            {/* DOM Analyzer */}
            <section id="dom-analyzer">
              <DOMAnalyzer config={appConfig} />
            </section>

            {/* Cookie Manager */}
            <section id="cookie-manager">
              <CookieManagerComponent config={appConfig} />
            </section>

            {/* URLPattern Demo */}
            <section id="urlpattern-demo">
              <URLPatternDemo config={appConfig} />
            </section>

            {/* Bun CookieMap Demo */}
            <section id="bun-cookiemap">
              <BunCookieMapDemo config={appConfig} />
            </section>

            {/* HTTP Headers Demo */}
            <section id="http-headers">
              <HTTPHeadersDemo config={appConfig} />
            </section>

            {/* Dev Dashboard */}
            <section id="dev-dashboard">
              <DevDashboard config={appConfig} />
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          background: "#f8fafc",
          padding: "2rem",
          textAlign: "center",
          borderTop: "1px solid #e2e8f0",
        }}>
          <p style={{
            color: "#64748b",
            margin: "0 0 1rem 0",
          }}>
            Built with Bun v1.3.6+ • React Fast Refresh • HMR Configuration Support
          </p>
          <div style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            <span style={{
              color: appConfig?.virtualFiles?.theme?.success || "#22c55e",
              fontSize: "0.9rem",
            }}>
              ✅ Virtual Files
            </span>
            <span style={{
              color: appConfig?.virtualFiles?.theme?.success || "#22c55e",
              fontSize: "0.9rem",
            }}>
              ✅ Cross-Compilation
            </span>
            <span style={{
              color: appConfig?.virtualFiles?.theme?.success || "#22c55e",
              fontSize: "0.9rem",
            }}>
              ✅ HMR Config
            </span>
            <span style={{
              color: appConfig?.virtualFiles?.theme?.success || "#22c55e",
              fontSize: "0.9rem",
            }}>
              ✅ Performance
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
