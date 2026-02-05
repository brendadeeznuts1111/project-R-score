/**
 * 🔥 Fire22 KPI Component Integration Example
 * Shows how to integrate the KPI component into existing dashboards
 */

import {
  KPIComponent,
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
  KPIStyles,
} from './kpi-component.ts';

/**
 * 🔄 Dashboard Integration Manager
 * Manages KPI components in existing dashboards
 */
export class DashboardKPIManager {
  private kpis: Map<string, KPIComponent> = new Map();
  private container: HTMLElement;
  private updateInterval: number | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.injectStyles();
  }

  /**
   * 🎨 Inject KPI styles into the document
   */
  private injectStyles(): void {
    if (!document.querySelector('#fire22-kpi-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'fire22-kpi-styles';
      styleSheet.textContent = KPIStyles;
      document.head.appendChild(styleSheet);
    }
  }

  /**
   * 🚀 Initialize default KPIs
   */
  public initializeDefaultKPIs(): void {
    // Create default KPI grid
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'kpi-grid';
    kpiGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        `;

    // Add default KPIs
    const pendingAmount = createPendingAmountKPI(0);
    const totalAgents = createTotalAgentsKPI(0);
    const activeAgents = createActiveAgentsKPI(0);
    const pendingWagers = createPendingWagersKPI(0);

    // Store references for updates
    this.kpis.set(
      'pendingAmount',
      new KPIComponent({
        label: 'Pending Amount',
        value: 0,
        format: 'currency',
        color: 'warning',
        icon: '💰',
      })
    );
    this.kpis.set(
      'totalAgents',
      new KPIComponent({
        label: 'Total Agents',
        value: 0,
        format: 'number',
        color: 'primary',
        icon: '👥',
      })
    );
    this.kpis.set(
      'activeAgents',
      new KPIComponent({
        label: 'Active Agents',
        value: 0,
        format: 'number',
        color: 'success',
        icon: '✅',
      })
    );
    this.kpis.set(
      'pendingWagers',
      new KPIComponent({
        label: 'Pending Wagers',
        value: 0,
        format: 'number',
        color: 'warning',
        icon: '📊',
      })
    );

    // Render KPIs
    this.kpis.forEach(kpi => {
      kpiGrid.appendChild(kpi.render());
    });

    // Add to container
    this.container.appendChild(kpiGrid);
  }

  /**
   * 🔄 Start real-time updates
   */
  public startUpdates(intervalMs: number = 5000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateKPIData();
    }, intervalMs);
  }

  /**
   * 🛑 Stop real-time updates
   */
  public stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 📊 Update KPI data (simulate API call)
   */
  private async updateKPIData(): Promise<void> {
    try {
      // Simulate API call - replace with actual API endpoint
      const data = await this.fetchDashboardData();

      // Update KPI values
      this.kpis.get('pendingAmount')?.setValue(data.pendingAmount);
      this.kpis.get('totalAgents')?.setValue(data.totalAgents);
      this.kpis.get('activeAgents')?.setValue(data.activeAgents);
      this.kpis.get('pendingWagers')?.setValue(data.pendingWagers);

      // Update trends based on data changes
      this.updateTrends(data);
    } catch (error) {
      console.error('Failed to update KPI data:', error);
    }
  }

  /**
   * 📡 Fetch dashboard data (replace with actual API)
   */
  private async fetchDashboardData(): Promise<any> {
    // Simulate API response - replace with actual fetch
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          pendingAmount: Math.floor(Math.random() * 200000) + 50000,
          totalAgents: Math.floor(Math.random() * 50) + 30,
          activeAgents: Math.floor(Math.random() * 20) + 25,
          pendingWagers: Math.floor(Math.random() * 200) + 100,
        });
      }, 100);
    });
  }

  /**
   * 📈 Update trend indicators
   */
  private updateTrends(data: any): void {
    // Add trend logic based on your business rules
    // This is a simple example
    const pendingAmountKPI = this.kpis.get('pendingAmount');
    if (pendingAmountKPI) {
      const currentValue = pendingAmountKPI.getValue();
      const trend = data.pendingAmount > currentValue ? 'up' : 'down';
      pendingAmountKPI.update({ trend });
    }
  }

  /**
   * ➕ Add custom KPI
   */
  public addCustomKPI(id: string, config: any): void {
    const kpi = new KPIComponent(config);
    this.kpis.set(id, kpi);

    // Add to existing grid or create new one
    const existingGrid = this.container.querySelector('.kpi-grid');
    if (existingGrid) {
      existingGrid.appendChild(kpi.render());
    }
  }

  /**
   * 🗑️ Remove KPI
   */
  public removeKPI(id: string): boolean {
    const kpi = this.kpis.get(id);
    if (kpi) {
      kpi.destroy();
      this.kpis.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 📊 Get KPI statistics
   */
  public getKPIStats(): any {
    const stats: any = {};
    this.kpis.forEach((kpi, id) => {
      stats[id] = {
        value: kpi.getValue(),
        label: kpi['config']?.label || 'Unknown',
      };
    });
    return stats;
  }

  /**
   * 🧹 Cleanup resources
   */
  public destroy(): void {
    this.stopUpdates();
    this.kpis.forEach(kpi => kpi.destroy());
    this.kpis.clear();
  }
}

/**
 * 🔌 Quick Integration Helper
 * Easy way to add KPIs to existing dashboards
 */
export const quickIntegrateKPIs = (containerId: string): DashboardKPIManager => {
  const manager = new DashboardKPIManager(containerId);
  manager.initializeDefaultKPIs();
  manager.startUpdates();
  return manager;
};

/**
 * 🎯 Replace Existing KPI Elements
 * Replace existing .kpi-card elements with new components
 */
export const replaceExistingKPIs = (): void => {
  const existingKPIs = document.querySelectorAll('.kpi-card');

  existingKPIs.forEach((element, index) => {
    // Extract data from existing element
    const labelElement = element.querySelector('.kpi-label');
    const valueElement = element.querySelector('.kpi-value');

    if (labelElement && valueElement) {
      const label = labelElement.textContent || `KPI ${index + 1}`;
      const value = valueElement.textContent || '0';

      // Create new KPI component
      const newKPI = new KPIComponent({
        label,
        value: parseFloat(value) || value,
        format: 'number',
        color: 'primary',
      });

      // Replace element
      element.parentNode?.replaceChild(newKPI.render(), element);
    }
  });
};

/**
 * 📱 Mobile-Responsive KPI Grid
 * Create a responsive KPI grid for mobile devices
 */
export const createResponsiveKPIGrid = (containerId: string): HTMLElement => {
  const grid = document.createElement('div');
  grid.className = 'fire22-kpi-grid';
  grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        padding: 1rem;
        
        @media (max-width: 768px) {
            grid-template-columns: 1fr;
            gap: 0.75rem;
            padding: 0.75rem;
        }
        
        @media (max-width: 480px) {
            gap: 0.5rem;
            padding: 0.5rem;
        }
    `;

  const container = document.getElementById(containerId);
  if (container) {
    container.appendChild(grid);
  }

  return grid;
};

// 🚀 Export for easy importing
export default DashboardKPIManager;
