// 🕒 DashboardHeader.tsx - Timezone-Aware Header Component
import React from 'react';
import { Badge } from './ui/badge';

interface DashboardHeaderProps {
  scope?: string;
  timezone?: string;
  platform?: string;
  version?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  scope = process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
  timezone = process.env.TZ || 'UTC',
  platform = process.platform || 'unknown',
  version = 'v3.7'
}) => {
  // Get current time in the active timezone
  const getCurrentTime = () => {
    return new Date().toLocaleString('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Get platform icon
  const getPlatformIcon = () => {
    switch (platform) {
      case 'darwin': return '🍎';
      case 'linux': return '🐧';
      case 'win32': return '🪟';
      default: return '💻';
    }
  };

  // Get scope color variant
  const getScopeVariant = () => {
    switch (scope) {
      case 'ENTERPRISE': return 'destructive';
      case 'DEVELOPMENT': return 'default';
      case 'LOCAL-SANDBOX': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <header className="dashboard-header border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Title and Scope */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">DuoPlus Dashboard</h1>
            <Badge variant={getScopeVariant()} className="text-xs">
              {scope}
            </Badge>
          </div>

          {/* Right: Environment Indicators */}
          <div className="flex items-center space-x-4 text-sm">
            {/* Timezone Indicator */}
            <div 
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-muted"
              title={`Active timezone: ${timezone} (IANA)`}
            >
              <span className="text-lg">🕒</span>
              <span className="font-mono text-xs">{timezone}</span>
            </div>

            {/* Current Time */}
            <div 
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-muted"
              title={`Current time in ${timezone}`}
            >
              <span className="text-lg">⏰</span>
              <span className="font-mono text-xs">{getCurrentTime()}</span>
            </div>

            {/* Platform Indicator */}
            <div 
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-muted"
              title={`Platform: ${platform}`}
            >
              <span className="text-lg">{getPlatformIcon()}</span>
              <span className="font-mono text-xs">{platform}</span>
            </div>

            {/* Version */}
            <div 
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-muted"
              title={`Version: ${version}`}
            >
              <span className="text-lg">🏷️</span>
              <span className="font-mono text-xs">{version}</span>
            </div>
          </div>
        </div>

        {/* Environment Context Bar */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Scope: <strong>{scope}</strong></span>
            <span>Timezone: <strong>{timezone}</strong></span>
            <span>Platform: <strong>{platform}</strong></span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Deterministic v3.7</span>
            <span>•</span>
            <span>Multi-Tenant Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// Server-side rendering helper
export const getServerSideHeaderProps = () => {
  return {
    scope: process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
    timezone: process.env.TZ || 'UTC',
    platform: process.platform || 'unknown',
    version: 'v3.7'
  };
};

// HTML injection helper for static dashboards
export const injectHeaderConfig = (html: string) => {
  const config = getServerSideHeaderProps();
  const configScript = `
    <script>
      window.DUOPLUS_CONFIG = ${JSON.stringify(config)};
      window.DASHBOARD_SCOPE = "${config.scope}";
      window.TIMEZONE = "${config.timezone}";
      window.PLATFORM = "${config.platform}";
    </script>
  `;
  
  return html.replace('</head>', configScript + '</head>');
};
