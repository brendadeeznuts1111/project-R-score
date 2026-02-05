/**
 * 🌊 Water Dashboard Integration Script
 * Replaces existing KPI cards with enhanced water-themed components
 */

import {
  WaterDashboardKPIManager,
  createWaterTemperatureKPI,
  createWaterPressureKPI,
  createWaterFlowRateKPI,
  WaterKPIStyles,
} from './water-kpi-components.ts';

/**
 * 🌊 Water Dashboard KPI Integrator
 * Seamlessly integrates enhanced KPI components into existing water dashboard
 */
export class WaterDashboardIntegrator {
  private waterManager: WaterDashboardKPIManager | null = null;
  private originalKPIs: HTMLElement[] = [];
  private isIntegrated: boolean = false;

  constructor() {
    this.injectWaterStyles();
  }

  /**
   * 🌊 Inject water KPI styles into the document
   */
  private injectWaterStyles(): void {
    if (!document.querySelector('#water-kpi-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'water-kpi-styles';
      styleSheet.textContent = WaterKPIStyles;
      document.head.appendChild(styleSheet);
    }
  }

  /**
   * 🌊 Find and replace existing KPI cards
   */
  public integrateWaterKPIs(): void {
    if (this.isIntegrated) {
      console.log('🌊 Water KPIs already integrated');
      return;
    }

    console.log('🌊 Starting water dashboard KPI integration...');

    // Find the system info section
    const systemInfoSection = this.findSystemInfoSection();
    if (!systemInfoSection) {
      console.error('🌊 Could not find system info section');
      return;
    }

    // Find existing KPI cards
    const existingKPIs = this.findExistingKPIs(systemInfoSection);
    if (existingKPIs.length === 0) {
      console.log('🌊 No existing KPI cards found');
      return;
    }

    // Store original KPIs for potential restoration
    this.originalKPIs = [...existingKPIs];

    // Replace with enhanced water KPIs
    this.replaceWithWaterKPIs(existingKPIs, systemInfoSection);

    // Initialize water monitoring
    this.initializeWaterMonitoring(systemInfoSection);

    this.isIntegrated = true;
    console.log('🌊 Water dashboard KPI integration completed successfully!');
  }

  /**
   * 🌊 Find the system info section
   */
  private findSystemInfoSection(): HTMLElement | null {
    // Look for system info tab content
    const systemInfo = document.querySelector('[x-show*="system-info"]');
    if (systemInfo) {
      return systemInfo as HTMLElement;
    }

    // Fallback: look for section with system temperature
    const sections = document.querySelectorAll('section, div');
    for (const section of sections) {
      if (section.textContent?.includes('System Temperature')) {
        return section as HTMLElement;
      }
    }

    return null;
  }

  /**
   * 🌊 Find existing KPI cards in the system info section
   */
  private findExistingKPIs(systemInfoSection: HTMLElement): HTMLElement[] {
    const kpiCards = systemInfoSection.querySelectorAll('.kpi-card');
    return Array.from(kpiCards) as HTMLElement[];
  }

  /**
   * 🌊 Replace existing KPIs with enhanced water KPIs
   */
  private replaceWithWaterKPIs(existingKPIs: HTMLElement[], systemInfoSection: HTMLElement): void {
    // Create enhanced water KPIs
    const waterKPIs = [
      createWaterTemperatureKPI(22),
      createWaterPressureKPI(125),
      createWaterFlowRateKPI(75),
    ];

    // Find the KPI grid container
    const kpiGrid = this.findOrCreateKPIGrid(systemInfoSection);

    // Clear existing KPIs
    kpiGrid.innerHTML = '';

    // Add enhanced water KPIs
    waterKPIs.forEach(kpi => {
      kpiGrid.appendChild(kpi);
    });

    // Add additional water KPIs for enhanced monitoring
    this.addAdditionalWaterKPIs(kpiGrid);
  }

  /**
   * 🌊 Find or create KPI grid container
   */
  private findOrCreateKPIGrid(systemInfoSection: HTMLElement): HTMLElement {
    // Look for existing grid
    let kpiGrid = systemInfoSection.querySelector('.grid') as HTMLElement;

    if (!kpiGrid) {
      // Create new grid if none exists
      kpiGrid = document.createElement('div');
      kpiGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-6';
      systemInfoSection.insertBefore(kpiGrid, systemInfoSection.firstChild);
    }

    return kpiGrid;
  }

  /**
   * 🌊 Add additional water KPIs for enhanced monitoring
   */
  private addAdditionalWaterKPIs(kpiGrid: HTMLElement): void {
    // Create additional water monitoring KPIs
    const additionalKPIs = [
      this.createOceanDepthKPI(),
      this.createSalinityKPI(),
      this.createTurbidityKPI(),
    ];

    // Add to grid
    additionalKPIs.forEach(kpi => {
      kpiGrid.appendChild(kpi);
    });

    // Update grid layout for 6 KPIs
    kpiGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  }

  /**
   * 🌊 Create ocean depth KPI
   */
  private createOceanDepthKPI(): HTMLElement {
    const kpi = document.createElement('div');
    kpi.className = 'water-kpi-card water-abyssal';
    kpi.innerHTML = `
            <div class="water-kpi-icon">🌊</div>
            <div class="water-kpi-value">2,847 m</div>
            <div class="water-kpi-label">Ocean Depth</div>
            <div class="water-kpi-trend water-trend-neutral">🌊 Stable</div>
        `;
    return kpi;
  }

  /**
   * 🌊 Create salinity KPI
   */
  private createSalinityKPI(): HTMLElement {
    const kpi = document.createElement('div');
    kpi.className = 'water-kpi-card water-coral';
    kpi.innerHTML = `
            <div class="water-kpi-icon">🧂</div>
            <div class="water-kpi-value">35.2 ppt</div>
            <div class="water-kpi-label">Salinity Level</div>
            <div class="water-kpi-trend water-trend-up">🌊 +0.1</div>
        `;
    return kpi;
  }

  /**
   * 🌊 Create turbidity KPI
   */
  private createTurbidityKPI(): HTMLElement {
    const kpi = document.createElement('div');
    kpi.className = 'water-kpi-card water-ocean-blue';
    kpi.innerHTML = `
            <div class="water-kpi-icon">🔍</div>
            <div class="water-kpi-value">2.1 NTU</div>
            <div class="water-kpi-label">Water Clarity</div>
            <div class="water-kpi-trend water-trend-down">💧 -0.3</div>
        `;
    return kpi;
  }

  /**
   * 🌊 Initialize water monitoring system
   */
  private initializeWaterMonitoring(systemInfoSection: HTMLElement): void {
    // Create water manager
    this.waterManager = new WaterDashboardKPIManager(systemInfoSection.id || 'water-dashboard');

    // Start monitoring
    this.waterManager.startWaterMonitoring(3000);

    // Add monitoring controls
    this.addMonitoringControls(systemInfoSection);
  }

  /**
   * 🌊 Add monitoring controls to the dashboard
   */
  private addMonitoringControls(systemInfoSection: HTMLElement): void {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'water-monitoring-controls';
    controlsContainer.style.cssText = `
            margin-top: 2rem;
            padding: 1.5rem;
            background: rgba(135, 206, 235, 0.1);
            border-radius: 1rem;
            border: 1px solid rgba(135, 206, 235, 0.3);
        `;

    controlsContainer.innerHTML = `
            <h3 class="text-xl font-bold mb-4 glow-text" style="color: #87ceeb;">🌊 Water System Monitoring</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button id="start-monitoring" class="water-control-btn water-btn-start">
                    🚀 Start Monitoring
                </button>
                <button id="stop-monitoring" class="water-control-btn water-btn-stop">
                    ⏹️ Stop Monitoring
                </button>
                <button id="refresh-data" class="water-control-btn water-btn-refresh">
                    🔄 Refresh Data
                </button>
            </div>
            <div class="mt-4 text-sm text-gray-400">
                <span id="monitoring-status">Status: Active</span> | 
                <span id="last-update">Last Update: ${new Date().toLocaleTimeString()}</span>
            </div>
        `;

    // Add controls to system info section
    systemInfoSection.appendChild(controlsContainer);

    // Add control button styles
    this.addControlButtonStyles();

    // Add event listeners
    this.addControlEventListeners();
  }

  /**
   * 🌊 Add control button styles
   */
  private addControlButtonStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
            .water-control-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 0.75rem;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            }

            .water-btn-start {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                color: white;
            }

            .water-btn-stop {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
            }

            .water-btn-refresh {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }

            .water-control-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            }

            .water-control-btn:active {
                transform: translateY(0);
            }
        `;
    document.head.appendChild(style);
  }

  /**
   * 🌊 Add control event listeners
   */
  private addControlEventListeners(): void {
    const startBtn = document.getElementById('start-monitoring');
    const stopBtn = document.getElementById('stop-monitoring');
    const refreshBtn = document.getElementById('refresh-data');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.waterManager?.startWaterMonitoring();
        this.updateMonitoringStatus('Active');
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.waterManager?.stopWaterMonitoring();
        this.updateMonitoringStatus('Stopped');
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshWaterData();
      });
    }
  }

  /**
   * 🌊 Update monitoring status display
   */
  private updateMonitoringStatus(status: string): void {
    const statusElement = document.getElementById('monitoring-status');
    if (statusElement) {
      statusElement.textContent = `Status: ${status}`;
    }
  }

  /**
   * 🌊 Refresh water data
   */
  private refreshWaterData(): void {
    if (this.waterManager) {
      // Force update of all KPIs
      const status = this.waterManager.getWaterSystemStatus();
      console.log('🌊 Water system status:', status);

      // Update last update time
      const lastUpdateElement = document.getElementById('last-update');
      if (lastUpdateElement) {
        lastUpdateElement.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
      }
    }
  }

  /**
   * 🌊 Restore original KPIs
   */
  public restoreOriginalKPIs(): void {
    if (!this.isIntegrated || this.originalKPIs.length === 0) {
      return;
    }

    console.log('🌊 Restoring original KPI cards...');

    // Stop water monitoring
    this.waterManager?.stopWaterMonitoring();

    // Find system info section
    const systemInfoSection = this.findSystemInfoSection();
    if (systemInfoSection) {
      // Find KPI grid
      const kpiGrid = systemInfoSection.querySelector('.grid');
      if (kpiGrid) {
        // Clear and restore original KPIs
        kpiGrid.innerHTML = '';
        this.originalKPIs.forEach(kpi => {
          kpiGrid.appendChild(kpi.cloneNode(true));
        });
      }
    }

    // Remove monitoring controls
    const controls = systemInfoSection.querySelector('.water-monitoring-controls');
    if (controls) {
      controls.remove();
    }

    this.isIntegrated = false;
    console.log('🌊 Original KPI cards restored');
  }

  /**
   * 🌊 Get integration status
   */
  public getIntegrationStatus(): boolean {
    return this.isIntegrated;
  }

  /**
   * 🌊 Get water system status
   */
  public getWaterSystemStatus(): any {
    return this.waterManager?.getWaterSystemStatus() || {};
  }

  /**
   * 🌊 Cleanup integration
   */
  public destroy(): void {
    this.waterManager?.destroy();
    this.waterManager = null;
    this.isIntegrated = false;
  }
}

/**
 * 🌊 Quick integration function
 */
export const integrateWaterDashboard = (): WaterDashboardIntegrator => {
  const integrator = new WaterDashboardIntegrator();
  integrator.integrateWaterKPIs();
  return integrator;
};

/**
 * 🌊 Auto-integration on page load
 */
export const autoIntegrateWaterDashboard = (): void => {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => integrateWaterDashboard(), 1000);
    });
  } else {
    setTimeout(() => integrateWaterDashboard(), 1000);
  }
};

// 🚀 Export for easy importing
export default WaterDashboardIntegrator;
