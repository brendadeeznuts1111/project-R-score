// server/dashboard-config-injection.ts
// Server-side configuration injection for dashboard timezone awareness

import { validateAndSetTimezone } from '../bootstrap-timezone';

export interface DashboardConfig {
  DASHBOARD_SCOPE: string;
  TIMEZONE: string;
  TIMEZONE_DISPLAY: string;
  PLATFORM: string;
  VERSION: string;
  BUILD_NUMBER: string;
}

export function getDashboardConfig(): DashboardConfig {
  // Get validated timezone configuration
  const tzConfig = validateAndSetTimezone();
  
  // Detect platform
  const platform = process.platform;
  
  return {
    DASHBOARD_SCOPE: process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX',
    TIMEZONE: tzConfig.scopeTimezone,
    TIMEZONE_DISPLAY: tzConfig.displayName,
    PLATFORM: platform,
    VERSION: process.env.APP_VERSION || 'v2.1.0',
    BUILD_NUMBER: process.env.BUILD_NUMBER || new Date().toISOString().split('T')[0].replace(/-/g, '.')
  };
}

export function injectDashboardConfig(htmlTemplate: string): string {
  const config = getDashboardConfig();
  
  // Inject configuration as global JavaScript variable
  const configScript = `
    <script>
      window.DASHBOARD_CONFIG = ${JSON.stringify(config)};
      
      // Ensure timezone is set for client-side Date operations
      if (typeof process !== 'undefined' && process.env) {
        process.env.TZ = "${config.TIMEZONE}";
      }
    </script>
  `;
  
  // Insert before closing head tag or at end of body
  return htmlTemplate.replace('</head>', configScript + '</head>')
                    .replace('</body>', configScript + '</body>');
}

// Express middleware for automatic config injection
export function dashboardConfigMiddleware(req: any, res: any, next: any) {
  const originalSend = res.send;
  
  res.send = function(html: string) {
    if (typeof html === 'string' && html.includes('<html')) {
      html = injectDashboardConfig(html);
    }
    originalSend.call(this, html);
  };
  
  next();
}
