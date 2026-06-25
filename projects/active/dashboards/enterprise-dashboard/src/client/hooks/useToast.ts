/**
 * useToast - Global Toast Notification Hook
 * 
 * Provides a simple API for showing toast notifications throughout the app
 */

import { useState, useCallback } from "react";
import type { ToastType } from "../components/Toast";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface UseToastReturn {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// Global toast state (for use outside React components)
let globalToasts: ToastMessage[] = [];
let globalListeners: Set<(toasts: ToastMessage[]) => void> = new Set();
const globalToastTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

// Global toast function (can be called from anywhere)
export function showGlobalToast(message: string, type: ToastType = "info", duration = 3000) {
  const id = `toast-${Date.now()}-${Math.random()}`;
  const newToast: ToastMessage = { id, message, type, duration };
  
  globalToasts = [...globalToasts, newToast];
  globalListeners.forEach(listener => listener(globalToasts));
  
  // Auto-remove after duration
  const timeoutId = setTimeout(() => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    globalListeners.forEach(listener => listener(globalToasts));
    globalToastTimeouts.delete(id);
  }, duration);
  
  globalToastTimeouts.set(id, timeoutId);
}

// Remove a toast manually (for manual dismissal)
export function removeGlobalToast(id: string) {
  // Clear timeout if exists
  const timeoutId = globalToastTimeouts.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    globalToastTimeouts.delete(id);
  }
  
  // Remove from toasts
  globalToasts = globalToasts.filter(t => t.id !== id);
  globalListeners.forEach(listener => listener(globalToasts));
}

// Cleanup all toasts (for component unmount)
export function cleanupGlobalToasts() {
  globalToastTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  globalToastTimeouts.clear();
  globalToasts = [];
  globalListeners.forEach(listener => listener(globalToasts));
}

// Subscribe to global toast updates
export function subscribeToGlobalToasts(listener: (toasts: ToastMessage[]) => void) {
  globalListeners.add(listener);
  listener(globalToasts); // Initial call
  
  return () => {
    globalListeners.delete(listener);
  };
}
