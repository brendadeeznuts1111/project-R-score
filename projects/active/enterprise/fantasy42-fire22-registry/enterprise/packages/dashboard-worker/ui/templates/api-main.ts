/**
 * Main API Template Entry Point
 * Routes to appropriate templates based on pathname
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';
import { generateApiDashboardPage } from './api-dashboard';
import { generateApiEndpointsPage } from './api-endpoints';
import { generateApiMonitoringPage } from './api-monitoring';
import { generateApiLogsPage } from './api-logs';
import { generateApiSecurityPage } from './api-security';

export async function generateApiPage(employee: EmployeeData, pathname?: string): Promise<string> {
  const content = await generateApiContent(employee, pathname);

  const html = `
    ${generateHtmlHead(
      `API Management - ${employee.name}`,
      'Comprehensive API endpoints for system integration, data access, and automation'
    )}
    ${generateHeader(employee, '/api')}
    <main class="api-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

async function generateApiContent(employee: EmployeeData, pathname?: string): Promise<string> {
  // Route to appropriate template based on pathname
  if (pathname === '/api/endpoints') {
    return generateApiEndpointsPage(employee).match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
  } else if (pathname === '/api/monitoring') {
    return generateApiMonitoringPage(employee).match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
  } else if (pathname === '/api/logs') {
    return generateApiLogsPage(employee).match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
  } else if (pathname === '/api/security') {
    const securityPage = await generateApiSecurityPage(employee);
    return securityPage.match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
  } else if (
    pathname?.startsWith('/api/dashboard') ||
    pathname?.startsWith('/api/messaging') ||
    pathname?.startsWith('/api/weekly-figures') ||
    pathname?.startsWith('/api/pending') ||
    pathname?.startsWith('/api/customer-admin') ||
    pathname?.startsWith('/api/agent-admin') ||
    pathname?.startsWith('/api/game-admin') ||
    pathname?.startsWith('/api/cashier') ||
    pathname?.startsWith('/api/reporting') ||
    pathname?.startsWith('/api/admin-tools') ||
    pathname?.startsWith('/api/billing') ||
    pathname?.startsWith('/api/rules') ||
    pathname?.startsWith('/api/settings')
  ) {
    // Route sportsbook admin endpoints to dashboard for now
    return generateApiDashboardPage(employee).match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
  } else {
    // Default to dashboard
    return generateApiDashboardPage(employee).match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
  }
}
