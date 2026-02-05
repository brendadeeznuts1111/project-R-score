// Base Dashboard Class

export interface DashboardConfig {
  title: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

export class Dashboard {
  private config: DashboardConfig;
  private container: HTMLElement | null = null;
  private isInitialized = false;

  constructor(config: DashboardConfig) {
    this.config = {
      width: 1200,
      height: 800,
      theme: 'dark',
      ...config
    };
  }

  /**
   * Initialize the dashboard
   */
  async initialize(containerId: string): Promise<void> {
    try {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        throw new Error(`Container with id '${containerId}' not found`);
      }

      this.setupContainer();
      this.isInitialized = true;
      console.log(`Dashboard '${this.config.title}' initialized successfully`);
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      throw error;
    }
  }

  /**
   * Setup container element
   */
  private setupContainer(): void {
    if (!this.container) return;

    this.container.style.width = `${this.config.width}px`;
    this.container.style.height = `${this.config.height}px`;
    this.container.className = `dashboard dashboard-${this.config.theme}`;
  }

  /**
   * Render content to dashboard
   */
  render(content: string): void {
    if (!this.container || !this.isInitialized) {
      throw new Error('Dashboard not initialized. Call initialize() first.');
    }

    this.container.innerHTML = content;
  }

  /**
   * Get dashboard configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(updates: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...updates };
    if (this.container) {
      this.setupContainer();
    }
  }

  /**
   * Check if dashboard is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Clear dashboard content
   */
  clear(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Destroy dashboard
   */
  destroy(): void {
    this.clear();
    this.container = null;
    this.isInitialized = false;
  }
}

export default Dashboard;
