/**
 * Test Setup - DOM Environment for React Component Tests
 * Uses happy-dom for browser API simulation
 * https://bun.sh/docs/test/dom
 */
import { Window } from "happy-dom";

// Create window and register globals BEFORE any other imports
const window = new Window({
  url: "http://localhost:3000",
  width: 1920,
  height: 1080,
});

// Type-safe global registration
const g = globalThis as typeof globalThis & { [key: string]: unknown };

// Core DOM globals required by React Testing Library
g.window = window;
g.document = window.document;
g.navigator = window.navigator;
g.location = window.location;
g.history = window.history;

// DOM classes
g.HTMLElement = window.HTMLElement;
g.HTMLInputElement = window.HTMLInputElement;
g.HTMLButtonElement = window.HTMLButtonElement;
g.HTMLDivElement = window.HTMLDivElement;
g.HTMLSpanElement = window.HTMLSpanElement;
g.HTMLAnchorElement = window.HTMLAnchorElement;
g.Element = window.Element;
g.Node = window.Node;
g.Text = window.Text;
g.Comment = window.Comment;
g.DocumentFragment = window.DocumentFragment;
g.Document = window.Document;
g.DOMParser = window.DOMParser;

// Events
g.Event = window.Event;
g.MouseEvent = window.MouseEvent;
g.KeyboardEvent = window.KeyboardEvent;
g.FocusEvent = window.FocusEvent;
g.InputEvent = window.InputEvent;
g.CustomEvent = window.CustomEvent;
g.PointerEvent = window.PointerEvent;

// Observers and utilities
g.MutationObserver = window.MutationObserver;
g.ResizeObserver = window.ResizeObserver;
g.IntersectionObserver = window.IntersectionObserver;
g.getComputedStyle = window.getComputedStyle.bind(window);
g.requestAnimationFrame = window.requestAnimationFrame.bind(window);
g.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
g.setTimeout = window.setTimeout.bind(window);
g.clearTimeout = window.clearTimeout.bind(window);
g.setInterval = window.setInterval.bind(window);
g.clearInterval = window.clearInterval.bind(window);

// SVG support
g.SVGElement = window.SVGElement;

// Range and Selection
g.Range = window.Range;
g.Selection = window.Selection;

// Storage
g.localStorage = window.localStorage;
g.sessionStorage = window.sessionStorage;

// matchMedia mock
g.matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

console.log("[happydom] DOM globals registered");
