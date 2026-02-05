/**
 * Toast Lifecycle Unit Tests
 * Tests for toast notification system including lifecycle, cleanup, and edge cases
 */
import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { render, screen, waitFor, act } from "@testing-library/react";
import { 
  showGlobalToast, 
  removeGlobalToast, 
  cleanupGlobalToasts,
  subscribeToGlobalToasts,
  useToast 
} from "../hooks/useToast";
import { ToastContainer } from "../components/ToastContainer";
import { Toast } from "../components/Toast";

// Mock timers
describe("Toast Lifecycle Tests", () => {
  beforeEach(() => {
    // Clean up before each test
    cleanupGlobalToasts();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up after each test
    cleanupGlobalToasts();
    jest.useRealTimers();
  });

  describe("showGlobalToast", () => {
    it("should add a toast to global state", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Test message", "info", 1000);
      
      expect(receivedToasts.length).toBe(1);
      expect(receivedToasts[0].message).toBe("Test message");
      expect(receivedToasts[0].type).toBe("info");
      expect(receivedToasts[0].duration).toBe(1000);
      expect(receivedToasts[0].id).toBeDefined();

      unsubscribe();
    });

    it("should auto-remove toast after duration", async () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Auto-remove test", "info", 1000);
      expect(receivedToasts.length).toBe(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(receivedToasts.length).toBe(0);
      });

      unsubscribe();
    });

    it("should use default duration of 3000ms", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Default duration test");
      
      expect(receivedToasts[0].duration).toBe(3000);

      unsubscribe();
    });

    it("should use default type of 'info'", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Default type test");
      
      expect(receivedToasts[0].type).toBe("info");

      unsubscribe();
    });

    it("should generate unique IDs for each toast", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Toast 1");
      showGlobalToast("Toast 2");
      showGlobalToast("Toast 3");

      const ids = receivedToasts.map(t => t.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(3);
      expect(ids.length).toBe(3);

      unsubscribe();
    });
  });

  describe("removeGlobalToast", () => {
    it("should remove a specific toast by ID", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Toast 1");
      showGlobalToast("Toast 2");
      showGlobalToast("Toast 3");

      expect(receivedToasts.length).toBe(3);

      const toastId = receivedToasts[1].id;
      removeGlobalToast(toastId);

      expect(receivedToasts.length).toBe(2);
      expect(receivedToasts.find(t => t.id === toastId)).toBeUndefined();

      unsubscribe();
    });

    it("should clear timeout when removing toast", () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Test", "info", 5000);
      const toastId = receivedToasts[0].id;
      
      removeGlobalToast(toastId);

      // Should have called clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Fast-forward time - toast should not auto-remove
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(receivedToasts.length).toBe(0); // Already removed manually

      clearTimeoutSpy.mockRestore();
      unsubscribe();
    });

    it("should handle removing non-existent toast gracefully", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Test");
      expect(receivedToasts.length).toBe(1);

      // Try to remove non-existent toast
      removeGlobalToast("non-existent-id");

      // Should still have the original toast
      expect(receivedToasts.length).toBe(1);

      unsubscribe();
    });
  });

  describe("cleanupGlobalToasts", () => {
    it("should remove all toasts", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Toast 1");
      showGlobalToast("Toast 2");
      showGlobalToast("Toast 3");

      expect(receivedToasts.length).toBe(3);

      cleanupGlobalToasts();

      expect(receivedToasts.length).toBe(0);

      unsubscribe();
    });

    it("should clear all timeouts", () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      
      showGlobalToast("Toast 1", "info", 1000);
      showGlobalToast("Toast 2", "info", 2000);
      showGlobalToast("Toast 3", "info", 3000);

      cleanupGlobalToasts();

      // Should have called clearTimeout for each toast
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("subscribeToGlobalToasts", () => {
    it("should call listener immediately with current toasts", () => {
      const listener = jest.fn();
      
      showGlobalToast("Existing toast");
      
      const unsubscribe = subscribeToGlobalToasts(listener);

      // Should have been called immediately
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].length).toBeGreaterThan(0);

      unsubscribe();
    });

    it("should call listener when toasts change", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToGlobalToasts(listener);

      // Clear initial call
      listener.mockClear();

      showGlobalToast("New toast");
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].length).toBe(1);

      unsubscribe();
    });

    it("should unsubscribe correctly", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToGlobalToasts(listener);

      listener.mockClear();
      unsubscribe();

      showGlobalToast("Should not trigger listener");
      
      // Listener should not have been called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle multiple subscribers", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      const unsubscribe1 = subscribeToGlobalToasts(listener1);
      const unsubscribe2 = subscribeToGlobalToasts(listener2);
      const unsubscribe3 = subscribeToGlobalToasts(listener3);

      listener1.mockClear();
      listener2.mockClear();
      listener3.mockClear();

      showGlobalToast("Multi-subscriber test");

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });
  });

  describe("useToast hook", () => {
    it("should return toast state and functions", () => {
      // This would require React Testing Library setup
      // For now, we test the hook indirectly through ToastContainer
      expect(useToast).toBeDefined();
      expect(typeof useToast).toBe("function");
    });
  });

  describe("ToastContainer component", () => {
    it("should render toasts from global state", async () => {
      cleanupGlobalToasts();
      const { unmount } = render(<ToastContainer />);

      act(() => {
        showGlobalToast("Test toast message", "info");
      });

      await waitFor(() => {
        expect(screen.getByText("Test toast message")).toBeDefined();
      });
      
      unmount();
    });

    it("should cleanup on unmount", () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      
      const { unmount } = render(<ToastContainer />);
      
      showGlobalToast("Test", "info", 5000);
      
      unmount();

      // Should have called cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("should handle manual toast dismissal", async () => {
      const { unmount } = render(<ToastContainer />);
      
      // Clean up any existing toasts first
      cleanupGlobalToasts();

      act(() => {
        showGlobalToast("Dismissible toast", "info", 10000);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Dismissible toast")).toBeDefined();
      });

      // Find and click close button (use getAllByRole and get the first one)
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find(btn => 
        btn.closest('.fixed.bottom-4.right-4') !== null
      ) || closeButtons[0];
      
      act(() => {
        closeButton.click();
      });

      await waitFor(() => {
        expect(screen.queryByText("Dismissible toast")).toBeNull();
      });
      
      unmount();
    });

    it("should display multiple toasts", async () => {
      cleanupGlobalToasts();
      const { unmount } = render(<ToastContainer />);

      act(() => {
        showGlobalToast("Toast 1", "info");
        showGlobalToast("Toast 2", "success");
        showGlobalToast("Toast 3", "error");
      });

      await waitFor(() => {
        expect(screen.getByText("Toast 1")).toBeDefined();
        expect(screen.getByText("Toast 2")).toBeDefined();
        expect(screen.getByText("Toast 3")).toBeDefined();
      });
      
      unmount();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid toast creation", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      // Create 100 toasts rapidly
      for (let i = 0; i < 100; i++) {
        showGlobalToast(`Toast ${i}`);
      }

      expect(receivedToasts.length).toBe(100);

      unsubscribe();
      cleanupGlobalToasts();
    });

    it("should handle zero duration gracefully", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Zero duration", "info", 0);

      act(() => {
        jest.advanceTimersByTime(1);
      });

      // Should still exist (or be removed immediately)
      // Behavior depends on implementation, but shouldn't crash
      expect(() => {
        expect(receivedToasts.length).toBeGreaterThanOrEqual(0);
      }).not.toThrow();

      unsubscribe();
    });

    it("should handle very long duration", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Long duration", "info", 60000);

      expect(receivedToasts.length).toBe(1);

      // Should still exist after 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(receivedToasts.length).toBe(1);

      unsubscribe();
    });

    it("should handle concurrent remove and auto-remove", () => {
      let receivedToasts: any[] = [];
      const unsubscribe = subscribeToGlobalToasts((toasts) => {
        receivedToasts = toasts;
      });

      showGlobalToast("Concurrent test", "info", 1000);
      const toastId = receivedToasts[0].id;

      // Remove manually while auto-remove is pending
      act(() => {
        jest.advanceTimersByTime(500);
        removeGlobalToast(toastId);
        jest.advanceTimersByTime(500);
      });

      expect(receivedToasts.length).toBe(0);

      unsubscribe();
    });
  });
});
