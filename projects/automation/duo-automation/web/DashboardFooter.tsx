// 🕒 DashboardFooter.tsx - Timezone-Aware Footer Component
import React from 'react';

interface DashboardFooterProps {
  scope?: string;
  timezone?: string;
  platform?: string;
  version?: string;
  buildTime?: string;
  environment?: string;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({
  scope = process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
  timezone = process.env.TZ || 'UTC',
  platform = process.platform || 'unknown',
  version = 'v3.7',
  buildTime = new Date().toISOString(),
  environment = process.env.NODE_ENV || 'development'
}) => {
  // Get detailed current time in the active timezone
  const getDetailedTime = () => {
    return new Date().toLocaleString('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Get timezone offset information
  const getTimezoneOffset = () => {
    const now = new Date();
    const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const localTime = new Date(utcTime.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (localTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);
    return offset >= 0 ? `+${offset}` : `${offset}`;
  };

  // Get build metadata
  const getBuildInfo = () => {
    return {
      version,
      buildTime,
      environment,
      nodeVersion: process.versions.bun || process.versions.node,
      platform
    };
  };

  const buildInfo = getBuildInfo();

  return (
    <footer className="dashboard-footer border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-4">
        {/* Primary Footer Row */}
        <div className="flex items-center justify-between text-sm mb-2">
          {/* Left: Environment Context */}
          <div className="flex items-center space-x-4 font-mono text-xs">
            <span className="text-muted-foreground">Scope:</span>
            <span className="font-semibold text-foreground">{scope}</span>
            
            <span className="text-muted-foreground">•</span>
            
            <span className="text-muted-foreground">TZ:</span>
            <span className="font-semibold text-foreground" title={`IANA: ${timezone} | Offset: UTC${getTimezoneOffset()}`}>
              {timezone}
            </span>
            
            <span className="text-muted-foreground">•</span>
            
            <span className="text-muted-foreground">Platform:</span>
            <span className="font-semibold text-foreground">{platform}</span>
          </div>

          {/* Right: Version Info */}
          <div className="flex items-center space-x-4 font-mono text-xs">
            <span className="text-muted-foreground">v{version}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{environment}</span>
          </div>
        </div>

        {/* Secondary Footer Row - Detailed Context */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          {/* Left: Current Time Display */}
          <div className="flex items-center space-x-2">
            <span>🕒</span>
            <span>Current Time ({timezone}):</span>
            <span className="font-mono font-semibold text-foreground">
              {getDetailedTime()}
            </span>
          </div>

          {/* Center: Build Information */}
          <div className="flex items-center space-x-4">
            <span className="font-mono">
              Built: {new Date(buildInfo.buildTime).toLocaleString()}
            </span>
            <span className="font-mono">
              Runtime: Bun {buildInfo.nodeVersion}
            </span>
          </div>

          {/* Right: Audit Trail */}
          <div className="flex items-center space-x-2">
            <span>🔐</span>
            <span>Deterministic v3.7</span>
            <span>•</span>
            <span>Audit Ready</span>
          </div>
        </div>

        {/* Debug Information (Hidden by default, visible with ?debug=true) */}
        <div className="hidden debug-info mt-2 pt-2 border-t text-xs font-mono">
          <details>
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Debug Information
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <strong>Environment Variables:</strong>
                <pre className="mt-1 text-xs bg-background p-2 rounded">
{`DASHBOARD_SCOPE=${scope}
TZ=${timezone}
NODE_ENV=${environment}
PLATFORM=${platform}`}
                </pre>
              </div>
              <div>
                <strong>Timezone Details:</strong>
                <pre className="mt-1 text-xs bg-background p-2 rounded">
{`IANA: ${timezone}
Offset: UTC${getTimezoneOffset()}
Current: ${getDetailedTime()}
UTC: ${new Date().toISOString()}`}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    </footer>
  );
};

// Server-side rendering helper
export const getServerSideFooterProps = () => {
  return {
    scope: process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
    timezone: process.env.TZ || 'UTC',
    platform: process.platform || 'unknown',
    version: 'v3.7',
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
};

// Static HTML footer injection
export const getStaticFooterHTML = () => {
  const props = getServerSideFooterProps();
  return `
    <footer class="dashboard-footer border-t bg-muted/30 mt-auto">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <div class="flex items-center space-x-4 font-mono text-xs">
            <span class="text-muted-foreground">Scope:</span>
            <span class="font-semibold text-foreground">${props.scope}</span>
            <span class="text-muted-foreground">•</span>
            <span class="text-muted-foreground">TZ:</span>
            <span class="font-semibold text-foreground">${props.timezone}</span>
            <span class="text-muted-foreground">•</span>
            <span class="text-muted-foreground">Platform:</span>
            <span class="font-semibold text-foreground">${props.platform}</span>
          </div>
          <div class="flex items-center space-x-4 font-mono text-xs">
            <span class="text-muted-foreground">v${props.version}</span>
            <span class="text-muted-foreground">•</span>
            <span class="text-muted-foreground">${props.environment}</span>
          </div>
        </div>
        <div class="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <div class="flex items-center space-x-2">
            <span>🕒</span>
            <span>Current Time (${props.timezone}):</span>
            <span class="font-mono font-semibold text-foreground" id="current-time">
              Loading...
            </span>
          </div>
          <div class="flex items-center space-x-4">
            <span class="font-mono">Built: ${new Date(props.buildTime).toLocaleString()}</span>
            <span class="font-mono">Runtime: Bun ${process.versions.bun}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span>🔐</span>
            <span>Deterministic v3.7</span>
            <span>•</span>
            <span>Audit Ready</span>
          </div>
        </div>
      </div>
    </footer>
    <script>
      // Update current time every second
      function updateCurrentTime() {
        const now = new Date();
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
          timeElement.textContent = now.toLocaleString('en-US', {
            timeZone: '${props.timezone}',
            timeZoneName: 'long',
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        }
      }
      updateCurrentTime();
      setInterval(updateCurrentTime, 1000);
    </script>
  `;
};
