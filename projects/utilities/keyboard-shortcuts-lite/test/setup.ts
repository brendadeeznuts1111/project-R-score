// Test setup for DOM environment
import { beforeEach, afterEach } from 'bun:test';

let mockActiveElement: any = null;
let eventListeners: Record<string, Function[]> = {};

// Mock DOM environment
global.document = {
  createElement: (tag: string) => {
    const element = {
      tagName: tag.toUpperCase(),
      focus: function() { mockActiveElement = this; },
      select: () => {},
      animate: () => ({ finished: Promise.resolve() }),
      style: {},
      classList: { add: () => {}, remove: () => {} },
      setAttribute: () => {},
      textContent: '',
      value: '',
      appendChild: () => {},
      remove: () => {}
    };
    return element;
  },
  get body() {
    return {
      appendChild: () => {},
      removeChild: () => {}
    };
  },
  querySelector: () => null,
  get activeElement() { return mockActiveElement; },
  addEventListener: (event: string, callback: Function) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(callback);
  },
  removeEventListener: (event: string, callback: Function) => {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
    }
  },
  dispatchEvent: (event: any): boolean => {
    const eventType = event.type;
    if (eventListeners[eventType]) {
      eventListeners[eventType].forEach(callback => callback(event));
    }
    return true;
  },
  createElementNS: () => document.createElement('div') as any
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout as any,
  clearTimeout: clearTimeout
} as Partial<Window>;

global.KeyboardEvent = class KeyboardEvent {
  constructor(public type: string, public options: any = {}) {
    this.key = options.key || '';
    this.ctrlKey = options.ctrlKey || false;
    this.metaKey = options.metaKey || false;
  }
  
  preventDefault() {}
} as any;

global.CSSStyleSheet = class CSSStyleSheet {
  replaceSync() {}
} as any;

beforeEach(() => {
  // Reset DOM before each test
  mockActiveElement = null;
  eventListeners = {};
});

afterEach(() => {
  // Cleanup after each test
  mockActiveElement = null;
  eventListeners = {};
});
