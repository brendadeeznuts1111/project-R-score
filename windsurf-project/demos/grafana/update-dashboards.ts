// dashboards/grafana/update-dashboards.ts
/**
 * §Pattern:125 - Grafana Dashboard Integration
 * @pattern Pattern:125
 * @perf <1s
 * @roi 100x (automated dashboard updates)
 */

import { readFileSync } from 'fs';
import { addPattern } from '../../utils/pattern-matrix';
import { config, validateConfig } from '../../utils/config';
import { retryGrafana, RetryError } from '../../utils/retry';

interface GrafanaDashboard {
  dashboard: any;
  overwrite: boolean;
  folderId?: number;
}

interface GrafanaResponse {
  id: number;
  uid: string;
  status: string;
  slug?: string;
  url?: string;
}

async function findOrCreateFolder(): Promise<number> {
  console.log(`📁 Looking for Grafana folder: ${config.grafana.dashboardFolder}`);
  
  try {
    // Search for existing folder
    const searchResponse = await fetch(`${config.grafana.url}/api/folders`, {
      headers: {
        'Authorization': `Bearer ${config.grafana.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Failed to search folders: ${searchResponse.status}`);
    }

    const folders = await searchResponse.json();
    const existingFolder = folders.find((f: any) => f.title === config.grafana.dashboardFolder);
    
    if (existingFolder) {
      console.log(`✅ Found existing folder: ${existingFolder.title} (ID: ${existingFolder.id})`);
      return existingFolder.id;
    }

    // Create new folder
    console.log(`📁 Creating new folder: ${config.grafana.dashboardFolder}`);
    const createResponse = await fetch(`${config.grafana.url}/api/folders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.grafana.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: config.grafana.dashboardFolder
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create folder: ${createResponse.status}`);
    }

    const newFolder = await createResponse.json();
    console.log(`✅ Created folder: ${newFolder.title} (ID: ${newFolder.id})`);
    return newFolder.id;

  } catch (error) {
    console.error('❌ Error managing Grafana folder:', error);
    throw error;
  }
}

async function updateGrafanaDashboards() {
  console.log('🔄 Updating Grafana dashboards...');
  
  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  try {
    // Load dashboard configuration
    const dashboardConfig = readFileSync(`${config.paths.grafana}/dashboard-dashboard.json`, 'utf-8');
    const parsedConfig = JSON.parse(dashboardConfig);
    
    // Find or create folder
    const folderId = await findOrCreateFolder();
    
    const dashboard: GrafanaDashboard = {
      dashboard: parsedConfig.dashboard,
      overwrite: true,
      folderId
    };

    console.log(`📊 Deploying dashboard to Grafana at ${config.grafana.url}`);
    console.log(`  Dashboard: ${dashboard.dashboard.title}`);
    console.log(`  Panels: ${dashboard.dashboard.panels.length}`);
    console.log(`  Folder: ${config.grafana.dashboardFolder} (ID: ${folderId})`);
    
    // Deploy to Grafana with retry logic
    const response = await retryGrafana(async () => {
      const deployResponse = await fetch(`${config.grafana.url}/api/dashboards/db`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.grafana.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(config.thresholds.grafanaTimeout),
        body: JSON.stringify(dashboard)
      });

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Grafana API error ${deployResponse.status}: ${errorText}`);
      }

      return deployResponse.json();
    });

    console.log('✅ Dashboard deployed successfully:');
    console.log(`  ID: ${response.id}`);
    console.log(`  UID: ${response.uid}`);
    console.log(`  Status: ${response.status}`);
    console.log(`  URL: ${config.grafana.url}/d/${response.uid}`);

    // Register pattern in matrix
    addPattern('Pattern', 'GrafanaIntegration', {
      perf: '<1s',
      semantics: ['grafana', 'panels', 'api'],
      roi: '100x',
      section: '§Pattern',
      deps: ['grafana-api', 'config', 'retry'],
      verified: '✅ ' + new Date().toLocaleDateString()
    });

    return response;

  } catch (error) {
    if (error instanceof RetryError) {
      console.error('❌ Grafana deployment failed after retries:');
      console.error(`  Attempts: ${error.attempts}`);
      console.error(`  Final error: ${error.lastError.message}`);
    } else {
      console.error('❌ Error updating Grafana dashboards:', error);
    }
    process.exit(1);
  }
}

// Auto-run if main
if (import.meta.main) {
  updateGrafanaDashboards().catch(console.error);
}

export { updateGrafanaDashboards };
