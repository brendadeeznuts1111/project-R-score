/**
 * 🌊 Fire22 Water Dashboard KPI Components
 * Specialized KPI components for water management and ocean analytics
 */

import { KPIComponent, createKPICard, KPIStyles } from './kpi-component.ts';

/**
 * 🌊 Water-Themed KPI Configuration
 */
export interface WaterKPIConfig {
  label: string;
  value: string | number;
  format?: 'number' | 'currency' | 'percentage' | 'text' | 'temperature' | 'pressure' | 'flow';
  color?: 'surface' | 'mid-water' | 'deep-water' | 'abyssal' | 'coral' | 'ocean-blue';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number;
  clickable?: boolean;
  onClick?: () => void;
  waterLevel?: 'normal' | 'high' | 'low' | 'critical';
  pulseEffect?: boolean;
}

/**
 * 🌊 Water KPI Component
 * Enhanced KPI component with water-themed styling and ocean analytics
 */
export class WaterKPIComponent extends KPIComponent {
  private waterConfig: WaterKPIConfig;

  constructor(config: WaterKPIConfig) {
    super(config);
    this.waterConfig = config;
    this.applyWaterStyling();
  }

  /**
   * 🌊 Apply water-themed styling
   */
  private applyWaterStyling(): void {
    const element = this.render();

    // Add water-specific classes
    element.classList.add('water-kpi');
    element.classList.add(`water-${this.waterConfig.color || 'ocean-blue'}`);

    if (this.waterConfig.pulseEffect) {
      element.classList.add('pulse-glow');
    }

    if (this.waterConfig.waterLevel) {
      element.classList.add(`water-level-${this.waterConfig.waterLevel}`);
    }
  }

  /**
   * 🌊 Create water-themed element
   */
  protected createElement(): HTMLElement {
    const kpiCard = document.createElement('div');
    kpiCard.className = `water-kpi-card water-${this.waterConfig.color || 'ocean-blue'}`;

    if (this.waterConfig.clickable) {
      kpiCard.classList.add('water-clickable');
      kpiCard.addEventListener('click', () => this.waterConfig.onClick?.());
    }

    const content = `
            ${this.waterConfig.icon ? `<div class="water-kpi-icon">${this.waterConfig.icon}</div>` : ''}
            <div class="water-kpi-value">
                ${this.formatWaterValue()}
            </div>
            <div class="water-kpi-label">${this.waterConfig.label}</div>
            ${this.waterConfig.trend ? this.createWaterTrendIndicator() : ''}
            ${this.waterConfig.waterLevel ? this.createWaterLevelIndicator() : ''}
        `;

    kpiCard.innerHTML = content;
    return kpiCard;
  }

  /**
   * 🌊 Format water-specific values
   */
  private formatWaterValue(): string {
    const value = this.waterConfig.value;

    switch (this.waterConfig.format) {
      case 'temperature':
        return typeof value === 'number' ? `${value}°C` : String(value);
      case 'pressure':
        return typeof value === 'number' ? `${value} PSI` : String(value);
      case 'flow':
        return typeof value === 'number' ? `${value} L/min` : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        return String(value);
    }
  }

  /**
   * 🌊 Create water trend indicator
   */
  private createWaterTrendIndicator(): string {
    if (!this.waterConfig.trend) return '';

    const trendClass = `water-trend-${this.waterConfig.trend}`;
    const trendIcon = this.getWaterTrendIcon();
    const trendValue = this.waterConfig.trendValue ? ` ${this.waterConfig.trendValue}` : '';

    return `<div class="water-kpi-trend ${trendClass}">${trendIcon}${trendValue}</div>`;
  }

  /**
   * 🌊 Get water-themed trend icons
   */
  private getWaterTrendIcon(): string {
    switch (this.waterConfig.trend) {
      case 'up':
        return '🌊';
      case 'down':
        return '💧';
      case 'neutral':
        return '🌊';
      default:
        return '';
    }
  }

  /**
   * 🌊 Create water level indicator
   */
  private createWaterLevelIndicator(): string {
    if (!this.waterConfig.waterLevel) return '';

    const levelClass = `water-level-${this.waterConfig.waterLevel}`;
    const levelIcon = this.getWaterLevelIcon();

    return `<div class="water-level-indicator ${levelClass}">${levelIcon}</div>`;
  }

  /**
   * 🌊 Get water level icons
   */
  private getWaterLevelIcon(): string {
    switch (this.waterConfig.waterLevel) {
      case 'normal':
        return '🌊';
      case 'high':
        return '⚠️';
      case 'low':
        return '💧';
      case 'critical':
        return '🚨';
      default:
        return '🌊';
    }
  }

  /**
   * 🌊 Update water configuration
   */
  public updateWaterConfig(config: Partial<WaterKPIConfig>): void {
    this.waterConfig = { ...this.waterConfig, ...config };
    this.update(config);
    this.applyWaterStyling();
  }

  /**
   * 🌊 Get water level status
   */
  public getWaterLevel(): string | undefined {
    return this.waterConfig.waterLevel;
  }

  /**
   * 🌊 Set water level with visual feedback
   */
  public setWaterLevel(level: 'normal' | 'high' | 'low' | 'critical'): void {
    this.waterConfig.waterLevel = level;
    this.updateWaterConfig({ waterLevel: level });
  }
}

/**
 * 🌊 Water KPI Factory Functions
 */
export const createWaterTemperatureKPI = (temperature: number): HTMLElement => {
  return createKPICard({
    label: 'System Temperature',
    value: temperature,
    format: 'temperature',
    color: 'surface',
    icon: '🌡️',
    trend: temperature > 20 ? 'up' : 'down',
  });
};

export const createWaterPressureKPI = (pressure: number): HTMLElement => {
  const level = pressure > 120 ? 'high' : pressure < 80 ? 'low' : 'normal';
  return createKPICard({
    label: 'Water Pressure',
    value: pressure,
    format: 'pressure',
    color: 'mid-water',
    icon: '💧',
    trend: pressure > 120 ? 'up' : pressure < 80 ? 'down' : 'neutral',
    waterLevel: level,
  });
};

export const createWaterFlowRateKPI = (flowRate: number): HTMLElement => {
  const level = flowRate > 80 ? 'high' : flowRate < 30 ? 'low' : 'normal';
  return createKPICard({
    label: 'Flow Rate',
    value: flowRate,
    format: 'flow',
    color: 'deep-water',
    icon: '🌊',
    trend: flowRate > 80 ? 'up' : flowRate < 30 ? 'down' : 'neutral',
    waterLevel: level,
  });
};

export const createOceanDepthKPI = (depth: number): HTMLElement => {
  const level = depth > 1000 ? 'abyssal' : depth > 500 ? 'deep-water' : 'mid-water';
  return createKPICard({
    label: 'Ocean Depth',
    value: depth,
    format: 'number',
    color: 'abyssal',
    icon: '🌊',
    suffix: ' m',
    trend: depth > 1000 ? 'down' : 'neutral',
  });
};

export const createSalinityKPI = (salinity: number): HTMLElement => {
  const level = salinity > 35 ? 'high' : salinity < 30 ? 'low' : 'normal';
  return createKPICard({
    label: 'Salinity Level',
    value: salinity,
    format: 'number',
    color: 'coral',
    icon: '🧂',
    suffix: ' ppt',
    trend: salinity > 35 ? 'up' : salinity < 30 ? 'down' : 'neutral',
    waterLevel: level,
  });
};

export const createTurbidityKPI = (turbidity: number): HTMLElement => {
  const level = turbidity > 5 ? 'high' : turbidity < 1 ? 'low' : 'normal';
  return createKPICard({
    label: 'Water Clarity',
    value: turbidity,
    format: 'number',
    color: 'ocean-blue',
    icon: '🔍',
    suffix: ' NTU',
    trend: turbidity > 5 ? 'down' : turbidity < 1 ? 'up' : 'neutral',
    waterLevel: level,
  });
};

/**
 * 🌊 Enhanced Water KPI Styles
 */
export const WaterKPIStyles = `
    /* Water KPI Base Styles */
    .water-kpi-card {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 1.5rem;
        border-radius: 1rem;
        text-align: center;
        border: 2px solid transparent;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        transition: all 0.4s ease;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
    }

    .water-kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(135, 206, 235, 0.1), transparent);
        transition: left 0.6s ease;
    }

    .water-kpi-card:hover::before {
        left: 100%;
    }

    .water-kpi-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
    }

    /* Water Color Themes */
    .water-surface {
        border-color: #87ceeb;
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    }

    .water-mid-water {
        border-color: #4682b4;
        background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%);
    }

    .water-deep-water {
        border-color: #191970;
        background: linear-gradient(135deg, #0f172a 0%, #312e81 100%);
    }

    .water-abyssal {
        border-color: #000080;
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    }

    .water-coral {
        border-color: #ff7f50;
        background: linear-gradient(135deg, #0f172a 0%, #7c2d12 100%);
    }

    .water-ocean-blue {
        border-color: #006994;
        background: linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%);
    }

    /* Water KPI Elements */
    .water-kpi-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
        opacity: 0.9;
        filter: drop-shadow(0 0 10px rgba(135, 206, 235, 0.5));
    }

    .water-kpi-value {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, #87ceeb, #4682b4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0.75rem;
        text-shadow: 0 0 20px rgba(135, 206, 235, 0.3);
    }

    .water-kpi-label {
        font-size: 1rem;
        color: #e2e8f0;
        font-weight: 600;
        margin-bottom: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .water-kpi-trend {
        font-size: 0.9rem;
        font-weight: 600;
        padding: 0.5rem 1rem;
        border-radius: 0.75rem;
        display: inline-block;
        margin-top: 0.5rem;
    }

    .water-trend-up {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .water-trend-down {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .water-trend-neutral {
        background: rgba(156, 163, 175, 0.2);
        color: #9ca3af;
        border: 1px solid rgba(156, 163, 175, 0.3);
    }

    /* Water Level Indicators */
    .water-level-indicator {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        font-size: 1.2rem;
        padding: 0.25rem;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.3);
    }

    .water-level-normal {
        color: #22c55e;
        animation: pulse-glow 2s ease-in-out infinite;
    }

    .water-level-high {
        color: #f59e0b;
        animation: pulse-warning 1.5s ease-in-out infinite;
    }

    .water-level-low {
        color: #3b82f6;
        animation: pulse-info 2s ease-in-out infinite;
    }

    .water-level-critical {
        color: #ef4444;
        animation: pulse-critical 1s ease-in-out infinite;
    }

    /* Water Animations */
    @keyframes pulse-glow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
    }

    @keyframes pulse-warning {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.15); }
    }

    @keyframes pulse-info {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.05); }
    }

    @keyframes pulse-critical {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
    }

    /* Water KPI Responsive */
    @media (max-width: 768px) {
        .water-kpi-card {
            padding: 1rem;
        }
        
        .water-kpi-value {
            font-size: 2rem;
        }
        
        .water-kpi-icon {
            font-size: 2rem;
        }
    }

    /* Water KPI Interactive */
    .water-clickable {
        cursor: pointer;
    }

    .water-clickable:hover {
        transform: translateY(-4px) scale(1.05);
    }

    /* Water KPI Pulse Effect */
    .pulse-glow {
        animation: pulse-glow 3s ease-in-out infinite;
    }
`;

/**
 * 🌊 Water Dashboard KPI Manager
 */
export class WaterDashboardKPIManager {
  private kpis: Map<string, WaterKPIComponent> = new Map();
  private container: HTMLElement;
  private updateInterval: number | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.injectWaterStyles();
  }

  /**
   * 🌊 Inject water KPI styles
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
   * 🌊 Initialize water system KPIs
   */
  public initializeWaterKPIs(): void {
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'water-kpi-grid';
    kpiGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        `;

    // Create water system KPIs
    const temperature = new WaterKPIComponent({
      label: 'System Temperature',
      value: 22,
      format: 'temperature',
      color: 'surface',
      icon: '🌡️',
      trend: 'neutral',
    });

    const pressure = new WaterKPIComponent({
      label: 'Water Pressure',
      value: 125,
      format: 'pressure',
      color: 'mid-water',
      icon: '💧',
      trend: 'up',
      waterLevel: 'high',
    });

    const flowRate = new WaterKPIComponent({
      label: 'Flow Rate',
      value: 75,
      format: 'flow',
      color: 'deep-water',
      icon: '🌊',
      trend: 'neutral',
      waterLevel: 'normal',
    });

    // Store references
    this.kpis.set('temperature', temperature);
    this.kpis.set('pressure', pressure);
    this.kpis.set('flowRate', flowRate);

    // Render KPIs
    this.kpis.forEach(kpi => {
      kpiGrid.appendChild(kpi.render());
    });

    this.container.appendChild(kpiGrid);
  }

  /**
   * 🌊 Start water system monitoring
   */
  public startWaterMonitoring(intervalMs: number = 3000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateWaterData();
    }, intervalMs);
  }

  /**
   * 🌊 Update water system data
   */
  private updateWaterData(): void {
    // Simulate real-time water system data
    const temperature = this.kpis.get('temperature');
    const pressure = this.kpis.get('pressure');
    const flowRate = this.kpis.get('flowRate');

    if (temperature) {
      const newTemp = Math.floor(Math.random() * 7) + 18; // 18-24°C
      temperature.updateWaterConfig({
        value: newTemp,
        trend: newTemp > 21 ? 'up' : 'down',
      });
    }

    if (pressure) {
      const newPressure = Math.floor(Math.random() * 51) + 100; // 100-150 PSI
      const level = newPressure > 120 ? 'high' : newPressure < 80 ? 'low' : 'normal';
      pressure.updateWaterConfig({
        value: newPressure,
        trend: newPressure > 125 ? 'up' : newPressure < 115 ? 'down' : 'neutral',
        waterLevel: level,
      });
    }

    if (flowRate) {
      const newFlow = Math.floor(Math.random() * 51) + 50; // 50-100 L/min
      const level = newFlow > 80 ? 'high' : newFlow < 30 ? 'low' : 'normal';
      flowRate.updateWaterConfig({
        value: newFlow,
        trend: newFlow > 75 ? 'up' : newFlow < 65 ? 'down' : 'neutral',
        waterLevel: level,
      });
    }
  }

  /**
   * 🌊 Stop water monitoring
   */
  public stopWaterMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 🌊 Get water system status
   */
  public getWaterSystemStatus(): any {
    const status: any = {};
    this.kpis.forEach((kpi, id) => {
      status[id] = {
        value: kpi.getValue(),
        waterLevel: kpi.getWaterLevel(),
        label: kpi['config']?.label || 'Unknown',
      };
    });
    return status;
  }

  /**
   * 🌊 Cleanup
   */
  public destroy(): void {
    this.stopWaterMonitoring();
    this.kpis.forEach(kpi => kpi.destroy());
    this.kpis.clear();
  }
}

// 🚀 Export for easy importing
export default WaterDashboardKPIManager;
