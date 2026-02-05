import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import {
  OverviewPage,
  ProxiesPage,
  AnalyticsPage,
  DuoPlusPage,
  UnifiedManagementPage,
  SettingsPage
} from "../../pages";

import { Sidebar, Header } from "./index";

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div
          className={`lg:pl-64 transition-all duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-16"}`}
        >
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Page content */}
          <main className="p-6">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/proxies" element={<ProxiesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/duoplus" element={<DuoPlusPage />} />
              <Route path="/unified" element={<UnifiedManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};
