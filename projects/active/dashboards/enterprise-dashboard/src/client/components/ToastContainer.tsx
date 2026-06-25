/**
 * ToastContainer - Global Toast Notification Container
 * 
 * Displays toast notifications from the global toast system
 * Wrapped with error boundary for graceful failure handling
 */

import { useEffect, useState } from "react";
import { Toast } from "./Toast";
import { ErrorBoundary } from "./ErrorBoundary";
import { subscribeToGlobalToasts, removeGlobalToast, cleanupGlobalToasts, type ToastMessage } from "../hooks/useToast";

function ToastContainerInner() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToGlobalToasts((newToasts) => {
      setToasts(newToasts);
    });

    return () => {
      unsubscribe();
      // Cleanup any pending timeouts on unmount
      cleanupGlobalToasts();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" style={{ maxWidth: '400px' }}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => {
            removeGlobalToast(toast.id);
          }}
        />
      ))}
    </div>
  );
}

export function ToastContainer() {
  return (
    <ErrorBoundary
      title="Toast Notification Error"
      description="The toast notification system encountered an error. Notifications may not display correctly."
      showRetry={false}
      showReport={false}
      fallback={
        <div className="fixed bottom-4 right-4 z-50 text-xs text-gray-500">
          Toast notifications unavailable
        </div>
      }
    >
      <ToastContainerInner />
    </ErrorBoundary>
  );
}
