/**
 * Test Setup - DOM Environment for React Component Tests
 * Uses happy-dom GlobalRegistrator for complete DOM simulation
 * https://bun.sh/docs/test/dom
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

// Register all happy-dom globals (document, window, HTMLElement, etc.)
GlobalRegistrator.register();

// Clean up after each test to prevent DOM state leaking between tests
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

// Mock matchMedia for components that use media queries
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
