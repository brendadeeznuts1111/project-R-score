/**
 * Comprehensive Bun Markdown React Components
 * Production-ready implementations with security, accessibility, and performance
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { BUN_MARKDOWN_CONFIG } from './constants';

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Sanitize URLs to prevent XSS attacks
 */
const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:', '#'];
    if (!allowedProtocols.includes(parsed.protocol) && !url.startsWith('#')) {
      return '#';
    }
    return url;
  } catch {
    return '#';
  }
};

/**
 * Sanitize text content
 */
const sanitizeText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/[<>]/g, '');
};

// ============================================================================
// MEMOIZED COMPONENTS (Performance Optimized)
// ============================================================================

/**
 * Safe external link with security attributes
 */
const SafeLink = memo(({ href, title, children }: { href: string; title?: string; children: React.ReactNode }) => {
  const safeHref = useMemo(() => sanitizeUrl(href), [href]);
  const safeTitle = useMemo(() => title ? sanitizeText(title) : undefined, [title]);
  const isExternal = useMemo(() => safeHref.startsWith('http'), [safeHref]);

  return (
    <a 
      href={safeHref}
      title={safeTitle}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="markdown-link"
    >
      {children}
    </a>
  );
});
SafeLink.displayName = 'SafeLink';

/**
 * Safe image with lazy loading and accessibility
 */
const SafeImage = memo(({ src, alt, title }: { src: string; alt?: string; title?: string }) => {
  const safeSrc = useMemo(() => sanitizeUrl(src), [src]);
  const safeAlt = useMemo(() => sanitizeText(alt) || 'Image', [alt]);
  const safeTitle = useMemo(() => title ? sanitizeText(title) : undefined, [title]);

  return (
    <img 
      src={safeSrc}
      alt={safeAlt}
      title={safeTitle}
      loading="lazy"
      className="markdown-image"
      onError={(e) => {
        // Fallback for broken images
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
});
SafeImage.displayName = 'SafeImage';

/**
 * Interactive code block with copy functionality
 */
const InteractiveCodeBlock = memo(({ language, children }: { language?: string; children: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = useCallback(async () => {
    if (typeof children !== 'string') return;
    
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setShowTooltip(true);
      setTimeout(() => {
        setCopied(false);
        setShowTooltip(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [children]);

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-header">
        <span className="markdown-language-tag">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="markdown-copy-button"
          aria-label={copied ? 'Copied!' : 'Copy code'}
          disabled={copied}
        >
          {copied ? '✓' : 'Copy'}
        </button>
        {showTooltip && (
          <div className="markdown-tooltip">
            Code copied to clipboard!
          </div>
        )}
      </div>
      <pre className={`markdown-code-content language-${language || 'text'}`}>
        <code>{children}</code>
      </pre>
    </div>
  );
});
InteractiveCodeBlock.displayName = 'InteractiveCodeBlock';

/**
 * Heading with anchor link and smooth scroll
 */
const HeadingWithAnchor = memo(({ level, id, children }: { 
  level: 1 | 2 | 3 | 4 | 5 | 6; 
  id?: string; 
  children: React.ReactNode 
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  const [hovered, setHovered] = useState(false);

  const handleAnchorClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      // Update URL without page reload
      history.replaceState(null, '', `#${id}`);
    }
  }, [id]);

  return (
    <HeadingTag 
      id={id}
      className={`markdown-heading markdown-h${level}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {id && (
        <a 
          href={`#${id}`}
          onClick={handleAnchorClick}
          className={`markdown-anchor ${hovered ? 'visible' : 'hidden'}`}
          aria-label="Anchor link"
        >
          #
        </a>
      )}
    </HeadingTag>
  );
});
HeadingWithAnchor.displayName = 'HeadingWithAnchor';

/**
 * Enhanced list item with task list support
 */
const EnhancedListItem = memo(({ checked, children }: { checked?: boolean; children: React.ReactNode }) => {
  return (
    <li className={`markdown-list-item ${checked ? 'checked' : ''}`}>
      {checked !== undefined && (
        <input 
          type="checkbox" 
          checked={checked} 
          readOnly 
          className="markdown-task-checkbox"
          aria-label={checked ? 'Completed task' : 'Pending task'}
        />
      )}
      <span className="markdown-list-content">{children}</span>
    </li>
  );
});
EnhancedListItem.displayName = 'EnhancedListItem';

/**
 * Responsive table with wrapper
 */
const ResponsiveTable = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="markdown-table-wrapper">
      <table className="markdown-table">
        {children}
      </table>
    </div>
  );
});
ResponsiveTable.displayName = 'ResponsiveTable';

// ============================================================================
// COMPONENT COLLECTIONS
// ============================================================================

/**
 * Base components with sensible defaults
 */
export const BASE_MARKDOWN_COMPONENTS = {
  // Headings with anchors
  h1: (props: { id?: string; children: React.ReactNode }) => (
    <HeadingWithAnchor level={1} {...props} />
  ),
  h2: (props: { id?: string; children: React.ReactNode }) => (
    <HeadingWithAnchor level={2} {...props} />
  ),
  h3: (props: { id?: string; children: React.ReactNode }) => (
    <HeadingWithAnchor level={3} {...props} />
  ),
  h4: (props: { id?: string; children: React.ReactNode }) => (
    <HeadingWithAnchor level={4} {...props} />
  ),
  h5: (props: { id?: string; children: React.ReactNode }) => (
    <HeadingWithAnchor level={5} {...props} />
  ),
  h6: (props: { id?: string; children: React.ReactNode }) => (
    <HeadingWithAnchor level={6} {...props} />
  ),

  // Content elements
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="markdown-paragraph">{children}</p>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="markdown-blockquote">{children}</blockquote>
  ),
  hr: () => <hr className="markdown-hr" />,

  // Lists
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="markdown-list markdown-unordered">{children}</ul>
  ),
  ol: ({ start, children }: { start?: number; children: React.ReactNode }) => (
    <ol className="markdown-list markdown-ordered" start={start}>{children}</ol>
  ),
  li: EnhancedListItem,

  // Tables
  table: ResponsiveTable,
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="markdown-thead">{children}</thead>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="markdown-tbody">{children}</tbody>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="markdown-tr">{children}</tr>
  ),
  th: ({ align, children }: { align?: string; children: React.ReactNode }) => (
    <th className={`markdown-th markdown-th-${align || 'left'}`} align={align as any}>
      {children}
    </th>
  ),
  td: ({ align, children }: { align?: string; children: React.ReactNode }) => (
    <td className={`markdown-td markdown-td-${align || 'left'}`} align={align as any}>
      {children}
    </td>
  ),

  // Inline elements
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="markdown-em">{children}</em>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="markdown-strong">{children}</strong>
  ),
  a: SafeLink,
  img: SafeImage,
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="markdown-inline-code">{children}</code>
  ),
  del: ({ children }: { children: React.ReactNode }) => (
    <del className="markdown-del">{children}</del>
  ),
  br: () => <br className="markdown-br" />,
  pre: InteractiveCodeBlock,
} as const;

/**
 * Security-focused components (for user-generated content)
 */
export const SECURE_MARKDOWN_COMPONENTS = {
  ...BASE_MARKDOWN_COMPONENTS,
  
  // Override with stricter security
  img: ({ src, alt, title }: { src: string; alt?: string; title?: string }) => {
    const safeSrc = sanitizeUrl(src);
    // Only allow images from same origin or trusted CDN
    const allowedDomains = ['localhost', 'yourdomain.com', 'cdn.yourdomain.com'];
    const isAllowed = allowedDomains.some(domain => 
      safeSrc.includes(domain) || safeSrc.startsWith('/') || safeSrc.startsWith('#')
    );
    
    if (!isAllowed) {
      return <span className="markdown-blocked-image">[Blocked Image]</span>;
    }
    
    return <SafeImage src={safeSrc} alt={alt} title={title} />;
  },
  
  a: ({ href, title, children }: { href: string; title?: string; children: React.ReactNode }) => {
    const safeHref = sanitizeUrl(href);
    // Add warning for external links
    const isExternal = safeHref.startsWith('http') && !safeHref.includes(window.location.hostname);
    
    return (
      <>
        <SafeLink href={safeHref} title={title}>{children}</SafeLink>
        {isExternal && (
          <span className="markdown-external-indicator" title="External link">↗</span>
        )}
      </>
    );
  },
} as const;

/**
 * Minimal components (for performance-critical applications)
 */
export const MINIMAL_MARKDOWN_COMPONENTS = {
  h1: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  h2: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  h3: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  p: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  a: SafeLink,
  img: SafeImage,
  code: ({ children }: { children: React.ReactNode }) => <code>{children}</code>,
  pre: ({ language, children }: { language?: string; children: React.ReactNode }) => (
    <pre><code className={language ? `language-${language}` : ''}>{children}</code></pre>
  ),
  ul: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  ol: ({ start, children }: { start?: number; children: React.ReactNode }) => <ol start={start}>{children}</ol>,
  li: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  blockquote: ({ children }: { children: React.ReactNode }) => <blockquote>{children}</blockquote>,
  hr: () => <hr />,
  table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  thead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  tbody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  th: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  td: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  em: ({ children }: { children: React.ReactNode }) => <em>{children}</em>,
  strong: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  del: ({ children }: { children: React.ReactNode }) => <del>{children}</del>,
  br: () => <br />,
} as const;

// ============================================================================
// MAIN MARKDOWN COMPONENT
// ============================================================================

interface MarkdownRendererProps {
  content: string;
  components?: Partial<typeof BASE_MARKDOWN_COMPONENTS>;
  options?: {
    reactVersion?: 18 | 19;
    tables?: boolean;
    headings?: { ids?: boolean };
    autolinks?: boolean | { url?: boolean; www?: boolean; email?: boolean };
    strikethrough?: boolean;
    tasklists?: boolean;
    noHtmlBlocks?: boolean;
    noHtmlSpans?: boolean;
    tagFilter?: boolean;
  };
  variant?: 'base' | 'secure' | 'minimal';
  className?: string;
}

/**
 * Production-ready Markdown renderer with component overrides
 */
export const MarkdownRenderer = memo(({ 
  content, 
  components = {}, 
  options = {},
  variant = 'base',
  className = ''
}: MarkdownRendererProps) => {
  // Select base component set based on variant
  const baseComponents = useMemo(() => {
    switch (variant) {
      case 'secure':
        return SECURE_MARKDOWN_COMPONENTS;
      case 'minimal':
        return MINIMAL_MARKDOWN_COMPONENTS;
      default:
        return BASE_MARKDOWN_COMPONENTS;
    }
  }, [variant]);

  // Merge custom components with base components
  const finalComponents = useMemo(() => ({
    ...baseComponents,
    ...components
  }), [baseComponents, components]);

  // Default options with security considerations
  const finalOptions = useMemo(() => ({
    reactVersion: 19, // Default to React 19
    tables: true,
    headings: { ids: true },
    autolinks: { url: true, www: true, email: true },
    strikethrough: true,
    tasklists: true,
    noHtmlBlocks: variant === 'secure', // Disable HTML in secure mode
    noHtmlSpans: variant === 'secure',   // Disable HTML in secure mode
    tagFilter: variant === 'secure',    // Enable tag filter in secure mode
    ...options
  }), [variant, options]);

  // Render the markdown
  try {
    const result = Bun.markdown.react(content, finalComponents, finalOptions);
    return (
      <div className={`markdown-content ${className}`}>
        {result}
      </div>
    );
  } catch (error) {
    console.error('Markdown rendering failed:', error);
    return (
      <div className={`markdown-error ${className}`}>
        <p>Unable to render content. Please check the markdown format.</p>
        <pre className="markdown-error-details">{content}</pre>
      </div>
    );
  }
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

/**
 * Simple markdown renderer with default styling
 */
export const Markdown = memo(({ content }: { content: string }) => (
  <MarkdownRenderer content={content} />
));
Markdown.displayName = 'Markdown';

/**
 * Secure markdown renderer for user-generated content
 */
export const SecureMarkdown = memo(({ content }: { content: string }) => (
  <MarkdownRenderer content={content} variant="secure" />
));
SecureMarkdown.displayName = 'SecureMarkdown';

/**
 * Minimal markdown renderer for performance-critical apps
 */
export const FastMarkdown = memo(({ content }: { content: string }) => (
  <MarkdownRenderer content={content} variant="minimal" />
));
FastMarkdown.displayName = 'FastMarkdown';

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SafeLink,
  SafeImage,
  InteractiveCodeBlock,
  HeadingWithAnchor,
  EnhancedListItem,
  ResponsiveTable,
};

export type {
  MarkdownRendererProps,
};
