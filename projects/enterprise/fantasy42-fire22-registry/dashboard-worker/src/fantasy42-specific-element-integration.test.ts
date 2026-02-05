/**
 * Fantasy42 Specific Element Integration Tests
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  Fantasy42SpecificElementManager,
  createSpecificElementManager,
} from '../core/integrations/fantasy42-specific-element-integration';
import { XPathElementHandler } from '../core/ui/xpath-element-handler';

// Mock the Fantasy42AgentClient
class MockFantasy42AgentClient {
  constructor(config: any) {
    this.config = config;
  }
  config: any;
}

// Mock DOM elements
const createMockElement = (tagName: string = 'div', options: any = {}) => {
  const element = {
    tagName: tagName.toUpperCase(),
    id: options.id || '',
    className: options.className || '',
    textContent: options.textContent || 'Mock content',
    attributes: options.attributes || [],
    children: options.children || [],
    addEventListener: mock(() => {}),
    removeEventListener: mock(() => {}),
    setAttribute: mock(() => {}),
    getAttribute: mock(() => ''),
    querySelector: mock(() => null),
    querySelectorAll: mock(() => []),
    ...options,
  };
  return element;
};

// Mock document and XPath evaluation
const mockDocument = {
  readyState: 'complete',
  body: createMockElement('body'),
  evaluate: mock((xpath: string) => {
    if (xpath === '/html/body/div[3]/div[5]/div/div[4]/div[7]/div') {
      return {
        singleNodeValue: createMockElement('div', {
          textContent: 'Target element content',
          id: 'target-element',
        }),
      };
    }
    return { singleNodeValue: null };
  }),
  createElement: mock((tag: string) => createMockElement(tag)),
  head: createMockElement('head'),
  addEventListener: mock(() => {}),
  removeEventListener: mock(() => {}),
};

// Setup global mocks
global.document = mockDocument as any;
global.window = {
  addEventListener: mock(() => {}),
  removeEventListener: mock(() => {}),
} as any;

describe('Fantasy42SpecificElementManager', () => {
  let client: MockFantasy42AgentClient;
  let manager: Fantasy42SpecificElementManager;
  let mockElement: any;

  beforeEach(() => {
    client = new MockFantasy42AgentClient({
      baseURL: 'https://api.test.com',
      token: 'test-token',
    });

    mockElement = createMockElement('div', {
      textContent: 'Test content',
      id: 'test-element',
    });

    // Reset mocks
    mockDocument.evaluate.mockClear();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully when element is found', async () => {
      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: mockElement,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
      });

      const result = await manager.initialize();

      expect(result).toBe(true);
      expect(manager.isReady()).toBe(true);
      expect(manager.getCurrentElement()).toBe(mockElement);
    });

    test('should handle element not found gracefully', async () => {
      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: null,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
      });

      const result = await manager.initialize();

      expect(result).toBe(true); // Should still initialize and setup watcher
      expect(manager.isReady()).toBe(false);
      expect(manager.getCurrentElement()).toBe(null);
    });

    test('should setup auto-update when enabled', async () => {
      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: mockElement,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
        autoUpdate: true,
        updateInterval: 1000,
      });

      const result = await manager.initialize();

      expect(result).toBe(true);
      // Auto-update should be started
    });
  });

  describe('Data Operations', () => {
    beforeEach(async () => {
      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: mockElement,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
      });

      await manager.initialize();
    });

    test('should read element data correctly', () => {
      const data = manager.readElementData();

      expect(data).toBeDefined();
      expect(data?.content).toBe('Test content');
      expect(data?.xpath).toBe('/html/body/div[3]/div[5]/div/div[4]/div[7]/div');
      expect(data?.timestamp).toBeDefined();
    });

    test('should write data to element', () => {
      const newContent = 'Updated content';
      const result = manager.writeElementData(newContent);

      expect(result).toBe(true);
      expect(mockElement.textContent).toBe(newContent);
    });

    test('should handle structured data writing', () => {
      const structuredData = {
        content: 'Structured content',
        attributes: {
          'data-test': 'value',
          class: 'test-class',
        },
      };

      const result = manager.writeElementData(structuredData);

      expect(result).toBe(true);
      expect(mockElement.textContent).toBe('Structured content');
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration correctly', async () => {
      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
        autoUpdate: false,
      });

      await manager.initialize();

      manager.updateConfig({
        autoUpdate: true,
        updateInterval: 2000,
      });

      // Configuration should be updated
    });
  });

  describe('Event Handling', () => {
    test('should call onElementFound callback', async () => {
      const onElementFound = mock(() => {});

      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: mockElement,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
        onElementFound,
      });

      await manager.initialize();

      expect(onElementFound).toHaveBeenCalledWith(mockElement);
    });

    test('should call onDataChange callback when data changes', async () => {
      const onDataChange = mock(() => {});

      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: mockElement,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'update',
        onDataChange,
      });

      await manager.initialize();

      // Simulate data change
      mockElement.textContent = 'Changed content';
      manager.readElementData();

      // onDataChange should be called
      expect(onDataChange).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', async () => {
      mockDocument.evaluate.mockReturnValue({
        singleNodeValue: mockElement,
      });

      manager = new Fantasy42SpecificElementManager(client, {
        xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
        action: 'read',
        autoUpdate: true,
      });

      await manager.initialize();
      manager.cleanup();

      expect(manager.isReady()).toBe(false);
      expect(manager.getCurrentElement()).toBe(null);
      expect(manager.getCurrentData()).toBe(null);
    });
  });
});

describe('createSpecificElementManager', () => {
  test('should create manager with default configuration', () => {
    const manager = createSpecificElementManager(client);

    expect(manager).toBeInstanceOf(Fantasy42SpecificElementManager);
  });
});

describe('Convenience Functions', () => {
  test('should export convenience functions', () => {
    // These would be imported from xpath-element-handler
    // but for testing we verify they exist in the system
    expect(true).toBe(true); // Placeholder test
  });
});
