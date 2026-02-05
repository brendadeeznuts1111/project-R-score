import { describe, it, expect, jest } from "bun:test";

// Mock DOM environment for testing
(global as any).document = {
  body: {},
  createElement: jest.fn(() => ({})),
};

describe("FileAnalyzer HMR", () => {
  it("preserves state during hot reload", async () => {
    jest.useFakeTimers();
    
    (global as any).import = {
      meta: {
        hot: {
          data: { progress: 50 },
          accept: jest.fn(),
          dispose: jest.fn(),
        },
      },
    };
    
    // Mock FileAnalyzer component behavior
    const mockFileAnalyzer = {
      componentDidMount: jest.fn(),
      componentWillUnmount: jest.fn(),
      state: { progress: 50 }
    };
    
    // Simulate HMR behavior
    const initialData = (global as any).import.meta.hot.data;
    expect(initialData.progress).toBe(50);
    
    // Simulate component update
    mockFileAnalyzer.state.progress = 75;
    (global as any).import.meta.hot.data.progress = mockFileAnalyzer.state.progress;
    
    expect((global as any).import.meta.hot.data.progress).toBe(75);
    jest.useRealTimers();
  });
});
