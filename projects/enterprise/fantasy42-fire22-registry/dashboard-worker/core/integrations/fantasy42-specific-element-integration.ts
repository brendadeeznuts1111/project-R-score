/**
 * Fantasy42 Specific Element Integration
 * Targets the element at: /html/body/div[3]/div[5]/div/div[4]/div[7]/div
 *
 * This integration handles a specific UI element identified by the provided XPath
 */

import { XPathElementHandler } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';

export interface SpecificElementConfig {
  xpath: string;
  action: 'read' | 'write' | 'update' | 'click' | 'submit' | 'validate';
  data?: any;
  autoUpdate?: boolean;
  updateInterval?: number;
  validation?: {
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
  onDataChange?: (newData: any, element: Element) => void;
  onElementFound?: (element: Element) => void;
}

export interface ElementData {
  content: string;
  attributes: Record<string, string>;
  children: ElementData[];
  timestamp: string;
  xpath: string;
}

export class Fantasy42SpecificElementManager {
  private xpathHandler: XPathElementHandler;
  private client: Fantasy42AgentClient;
  private targetXPath: string;
  private config: SpecificElementConfig;
  private isInitialized: boolean = false;
  private currentElement: Element | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastData: any = null;

  constructor(client: Fantasy42AgentClient, config: SpecificElementConfig) {
    this.client = client;
    this.xpathHandler = XPathElementHandler.getInstance();
    this.targetXPath = config.xpath;
    this.config = config;
  }

  /**
   * Initialize the specific element integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎯 Initializing Fantasy42 Specific Element Integration...');
      console.log('📍 Target XPath:', this.targetXPath);

      // Wait for page to be ready
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          const onLoad = () => {
            window.removeEventListener('load', onLoad);
            resolve(void 0);
          };
          window.addEventListener('load', onLoad);
          // Fallback timeout
          setTimeout(resolve, 10000);
        });
      }

      // Try to find the element
      const element = this.xpathHandler.findElementByXPath(this.targetXPath);
      if (element) {
        console.log('✅ Found target element:', element.tagName);
        this.currentElement = element;
        this.setupElement(element);
      } else {
        console.warn('⚠️ Target element not found, setting up watcher');
        this.setupDOMWatcher();
      }

      // Setup auto-update if enabled
      if (this.config.autoUpdate && this.config.updateInterval) {
        this.startAutoUpdate();
      }

      this.isInitialized = true;
      console.log('✅ Fantasy42 Specific Element Integration initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize specific element integration:', error);
      return false;
    }
  }

  /**
   * Setup the found element with event listeners and monitoring
   */
  private setupElement(element: Element): void {
    this.currentElement = element;

    // Call the element found callback
    if (this.config.onElementFound) {
      this.config.onElementFound(element);
    }

    // Setup event listeners based on action type
    switch (this.config.action) {
      case 'click':
        element.addEventListener('click', e => this.handleClick(e));
        break;
      case 'submit':
        if (element instanceof HTMLFormElement) {
          element.addEventListener('submit', e => this.handleSubmit(e));
        }
        break;
      case 'update':
        this.setupContentObserver(element);
        break;
    }

    // Initial data read if configured
    if (this.config.action === 'read') {
      this.readElementData();
    }

    console.log('✅ Element setup complete for:', element.tagName);
  }

  /**
   * Setup DOM watcher to find element when it becomes available
   */
  private setupDOMWatcher(): void {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const element = this.xpathHandler.findElementByXPath(this.targetXPath);
          if (element) {
            console.log('🎯 Target element found via DOM watcher');
            observer.disconnect();
            this.setupElement(element);
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also try finding the element periodically
    const intervalId = setInterval(() => {
      const element = this.xpathHandler.findElementByXPath(this.targetXPath);
      if (element) {
        clearInterval(intervalId);
        console.log('🎯 Target element found via interval check');
        this.setupElement(element);
      }
    }, 1000);

    // Stop checking after 30 seconds
    setTimeout(() => {
      clearInterval(intervalId);
    }, 30000);
  }

  /**
   * Setup content observer for real-time updates
   */
  private setupContentObserver(element: Element): void {
    const observer = new MutationObserver(mutations => {
      let contentChanged = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          contentChanged = true;
          break;
        }
      }

      if (contentChanged) {
        const newData = this.readElementData();
        if (this.config.onDataChange && this.hasDataChanged(newData)) {
          this.config.onDataChange(newData, element);
        }
      }
    });

    observer.observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  /**
   * Read data from the element
   */
  readElementData(): ElementData | null {
    if (!this.currentElement) return null;

    const element = this.currentElement;
    const data: ElementData = {
      content: element.textContent || '',
      attributes: {},
      children: [],
      timestamp: new Date().toISOString(),
      xpath: this.targetXPath,
    };

    // Get attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      data.attributes[attr.name] = attr.value;
    }

    // Get children data (simplified)
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      data.children.push({
        content: child.textContent || '',
        attributes: {},
        children: [],
        timestamp: data.timestamp,
        xpath: `${this.targetXPath}/*[${i + 1}]`,
      });
    }

    this.lastData = data;
    return data;
  }

  /**
   * Write data to the element
   */
  writeElementData(data: any): boolean {
    if (!this.currentElement) return false;

    try {
      if (typeof data === 'string') {
        this.currentElement.textContent = data;
      } else if (typeof data === 'object') {
        // Handle object data (could be attributes, etc.)
        if (data.content) {
          this.currentElement.textContent = data.content;
        }
        if (data.attributes) {
          Object.entries(data.attributes).forEach(([key, value]) => {
            (this.currentElement as Element).setAttribute(key, String(value));
          });
        }
      }

      console.log('✅ Element data written successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to write element data:', error);
      return false;
    }
  }

  /**
   * Handle click events
   */
  private handleClick(event: Event): void {
    console.log('🖱️ Element clicked');
    // Add your click handling logic here
  }

  /**
   * Handle form submission
   */
  private handleSubmit(event: Event): void {
    event.preventDefault();
    console.log('📝 Form submitted');
    // Add your form submission logic here
  }

  /**
   * Start auto-update functionality
   */
  private startAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      if (this.currentElement) {
        const newData = this.readElementData();
        if (this.config.onDataChange && this.hasDataChanged(newData)) {
          this.config.onDataChange(newData, this.currentElement);
        }
      }
    }, this.config.updateInterval || 5000);
  }

  /**
   * Check if data has changed
   */
  private hasDataChanged(newData: any): boolean {
    if (!this.lastData || !newData) return true;

    // Simple comparison - you might want to make this more sophisticated
    return JSON.stringify(this.lastData) !== JSON.stringify(newData);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SpecificElementConfig>): void {
    Object.assign(this.config, newConfig);

    // Restart auto-update if interval changed
    if (newConfig.updateInterval && this.config.autoUpdate) {
      this.startAutoUpdate();
    }
  }

  /**
   * Get current element
   */
  getCurrentElement(): Element | null {
    return this.currentElement;
  }

  /**
   * Get current data
   */
  getCurrentData(): any {
    return this.lastData;
  }

  /**
   * Check if integration is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.currentElement !== null;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.currentElement = null;
    this.lastData = null;
    this.isInitialized = false;

    console.log('🧹 Specific element integration cleaned up');
  }
}

// Convenience functions
export const createSpecificElementIntegration = (
  client: Fantasy42AgentClient,
  config: SpecificElementConfig
): Fantasy42SpecificElementManager => {
  return new Fantasy42SpecificElementManager(client, config);
};

export const initializeSpecificElementIntegration = async (
  client: Fantasy42AgentClient,
  config: SpecificElementConfig
): Promise<boolean> => {
  const manager = new Fantasy42SpecificElementManager(client, config);
  return await manager.initialize();
};

// Pre-configured integration for the specific XPath
export const createSpecificElementManager = (client: Fantasy42AgentClient) => {
  const config: SpecificElementConfig = {
    xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
    action: 'read',
    autoUpdate: true,
    updateInterval: 5000,
    onDataChange: (newData, element) => {
      console.log('📊 Element data changed:', newData);
      // Add your data change handling logic here
    },
    onElementFound: element => {
      console.log('🎯 Specific element found:', element.tagName);
      // Add your element found handling logic here
    },
  };

  return new Fantasy42SpecificElementManager(client, config);
};
