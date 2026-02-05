/**
 * ConfigErrorBoundary – catch config/theme load errors and show a recovery UI.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ConfigErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ConfigErrorBoundary: configuration error", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="config-error"
          style={{
            padding: "2rem",
            maxWidth: "32rem",
            margin: "4rem auto",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            background: "var(--bg-secondary, #1e293b)",
            border: "1px solid var(--border-color, #334155)",
            borderRadius: "12px",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>
            Configuration error
          </h2>
          <p style={{ margin: "0 0 1rem", color: "var(--text-secondary, #94a3b8)", fontSize: "0.9rem" }}>
            The theme or config failed to load. Check the console for details.
          </p>
          <pre
            style={{
              margin: "0 0 1rem",
              padding: "0.75rem",
              fontSize: "0.75rem",
              textAlign: "left",
              overflow: "auto",
              background: "var(--bg-tertiary, #334155)",
              borderRadius: "6px",
              color: "var(--text-primary, #f8fafc)",
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color, #475569)",
              background: "var(--bg-tertiary, #334155)",
              color: "var(--text-primary, #f8fafc)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
