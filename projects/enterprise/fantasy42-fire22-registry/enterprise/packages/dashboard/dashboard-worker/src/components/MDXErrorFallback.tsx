import React from 'react';

interface MDXErrorFallbackProps {
  error?: Error;
  filePath?: string;
}

export function MDXErrorFallback({ error, filePath }: MDXErrorFallbackProps) {
  const errorType = React.useMemo(() => {
    if (!error?.message) return 'unknown';

    if (error.message.includes('Unexpected character') && error.message.includes('before name')) {
      return 'invalid-jsx-name';
    }
    if (error.message.includes('FunctionDeclaration in code: only import/exports are supported')) {
      return 'invalid-esm-code';
    }
    if (error.message.includes('Could not parse expression with acorn')) {
      return 'invalid-expression';
    }
    return 'syntax-error';
  }, [error]);

  const getSolution = () => {
    switch (errorType) {
      case 'invalid-jsx-name':
        return (
          <div>
            <h4>❌ Invalid JSX Component Name</h4>
            <p>Component names cannot start with numbers. Fix examples:</p>
            <ul>
              <li>
                <code>&lt;5minutes&gt;</code> → <code>&lt;FiveMinutes&gt;</code>
              </li>
              <li>
                <code>&lt;1password&gt;</code> → <code>&lt;OnePassword&gt;</code>
              </li>
              <li>
                <code>&lt;2factor&gt;</code> → <code>&lt;TwoFactor&gt;</code>
              </li>
            </ul>
          </div>
        );

      case 'invalid-esm-code':
        return (
          <div>
            <h4>❌ Invalid Code Block</h4>
            <p>Function declarations are not allowed in MDX code blocks. Wrap in code fences:</p>
            <pre>{`\`\`\`javascript
function myFunction() {
  // Your code here
}
\`\`\``}</pre>
          </div>
        );

      case 'invalid-expression':
        return (
          <div>
            <h4>❌ Invalid JavaScript Expression</h4>
            <p>Check for unmatched braces or invalid syntax in JSX expressions:</p>
            <ul>
              <li>
                <code>
                  {'{'} invalid syntax {'}'}
                </code>{' '}
                →{' '}
                <code>
                  {'{'} validSyntax {'}'}
                </code>
              </li>
              <li>Remove bare JavaScript that isn't wrapped properly</li>
            </ul>
          </div>
        );

      default:
        return (
          <div>
            <h4>❌ MDX Syntax Error</h4>
            <p>The markdown file contains invalid MDX syntax that prevents compilation.</p>
          </div>
        );
    }
  };

  return (
    <div
      className="mdx-error-fallback"
      style={{
        padding: '2rem',
        margin: '1rem',
        border: '2px solid #ff6b35',
        borderRadius: '8px',
        background: 'rgba(247, 147, 30, 0.1)',
      }}
    >
      <div className="fire22-badge">MDX Error</div>

      <h2>🔧 Documentation Compilation Failed</h2>

      <div className="api-endpoint">
        <strong>File:</strong> <code>{filePath || 'Unknown'}</code>
        <br />
        <strong>Error Type:</strong> <code>{errorType}</code>
      </div>

      {getSolution()}

      <div className="bun-highlight">
        <strong>🥖 Bun Development Note:</strong> MDX combines Markdown with JSX, so all JSX syntax
        must be valid. Use the Bun development tools to validate your markdown before deployment.
      </div>

      <details style={{ marginTop: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📋 Full Error Details</summary>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.8rem',
            marginTop: '0.5rem',
          }}
        >
          {error?.message || 'No error message available'}
          {error?.stack && '\n\n' + error.stack}
        </pre>
      </details>

      <div style={{ marginTop: '1.5rem' }}>
        <h3>🛠️ Quick Fixes:</h3>
        <ol>
          <li>Open the source file in your editor</li>
          <li>Look for the line number mentioned in the error</li>
          <li>Apply the suggested fix above</li>
          <li>Save and the page will automatically reload</li>
        </ol>
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(46, 133, 85, 0.1)',
          borderRadius: '4px',
        }}
      >
        <strong>💡 Alternative:</strong> If this content is not critical, you can temporarily rename
        the file to <code>.txt</code> to exclude it from compilation while you fix the syntax.
      </div>
    </div>
  );
}
