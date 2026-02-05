import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DocumentationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Documentation Error:', error);
    console.error('Error Info:', errorInfo);

    // Log to Fire22 monitoring system
    if (typeof window !== 'undefined' && (window as any).fire22) {
      (window as any).fire22.logError?.({
        type: 'documentation-error',
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="documentation-error">
          <div className="fire22-badge">Error</div>
          <h2>🚨 Documentation Error</h2>
          <p>
            This documentation page failed to load due to a compilation error. This is likely caused
            by invalid MDX syntax in the source file.
          </p>

          <details>
            <summary>Error Details</summary>
            <pre
              style={{
                background: '#f5f5f5',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.8rem',
              }}
            >
              {this.state.error?.message}
              {this.state.error?.stack && '\n\nStack:\n' + this.state.error.stack}
            </pre>
          </details>

          <div className="bun-highlight">
            <strong>🥖 Bun Development Tip:</strong> MDX requires valid JSX syntax. Check for
            invalid component names (starting with numbers) or malformed expressions.
          </div>

          <h3>Common Solutions:</h3>
          <ul>
            <li>
              Remove or escape JSX-like syntax: <code>&lt;component5&gt;</code> →{' '}
              <code>&lt;Component5&gt;</code>
            </li>
            <li>
              Wrap JavaScript expressions properly: <code>{'{ validExpression }'}</code>
            </li>
            <li>Use code blocks for function declarations instead of ESM imports</li>
            <li>Check for unmatched braces or brackets</li>
          </ul>

          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--ifm-color-primary)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '1rem',
            }}
          >
            🔄 Retry Loading
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
