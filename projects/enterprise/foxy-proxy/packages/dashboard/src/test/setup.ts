/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom";

// Mock bun:bundle FIRST before any imports that might use it
vi.mock("bun:bundle", () => ({
  feature: (name: string) => {
    // Mock feature flags - return true for development features
    const mockFeatures: Record<string, boolean> = {
      DEBUG: true,
      PREMIUM_TIER: false,
      ENTERPRISE: false,
      QUANTUM_SAFE: false,
      ADVANCED_WIDTH_CALC: true,
      MOCK_API: true,
      BETA_FEATURES: false,
      SSO_INTEGRATION: false,
      AUDIT_LOGS: false,
      COMPLIANCE_MODE: false,
      ADVANCED_ANALYTICS: true,
      PERFORMANCE_PROFILING: false,
      WEBHOOK_SUPPORT: true,
      BACKUP_AUTOMATION: true
    };
    return mockFeatures[name] ?? false;
  }
}));

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
const OriginalURL = global.URL;
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

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  LayoutDashboard: () => React.createElement("div", { "data-testid": "layout-dashboard-icon" }),
  Server: () => React.createElement("div", { "data-testid": "server-icon" }),
  BarChart3: () => React.createElement("div", { "data-testid": "bar-chart-icon" }),
  Settings: () => React.createElement("div", { "data-testid": "settings-icon" }),
  Shield: () => React.createElement("div", { "data-testid": "shield-icon" }),
  Activity: () => React.createElement("div", { "data-testid": "activity-icon" }),
  AlertTriangle: () => React.createElement("div", { "data-testid": "alert-triangle-icon" }),
  TrendingUp: () => React.createElement("div", { "data-testid": "trending-up-icon" }),
  Globe: () => React.createElement("div", { "data-testid": "globe-icon" }),
  RefreshCw: () => React.createElement("div", { "data-testid": "refresh-cw-icon" }),
  Plus: () => React.createElement("div", { "data-testid": "plus-icon" }),
  Search: () => React.createElement("div", { "data-testid": "search-icon" }),
  Filter: () => React.createElement("div", { "data-testid": "filter-icon" }),
  MoreVertical: () => React.createElement("div", { "data-testid": "more-vertical-icon" }),
  Bell: () => React.createElement("div", { "data-testid": "bell-icon" }),
  User: () => React.createElement("div", { "data-testid": "user-icon" }),
  LogOut: () => React.createElement("div", { "data-testid": "logout-icon" }),
  Key: () => React.createElement("div", { "data-testid": "key-icon" }),
  Smartphone: () => React.createElement("div", { "data-testid": "smartphone-icon" }),
  Save: () => React.createElement("div", { "data-testid": "save-icon" }),
  Eye: () => React.createElement("div", { "data-testid": "eye-icon" }),
  EyeOff: () => React.createElement("div", { "data-testid": "eye-off-icon" }),
  X: () => React.createElement("div", { "data-testid": "x-icon" }),
  Cloud: () => React.createElement("div", { "data-testid": "cloud-icon" }),
  Copy: () => React.createElement("div", { "data-testid": "copy-icon" }),
  Check: () => React.createElement("div", { "data-testid": "check-icon" }),
  ExternalLink: () => React.createElement("div", { "data-testid": "external-link-icon" }),
  Play: () => React.createElement("div", { "data-testid": "play-icon" }),
  Power: () => React.createElement("div", { "data-testid": "power-icon" }),
  Upload: () => React.createElement("div", { "data-testid": "upload-icon" }),
  Download: () => React.createElement("div", { "data-testid": "download-icon" }),
  FileText: () => React.createElement("div", { "data-testid": "file-text-icon" }),
  Trash2: () => React.createElement("div", { "data-testid": "trash-2-icon" }),
  AlertCircle: () => React.createElement("div", { "data-testid": "alert-circle-icon" }),
  Clock: () => React.createElement("div", { "data-testid": "clock-icon" }),
  Calendar: () => React.createElement("div", { "data-testid": "calendar-icon" }),
  CheckCircle2: () => React.createElement("div", { "data-testid": "check-circle-2-icon" })
}));

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

// Mock bun:bundle for feature flags
vi.mock("bun:bundle", () => ({
  feature: (name: string) => {
    const mockFeatures: Record<string, boolean> = {
      DEBUG: true,
      PREMIUM_TIER: false,
      ENTERPRISE: false,
      QUANTUM_SAFE: false,
      ADVANCED_WIDTH_CALC: true,
      MOCK_API: true,
      BETA_FEATURES: false,
      SSO_INTEGRATION: false,
      AUDIT_LOGS: false,
      COMPLIANCE_MODE: false,
      ADVANCED_ANALYTICS: true,
      PERFORMANCE_PROFILING: false,
      WEBHOOK_SUPPORT: true,
      BACKUP_AUTOMATION: true
    };
    return mockFeatures[name] ?? false;
  }
}));
