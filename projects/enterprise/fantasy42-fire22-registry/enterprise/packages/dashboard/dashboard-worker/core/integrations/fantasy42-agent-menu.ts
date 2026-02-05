/**
 * Fantasy42 Agent Menu Configuration System
 * Dynamic menu style management, layout switching, and theme customization
 * Targets: Agent menu selector, menu containers, and layout elements
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface MenuStyle {
  id: string;
  name: string;
  description: string;
  layout: 'left' | 'tile' | 'top' | 'compact';
  theme: 'light' | 'dark' | 'auto';
  iconStyle: 'filled' | 'outlined' | 'minimal';
  animation: 'none' | 'slide' | 'fade' | 'scale';
  responsive: boolean;
  accessibility: boolean;
  customCSS?: string;
  customJS?: string;
}

export interface MenuConfiguration {
  currentStyle: MenuStyle;
  availableStyles: MenuStyle[];
  userPreferences: {
    defaultStyle: string;
    rememberLastStyle: boolean;
    autoSwitchBasedOnScreen: boolean;
    keyboardNavigation: boolean;
    voiceCommands: boolean;
  };
  quickActions: {
    enabled: boolean;
    position: 'top' | 'bottom' | 'floating';
    actions: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
      shortcut?: string;
    }>;
  };
  notifications: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    maxVisible: number;
    autoHide: boolean;
    soundEnabled: boolean;
  };
  search: {
    enabled: boolean;
    position: 'header' | 'sidebar' | 'floating';
    placeholder: string;
    shortcuts: boolean;
  };
}

export interface MenuAnalytics {
  styleUsage: Record<string, number>;
  interactionPatterns: Record<string, any>;
  performanceMetrics: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
    errorRate: number;
  };
  userFeedback: Array<{
    styleId: string;
    rating: number;
    comments: string;
    timestamp: string;
  }>;
}

export class Fantasy42AgentMenu {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private currentConfig: MenuConfiguration;
  private analytics: MenuAnalytics;
  private isInitialized: boolean = false;
  private menuContainer: HTMLElement | null = null;
  private styleObserver: MutationObserver | null = null;

  private defaultStyles: MenuStyle[] = [
    {
      id: 'left-menu',
      name: 'Left Menu',
      description: 'Classic vertical menu on the left side with collapsible sections',
      layout: 'left',
      theme: 'auto',
      iconStyle: 'outlined',
      animation: 'slide',
      responsive: true,
      accessibility: true,
    },
    {
      id: 'tile-menu',
      name: 'Tile Menu',
      description: 'Grid-based menu with interactive tiles and visual elements',
      layout: 'tile',
      theme: 'light',
      iconStyle: 'filled',
      animation: 'scale',
      responsive: true,
      accessibility: true,
    },
    {
      id: 'top-menu',
      name: 'Top Menu',
      description: 'Horizontal menu bar at the top with dropdown sections',
      layout: 'top',
      theme: 'dark',
      iconStyle: 'minimal',
      animation: 'fade',
      responsive: true,
      accessibility: true,
    },
    {
      id: 'compact-menu',
      name: 'Compact Menu',
      description: 'Minimal menu design optimized for small screens',
      layout: 'compact',
      theme: 'auto',
      iconStyle: 'outlined',
      animation: 'none',
      responsive: true,
      accessibility: true,
    },
  ];

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    initialConfig?: Partial<MenuConfiguration>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.currentConfig = this.createDefaultConfiguration();
    if (initialConfig) {
      this.currentConfig = { ...this.currentConfig, ...initialConfig };
    }

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize agent menu system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎯 Initializing Fantasy42 Agent Menu System...');

      // Locate menu selector element
      const menuSelector = this.xpathHandler.findElementByXPath(
        "//select[@data-field='agent-menu-style']"
      );

      if (!menuSelector) {
        console.warn('⚠️ Agent menu selector not found');
        return false;
      }

      // Setup menu selector event listeners
      this.setupMenuSelector(menuSelector as HTMLSelectElement);

      // Initialize menu container detection
      await this.detectMenuContainer();

      // Load user preferences
      await this.loadUserPreferences();

      // Setup style observer for dynamic changes
      this.setupStyleObserver();

      // Apply current menu style
      await this.applyMenuStyle(this.currentConfig.currentStyle);

      // Initialize analytics tracking
      this.setupAnalyticsTracking();

      // Setup keyboard shortcuts
      if (this.currentConfig.userPreferences.keyboardNavigation) {
        this.setupKeyboardShortcuts();
      }

      // Setup quick actions
      if (this.currentConfig.quickActions.enabled) {
        await this.initializeQuickActions();
      }

      // Setup notifications
      if (this.currentConfig.notifications.enabled) {
        await this.initializeNotifications();
      }

      // Setup search functionality
      if (this.currentConfig.search.enabled) {
        await this.initializeSearch();
      }

      this.isInitialized = true;
      console.log('✅ Fantasy42 Agent Menu System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize agent menu system:', error);
      return false;
    }
  }

  /**
   * Create default menu configuration
   */
  private createDefaultConfiguration(): MenuConfiguration {
    return {
      currentStyle: this.defaultStyles[0], // Left Menu as default
      availableStyles: [...this.defaultStyles],
      userPreferences: {
        defaultStyle: 'left-menu',
        rememberLastStyle: true,
        autoSwitchBasedOnScreen: true,
        keyboardNavigation: true,
        voiceCommands: false,
      },
      quickActions: {
        enabled: true,
        position: 'floating',
        actions: [
          {
            id: 'quick-deposit',
            label: 'Quick Deposit',
            icon: '💰',
            action: 'openDepositModal',
            shortcut: 'Ctrl+D',
          },
          {
            id: 'quick-withdrawal',
            label: 'Quick Withdrawal',
            icon: '💸',
            action: 'openWithdrawalModal',
            shortcut: 'Ctrl+W',
          },
          {
            id: 'new-bet',
            label: 'New Bet',
            icon: '🎯',
            action: 'openBettingInterface',
            shortcut: 'Ctrl+B',
          },
          {
            id: 'player-search',
            label: 'Player Search',
            icon: '🔍',
            action: 'openPlayerSearch',
            shortcut: 'Ctrl+F',
          },
        ],
      },
      notifications: {
        enabled: true,
        position: 'top-right',
        maxVisible: 5,
        autoHide: true,
        soundEnabled: true,
      },
      search: {
        enabled: true,
        position: 'header',
        placeholder: 'Search players, games, transactions...',
        shortcuts: true,
      },
    };
  }

  /**
   * Initialize analytics tracking
   */
  private initializeAnalytics(): MenuAnalytics {
    return {
      styleUsage: {},
      interactionPatterns: {},
      performanceMetrics: {
        loadTime: 0,
        renderTime: 0,
        interactionTime: 0,
        errorRate: 0,
      },
      userFeedback: [],
    };
  }

  /**
   * Setup menu selector event listeners
   */
  private setupMenuSelector(selector: HTMLSelectElement): void {
    selector.addEventListener('change', async event => {
      const target = event.target as HTMLSelectElement;
      const selectedStyleId = target.value;

      // Convert display name to style ID
      const styleId = this.convertDisplayNameToId(selectedStyleId);

      await this.switchMenuStyle(styleId);
    });

    // Add visual feedback for current selection
    this.updateSelectorVisualState(selector);

    console.log('✅ Menu selector event listeners setup');
  }

  /**
   * Convert display name to style ID
   */
  private convertDisplayNameToId(displayName: string): string {
    const nameToIdMap: Record<string, string> = {
      'Left Menu': 'left-menu',
      'Tile Menu': 'tile-menu',
      'Top Menu': 'top-menu',
      'Compact Menu': 'compact-menu',
    };

    return nameToIdMap[displayName] || 'left-menu';
  }

  /**
   * Update selector visual state
   */
  private updateSelectorVisualState(selector: HTMLSelectElement): void {
    const currentStyleId = this.currentConfig.currentStyle.id;
    const displayName = this.convertIdToDisplayName(currentStyleId);

    selector.value = displayName;

    // Add custom styling
    selector.style.cssText = `
	  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	  color: white;
	  border: none;
	  border-radius: 8px;
	  padding: 8px 12px;
	  font-weight: 500;
	  cursor: pointer;
	  transition: all 0.3s ease;
	`;

    selector.addEventListener('mouseenter', () => {
      selector.style.transform = 'translateY(-2px)';
      selector.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    });

    selector.addEventListener('mouseleave', () => {
      selector.style.transform = 'translateY(0)';
      selector.style.boxShadow = 'none';
    });
  }

  /**
   * Convert style ID to display name
   */
  private convertIdToDisplayName(styleId: string): string {
    const idToNameMap: Record<string, string> = {
      'left-menu': 'Left Menu',
      'tile-menu': 'Tile Menu',
      'top-menu': 'Top Menu',
      'compact-menu': 'Compact Menu',
    };

    return idToNameMap[styleId] || 'Left Menu';
  }

  /**
   * Detect menu container element
   */
  private async detectMenuContainer(): Promise<void> {
    // Try common menu container selectors
    const possibleSelectors = [
      '.agent-menu',
      '.sidebar-menu',
      '.main-navigation',
      '.menu-container',
      '#agent-menu',
      '#sidebar-menu',
    ];

    for (const selector of possibleSelectors) {
      const container = document.querySelector(selector) as HTMLElement;
      if (container) {
        this.menuContainer = container;
        console.log(`✅ Found menu container: ${selector}`);
        return;
      }
    }

    // Fallback: create menu container
    await this.createFallbackMenuContainer();
  }

  /**
   * Create fallback menu container
   */
  private async createFallbackMenuContainer(): Promise<void> {
    const container = document.createElement('div');
    container.id = 'fantasy42-agent-menu';
    container.className = 'agent-menu fantasy42-menu-container';

    // Insert at beginning of body or after header
    const header = document.querySelector('header, .header, #header');
    if (header) {
      header.insertAdjacentElement('afterend', container);
    } else {
      document.body.insertBefore(container, document.body.firstChild);
    }

    this.menuContainer = container;
    console.log('✅ Created fallback menu container');
  }

  /**
   * Load user preferences from storage
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      // Try to load from localStorage
      const savedConfig = localStorage.getItem('fantasy42-menu-config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.currentConfig = { ...this.currentConfig, ...parsedConfig };
      }

      // Load last used style
      if (this.currentConfig.userPreferences.rememberLastStyle) {
        const lastStyle = localStorage.getItem('fantasy42-last-menu-style');
        if (lastStyle) {
          const style = this.defaultStyles.find(s => s.id === lastStyle);
          if (style) {
            this.currentConfig.currentStyle = style;
          }
        }
      }

      console.log('✅ User preferences loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load user preferences:', error);
    }
  }

  /**
   * Setup style observer for dynamic changes
   */
  private setupStyleObserver(): void {
    if (!this.menuContainer) return;

    this.styleObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.handleMenuContainerChange();
        }
      });
    });

    this.styleObserver.observe(this.menuContainer, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    console.log('✅ Style observer setup');
  }

  /**
   * Handle menu container changes
   */
  private handleMenuContainerChange(): void {
    // Reapply current style if container changes
    if (this.isInitialized) {
      setTimeout(() => {
        this.applyMenuStyle(this.currentConfig.currentStyle);
      }, 100);
    }
  }

  /**
   * Switch menu style
   */
  private async switchMenuStyle(styleId: string): Promise<void> {
    const newStyle = this.currentConfig.availableStyles.find(s => s.id === styleId);

    if (!newStyle) {
      console.warn(`⚠️ Menu style not found: ${styleId}`);
      return;
    }

    // Track style usage
    this.analytics.styleUsage[styleId] = (this.analytics.styleUsage[styleId] || 0) + 1;

    // Save last used style
    if (this.currentConfig.userPreferences.rememberLastStyle) {
      localStorage.setItem('fantasy42-last-menu-style', styleId);
    }

    // Apply new style
    await this.applyMenuStyle(newStyle);

    // Update configuration
    this.currentConfig.currentStyle = newStyle;

    // Save configuration
    this.saveConfiguration();

    console.log(`🎨 Switched to menu style: ${newStyle.name}`);
  }

  /**
   * Apply menu style
   */
  private async applyMenuStyle(style: MenuStyle): Promise<void> {
    if (!this.menuContainer) return;

    const startTime = Date.now();

    try {
      // Clear existing styles
      this.clearMenuStyles();

      // Apply layout class
      this.menuContainer.classList.add(`menu-${style.layout}`);

      // Apply theme
      this.applyTheme(style.theme);

      // Apply icon style
      this.applyIconStyle(style.iconStyle);

      // Apply animation
      this.applyAnimation(style.animation);

      // Apply responsive features
      if (style.responsive) {
        await this.applyResponsiveFeatures();
      }

      // Apply accessibility features
      if (style.accessibility) {
        await this.applyAccessibilityFeatures();
      }

      // Apply custom CSS if provided
      if (style.customCSS) {
        this.applyCustomCSS(style.customCSS);
      }

      // Apply custom JS if provided
      if (style.customJS) {
        this.applyCustomJS(style.customJS);
      }

      // Update layout structure
      await this.updateLayoutStructure(style);

      const renderTime = Date.now() - startTime;
      this.analytics.performanceMetrics.renderTime = renderTime;

      console.log(`✅ Applied menu style: ${style.name} (${renderTime}ms)`);
    } catch (error) {
      console.error('❌ Failed to apply menu style:', error);
      this.analytics.performanceMetrics.errorRate++;
    }
  }

  /**
   * Clear existing menu styles
   */
  private clearMenuStyles(): void {
    if (!this.menuContainer) return;

    // Remove layout classes
    this.menuContainer.classList.remove('menu-left', 'menu-tile', 'menu-top', 'menu-compact');

    // Remove theme classes
    this.menuContainer.classList.remove('theme-light', 'theme-dark', 'theme-auto');

    // Remove animation classes
    this.menuContainer.classList.remove(
      'animation-slide',
      'animation-fade',
      'animation-scale',
      'animation-none'
    );

    // Remove icon style classes
    this.menuContainer.classList.remove('icons-filled', 'icons-outlined', 'icons-minimal');
  }

  /**
   * Apply theme
   */
  private applyTheme(theme: MenuStyle['theme']): void {
    if (!this.menuContainer) return;

    this.menuContainer.classList.add(`theme-${theme}`);

    // Apply theme-specific styles
    const themeStyles = this.getThemeStyles(theme);
    this.applyInlineStyles(themeStyles);
  }

  /**
   * Get theme styles
   */
  private getThemeStyles(theme: MenuStyle['theme']): string {
    const themes: Record<MenuStyle['theme'], string> = {
      light: `
	    --menu-bg: #ffffff;
	    --menu-text: #2c3e50;
	    --menu-hover: #f8f9fa;
	    --menu-active: #e9ecef;
	    --menu-border: #dee2e6;
	    --menu-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	  `,
      dark: `
	    --menu-bg: #1a1a1a;
	    --menu-text: #ffffff;
	    --menu-hover: #2d2d2d;
	    --menu-active: #404040;
	    --menu-border: #404040;
	    --menu-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	  `,
      auto: `
	    --menu-bg: var(--bs-body-bg, #ffffff);
	    --menu-text: var(--bs-body-color, #2c3e50);
	    --menu-hover: var(--bs-gray-100, #f8f9fa);
	    --menu-active: var(--bs-gray-200, #e9ecef);
	    --menu-border: var(--bs-border-color, #dee2e6);
	    --menu-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	  `,
    };

    return themes[theme] || themes.light;
  }

  /**
   * Apply icon style
   */
  private applyIconStyle(iconStyle: MenuStyle['iconStyle']): void {
    if (!this.menuContainer) return;

    this.menuContainer.classList.add(`icons-${iconStyle}`);
  }

  /**
   * Apply animation
   */
  private applyAnimation(animation: MenuStyle['animation']): void {
    if (!this.menuContainer) return;

    this.menuContainer.classList.add(`animation-${animation}`);

    // Add animation-specific styles
    const animationStyles = this.getAnimationStyles(animation);
    this.applyInlineStyles(animationStyles);
  }

  /**
   * Get animation styles
   */
  private getAnimationStyles(animation: MenuStyle['animation']): string {
    const animations: Record<MenuStyle['animation'], string> = {
      none: '',
      slide: `
	    .menu-item {
	      transition: transform 0.3s ease, opacity 0.3s ease;
	    }
	    .menu-item:hover {
	      transform: translateX(5px);
	    }
	  `,
      fade: `
	    .menu-item {
	      transition: opacity 0.3s ease;
	    }
	    .menu-item:hover {
	      opacity: 0.8;
	    }
	  `,
      scale: `
	    .menu-item {
	      transition: transform 0.3s ease;
	    }
	    .menu-item:hover {
	      transform: scale(1.05);
	    }
	  `,
    };

    return animations[animation] || '';
  }

  /**
   * Apply responsive features
   */
  private async applyResponsiveFeatures(): Promise<void> {
    if (!this.menuContainer) return;

    // Add responsive CSS
    const responsiveStyles = `
	  @media (max-width: 768px) {
	    .menu-container {
	      position: fixed !important;
	      top: 0 !important;
	      left: -100% !important;
	      width: 280px !important;
	      height: 100vh !important;
	      z-index: 1000 !important;
	      transition: left 0.3s ease !important;
	    }
	    .menu-container.open {
	      left: 0 !important;
	    }
	    .menu-overlay {
	      position: fixed;
	      top: 0;
	      left: 0;
	      width: 100%;
	      height: 100%;
	      background: rgba(0, 0, 0, 0.5);
	      z-index: 999;
	      display: none;
	    }
	    .menu-overlay.show {
	      display: block;
	    }
	  }
	`;

    this.applyInlineStyles(responsiveStyles);

    // Add mobile menu toggle if needed
    await this.addMobileMenuToggle();
  }

  /**
   * Apply accessibility features
   */
  private async applyAccessibilityFeatures(): Promise<void> {
    if (!this.menuContainer) return;

    // Add ARIA labels and roles
    const menuItems = this.menuContainer.querySelectorAll('.menu-item');
    menuItems.forEach((item, index) => {
      const element = item as HTMLElement;
      element.setAttribute('role', 'menuitem');
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', element.textContent || `Menu item ${index + 1}`);
    });

    // Add keyboard navigation
    this.setupKeyboardNavigation();

    // Add focus management
    this.setupFocusManagement();

    console.log('♿ Accessibility features applied');
  }

  /**
   * Apply custom CSS
   */
  private applyCustomCSS(css: string): void {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Apply custom JS
   */
  private applyCustomJS(js: string): void {
    try {
      // Create a function from the JS string and execute it
      const customFunction = new Function(js);
      customFunction.call(this);
    } catch (error) {
      console.error('❌ Failed to execute custom JS:', error);
    }
  }

  /**
   * Update layout structure
   */
  private async updateLayoutStructure(style: MenuStyle): Promise<void> {
    if (!this.menuContainer) return;

    // Clear existing structure
    this.menuContainer.innerHTML = '';

    // Create new structure based on style
    const structure = this.createMenuStructure(style);
    this.menuContainer.innerHTML = structure;

    // Setup structure interactions
    await this.setupStructureInteractions(style);
  }

  /**
   * Create menu structure
   */
  private createMenuStructure(style: MenuStyle): string {
    const structures: Record<MenuStyle['layout'], string> = {
      left: `
	    <div class="menu-header">
	      <h3>Agent Dashboard</h3>
	    </div>
	    <nav class="menu-nav">
	      <ul class="menu-list">
	        <li class="menu-item" data-action="dashboard">
	          <i class="icon-dashboard"></i>
	          <span>Dashboard</span>
	        </li>
	        <li class="menu-item" data-action="players">
	          <i class="icon-users"></i>
	          <span>Players</span>
	        </li>
	        <li class="menu-item" data-action="transactions">
	          <i class="icon-transactions"></i>
	          <span>Transactions</span>
	        </li>
	        <li class="menu-item" data-action="reports">
	          <i class="icon-reports"></i>
	          <span>Reports</span>
	        </li>
	        <li class="menu-item" data-action="settings">
	          <i class="icon-settings"></i>
	          <span>Settings</span>
	        </li>
	      </ul>
	    </nav>
	  `,
      tile: `
	    <div class="menu-grid">
	      <div class="menu-tile" data-action="dashboard">
	        <i class="icon-dashboard"></i>
	        <h4>Dashboard</h4>
	        <p>Overview & Analytics</p>
	      </div>
	      <div class="menu-tile" data-action="players">
	        <i class="icon-users"></i>
	        <h4>Players</h4>
	        <p>Player Management</p>
	      </div>
	      <div class="menu-tile" data-action="transactions">
	        <i class="icon-transactions"></i>
	        <h4>Transactions</h4>
	        <p>Deposit & Withdrawal</p>
	      </div>
	      <div class="menu-tile" data-action="reports">
	        <i class="icon-reports"></i>
	        <h4>Reports</h4>
	        <p>Analytics & Insights</p>
	      </div>
	      <div class="menu-tile" data-action="settings">
	        <i class="icon-settings"></i>
	        <h4>Settings</h4>
	        <p>Configuration</p>
	      </div>
	    </div>
	  `,
      top: `
	    <div class="menu-bar">
	      <div class="menu-brand">
	        <h3>Agent Portal</h3>
	      </div>
	      <nav class="menu-nav">
	        <ul class="menu-list">
	          <li class="menu-item dropdown">
	            <span>Dashboard</span>
	            <div class="dropdown-menu">
	              <a href="#" data-action="overview">Overview</a>
	              <a href="#" data-action="analytics">Analytics</a>
	            </div>
	          </li>
	          <li class="menu-item dropdown">
	            <span>Players</span>
	            <div class="dropdown-menu">
	              <a href="#" data-action="all-players">All Players</a>
	              <a href="#" data-action="active-players">Active</a>
	            </div>
	          </li>
	          <li class="menu-item" data-action="transactions">Transactions</li>
	          <li class="menu-item" data-action="reports">Reports</li>
	          <li class="menu-item" data-action="settings">Settings</li>
	        </ul>
	      </nav>
	    </div>
	  `,
      compact: `
	    <div class="menu-compact">
	      <div class="menu-toggle">
	        <i class="icon-menu"></i>
	      </div>
	      <nav class="menu-nav">
	        <ul class="menu-list">
	          <li class="menu-item" data-action="dashboard" title="Dashboard">
	            <i class="icon-dashboard"></i>
	          </li>
	          <li class="menu-item" data-action="players" title="Players">
	            <i class="icon-users"></i>
	          </li>
	          <li class="menu-item" data-action="transactions" title="Transactions">
	            <i class="icon-transactions"></i>
	          </li>
	          <li class="menu-item" data-action="reports" title="Reports">
	            <i class="icon-reports"></i>
	          </li>
	          <li class="menu-item" data-action="settings" title="Settings">
	            <i class="icon-settings"></i>
	          </li>
	        </ul>
	      </nav>
	    </div>
	  `,
    };

    return structures[style.layout] || structures.left;
  }

  /**
   * Setup structure interactions
   */
  private async setupStructureInteractions(style: MenuStyle): Promise<void> {
    if (!this.menuContainer) return;

    // Setup menu item clicks
    const menuItems = this.menuContainer.querySelectorAll('.menu-item, .menu-tile');
    menuItems.forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const action = (item as HTMLElement).getAttribute('data-action');
        if (action) {
          this.handleMenuAction(action);
        }
      });
    });

    // Setup dropdowns for top menu
    if (style.layout === 'top') {
      const dropdowns = this.menuContainer.querySelectorAll('.dropdown');
      dropdowns.forEach(dropdown => {
        dropdown.addEventListener('mouseenter', () => {
          const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement;
          if (menu) menu.style.display = 'block';
        });

        dropdown.addEventListener('mouseleave', () => {
          const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement;
          if (menu) menu.style.display = 'none';
        });
      });
    }

    // Setup compact menu toggle
    if (style.layout === 'compact') {
      const toggle = this.menuContainer.querySelector('.menu-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          this.toggleCompactMenu();
        });
      }
    }

    console.log('✅ Structure interactions setup');
  }

  /**
   * Handle menu action
   */
  private handleMenuAction(action: string): void {
    console.log(`🎯 Menu action: ${action}`);

    // Track interaction
    this.analytics.interactionPatterns[action] =
      (this.analytics.interactionPatterns[action] || 0) + 1;

    // Handle different actions
    switch (action) {
      case 'dashboard':
        this.navigateToDashboard();
        break;
      case 'players':
        this.navigateToPlayers();
        break;
      case 'transactions':
        this.navigateToTransactions();
        break;
      case 'reports':
        this.navigateToReports();
        break;
      case 'settings':
        this.navigateToSettings();
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  /**
   * Setup analytics tracking
   */
  private setupAnalyticsTracking(): void {
    // Track menu interactions
    document.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target.closest('.menu-item, .menu-tile')) {
        this.trackInteraction('menu_click', {
          element: target.className,
          action: target.getAttribute('data-action'),
          timestamp: new Date().toISOString(),
        });
      }
    });

    console.log('📊 Analytics tracking setup');
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', e => {
      // Handle menu shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        switch (key) {
          case 'd':
            e.preventDefault();
            this.handleMenuAction('dashboard');
            break;
          case 'p':
            e.preventDefault();
            this.handleMenuAction('players');
            break;
          case 't':
            e.preventDefault();
            this.handleMenuAction('transactions');
            break;
          case 'r':
            e.preventDefault();
            this.handleMenuAction('reports');
            break;
          case 's':
            e.preventDefault();
            this.handleMenuAction('settings');
            break;
        }
      }
    });

    console.log('⌨️ Keyboard shortcuts setup');
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    if (!this.menuContainer) return;

    const menuItems = this.menuContainer.querySelectorAll('.menu-item, .menu-tile');
    let currentIndex = 0;

    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentIndex = Math.min(currentIndex + 1, menuItems.length - 1);
        (menuItems[currentIndex] as HTMLElement).focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        (menuItems[currentIndex] as HTMLElement).focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        const focused = document.activeElement;
        if (focused && focused.closest('.menu-item, .menu-tile')) {
          focused.click();
        }
      }
    });

    console.log('♿ Keyboard navigation setup');
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    if (!this.menuContainer) return;

    // Trap focus within menu when open
    const focusableElements = this.menuContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    this.menuContainer.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });

    console.log('🎯 Focus management setup');
  }

  /**
   * Initialize quick actions
   */
  private async initializeQuickActions(): Promise<void> {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = `quick-actions ${this.currentConfig.quickActions.position}`;
    actionsContainer.innerHTML = this.currentConfig.quickActions.actions
      .map(
        action => `
	  <button class="quick-action-btn" data-action="${action.action}" title="${action.label} (${action.shortcut})">
	    <span class="action-icon">${action.icon}</span>
	    <span class="action-label">${action.label}</span>
	  </button>
	`
      )
      .join('');

    // Add styles
    const styles = `
	  .quick-actions.floating {
	    position: fixed;
	    bottom: 20px;
	    right: 20px;
	    z-index: 1000;
	    display: flex;
	    flex-direction: column;
	    gap: 10px;
	  }
	  .quick-action-btn {
	    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	    color: white;
	    border: none;
	    border-radius: 50px;
	    padding: 12px 16px;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    display: flex;
	    align-items: center;
	    gap: 8px;
	    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	  }
	  .quick-action-btn:hover {
	    transform: translateY(-2px);
	    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
	  }
	  .action-label {
	    display: none;
	  }
	  @media (min-width: 768px) {
	    .quick-action-btn {
	      padding: 12px 20px;
	    }
	    .action-label {
	      display: block;
	    }
	  }
	`;

    this.applyInlineStyles(styles);
    document.body.appendChild(actionsContainer);

    // Setup action button events
    const actionButtons = actionsContainer.querySelectorAll('.quick-action-btn');
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        if (action) {
          this.handleQuickAction(action);
        }
      });
    });

    console.log('⚡ Quick actions initialized');
  }

  /**
   * Initialize notifications
   */
  private async initializeNotifications(): Promise<void> {
    const notificationContainer = document.createElement('div');
    notificationContainer.className = `notification-container ${this.currentConfig.notifications.position}`;
    notificationContainer.id = 'fantasy42-notifications';

    const styles = `
	  .notification-container {
	    position: fixed;
	    z-index: 1001;
	    max-width: 400px;
	  }
	  .notification-container.top-right {
	    top: 20px;
	    right: 20px;
	  }
	  .notification-container.top-left {
	    top: 20px;
	    left: 20px;
	  }
	  .notification-container.bottom-right {
	    bottom: 20px;
	    right: 20px;
	  }
	  .notification-container.bottom-left {
	    bottom: 20px;
	    left: 20px;
	  }
	  .notification-item {
	    background: white;
	    border-radius: 8px;
	    padding: 16px;
	    margin-bottom: 10px;
	    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	    border-left: 4px solid #667eea;
	    animation: slideIn 0.3s ease;
	  }
	  @keyframes slideIn {
	    from { transform: translateX(100%); opacity: 0; }
	    to { transform: translateX(0); opacity: 1; }
	  }
	  .notification-close {
	    float: right;
	    cursor: pointer;
	    color: #6c757d;
	  }
	`;

    this.applyInlineStyles(styles);
    document.body.appendChild(notificationContainer);

    console.log('🔔 Notifications initialized');
  }

  /**
   * Initialize search
   */
  private async initializeSearch(): Promise<void> {
    const searchContainer = document.createElement('div');
    searchContainer.className = `menu-search ${this.currentConfig.search.position}`;

    searchContainer.innerHTML = `
	  <div class="search-wrapper">
	    <input type="text" class="search-input" placeholder="${this.currentConfig.search.placeholder}" />
	    <button class="search-btn">🔍</button>
	  </div>
	`;

    // Position search based on configuration
    if (this.currentConfig.search.position === 'header') {
      const header = document.querySelector('header, .header, #header');
      if (header) {
        header.appendChild(searchContainer);
      }
    } else if (this.currentConfig.search.position === 'sidebar') {
      if (this.menuContainer) {
        this.menuContainer.appendChild(searchContainer);
      }
    } else {
      // Floating search
      searchContainer.style.cssText = `
	    position: fixed;
	    top: 20px;
	    left: 50%;
	    transform: translateX(-50%);
	    z-index: 1000;
	  `;
      document.body.appendChild(searchContainer);
    }

    const styles = `
	  .menu-search .search-wrapper {
	    display: flex;
	    background: white;
	    border-radius: 25px;
	    overflow: hidden;
	    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	  }
	  .search-input {
	    flex: 1;
	    border: none;
	    padding: 12px 16px;
	    outline: none;
	    font-size: 14px;
	  }
	  .search-btn {
	    background: #667eea;
	    color: white;
	    border: none;
	    padding: 12px 16px;
	    cursor: pointer;
	    transition: background 0.3s ease;
	  }
	  .search-btn:hover {
	    background: #5a6fd8;
	  }
	`;

    this.applyInlineStyles(styles);

    // Setup search functionality
    const searchInput = searchContainer.querySelector('.search-input') as HTMLInputElement;
    const searchBtn = searchContainer.querySelector('.search-btn');

    const performSearch = () => {
      const query = searchInput.value.trim();
      if (query) {
        this.performSearch(query);
      }
    };

    searchBtn?.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    console.log('🔍 Search functionality initialized');
  }

  /**
   * Apply inline styles
   */
  private applyInlineStyles(styles: string): void {
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.appendChild(style);
  }

  /**
   * Add mobile menu toggle
   */
  private async addMobileMenuToggle(): Promise<void> {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-menu-toggle';
    toggleBtn.innerHTML = '☰';
    toggleBtn.style.cssText = `
	  position: fixed;
	  top: 15px;
	  left: 15px;
	  z-index: 1001;
	  background: #667eea;
	  color: white;
	  border: none;
	  border-radius: 4px;
	  padding: 10px;
	  cursor: pointer;
	  display: none;
	  font-size: 16px;
	`;

    document.body.appendChild(toggleBtn);

    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    // Toggle functionality
    toggleBtn.addEventListener('click', () => {
      const menu = document.querySelector('.menu-container') as HTMLElement;
      const isOpen = menu?.classList.contains('open');

      if (isOpen) {
        menu?.classList.remove('open');
        overlay.classList.remove('show');
      } else {
        menu?.classList.add('open');
        overlay.classList.add('show');
      }
    });

    overlay.addEventListener('click', () => {
      const menu = document.querySelector('.menu-container') as HTMLElement;
      menu?.classList.remove('open');
      overlay.classList.remove('show');
    });

    // Show/hide toggle based on screen size
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleScreenChange = (e: MediaQueryListEvent) => {
      toggleBtn.style.display = e.matches ? 'block' : 'none';
    };

    mediaQuery.addEventListener('change', handleScreenChange);
    toggleBtn.style.display = mediaQuery.matches ? 'block' : 'none';

    console.log('📱 Mobile menu toggle added');
  }

  /**
   * Toggle compact menu
   */
  private toggleCompactMenu(): void {
    if (!this.menuContainer) return;

    const nav = this.menuContainer.querySelector('.menu-nav') as HTMLElement;
    if (nav) {
      const isCollapsed = nav.style.display === 'none';
      nav.style.display = isCollapsed ? 'block' : 'none';
    }
  }

  /**
   * Handle quick action
   */
  private handleQuickAction(action: string): void {
    console.log(`⚡ Quick action: ${action}`);

    // Handle different quick actions
    switch (action) {
      case 'openDepositModal':
        this.openDepositModal();
        break;
      case 'openWithdrawalModal':
        this.openWithdrawalModal();
        break;
      case 'openBettingInterface':
        this.openBettingInterface();
        break;
      case 'openPlayerSearch':
        this.openPlayerSearch();
        break;
    }
  }

  /**
   * Perform search
   */
  private performSearch(query: string): void {
    console.log(`🔍 Searching for: ${query}`);

    // Implement search functionality
    // This would integrate with Fantasy42 search API
  }

  /**
   * Track interaction
   */
  private trackInteraction(type: string, data: any): void {
    // Track interaction for analytics
    this.analytics.interactionPatterns[type] = (this.analytics.interactionPatterns[type] || 0) + 1;
  }

  /**
   * Save configuration
   */
  private saveConfiguration(): void {
    try {
      localStorage.setItem('fantasy42-menu-config', JSON.stringify(this.currentConfig));
    } catch (error) {
      console.warn('⚠️ Failed to save configuration:', error);
    }
  }

  /**
   * Navigation methods
   */
  private navigateToDashboard(): void {
    console.log('📊 Navigating to Dashboard');
    // Implement navigation logic
  }

  private navigateToPlayers(): void {
    console.log('👥 Navigating to Players');
    // Implement navigation logic
  }

  private navigateToTransactions(): void {
    console.log('💰 Navigating to Transactions');
    // Implement navigation logic
  }

  private navigateToReports(): void {
    console.log('📈 Navigating to Reports');
    // Implement navigation logic
  }

  private navigateToSettings(): void {
    console.log('⚙️ Navigating to Settings');
    // Implement navigation logic
  }

  /**
   * Quick action methods
   */
  private openDepositModal(): void {
    console.log('💰 Opening deposit modal');
    // Implement deposit modal logic
  }

  private openWithdrawalModal(): void {
    console.log('💸 Opening withdrawal modal');
    // Implement withdrawal modal logic
  }

  private openBettingInterface(): void {
    console.log('🎯 Opening betting interface');
    // Implement betting interface logic
  }

  private openPlayerSearch(): void {
    console.log('🔍 Opening player search');
    // Implement player search logic
  }

  /**
   * Get menu status
   */
  getStatus(): {
    isInitialized: boolean;
    currentStyle: string;
    availableStyles: string[];
    analytics: MenuAnalytics;
    preferences: any;
  } {
    return {
      isInitialized: this.isInitialized,
      currentStyle: this.currentConfig.currentStyle.name,
      availableStyles: this.currentConfig.availableStyles.map(s => s.name),
      analytics: this.analytics,
      preferences: this.currentConfig.userPreferences,
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): MenuConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<MenuConfiguration>): Promise<void> {
    this.currentConfig = { ...this.currentConfig, ...newConfig };
    this.saveConfiguration();

    // Reinitialize with new config
    if (this.isInitialized) {
      await this.initialize();
    }

    console.log('⚙️ Configuration updated');
  }

  /**
   * Add custom style
   */
  addCustomStyle(style: MenuStyle): void {
    this.currentConfig.availableStyles.push(style);
    console.log(`🎨 Added custom style: ${style.name}`);
  }

  /**
   * Remove custom style
   */
  removeCustomStyle(styleId: string): void {
    this.currentConfig.availableStyles = this.currentConfig.availableStyles.filter(
      s => s.id !== styleId
    );
    console.log(`🗑️ Removed style: ${styleId}`);
  }

  /**
   * Export configuration
   */
  exportConfiguration(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      await this.updateConfiguration(importedConfig);
      console.log('📥 Configuration imported');
    } catch (error) {
      console.error('❌ Failed to import configuration:', error);
    }
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.currentConfig = this.createDefaultConfiguration();
    this.saveConfiguration();

    if (this.isInitialized) {
      await this.initialize();
    }

    console.log('🔄 Reset to default configuration');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.styleObserver) {
      this.styleObserver.disconnect();
    }

    // Remove added elements
    const addedElements = document.querySelectorAll(
      '.fantasy42-menu-container, .quick-actions, .notification-container, .menu-overlay, .mobile-menu-toggle'
    );
    addedElements.forEach(element => element.remove());

    // Clear configuration
    localStorage.removeItem('fantasy42-menu-config');
    localStorage.removeItem('fantasy42-last-menu-style');

    this.isInitialized = false;
    console.log('🧹 Agent menu system cleaned up');
  }
}

// Convenience functions
export const createFantasy42AgentMenu = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<MenuConfiguration>
): Fantasy42AgentMenu => {
  return new Fantasy42AgentMenu(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42AgentMenu = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<MenuConfiguration>
): Promise<boolean> => {
  const menuSystem = new Fantasy42AgentMenu(fantasyClient, unifiedIntegration, config);
  return await menuSystem.initialize();
};

// Export types
export type { MenuStyle, MenuConfiguration, MenuAnalytics };
