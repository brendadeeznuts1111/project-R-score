#!/usr/bin/env bun
/**
 * Reusable HTML Headers
 * Common header components for HTML reports
 * Enhanced with Bun's native fetch capabilities for performance optimization
 * 
 * Usage:
 *   import { generateHeader, generateSkipLink, generateFooter, optimizeResourceHints } from './html-headers';
 */

export interface HeaderOptions {
  title: string;
  description?: string;
  showTelemetry?: boolean;
  showDarkMode?: boolean;
  customActions?: Array<{ id: string; label: string; onclick: string; icon?: string }>;
}

export interface FooterOptions {
  generatedAt: Date;
  reportType?: string;
  version?: string;
}

export interface ResourceHint {
  url: string;
  type: 'preconnect' | 'dns-prefetch' | 'preload' | 'prefetch';
  as?: string;
  crossorigin?: boolean;
}

/**
 * Optimize resource hints using Bun's native fetch capabilities
 * Pre-resolves DNS and establishes connections at generation time
 */
export async function optimizeResourceHints(resources: ResourceHint[]): Promise<void> {
  const uniqueHosts = new Set<string>();
  
  for (const resource of resources) {
    try {
      const url = new URL(resource.url);
      const hostname = url.hostname;
      
      // Use Bun's DNS prefetch for all resources
      if (typeof Bun !== 'undefined' && Bun.dns?.prefetch) {
        if (!uniqueHosts.has(hostname)) {
          Bun.dns.prefetch(hostname, url.port ? parseInt(url.port) : undefined);
          uniqueHosts.add(hostname);
        }
      }
      
      // Use Bun's preconnect for critical resources
      if (resource.type === 'preconnect' && typeof fetch !== 'undefined' && (fetch as any).preconnect) {
        (fetch as any).preconnect(resource.url, {
          dns: true,
          http: url.protocol === 'http:',
          https: url.protocol === 'https:',
          tcp: true,
        });
      }
    } catch (error) {
      // Silently fail - resource hints are optimizations, not critical
      console.warn(`Failed to optimize resource hint for ${resource.url}:`, error);
    }
  }
}

/**
 * Generate optimized resource hint tags
 * Uses Bun's native capabilities when available
 */
export function generateResourceHints(resources: ResourceHint[]): string {
  return resources.map(resource => {
    const url = resource.url;
    const attrs: string[] = [];
    
    switch (resource.type) {
      case 'preconnect':
        attrs.push(`rel="preconnect"`, `href="${url}"`);
        if (resource.crossorigin) attrs.push('crossorigin');
        break;
      case 'dns-prefetch':
        attrs.push(`rel="dns-prefetch"`, `href="${url}"`);
        break;
      case 'preload':
        attrs.push(`rel="preload"`, `href="${url}"`);
        if (resource.as) attrs.push(`as="${resource.as}"`);
        if (resource.crossorigin) attrs.push('crossorigin');
        break;
      case 'prefetch':
        attrs.push(`rel="prefetch"`, `href="${url}"`);
        if (resource.as) attrs.push(`as="${resource.as}"`);
        break;
    }
    
    return `  <link ${attrs.join(' ')}>`;
  }).join('\n');
}

/**
 * Generate skip link for accessibility
 */
export function generateSkipLink(targetId: string = "main-content"): string {
  return `<a href="#${targetId}" class="skip-link">Skip to main content</a>`;
}

/**
 * Generate reusable HTML header with telemetry, dark mode, and custom actions
 */
export function generateHeader(options: HeaderOptions): string {
  const {
    title,
    description = "",
    showTelemetry = false,
    showDarkMode = false,
    customActions = [],
  } = options;

  const actions = [];
  
  if (showDarkMode) {
    actions.push(`
      <button 
        id="darkModeToggle" 
        onclick="toggleDarkMode()" 
        aria-label="Toggle dark/light mode"
        style="background: #334155; border: 1px solid #475569; color: #94a3b8; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
        <span id="darkModeIcon">🌙</span>
      </button>
    `);
  }
  
  if (showTelemetry) {
    actions.push(`
      <button 
        id="telemetryBtn" 
        onclick="toggleTelemetry()" 
        aria-label="Toggle telemetry collection"
        aria-pressed="false"
        style="
          background: linear-gradient(135deg, #334155 0%, #475569 100%);
          border: 1px solid #475569;
          color: #94a3b8;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          position: relative;
        "
        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)';"
        title="Click to toggle telemetry | Right-click or double-click to export"
      >
        <span id="telemetryIcon" style="font-size: 1rem; transition: transform 0.3s ease;">📊</span>
        <span id="telemetryText" style="font-weight: 500;">Telemetry</span>
        <span id="telemetryStatus" style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #64748b;
          transition: all 0.3s ease;
          margin-left: 0.25rem;
        "></span>
      </button>
    `);
  }
  
  customActions.forEach(action => {
    actions.push(`
      <button 
        id="${action.id}" 
        onclick="${action.onclick}" 
        aria-label="${action.label}"
        style="background: #334155; border: 1px solid #475569; color: #94a3b8; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
        ${action.icon ? `<span>${action.icon}</span>` : ''}
        <span>${action.label}</span>
      </button>
    `);
  });

  return `
    <header role="banner" style="position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1>${title}</h1>
          ${description ? `<p style="color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem;">${description}</p>` : ''}
        </div>
        ${actions.length > 0 ? `<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">${actions.join('')}</div>` : ''}
      </div>
    </header>
  `;
}

/**
 * Generate reusable HTML footer
 */
export function generateFooter(options: FooterOptions): string {
  const { generatedAt, reportType = "", version = "" } = options;
  
  return `
    <footer role="contentinfo" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 0.875rem;">
      ${reportType ? `<div style="margin-bottom: 0.5rem;"><strong>${reportType}</strong></div>` : ''}
      <div>Generated at <time datetime="${generatedAt.toISOString()}">${generatedAt.toLocaleString()}</time></div>
      ${version ? `<div style="margin-top: 0.5rem; font-size: 0.75rem;">Version ${version}</div>` : ''}
    </footer>
  `;
}

/**
 * Generate common HTML head section with meta tags, styles, and scripts
 * Enhanced with Bun's native fetch optimizations
 */
export async function generateHTMLHead(options: {
  title: string;
  description?: string;
  themeColor?: string;
  includeChartJS?: boolean;
  includeDarkMode?: boolean;
  customStyles?: string;
  customScripts?: string;
  additionalResources?: ResourceHint[];
}): Promise<string> {
  const {
    title,
    description = "",
    themeColor = "#007acc",
    includeChartJS = false,
    includeDarkMode = false,
    customStyles = "",
    customScripts = "",
    additionalResources = [],
  } = options;

  // Build resource hints array
  const resources: ResourceHint[] = [];
  
  if (includeChartJS) {
    resources.push(
      { url: 'https://cdn.jsdelivr.net', type: 'preconnect', crossorigin: true },
      { url: 'https://cdn.jsdelivr.net', type: 'dns-prefetch' },
      { 
        url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js', 
        type: 'preload', 
        as: 'script', 
        crossorigin: true 
      }
    );
  }
  
  // Add additional resources
  resources.push(...additionalResources);
  
  // Optimize using Bun's native capabilities
  await optimizeResourceHints(resources);
  
  // Generate HTML resource hints
  const resourceHints = generateResourceHints(resources);

  const darkModeScript = includeDarkMode ? `
    <script>
      function initDarkMode() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const saved = localStorage.getItem('darkMode');
        const isDark = saved === null ? prefersDark : saved === 'true';
        document.body.classList.toggle('dark-mode', isDark);
        updateDarkModeIcon(isDark);
      }
      
      function toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark.toString());
        updateDarkModeIcon(isDark);
      }
      
      function updateDarkModeIcon(isDark) {
        const icon = document.getElementById('darkModeIcon');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
      }
      
      initDarkMode();
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', initDarkMode);
    </script>
  ` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description || title}">
  <meta name="theme-color" content="${themeColor}">
  <title>${title}</title>
  ${chartJSPreload}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
      line-height: 1.6;
    }
    ${includeDarkMode ? `
    body.dark-mode {
      background: #0f172a;
      color: #e2e8f0;
    }
    body:not(.dark-mode) {
      background: #ffffff;
      color: #1e293b;
    }
    ` : ''}
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #60a5fa; margin-bottom: 1rem; }
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #1e293b;
      color: #60a5fa;
      padding: 0.5rem 1rem;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
    }
    .skip-link:focus {
      top: 0;
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }
    button:focus {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    ${customStyles}
  </style>
  ${darkModeScript}
  ${customScripts}
</head>
  `;
}

/**
 * Generate complete HTML document structure
 * Enhanced with Bun's native fetch optimizations
 */
export async function generateHTMLDocument(options: {
  title: string;
  description?: string;
  content: string;
  includeChartJS?: boolean;
  includeDarkMode?: boolean;
  includeTelemetry?: boolean;
  customActions?: Array<{ id: string; label: string; onclick: string; icon?: string }>;
  footerOptions?: FooterOptions;
  customStyles?: string;
  customScripts?: string;
  additionalResources?: ResourceHint[];
}): Promise<string> {
  const {
    title,
    description = "",
    content,
    includeChartJS = false,
    includeDarkMode = false,
    includeTelemetry = false,
    customActions = [],
    footerOptions,
    customStyles = "",
    customScripts = "",
    additionalResources = [],
  } = options;

  const head = await generateHTMLHead({
    title,
    description,
    includeChartJS,
    includeDarkMode,
    customStyles,
    customScripts,
    additionalResources,
  });

  const skipLink = generateSkipLink();
  const header = generateHeader({
    title,
    description,
    showTelemetry: includeTelemetry,
    showDarkMode: includeDarkMode,
    customActions,
  });

  const footer = footerOptions
    ? generateFooter(footerOptions)
    : generateFooter({ generatedAt: new Date() });

  const chartJSScript = includeChartJS
    ? '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" defer></script>'
    : "";

  return `${head}
<body>
  ${skipLink}
  <div class="container">
    ${header}
    <main id="main-content" role="main">
      ${content}
    </main>
    ${footer}
  </div>
  ${chartJSScript}
</body>
</html>`;
}
