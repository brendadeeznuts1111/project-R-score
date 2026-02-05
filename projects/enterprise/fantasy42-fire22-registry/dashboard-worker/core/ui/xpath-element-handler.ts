/**
 * XPath Element Handler - Targets and manipulates specific DOM elements by XPath
 * Known targets:
 * - Fantasy42 Notes: /html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div
 * - Specific Element: /html/body/div[3]/div[5]/div/div[4]/div[7]/div
 */

export interface XPathElementConfig {
  xpath: string;
  action: 'read' | 'write' | 'update' | 'click' | 'submit' | 'validate';
  data?: any;
  validation?: {
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
  onSuccess?: (element: Element, data?: any) => void;
  onError?: (error: string, element?: Element) => void;
}

export interface XPathResult {
  success: boolean;
  element?: Element;
  data?: any;
  error?: string;
  xpath: string;
}

export class XPathElementHandler {
  private static instance: XPathElementHandler;
  private xpathCache: Map<string, Element> = new Map();
  private observers: Map<string, MutationObserver> = new Map();

  static getInstance(): XPathElementHandler {
    if (!XPathElementHandler.instance) {
      XPathElementHandler.instance = new XPathElementHandler();
    }
    return XPathElementHandler.instance;
  }

  /**
   * Find element by XPath
   */
  findElementByXPath(xpath: string): Element | null {
    try {
      // Check cache first
      if (this.xpathCache.has(xpath)) {
        const cached = this.xpathCache.get(xpath);
        if (cached && document.contains(cached)) {
          return cached;
        } else {
          this.xpathCache.delete(xpath);
        }
      }

      // Evaluate XPath
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );

      const element = result.singleNodeValue as Element;

      if (element) {
        // Cache the result
        this.xpathCache.set(xpath, element);

        // Set up observer for this element
        this.setupElementObserver(xpath, element);
      }

      return element;
    } catch (error) {
      console.error(`XPath evaluation failed for: ${xpath}`, error);
      return null;
    }
  }

  /**
   * Handle the specific XPath element
   */
  async handleXPathElement(config: XPathElementConfig): Promise<XPathResult> {
    const element = this.findElementByXPath(config.xpath);

    if (!element) {
      const error = `Element not found for XPath: ${config.xpath}`;
      console.error(error);

      if (config.onError) {
        config.onError(error);
      }

      return {
        success: false,
        error,
        xpath: config.xpath,
      };
    }

    try {
      let result: any = null;

      switch (config.action) {
        case 'read':
          result = this.readElement(element, config);
          break;
        case 'write':
          result = this.writeElement(element, config);
          break;
        case 'update':
          result = this.updateElement(element, config);
          break;
        case 'click':
          result = this.clickElement(element, config);
          break;
        case 'submit':
          result = this.submitElement(element, config);
          break;
        case 'validate':
          result = this.validateElement(element, config);
          break;
        default:
          throw new Error(`Unsupported action: ${config.action}`);
      }

      // Validate result if validation rules are provided
      if (config.validation && !this.validateData(result, config.validation)) {
        throw new Error('Validation failed for element data');
      }

      if (config.onSuccess) {
        config.onSuccess(element, result);
      }

      return {
        success: true,
        element,
        data: result,
        xpath: config.xpath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (config.onError) {
        config.onError(errorMessage, element);
      }

      return {
        success: false,
        element,
        error: errorMessage,
        xpath: config.xpath,
      };
    }
  }

  /**
   * Handle the specific element you referenced
   */
  async handleFantasy402Element(
    action: XPathElementConfig['action'],
    data?: any
  ): Promise<XPathResult> {
    const xpath = '/html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div';

    return this.handleXPathElement({
      xpath,
      action,
      data,
      validation: {
        required: true,
        minLength: action === 'write' ? 1 : undefined,
        maxLength: action === 'write' ? 5000 : undefined,
      },
      onSuccess: (element, result) => {
        console.log(`✅ Successfully handled Fantasy402 element:`, {
          xpath,
          action,
          elementType: element.tagName,
          result,
        });

        // Additional success handling for Fantasy402 elements
        this.handleFantasy402Success(element, action, result);
      },
      onError: (error, element) => {
        console.error(`❌ Failed to handle Fantasy402 element:`, {
          xpath,
          action,
          error,
          elementType: element?.tagName,
        });

        // Additional error handling for Fantasy402 elements
        this.handleFantasy402Error(error, element, action);
      },
    });
  }

  /**
   * Read element value/content
   */
  private readElement(element: Element, config: XPathElementConfig): any {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }

    if (element instanceof HTMLSelectElement) {
      return element.value;
    }

    if (element instanceof HTMLElement) {
      return element.textContent || element.innerText || '';
    }

    return null;
  }

  /**
   * Write data to element
   */
  private writeElement(element: Element, config: XPathElementConfig): boolean {
    if (!config.data) return false;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = String(config.data);
      return true;
    }

    if (element instanceof HTMLSelectElement) {
      element.value = String(config.data);
      return true;
    }

    if (element instanceof HTMLElement) {
      element.textContent = String(config.data);
      return true;
    }

    return false;
  }

  /**
   * Update element (merge data)
   */
  private updateElement(element: Element, config: XPathElementConfig): any {
    const currentData = this.readElement(element, config);

    if (typeof config.data === 'object' && typeof currentData === 'object') {
      return { ...currentData, ...config.data };
    }

    return config.data || currentData;
  }

  /**
   * Click element
   */
  private clickElement(element: Element, config: XPathElementConfig): boolean {
    if (element instanceof HTMLElement) {
      element.click();
      return true;
    }
    return false;
  }

  /**
   * Submit element (for forms)
   */
  private submitElement(element: Element, config: XPathElementConfig): boolean {
    if (element instanceof HTMLFormElement) {
      element.submit();
      return true;
    }

    // Find parent form
    let parent = element.parentElement;
    while (parent && !(parent instanceof HTMLFormElement)) {
      parent = parent.parentElement;
    }

    if (parent instanceof HTMLFormElement) {
      parent.submit();
      return true;
    }

    return false;
  }

  /**
   * Validate element data
   */
  private validateElement(element: Element, config: XPathElementConfig): boolean {
    const data = this.readElement(element, config);
    return this.validateData(data, config.validation || {});
  }

  /**
   * Validate data against rules
   */
  private validateData(data: any, validation: XPathElementConfig['validation']): boolean {
    if (validation.required && (data === null || data === undefined || data === '')) {
      return false;
    }

    if (typeof data === 'string') {
      if (validation.minLength && data.length < validation.minLength) {
        return false;
      }

      if (validation.maxLength && data.length > validation.maxLength) {
        return false;
      }

      if (validation.pattern && !validation.pattern.test(data)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Setup observer for element changes
   */
  private setupElementObserver(xpath: string, element: Element): void {
    if (this.observers.has(xpath)) {
      this.observers.get(xpath)?.disconnect();
    }

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        console.log(`Element changed at ${xpath}:`, mutation.type);
      });
    });

    observer.observe(element, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
    });

    this.observers.set(xpath, observer);
  }

  /**
   * Handle Fantasy402 specific success actions
   */
  private handleFantasy402Success(element: Element, action: string, result: any): void {
    // Fantasy402 specific success handling
    switch (action) {
      case 'write':
        // Could trigger form validation or auto-save
        this.triggerFantasy402Update(element, result);
        break;
      case 'click':
        // Could trigger additional actions
        this.handleFantasy402Click(element);
        break;
      case 'submit':
        // Could trigger form processing
        this.handleFantasy402Submit(element, result);
        break;
    }

    // Log success for audit trail
    console.log(`Fantasy402 ${action} success:`, {
      element: element.tagName,
      id: element.id,
      className: element.className,
      result: typeof result === 'string' ? result.substring(0, 100) : result,
    });
  }

  /**
   * Handle Fantasy402 specific error actions
   */
  private handleFantasy402Error(error: string, element?: Element, action?: string): void {
    // Fantasy402 specific error handling
    console.error(`Fantasy402 ${action} error:`, error);

    // Could show user-friendly error message
    if (element) {
      this.showFantasy402Error(element, error);
    }

    // Could trigger error recovery mechanisms
    this.attemptFantasy402Recovery(element, error, action);
  }

  /**
   * Trigger Fantasy402 update mechanisms
   */
  private triggerFantasy402Update(element: Element, data: any): void {
    // Trigger form validation
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);
    }

    // Trigger change events for select elements
    if (element instanceof HTMLSelectElement) {
      const event = new Event('change', { bubbles: true });
      element.dispatchEvent(event);
    }

    // Could trigger auto-save or real-time updates
    console.log('Fantasy402 update triggered for element:', element.id || element.className);
  }

  /**
   * Handle Fantasy402 click actions
   */
  private handleFantasy402Click(element: Element): void {
    // Could trigger modal opening, form submission, or other actions
    console.log('Fantasy402 click handled for element:', element.id || element.className);
  }

  /**
   * Handle Fantasy402 form submission
   */
  private handleFantasy402Submit(element: Element, data: any): void {
    // Could trigger API calls, validation, or processing
    console.log('Fantasy402 submit handled for element:', element.id || element.className);
  }

  /**
   * Show user-friendly error for Fantasy402 elements
   */
  private showFantasy402Error(element: Element, error: string): void {
    // Add error styling
    element.classList.add('is-invalid');

    // Create or update error message
    let errorElement = element.parentElement?.querySelector('.invalid-feedback');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'invalid-feedback';
      element.parentElement?.appendChild(errorElement);
    }
    errorElement.textContent = error;

    // Remove error styling after user interaction
    const removeError = () => {
      element.classList.remove('is-invalid');
      errorElement?.remove();
      element.removeEventListener('input', removeError);
      element.removeEventListener('change', removeError);
    };

    element.addEventListener('input', removeError);
    element.addEventListener('change', removeError);
  }

  /**
   * Attempt error recovery for Fantasy402 elements
   */
  private attemptFantasy402Recovery(element?: Element, error?: string, action?: string): void {
    // Could retry failed operations
    // Could reset form state
    // Could provide alternative actions
    console.log('Fantasy402 recovery attempted for:', {
      element: element?.id || element?.className,
      error,
      action,
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Disconnect all observers
    this.observers.forEach((observer, xpath) => {
      observer.disconnect();
      console.log(`Observer disconnected for: ${xpath}`);
    });
    this.observers.clear();

    // Clear cache
    this.xpathCache.clear();

    console.log('XPathElementHandler cleaned up');
  }
}

// Export singleton instance
export const xpathHandler = XPathElementHandler.getInstance();

// Convenience functions for known XPaths
export const handleFantasy402Element = (action: XPathElementConfig['action'], data?: any) =>
  xpathHandler.handleFantasy402Element(action, data);

export const findFantasy402Element = () =>
  xpathHandler.findElementByXPath(
    '/html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div'
  );

// Specific element convenience functions
export const handleSpecificElement = (action: XPathElementConfig['action'], data?: any) =>
  xpathHandler.handleXPathElement({
    xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
    action,
    data,
  });

export const findSpecificElement = () =>
  xpathHandler.findElementByXPath('/html/body/div[3]/div[5]/div/div[4]/div[7]/div');

// Export types
export type { XPathElementConfig, XPathResult };
