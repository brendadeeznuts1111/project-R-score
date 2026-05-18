/**
 * Tools Template Main Entry Point
 * Main tools dashboard and navigation
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateToolsPage(employee: EmployeeData, pathname?: string): string {
  const content = generateToolsContent(employee);

  const html = `
    ${generateHtmlHead(
      `Tools & Features - ${employee.name}`,
      'Available tools, feature access, and capability management'
    )}
    ${generateHeader(employee, '/tools')}
    <main class="tools-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateToolsContent(employee: EmployeeData): string {
  const tools = [
    {
      icon: '🛠️',
      title: 'Development Tools',
      description: 'Code editors, debuggers, and development utilities',
      status: 'available',
    },
    {
      icon: '📊',
      title: 'Analytics Tools',
      description: 'Data analysis, reporting, and visualization tools',
      status: 'available',
    },
    {
      icon: '🔧',
      title: 'System Tools',
      description: 'System maintenance, monitoring, and management tools',
      status: 'available',
    },
    {
      icon: '📱',
      title: 'Mobile Tools',
      description: 'Mobile development and testing tools',
      status: 'coming-soon',
    },
  ];

  return `
    <div class="tools-overview">
      <div class="tools-header">
        <h1>🛠️ Tools & Features</h1>
        <p>Available tools, feature access, and capability management</p>
      </div>

      <div class="tools-grid">
        ${tools
          .map(
            tool => `
          <div class="tool-card ${tool.status === 'available' ? 'active' : 'disabled'}">
            <div class="tool-icon">${tool.icon}</div>
            <div class="tool-content">
              <h3>${tool.title}</h3>
              <p>${tool.description}</p>
              <div class="tool-status ${tool.status}">${tool.status.replace('-', ' ').toUpperCase()}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="tools-actions">
        <button class="btn-primary" onclick="refreshTools()">🔄 Refresh Tools</button>
        <button class="btn-secondary" onclick="openToolManager()">⚙️ Tool Manager</button>
      </div>
    </div>
  `;
}

// Tool management functions
declare function refreshTools(): void;
declare function openToolManager(): void;
