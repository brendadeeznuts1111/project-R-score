/**
 * Fire22 Fantasy42 DOM Analyzer
 * Advanced DOM analysis and interaction system for Fantasy42 interface
 */

import { EventEmitter } from 'events';
import { XPathElementHandler } from '../ui/xpath-element-handler';

export interface DOMElement {
  tagName: string;
  id?: string;
  className?: string;
  xpath: string;
  attributes: Record<string, string>;
  textContent?: string;
  innerHTML?: string;
  isVisible: boolean;
  boundingRect?: DOMRect;
  computedStyle?: Record<string, string>;
}

export interface Fantasy42PageStructure {
  url: string;
  title: string;
  mainContent: DOMElement[];
  navigation: DOMElement[];
  forms: DOMElement[];
  tables: DOMElement[];
  buttons: DOMElement[];
  links: DOMElement[];
  inputs: DOMElement[];
  customerElements: DOMElement[];
  agentElements: DOMElement[];
  transactionElements: DOMElement[];
}

export interface ElementInteraction {
  element: DOMElement;
  action: 'click' | 'input' | 'select' | 'hover' | 'focus' | 'blur';
  value?: string;
  delay?: number;
  waitFor?: string; // XPath to wait for after action
}

export interface AutomationScript {
  name: string;
  description: string;
  steps: ElementInteraction[];
  triggers: string[]; // Events that should trigger this script
  conditions: string[]; // Conditions that must be met
}

export class Fantasy42DOMAnalyzer extends EventEmitter {
  private static instance: Fantasy42DOMAnalyzer;
  private xpathHandler: XPathElementHandler;
  private pageStructure: Fantasy42PageStructure | null = null;
  private automationScripts: Map<string, AutomationScript> = new Map();
  private elementCache: Map<string, DOMElement> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.xpathHandler = XPathElementHandler.getInstance();
  }

  public static getInstance(): Fantasy42DOMAnalyzer {
    if (!Fantasy42DOMAnalyzer.instance) {
      Fantasy42DOMAnalyzer.instance = new Fantasy42DOMAnalyzer();
    }
    return Fantasy42DOMAnalyzer.instance;
  }

  /**
   * Initialize the DOM analyzer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Setup initial analysis
    await this.analyzeCurrentPage();

    // Setup continuous monitoring
    this.setupPageMonitoring();

    // Load automation scripts
    this.loadDefaultScripts();

    this.isInitialized = true;
  }

  /**
   * Analyze the current page structure
   */
  async analyzeCurrentPage(): Promise<Fantasy42PageStructure> {
    const structure: Fantasy42PageStructure = {
      url: window.location.href,
      title: document.title,
      mainContent: [],
      navigation: [],
      forms: [],
      tables: [],
      buttons: [],
      links: [],
      inputs: [],
      customerElements: [],
      agentElements: [],
      transactionElements: [],
    };

    // Analyze main content areas
    structure.mainContent = await this.findMainContent();

    // Analyze navigation elements
    structure.navigation = await this.findNavigationElements();

    // Analyze forms
    structure.forms = await this.findForms();

    // Analyze tables (likely contain customer/agent data)
    structure.tables = await this.findTables();

    // Analyze interactive elements
    structure.buttons = await this.findButtons();
    structure.links = await this.findLinks();
    structure.inputs = await this.findInputs();

    // Analyze domain-specific elements
    structure.customerElements = await this.findCustomerElements();
    structure.agentElements = await this.findAgentElements();
    structure.transactionElements = await this.findTransactionElements();

    this.pageStructure = structure;
    this.emit('page-analyzed', structure);

    return structure;
  }

  /**
   * Find main content areas
   */
  private async findMainContent(): Promise<DOMElement[]> {
    const selectors = [
      '[class*="content"]',
      '[class*="main"]',
      '[class*="container"]',
      '[id*="content"]',
      '[id*="main"]',
      'div.row',
      'div.col',
      '.card',
      '.panel',
    ];

    const elements: DOMElement[] = [];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const element = this.createDOMElement(el);
          if (element) elements.push(element);
        }
      });
    }

    return elements;
  }

  /**
   * Find navigation elements
   */
  private async findNavigationElements(): Promise<DOMElement[]> {
    const selectors = [
      'nav',
      '[class*="nav"]',
      '[class*="menu"]',
      '.navbar',
      '.sidebar',
      '[role="navigation"]',
      'ul[class*="menu"]',
      '.breadcrumb',
    ];

    const elements: DOMElement[] = [];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const element = this.createDOMElement(el);
          if (element) elements.push(element);
        }
      });
    }

    return elements;
  }

  /**
   * Find forms on the page
   */
  private async findForms(): Promise<DOMElement[]> {
    const forms = document.querySelectorAll('form');
    const elements: DOMElement[] = [];

    forms.forEach(form => {
      if (form instanceof HTMLFormElement) {
        const element = this.createDOMElement(form);
        if (element) {
          // Analyze form fields
          element.formFields = this.analyzeFormFields(form);
          elements.push(element);
        }
      }
    });

    return elements;
  }

  /**
   * Find tables (likely contain data)
   */
  private async findTables(): Promise<DOMElement[]> {
    const tables = document.querySelectorAll('table');
    const elements: DOMElement[] = [];

    tables.forEach(table => {
      if (table instanceof HTMLTableElement) {
        const element = this.createDOMElement(table);
        if (element) {
          element.tableInfo = this.analyzeTable(table);
          elements.push(element);
        }
      }
    });

    return elements;
  }

  /**
   * Find buttons
   */
  private async findButtons(): Promise<DOMElement[]> {
    const selectors = [
      'button',
      '[type="button"]',
      '[type="submit"]',
      '[role="button"]',
      '.btn',
      '[class*="button"]',
      'input[type="button"]',
      'input[type="submit"]',
    ];

    const elements: DOMElement[] = [];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const element = this.createDOMElement(el);
          if (element) elements.push(element);
        }
      });
    }

    return elements;
  }

  /**
   * Find links
   */
  private async findLinks(): Promise<DOMElement[]> {
    const links = document.querySelectorAll('a');
    const elements: DOMElement[] = [];

    links.forEach(link => {
      if (link instanceof HTMLAnchorElement) {
        const element = this.createDOMElement(link);
        if (element) elements.push(element);
      }
    });

    return elements;
  }

  /**
   * Find input elements
   */
  private async findInputs(): Promise<DOMElement[]> {
    const inputs = document.querySelectorAll('input, select, textarea');
    const elements: DOMElement[] = [];

    inputs.forEach(input => {
      if (input instanceof HTMLElement) {
        const element = this.createDOMElement(input);
        if (element) elements.push(element);
      }
    });

    return elements;
  }

  /**
   * Find customer-related elements
   */
  private async findCustomerElements(): Promise<DOMElement[]> {
    const selectors = [
      '[class*="customer"]',
      '[class*="player"]',
      '[class*="user"]',
      '[id*="customer"]',
      '[id*="player"]',
      '[id*="user"]',
      '[data-field*="customer"]',
      '[data-field*="player"]',
      '[data-field*="user"]',
      'tr[class*="customer"]',
      'tr[class*="player"]',
      'tr[class*="user"]',
    ];

    const elements: DOMElement[] = [];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const element = this.createDOMElement(el);
          if (element) elements.push(element);
        }
      });
    }

    return elements;
  }

  /**
   * Find agent-related elements
   */
  private async findAgentElements(): Promise<DOMElement[]> {
    const selectors = [
      '[class*="agent"]',
      '[id*="agent"]',
      '[data-field*="agent"]',
      'tr[class*="agent"]',
      '.agent-tree',
      '.agent-list',
      '[href*="agent"]',
      '[data-action*="agent"]',
    ];

    const elements: DOMElement[] = [];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const element = this.createDOMElement(el);
          if (element) elements.push(element);
        }
      });
    }

    return elements;
  }

  /**
   * Find transaction-related elements
   */
  private async findTransactionElements(): Promise<DOMElement[]> {
    const selectors = [
      '[class*="transaction"]',
      '[class*="payment"]',
      '[class*="cash"]',
      '[class*="deposit"]',
      '[class*="withdrawal"]',
      '[id*="transaction"]',
      '[id*="payment"]',
      '[id*="cash"]',
      '[data-action*="transaction"]',
      '[data-action*="payment"]',
      '[data-action*="cash"]',
      'tr[class*="transaction"]',
      'tr[class*="payment"]',
    ];

    const elements: DOMElement[] = [];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const element = this.createDOMElement(el);
          if (element) elements.push(element);
        }
      });
    }

    return elements;
  }

  /**
   * Create DOM element analysis
   */
  private createDOMElement(el: HTMLElement): DOMElement | null {
    try {
      const xpath = this.getElementXPath(el);
      const cacheKey = xpath;

      // Check cache first
      if (this.elementCache.has(cacheKey)) {
        return this.elementCache.get(cacheKey)!;
      }

      const element: DOMElement = {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        xpath,
        attributes: {},
        textContent: el.textContent?.trim(),
        innerHTML: el.innerHTML,
        isVisible: this.isElementVisible(el),
        boundingRect: el.getBoundingClientRect(),
        computedStyle: this.getComputedStyle(el),
      };

      // Extract attributes
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        element.attributes[attr.name] = attr.value;
      }

      // Cache the element
      this.elementCache.set(cacheKey, element);

      return element;
    } catch (error) {
      console.warn('Failed to analyze element:', error);
      return null;
    }
  }

  /**
   * Get XPath for element
   */
  private getElementXPath(element: HTMLElement): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    if (element.name) {
      return `//${element.tagName.toLowerCase()}[@name="${element.name}"]`;
    }

    const parts = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling: Element | null = current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const pathSegment = index > 0 ? `${tagName}[${index + 1}]` : tagName;
      parts.unshift(pathSegment);

      current = current.parentElement;
    }

    return `/${parts.join('/')}`;
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  /**
   * Get computed style
   */
  private getComputedStyle(element: HTMLElement): Record<string, string> {
    const computed = window.getComputedStyle(element);
    const style: Record<string, string> = {};

    // Get key style properties
    const properties = [
      'display',
      'visibility',
      'opacity',
      'position',
      'top',
      'left',
      'width',
      'height',
      'background-color',
      'color',
      'font-size',
      'font-weight',
      'text-align',
      'border',
      'padding',
      'margin',
    ];

    properties.forEach(prop => {
      style[prop] = computed.getPropertyValue(prop);
    });

    return style;
  }

  /**
   * Analyze form fields
   */
  private analyzeFormFields(form: HTMLFormElement): any[] {
    const fields = [];
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      if (input instanceof HTMLElement) {
        const field = this.createDOMElement(input);
        if (field) {
          fields.push(field);
        }
      }
    });

    return fields;
  }

  /**
   * Analyze table structure
   */
  private analyzeTable(table: HTMLTableElement): any {
    const headers = [];
    const rows = [];

    // Get headers
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach(cell => {
      headers.push(cell.textContent?.trim());
    });

    // Get data rows
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach(row => {
      const rowData = [];
      const cells = row.querySelectorAll('td');
      cells.forEach(cell => {
        rowData.push(cell.textContent?.trim());
      });
      rows.push(rowData);
    });

    return {
      headers,
      rows,
      rowCount: rows.length,
      columnCount: headers.length,
    };
  }

  /**
   * Setup page monitoring
   */
  private setupPageMonitoring(): void {
    // Monitor DOM changes
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          this.handleDOMChange(mutation);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Monitor URL changes
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.handleUrlChange(currentUrl);
      }
    }, 1000);
  }

  /**
   * Load default automation scripts
   */
  private loadDefaultScripts(): void {
    // Customer search script
    this.automationScripts.set('customer-search', {
      name: 'Customer Search',
      description: 'Automatically search for customers',
      steps: [
        {
          element: { xpath: '//input[@placeholder="Search customers"]' } as DOMElement,
          action: 'input',
          value: '{searchTerm}',
        },
        {
          element: { xpath: '//button[@data-action="search"]' } as DOMElement,
          action: 'click',
          delay: 500,
        },
      ],
      triggers: ['customer-search-requested'],
      conditions: ['search-input-available'],
    });

    // Agent tree navigation
    this.automationScripts.set('agent-navigation', {
      name: 'Agent Tree Navigation',
      description: 'Navigate agent hierarchy',
      steps: [
        {
          element: { xpath: '//a[@data-action="get-agent-management"]' } as DOMElement,
          action: 'click',
          delay: 1000,
        },
        {
          element: { xpath: '//div[@class="agent-tree"]' } as DOMElement,
          action: 'focus',
        },
      ],
      triggers: ['agent-tree-requested'],
      conditions: ['agent-tree-available'],
    });

    // Transaction processing
    this.automationScripts.set('transaction-processing', {
      name: 'Transaction Processing',
      description: 'Process customer transactions',
      steps: [
        {
          element: { xpath: '//a[@data-action="get-transactions"]' } as DOMElement,
          action: 'click',
          delay: 1000,
        },
        {
          element: { xpath: '//input[@name="amount"]' } as DOMElement,
          action: 'input',
          value: '{amount}',
        },
      ],
      triggers: ['transaction-requested'],
      conditions: ['transaction-form-available'],
    });
  }

  /**
   * Execute automation script
   */
  async executeScript(scriptName: string, parameters: Record<string, any> = {}): Promise<void> {
    const script = this.automationScripts.get(scriptName);
    if (!script) {
      throw new Error(`Script '${scriptName}' not found`);
    }

    for (const step of script.steps) {
      try {
        await this.executeStep(step, parameters);
        if (step.delay) {
          await this.delay(step.delay);
        }
      } catch (error) {
        console.error(`Script execution failed at step:`, step, error);
        throw error;
      }
    }
  }

  /**
   * Execute automation step
   */
  private async executeStep(
    step: ElementInteraction,
    parameters: Record<string, any>
  ): Promise<void> {
    // Find the element
    const element = this.xpathHandler.findElementByXPath(step.element.xpath);
    if (!element) {
      throw new Error(`Element not found: ${step.element.xpath}`);
    }

    // Replace parameters in value
    let value = step.value;
    if (value) {
      for (const [key, paramValue] of Object.entries(parameters)) {
        value = value.replace(`{${key}}`, paramValue.toString());
      }
    }

    // Execute action
    switch (step.action) {
      case 'click':
        if (element instanceof HTMLElement) {
          element.click();
        }
        break;

      case 'input':
        if (element instanceof HTMLInputElement && value) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;

      case 'select':
        if (element instanceof HTMLSelectElement && value) {
          element.value = value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;

      case 'focus':
        if (element instanceof HTMLElement) {
          element.focus();
        }
        break;

      case 'blur':
        if (element instanceof HTMLElement) {
          element.blur();
        }
        break;

      default:
        throw new Error(`Unsupported action: ${step.action}`);
    }

    // Wait for element if specified
    if (step.waitFor) {
      await this.waitForElement(step.waitFor, 5000);
    }
  }

  /**
   * Wait for element to appear
   */
  private async waitForElement(xpath: string, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = this.xpathHandler.findElementByXPath(xpath);
      if (element) {
        return;
      }
      await this.delay(100);
    }

    throw new Error(`Element not found within timeout: ${xpath}`);
  }

  /**
   * Handle DOM changes
   */
  private handleDOMChange(mutation: MutationRecord): void {
    // Analyze new elements
    mutation.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) {
        this.analyzeElement(node);
      }
    });

    this.emit('dom-changed', mutation);
  }

  /**
   * Handle URL changes
   */
  private handleUrlChange(newUrl: string): void {
    this.emit('url-changed', newUrl);

    // Re-analyze page
    setTimeout(() => {
      this.analyzeCurrentPage();
    }, 1000);
  }

  /**
   * Analyze new element
   */
  private analyzeElement(element: HTMLElement): void {
    const domElement = this.createDOMElement(element);
    if (domElement) {
      this.emit('element-discovered', domElement);

      // Check if it matches any automation triggers
      this.checkAutomationTriggers(domElement);
    }
  }

  /**
   * Check automation triggers
   */
  private checkAutomationTriggers(element: DOMElement): void {
    for (const [scriptName, script] of this.automationScripts) {
      // Check if element matches any triggers
      const isTriggered = script.triggers.some(trigger => {
        return (
          element.attributes['data-action'] === trigger ||
          element.className?.includes(trigger) ||
          element.id === trigger
        );
      });

      if (isTriggered) {
        this.emit('automation-triggered', { scriptName, element });
      }
    }
  }

  /**
   * Get page structure
   */
  getPageStructure(): Fantasy42PageStructure | null {
    return this.pageStructure;
  }

  /**
   * Find element by various criteria
   */
  findElement(criteria: {
    text?: string;
    className?: string;
    id?: string;
    tagName?: string;
    attribute?: { name: string; value: string };
    xpath?: string;
  }): DOMElement | null {
    let elements: NodeListOf<Element>;

    if (criteria.xpath) {
      const element = this.xpathHandler.findElementByXPath(criteria.xpath);
      return element ? this.createDOMElement(element as HTMLElement) : null;
    }

    if (criteria.id) {
      const element = document.getElementById(criteria.id);
      return element ? this.createDOMElement(element) : null;
    }

    // Build selector
    let selector = criteria.tagName || '*';

    if (criteria.className) {
      selector += `.${criteria.className}`;
    }

    if (criteria.attribute) {
      selector += `[${criteria.attribute.name}="${criteria.attribute.value}"]`;
    }

    elements = document.querySelectorAll(selector);

    // Filter by text content
    if (criteria.text) {
      const matchingElements = Array.from(elements).filter(el =>
        el.textContent?.toLowerCase().includes(criteria.text!.toLowerCase())
      );

      if (matchingElements.length > 0) {
        return this.createDOMElement(matchingElements[0] as HTMLElement);
      }
    }

    // Return first match if no text filter
    if (elements.length > 0) {
      return this.createDOMElement(elements[0] as HTMLElement);
    }

    return null;
  }

  /**
   * Get automation scripts
   */
  getAutomationScripts(): Map<string, AutomationScript> {
    return this.automationScripts;
  }

  /**
   * Add custom automation script
   */
  addAutomationScript(script: AutomationScript): void {
    this.automationScripts.set(script.name, script);
  }

  /**
   * Remove automation script
   */
  removeAutomationScript(scriptName: string): void {
    this.automationScripts.delete(scriptName);
  }

  /**
   * Export page analysis
   */
  exportPageAnalysis(): any {
    return {
      pageStructure: this.pageStructure,
      elementCache: Array.from(this.elementCache.entries()),
      automationScripts: Array.from(this.automationScripts.entries()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate interaction report
   */
  generateInteractionReport(): any {
    const structure = this.pageStructure;
    if (!structure) return null;

    return {
      pageInfo: {
        url: structure.url,
        title: structure.title,
        timestamp: new Date().toISOString(),
      },
      elementCounts: {
        mainContent: structure.mainContent.length,
        navigation: structure.navigation.length,
        forms: structure.forms.length,
        tables: structure.tables.length,
        buttons: structure.buttons.length,
        links: structure.links.length,
        inputs: structure.inputs.length,
        customerElements: structure.customerElements.length,
        agentElements: structure.agentElements.length,
        transactionElements: structure.transactionElements.length,
      },
      interactiveElements: {
        clickable: structure.buttons.filter(
          b => b.attributes.onclick || b.attributes['data-action']
        ).length,
        forms: structure.forms.length,
        inputs: structure.inputs.length,
      },
      automationPotential: this.automationScripts.size,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global functions for easy access
export async function initializeDOMAnalyzer(): Promise<Fantasy42DOMAnalyzer> {
  const analyzer = Fantasy42DOMAnalyzer.getInstance();
  await analyzer.initialize();
  return analyzer;
}

export function getDOMAnalyzer(): Fantasy42DOMAnalyzer {
  return Fantasy42DOMAnalyzer.getInstance();
}

// Browser console helpers
export function analyzeCurrentPage(): Promise<any> {
  const analyzer = getDOMAnalyzer();
  return analyzer.analyzeCurrentPage();
}

export function findFantasy42Element(criteria: any): any {
  const analyzer = getDOMAnalyzer();
  return analyzer.findElement(criteria);
}

export function executeAutomationScript(scriptName: string, parameters?: any): Promise<void> {
  const analyzer = getDOMAnalyzer();
  return analyzer.executeScript(scriptName, parameters);
}

export { Fantasy42DOMAnalyzer };
