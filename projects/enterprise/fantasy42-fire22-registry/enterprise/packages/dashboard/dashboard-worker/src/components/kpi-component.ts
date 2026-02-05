/**
 * 🔥 Fire22 KPI Component
 * Standalone, reusable KPI component with enhanced styling and functionality
 */

export interface KPIConfig {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number;
  clickable?: boolean;
  onClick?: () => void;
}

export class KPIComponent {
  private config: KPIConfig;
  private element: HTMLElement;

  constructor(config: KPIConfig) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.element = this.createElement();
  }

  private getDefaultConfig(): Partial<KPIConfig> {
    return {
      format: 'text',
      color: 'primary',
      size: 'medium',
      clickable: false,
    };
  }

  private createElement(): HTMLElement {
    const kpiCard = document.createElement('div');
    kpiCard.className = `kpi-card kpi-${this.config.color} kpi-${this.config.size}`;

    if (this.config.clickable) {
      kpiCard.classList.add('kpi-clickable');
      kpiCard.addEventListener('click', () => this.config.onClick?.());
    }

    const content = `
      ${this.config.icon ? `<div class="kpi-icon">${this.config.icon}</div>` : ''}
      <div class="kpi-value">
        ${this.config.prefix || ''}${this.formatValue()}${this.config.suffix || ''}
      </div>
      <div class="kpi-label">${this.config.label}</div>
      ${this.config.trend ? this.createTrendIndicator() : ''}
    `;

    kpiCard.innerHTML = content;
    return kpiCard;
  }

  private formatValue(): string {
    const value = this.config.value;

    switch (this.config.format) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      case 'currency':
        return typeof value === 'number'
          ? value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })
          : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
      default:
        return String(value);
    }
  }

  private createTrendIndicator(): string {
    if (!this.config.trend) return '';

    const trendClass = `trend-${this.config.trend}`;
    const trendIcon = this.getTrendIcon();
    const trendValue = this.config.trendValue ? ` ${this.config.trendValue}` : '';

    return `<div class="kpi-trend ${trendClass}">${trendIcon}${trendValue}</div>`;
  }

  private getTrendIcon(): string {
    switch (this.config.trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'neutral':
        return '→';
      default:
        return '';
    }
  }

  public render(): HTMLElement {
    return this.element;
  }

  public update(config: Partial<KPIConfig>): void {
    this.config = { ...this.config, ...config };
    this.element.innerHTML = this.createElement().innerHTML;
  }

  public destroy(): void {
    this.element.remove();
  }

  public getValue(): string | number {
    return this.config.value;
  }

  public setValue(value: string | number): void {
    this.config.value = value;
    this.update({ value });
  }
}

// 🎨 Enhanced KPI Styles
export const KPIStyles = `
  .kpi-card {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    padding: 1.5rem;
    border-radius: 1rem;
    text-align: center;
    border: 1px solid #475569;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(253, 187, 45, 0.1), transparent);
    transition: left 0.3s ease;
  }

  .kpi-card:hover::before {
    left: 100%;
  }

  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .kpi-clickable {
    cursor: pointer;
  }

  .kpi-clickable:hover {
    transform: translateY(-2px) scale(1.02);
  }

  .kpi-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    opacity: 0.8;
  }

  .kpi-value {
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .kpi-label {
    font-size: 0.9rem;
    color: #94a3b8;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .kpi-trend {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    display: inline-block;
  }

  .trend-up {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
  }

  .trend-down {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .trend-neutral {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }

  /* Size variants */
  .kpi-small {
    padding: 1rem;
  }

  .kpi-small .kpi-value {
    font-size: 1.5rem;
  }

  .kpi-small .kpi-label {
    font-size: 0.8rem;
  }

  .kpi-large {
    padding: 2rem;
  }

  .kpi-large .kpi-value {
    font-size: 3.5rem;
  }

  .kpi-large .kpi-label {
    font-size: 1.1rem;
  }

  /* Color variants */
  .kpi-primary .kpi-value {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .kpi-secondary .kpi-value {
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .kpi-success .kpi-value {
    background: linear-gradient(135deg, #10b981, #059669);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .kpi-warning .kpi-value {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .kpi-danger .kpi-value {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .kpi-info .kpi-value {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    -webkit-background-clip: text;
    background-clip: text;
  }
`;

// 🚀 Quick KPI Factory Functions
export const createKPICard = (config: KPIConfig): HTMLElement => {
  const kpi = new KPIComponent(config);
  return kpi.render();
};

export const createPendingAmountKPI = (amount: number): HTMLElement => {
  return createKPICard({
    label: 'Pending Amount',
    value: amount,
    format: 'currency',
    color: 'warning',
    icon: '💰',
    trend: 'up',
  });
};

export const createTotalAgentsKPI = (count: number): HTMLElement => {
  return createKPICard({
    label: 'Total Agents',
    value: count,
    format: 'number',
    color: 'primary',
    icon: '👥',
  });
};

export const createActiveAgentsKPI = (count: number): HTMLElement => {
  return createKPICard({
    label: 'Active Agents',
    value: count,
    format: 'number',
    color: 'success',
    icon: '✅',
  });
};

export const createPendingWagersKPI = (count: number): HTMLElement => {
  return createKPICard({
    label: 'Pending Wagers',
    value: count,
    format: 'number',
    color: 'warning',
    icon: '📊',
  });
};
