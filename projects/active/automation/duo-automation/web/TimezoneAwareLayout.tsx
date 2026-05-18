// 🕒 TimezoneAwareLayout.tsx - Complete Timezone-Aware Dashboard Layout
import React, { useEffect, useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';

interface TimezoneAwareLayoutProps {
  children: React.ReactNode;
  title?: string;
  scope?: string;
  timezone?: string;
  platform?: string;
  version?: string;
}

export const TimezoneAwareLayout: React.FC<TimezoneAwareLayoutProps> = ({
  children,
  title = 'DuoPlus Dashboard',
  scope,
  timezone,
  platform,
  version
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [config, setConfig] = useState({
    scope: scope || process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
    timezone: timezone || process.env.TZ || 'UTC',
    platform: platform || process.platform || 'unknown',
    version: version || 'v3.7'
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load config from window if available (for static HTML)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.DUOPLUS_CONFIG) {
      setConfig(window.DUOPLUS_CONFIG);
    }
  }, []);

  // Format time in the active timezone
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      timeZone: config.timezone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Get timezone offset
  const getTimezoneOffset = () => {
    const now = new Date();
    const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const localTime = new Date(utcTime.toLocaleString('en-US', { timeZone: config.timezone }));
    const offset = (localTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);
    return offset >= 0 ? `+${offset}` : `${offset}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Document Head with Meta */}
      <head>
        <title>{title} - {config.scope} - {config.timezone}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="dashboard-scope" content={config.scope} />
        <meta name="dashboard-timezone" content={config.timezone} />
        <meta name="dashboard-platform" content={config.platform} />
        <meta name="dashboard-version" content={config.version} />
      </head>

      {/* Timezone-Aware Header */}
      <DashboardHeader
        scope={config.scope}
        timezone={config.timezone}
        platform={config.platform}
        version={config.version}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Environment Banner */}
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Scope:</span>
                <code className="px-2 py-1 bg-background rounded">{config.scope}</code>
                <span>•</span>
                <span>Timezone:</span>
                <code className="px-2 py-1 bg-background rounded">{config.timezone}</code>
                <span>(UTC{getTimezoneOffset()})</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Current Time:</span>
              <code className="px-2 py-1 bg-background rounded font-mono">
                {formatTime(currentTime)}
              </code>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </main>

      {/* Timezone-Aware Footer */}
      <DashboardFooter
        scope={config.scope}
        timezone={config.timezone}
        platform={config.platform}
        version={config.version}
      />

      {/* Global Styles */}
      <style jsx global>{`
        .dashboard-header {
          position: sticky;
          top: 0;
          z-index: 50;
        }
        
        .dashboard-footer {
          margin-top: auto;
        }
        
        /* Ensure timezone indicators are always visible */
        .timezone-indicator {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        }
        
        /* Environment-specific styling */
        .scope-enterprise {
          border-left: 4px solid #dc2626;
        }
        
        .scope-development {
          border-left: 4px solid #3b82f6;
        }
        
        .scope-local-sandbox {
          border-left: 4px solid #16a34a;
        }
      `}</style>
    </div>
  );
};

// Hook for accessing timezone config
export const useTimezoneConfig = () => {
  const [config, setConfig] = useState({
    scope: process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
    timezone: process.env.TZ || 'UTC',
    platform: process.platform || 'unknown',
    version: 'v3.7'
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.DUOPLUS_CONFIG) {
      setConfig(window.DUOPLUS_CONFIG);
    }
  }, []);

  return config;
};

// Higher-order component for timezone awareness
export const withTimezoneAwareness = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const config = useTimezoneConfig();
    
    return (
      <TimezoneAwareLayout {...config}>
        <Component {...props} ref={ref} />
      </TimezoneAwareLayout>
    );
  });
};

// Server-side rendering utilities
export const getServerSideProps = async (context: any) => {
  return {
    props: {
      scope: process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
      timezone: process.env.TZ || 'UTC',
      platform: process.platform || 'unknown',
      version: 'v3.7',
      buildTime: new Date().toISOString()
    }
  };
};

// Static HTML generation helper
export const generateTimezoneAwareHTML = (content: string, config: any = {}) => {
  const finalConfig = {
    scope: config.scope || process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
    timezone: config.timezone || process.env.TZ || 'UTC',
    platform: config.platform || process.platform || 'unknown',
    version: config.version || 'v3.7',
    ...config
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="dashboard-scope" content="${finalConfig.scope}" />
      <meta name="dashboard-timezone" content="${finalConfig.timezone}" />
      <meta name="dashboard-platform" content="${finalConfig.platform}" />
      <meta name="dashboard-version" content="${finalConfig.version}" />
      <title>DuoPlus Dashboard - ${finalConfig.scope} - ${finalConfig.timezone}</title>
      <script>
        window.DUOPLUS_CONFIG = ${JSON.stringify(finalConfig)};
        window.DASHBOARD_SCOPE = "${finalConfig.scope}";
        window.TIMEZONE = "${finalConfig.timezone}";
        window.PLATFORM = "${finalConfig.platform}";
      </script>
    </head>
    <body class="min-h-screen flex flex-col bg-background">
      ${content}
    </body>
    </html>
  `;
};
