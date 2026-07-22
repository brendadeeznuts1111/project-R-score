/**
 * Dashboard Hub Configuration Manager
 * Centralized access to all dashboard and hub configurations
 */

import {
  CLOUDFLARE_DEFAULTS,
  cloudflareAccountIdFromEnv,
} from '../../../../../config/r2-env.ts';

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
  const accountId = cloudflareAccountIdFromEnv();
  const zone = CLOUDFLARE_DEFAULTS.zones.factoryWager.name;
  const dashboardUrl = `https://dash.cloudflare.com/${accountId}/${zone}`;
  return {
    hub: {
      name: 'Factory Wager Cloudflare Hub',
      description: 'Central hub for all repositories, dashboards, and operational monitoring',
      url: dashboardUrl,
      type: 'cloudflare',
      domain: zone,
      accountId,
      primary: true,
      categories: ['infrastructure', 'cdn', 'dns', 'security', 'analytics', 'repositories'],
      accessLevel: 'admin',
      lastUpdated: new Date().toISOString(),
    },
    dashboards: [
      {
        id: 'cloudflare-hub',
        name: 'Cloudflare Dashboard Hub',
        url: dashboardUrl,
        type: 'cloudflare',
        description: 'Primary hub for all repos, dashboards, and infrastructure',
        category: 'hub',
        primary: true,
      },
    ],
    repositories: [],
    integrations: {
      cloudflare: {
        accountId,
        domain: zone,
        dashboardUrl,
      },
    },
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
    console.info(`🌐 Primary Hub URL: ${url}`);
  }
}

