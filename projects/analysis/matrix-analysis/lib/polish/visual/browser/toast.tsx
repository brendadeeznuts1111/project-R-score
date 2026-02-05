// lib/polish/visual/browser/toast.tsx - Toast Notification System
// ═══════════════════════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type FC,
  type CSSProperties,
} from "react";
import { toastStyles, injectPolishStyles } from "./styles.ts";
import type { VisualFlashType } from "../../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToastData {
  id: string;
  type: VisualFlashType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

const TOAST_ICONS: Record<VisualFlashType, string> = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
};

const TOAST_COLORS: Record<VisualFlashType, string> = {
  success: "var(--polish-success)",
  error: "var(--polish-error)",
  warning: "var(--polish-warning)",
  info: "var(--polish-info)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

const ToastItem: FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 250);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 250);
  };

  const style: CSSProperties = {
    ...toastStyles.toast,
    borderLeft: `3px solid ${TOAST_COLORS[toast.type]}`,
    animation: isExiting
      ? "polish-fade-out 250ms ease forwards"
      : "polish-slide-down 250ms ease",
  };

  return (
    <div style={style}>
      <span style={{ ...toastStyles.icon, color: TOAST_COLORS[toast.type] }}>
        {TOAST_ICONS[toast.type]}
      </span>
      <div style={toastStyles.content}>
        {toast.title && <div style={toastStyles.title}>{toast.title}</div>}
        <div style={toastStyles.message}>{toast.message}</div>
      </div>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          style={{
            background: TOAST_COLORS[toast.type],
            color: "white",
            border: "none",
            padding: "4px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={handleClose} style={toastStyles.closeButton}>
        ×
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────────────────────

const ToastContainer: FC<{ toasts: ToastData[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div style={toastStyles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export const ToastProvider: FC<ToastProviderProps> = ({ children, maxToasts = 5 }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Inject styles on mount
  useEffect(() => {
    injectPolishStyles();
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => {
        const next = [...prev, { ...toast, id }];
        return next.slice(-maxToasts);
      });
      return id;
    },
    [maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: "success", message, title }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => addToast({ type: "error", message, title }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: "warning", message, title }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => addToast({ type: "info", message, title }),
    [addToast]
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
