/**
 * PageLayout — Common Page Wrapper
 *
 * Wraps page content with sidebar + topbar + content area.
 * Provides Suspense fallback for lazy-loaded pages.
 */

import React, { Suspense } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PageLayoutProps {
  children: React.ReactNode;
  version: string;
  wsConnected: boolean;
  serverTime: string;
  activeAlerts: number;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  pageTitle?: string;
}

// ---------------------------------------------------------------------------
// Loading Fallback
// ---------------------------------------------------------------------------

const PageLoadingFallback: React.FC = () => (
  <div className="page-loading">
    <div className="spinner" />
    <p>Loading page...</p>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  version,
  wsConnected,
  serverTime,
  activeAlerts,
  sidebarCollapsed,
  onToggleSidebar,
  pageTitle,
}) => {
  return (
    <div className={`app-layout ${sidebarCollapsed ? "collapsed" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        wsConnected={wsConnected}
        version={version}
      />

      <main className="main-content">
        <TopBar
          title={pageTitle}
          serverTime={serverTime}
          activeAlerts={activeAlerts}
          wsConnected={wsConnected}
        />

        <div className="content-area">
          <Suspense fallback={<PageLoadingFallback />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default PageLayout;
