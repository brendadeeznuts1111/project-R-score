/**
 * 🔥 Fire22 KPI Component System - Main Export
 * Comprehensive KPI component system for the Fire22 Dashboard Worker
 */

import {
  KPIComponent,
  type KPIConfig,
  createKPICard,
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
  KPIStyles,
} from './kpi-component.ts';

// Core KPI Component
export { KPIComponent, type KPIConfig };

// Pre-built KPI Components
export {
  createKPICard,
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
};

// Styles
export { KPIStyles };

// Integration Tools
export {
  DashboardKPIManager,
  quickIntegrateKPIs,
  replaceExistingKPIs,
  createResponsiveKPIGrid,
} from './integration-example.ts';

// Testing
export { KPIComponentTestSuite, runKPITests } from './kpi-component.test.ts';

// 🚀 Quick Start Examples
export const quickStartExamples = {
  /**
   * 🎯 Create a simple KPI
   */
  simpleKPI: () => {
    return createKPICard({
      label: 'Quick Start',
      value: 100,
      format: 'number',
      color: 'primary',
    });
  },

  /**
   * 📊 Create a dashboard with multiple KPIs
   */
  dashboardKPIs: () => {
    const container = document.createElement('div');
    container.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            padding: 2rem;
        `;

    container.appendChild(createPendingAmountKPI(125000));
    container.appendChild(createTotalAgentsKPI(42));
    container.appendChild(createActiveAgentsKPI(38));
    container.appendChild(createPendingWagersKPI(156));

    return container;
  },

  /**
   * 🔄 Create an interactive KPI
   */
  interactiveKPI: () => {
    return new KPIComponent({
      label: 'Click Me!',
      value: 'Interactive',
      color: 'secondary',
      icon: '🖱️',
      clickable: true,
      onClick: () => {
        alert('KPI clicked! This could open a detailed view or modal.');
      },
    }).render();
  },
};

// 📚 Documentation Links
export const documentation = {
  readme: './README.md',
  demo: './kpi-demo.html',
  integration: './integration-example.ts',
  tests: './kpi-component.test.ts',
};

// 🎯 Version Information
export const version = '1.0.0';
export const buildDate = new Date().toISOString();

// 🚀 Default Export
export default {
  KPIComponent,
  createKPICard,
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
  DashboardKPIManager,
  quickIntegrateKPIs,
  runKPITests,
  quickStartExamples,
  documentation,
  version,
  buildDate,
};
