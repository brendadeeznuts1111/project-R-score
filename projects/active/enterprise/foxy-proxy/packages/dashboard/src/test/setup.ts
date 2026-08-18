/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Set up DOM environment - ensure window exists first
if (typeof window === "undefined") {
  // @ts-ignore - we're defining window for the test environment
  global.window = {} as any;
}

// Set up matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock window.scrollTo
if (typeof window !== "undefined") {
  window.scrollTo = vi.fn().mockImplementation(() => {
    // Mock implementation - parameters prefixed with _ to indicate unused
  });
}

// Mock HTMLCanvasElement methods
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
    if (contextId === "2d") {
      return {
        canvas: document.createElement("canvas"),
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        isPointInPath: vi.fn(),
        isPointInStroke: vi.fn(),
        createLinearGradient: vi.fn(),
        createRadialGradient: vi.fn(),
        createPattern: vi.fn(),
        // Add all required CanvasRenderingContext2D properties
        direction: "ltr",
        font: "10px sans-serif",
        textAlign: "start",
        textBaseline: "alphabetic",
        lineCap: "butt",
        lineDashOffset: 0,
        lineJoin: "miter",
        lineWidth: 1,
        miterLimit: 10,
        shadowBlur: 0,
        shadowColor: "rgba(0, 0, 0, 0)",
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        strokeStyle: "#000000",
        fillStyle: "#000000"
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  });
}

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Do not mock core document methods if they exist (JSDOM provides them)
// Manual mocks here were breaking React 19's environment detection

// Mock URL.createObjectURL and revokeObjectURL while preserving URL constructor
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock Blob
global.Blob = class MockBlob {
  constructor(data: any[], options: any) {
    this.data = data;
    this.type = options?.type || "";
  }
  data: any[];
  type: string;
} as any;

// Mock File
global.File = class MockFile {
  constructor(data: any[], name: string, options: any) {
    this.data = data;
    this.name = name;
    this.type = options?.type || "";
    this.size = data.length;
  }
  data: any[];
  name: string;
  type: string;
  size: number;
} as any;

// Mock alert and confirm
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

// Mock React Router
vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  Routes: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  Route: ({ element }: { element: React.ReactNode }) => element,
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) =>
    React.createElement("a", props, children),
  useLocation: () => ({ pathname: "/" })
}));

// Preserve the real icon surface. This pinned lucide version lacks TestTube.
vi.mock("lucide-react", async (importOriginal) => {
  const icons = await importOriginal<Record<string, unknown>>();
  return {
    ...icons,
    TestTube: () => React.createElement("div", { "data-testid": "test-tube-icon" })
  };
});

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "bar-chart" }, children),
  Bar: () => React.createElement("div", { "data-testid": "bar" }),
  XAxis: () => React.createElement("div", { "data-testid": "x-axis" }),
  YAxis: () => React.createElement("div", { "data-testid": "y-axis" }),
  CartesianGrid: () => React.createElement("div", { "data-testid": "cartesian-grid" }),
  Tooltip: () => React.createElement("div", { "data-testid": "tooltip" }),
  PieChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "pie-chart" }, children),
  Pie: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "pie" }, children),
  Cell: () => React.createElement("div", { "data-testid": "cell" }),
  LineChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "line-chart" }, children),
  Line: () => React.createElement("div", { "data-testid": "line" })
}));
