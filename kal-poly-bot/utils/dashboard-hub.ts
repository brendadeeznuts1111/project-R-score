/**
 * Dashboard Hub Configuration Manager
 * Centralized access to all dashboard and hub configurations
 */

export interface DashboardHubConfig {
  hub: {
    name: string;
    description: string;
    url: string;
    type: string;
    domain: string;
    accountId: string;
    primary: boolean;
    categories: string[];
    accessLevel: string;
    lastUpdated: string;
  };
  dashboards: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    description: string;
    category: string;
    primary?: boolean;
  }>;
  repositories: Array<{
    name: string;
    url: string;
    hub: string;
  }>;
  integrations: {
    cloudflare: {
      accountId: string;
      domain: string;
      dashboardUrl: string;
    };
  };
}

/**
 * Load dashboard hub configuration
 */
export async function loadDashboardHubConfig(): Promise<DashboardHubConfig> {
  try {
    const config = await import('../configs/dashboards-hub.json');
    return config.default || config;
  } catch (error) {
    console.warn('⚠️ Could not load dashboard hub config, using defaults:', error);
    return getDefaultConfig();
  }
}

/**
 * Get default dashboard hub configuration
 */
function getDefaultConfig(): DashboardHubConfig {
  return {
    hub: {
      name: 'Factory Wager Cloudflare Hub',
      description: 'Central hub for all repositories, dashboards, and operational monitoring',
      url: 'https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/factory-wager.com',
      type: 'cloudflare',
      domain: 'factory-wager.com',
      accountId: '7a470541a704caaf91e71efccc78fd36',
      primary: true,
      categories: ['infrastructure', 'cdn', 'dns', 'security', 'analytics', 'repositories'],
      accessLevel: 'admin',
      lastUpdated: new Date().toISOString()
    },
    dashboards: [
      {
        id: 'cloudflare-hub',
        name: 'Cloudflare Dashboard Hub',
        url: 'https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/factory-wager.com',
        type: 'cloudflare',
        description: 'Primary hub for all repos, dashboards, and infrastructure',
        category: 'hub',
        primary: true
      }
    ],
    repositories: [],
    integrations: {
      cloudflare: {
        accountId: '7a470541a704caaf91e71efccc78fd36',
        domain: 'factory-wager.com',
        dashboardUrl: 'https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/factory-wager.com'
      }
    }
  };
}

/**
 * Get primary hub URL
 */
export async function getPrimaryHubUrl(): Promise<string> {
  const config = await loadDashboardHubConfig();
  return config.hub.url;
}

/**
 * Get all dashboard URLs
 */
export async function getAllDashboardUrls(): Promise<Array<{ name: string; url: string; type: string }>> {
  const config = await loadDashboardHubConfig();
  return config.dashboards.map(d => ({
    name: d.name,
    url: d.url,
    type: d.type
  }));
}

/**
 * Get Cloudflare integration details
 */
export async function getCloudflareIntegration() {
  const config = await loadDashboardHubConfig();
  return config.integrations.cloudflare;
}

/**
 * Open primary hub in browser (Bun-specific)
 */
export async function openPrimaryHub(): Promise<void> {
  const url = await getPrimaryHubUrl();
  if (typeof Bun !== 'undefined') {
    await Bun.spawn(['open', url]).exited;
  } else {
    console.log(`🌐 Primary Hub URL: ${url}`);
  }
}

