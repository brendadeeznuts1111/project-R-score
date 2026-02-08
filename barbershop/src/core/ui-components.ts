/**
 * FactoryWager UI Components
 * Shared header, footer, and layout components for all dashboards
 * Theme-aware and accessible
 */

import {
  loadThemeFromTOML,
  generateThemeCSS as generateDynamicThemeCSS,
  getAvailableThemes,
} from './theme-loader';

// Load default theme
const defaultTheme = loadThemeFromTOML('factorywager');

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

export interface HeaderConfig {
  title: string;
  subtitle?: string;
  logo?: string;
  navItems?: NavItem[];
  showThemeToggle?: boolean;
  userMenu?: {
    name: string;
    avatar?: string;
    items: { label: string; href: string }[];
  };
}

export interface FooterConfig {
  copyright?: string;
  links?: { label: string; href: string }[];
  version?: string;
  showSystemStatus?: boolean;
}

// Generate CSS variables from loaded theme
export function generateThemeCSS(themeName: string = 'factorywager'): string {
  const theme = loadThemeFromTOML(themeName);
  return generateDynamicThemeCSS(theme);
}

// Get animation CSS
export function getAnimationCSS(): string {
  // Return a link to the animations CSS file
  return '<link rel="stylesheet" href="/themes/css/animations.css">';
}

// Shared layout styles
export function generateLayoutCSS(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-sans);
      background: var(--color-background-secondary);
      color: var(--color-text-primary);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header Styles */
    .fw-header {
      background: var(--color-background-primary);
      border-bottom: 1px solid var(--color-border-default);
      padding: 1rem 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--shadow-sm);
    }

    .fw-header-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .fw-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }

    .fw-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500));
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .fw-brand-text {
      display: flex;
      flex-direction: column;
    }

    .fw-brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .fw-brand-subtitle {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .fw-nav {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex: 1;
      justify-content: center;
    }

    .fw-nav-link {
      padding: 0.5rem 1rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .fw-nav-link:hover {
      background: var(--color-background-secondary);
      color: var(--color-text-primary);
    }

    .fw-nav-link.active {
      background: var(--color-primary-100);
      color: var(--color-primary-700);
    }

    .fw-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .fw-theme-toggle {
      padding: 0.5rem;
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 1rem;
      transition: all var(--transition-fast);
    }

    .fw-theme-toggle:hover {
      background: var(--color-background-tertiary);
      border-color: var(--color-border-default);
    }

    .fw-notification-btn {
      position: relative;
      padding: 0.5rem;
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 1rem;
      transition: all var(--transition-fast);
    }

    .fw-notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--color-error-500);
      color: white;
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-full);
      font-weight: 600;
      min-width: 18px;
      text-align: center;
    }

    .fw-user-menu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem 0.25rem 0.25rem;
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-full);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all var(--transition-fast);
    }

    .fw-user-menu:hover {
      background: var(--color-background-tertiary);
      border-color: var(--color-border-default);
    }

    .fw-user-avatar {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500));
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: white;
      font-weight: 600;
    }

    /* Main Content */
    .fw-main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Footer Styles */
    .fw-footer {
      background: var(--color-background-primary);
      border-top: 1px solid var(--color-border-default);
      padding: 1.5rem;
      margin-top: auto;
    }

    .fw-footer-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .fw-footer-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .fw-footer-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .fw-footer-link {
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color var(--transition-fast);
    }

    .fw-footer-link:hover {
      color: var(--color-primary-600);
    }

    .fw-footer-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .fw-status-indicator {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .fw-status-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--color-status-online);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .fw-nav {
        display: none;
      }

      .fw-header-inner {
        flex-wrap: wrap;
      }

      .fw-footer-inner {
        flex-direction: column;
        text-align: center;
      }
    }
  `;
}

// Cookie Security Badge Component
export interface CookieSecurityBadge {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | '?';
  integrated: boolean;
  score?: number;
}

// Bright hex colors for badge states
const BADGE_COLORS = {
  'A+': { bg: '#00FF00', text: '#000000', glow: '0 0 10px #00FF00' },      // Neon Green
  'A':  { bg: '#00FF88', text: '#000000', glow: '0 0 10px #00FF88' },      // Bright Green
  'B':  { bg: '#88FF00', text: '#000000', glow: '0 0 10px #88FF00' },      // Lime
  'C':  { bg: '#FFDD00', text: '#000000', glow: '0 0 10px #FFDD00' },      // Yellow
  'D':  { bg: '#FF8800', text: '#000000', glow: '0 0 10px #FF8800' },      // Orange
  'F':  { bg: '#FF0044', text: '#FFFFFF', glow: '0 0 15px #FF0044' },      // Bright Red
  '?':  { bg: '#00DDFF', text: '#000000', glow: '0 0 10px #00DDFF' },      // Cyan (checking)
  'off':{ bg: '#888888', text: '#FFFFFF', glow: 'none' },                   // Gray (off)
};

export function renderCookieSecurityBadge(badge: CookieSecurityBadge = { grade: '?', integrated: false }): string {
  const colors = BADGE_COLORS[badge.grade] || BADGE_COLORS['?'];
  const statusText = badge.integrated ? `🍪 v3.26 ${badge.grade}` : '🍪 Checking...';
  const title = badge.integrated 
    ? `Cookie Security v3.26 | Grade: ${badge.grade} | Score: ${badge.score || 'N/A'}/100` 
    : 'Checking cookie security integration...';
  
  return `
    <div id="cookie-security-badge" class="cookie-security-badge" 
         style="
           background: ${colors.bg};
           color: ${colors.text};
           box-shadow: ${colors.glow};
           padding: 0.375rem 0.75rem;
           border-radius: 9999px;
           font-size: 0.75rem;
           font-weight: 700;
           font-family: monospace;
           display: inline-flex;
           align-items: center;
           gap: 0.375rem;
           cursor: help;
           transition: all 0.3s ease;
           text-transform: uppercase;
           letter-spacing: 0.02em;
           border: 2px solid ${colors.bg};
           animation: badgePulse 2s infinite;
         "
         title="${title}"
    >
      <span class="badge-icon">🔒</span>
      <span class="badge-text">${statusText}</span>
    </div>
    <style>
      @keyframes badgePulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.02); }
      }
      .cookie-security-badge:hover {
        transform: scale(1.05) !important;
        filter: brightness(1.1);
      }
    </style>
  `;
}

// Render header component
export function renderHeader(config: HeaderConfig, showCookieBadge: boolean = true): string {
  const navItems =
    config.navItems
      ?.map(
        item => `
      <a href="${item.href}" class="fw-nav-link ${item.active ? 'active' : ''}">
        ${item.icon || ''}
        ${item.label}
      </a>
    `
      )
      .join('') || '';

  const themeToggle = config.showThemeToggle
    ? `<button class="fw-theme-toggle" onclick="toggleTheme()" title="Toggle theme">🎨</button>`
    : '';

  const userMenu = config.userMenu
    ? `
    <button class="fw-user-menu">
      <div class="fw-user-avatar">${config.userMenu.avatar || config.userMenu.name.charAt(0).toUpperCase()}</div>
      <span>${config.userMenu.name}</span>
    </button>
  `
    : '';

  const cookieBadge = showCookieBadge ? renderCookieSecurityBadge() : '';

  return `
    <header class="fw-header">
      <div class="fw-header-inner">
        <a href="/" class="fw-brand">
          <div class="fw-logo">${config.logo || '🏰'}</div>
          <div class="fw-brand-text">
            <span class="fw-brand-title">${config.title}</span>
            ${config.subtitle ? `<span class="fw-brand-subtitle">${config.subtitle}</span>` : ''}
          </div>
        </a>

        <nav class="fw-nav">
          ${navItems}
        </nav>

        <div class="fw-header-actions">
          ${cookieBadge}
          <button class="fw-notification-btn">
            🔔
            <span class="fw-notification-badge">3</span>
          </button>
          ${themeToggle}
          ${userMenu}
        </div>
      </div>
    </header>
  `;
}

// Render footer component
export function renderFooter(config: FooterConfig = {}): string {
  const links =
    config.links
      ?.map(
        link => `
      <a href="${link.href}" class="fw-footer-link">${link.label}</a>
    `
      )
      .join('') || '';

  const statusIndicator = config.showSystemStatus
    ? `
    <div class="fw-status-indicator">
      <span class="fw-status-dot"></span>
      <span>All systems operational</span>
    </div>
  `
    : '';

  return `
    <footer class="fw-footer">
      <div class="fw-footer-inner">
        <div class="fw-footer-left">
          <span>${config.copyright || '© 2026 FactoryWager'}</span>
          <div class="fw-footer-links">
            ${links}
          </div>
        </div>
        <div class="fw-footer-right">
          ${statusIndicator}
          ${config.version ? `<span>v${config.version}</span>` : ''}
        </div>
      </div>
    </footer>
  `;
}

// Render complete layout wrapper
export function renderLayout(params: {
  title: string;
  header: HeaderConfig;
  footer?: FooterConfig;
  content: string;
  resourceHints?: string;
  showCookieBadge?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.title}</title>
  ${params.resourceHints || ''}
  <style>
    ${generateThemeCSS()}
    ${generateLayoutCSS()}
  </style>
</head>
<body>
  ${renderHeader(params.header, params.showCookieBadge !== false)}

  <main class="fw-main">
    ${params.content}
  </main>

  ${renderFooter(params.footer)}

  <script>
    // Theme toggle functionality
    function toggleTheme() {
      const themes = ['light', 'dark', 'professional', 'high-contrast'];
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = themes[(themes.indexOf(current) + 1) % themes.length];
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('fw-theme', next);
    }

    // Load saved theme
    const saved = localStorage.getItem('fw-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }

    // Cookie Security v3.26 Integration Check
    (function checkCookieSecurity() {
      const badge = document.getElementById('cookie-security-badge');
      if (!badge) return;

      // Check for secure cookie indicators
      const checks = {
        secure: document.cookie.includes('Secure') || location.protocol === 'https:',
        httpOnly: document.cookie.includes('HttpOnly'),
        sameSite: document.cookie.includes('SameSite'),
        hasSession: document.cookie.includes('session') || document.cookie.includes('sid'),
      };

      // Calculate grade based on checks
      let score = 0;
      if (checks.secure) score += 30;
      if (checks.httpOnly) score += 30;
      if (checks.sameSite) score += 20;
      if (checks.hasSession) score += 20;

      let grade = 'F';
      if (score >= 95) grade = 'A+';
      else if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';

      // Bright hex colors matching server-side
      const colors = {
        'A+': { bg: '#00FF00', text: '#000000', glow: '0 0 10px #00FF00' },
        'A':  { bg: '#00FF88', text: '#000000', glow: '0 0 10px #00FF88' },
        'B':  { bg: '#88FF00', text: '#000000', glow: '0 0 10px #88FF00' },
        'C':  { bg: '#FFDD00', text: '#000000', glow: '0 0 10px #FFDD00' },
        'D':  { bg: '#FF8800', text: '#000000', glow: '0 0 10px #FF8800' },
        'F':  { bg: '#FF0044', text: '#FFFFFF', glow: '0 0 15px #FF0044' },
      }[grade] || colors['F'];

      // Update badge
      badge.style.background = colors.bg;
      badge.style.color = colors.text;
      badge.style.boxShadow = colors.glow;
      badge.style.borderColor = colors.bg;
      
      const badgeText = badge.querySelector('.badge-text');
      if (badgeText) {
        badgeText.textContent = '🍪 v3.26 ' + grade;
      }
      
      badge.title = 'Cookie Security v3.26 | Grade: ' + grade + ' | Score: ' + score + '/100 | ' +
        'Secure: ' + (checks.secure ? '✓' : '✗') + ', ' +
        'HttpOnly: ' + (checks.httpOnly ? '✓' : '✗') + ', ' +
        'SameSite: ' + (checks.sameSite ? '✓' : '✗') + ', ' +
        'Session: ' + (checks.hasSession ? '✓' : '✗');

      console.log('🍪 Cookie Security v3.26 | Grade:', grade, '| Score:', score + '/100');
    })();
  </script>
</body>
</html>`;
}

// Pre-configured headers for each dashboard
export const adminHeaderConfig: HeaderConfig = {
  title: 'Admin Control Room',
  subtitle: 'God View',
  logo: '👑',
  navItems: [
    { label: 'Overview', href: '/admin', icon: '📊', active: true },
    { label: 'Tickets', href: '/admin/tickets', icon: '🎫' },
    { label: 'Barbers', href: '/admin/barbers', icon: '✂️' },
    { label: 'Revenue', href: '/admin/revenue', icon: '💰' },
  ],
  showThemeToggle: true,
  userMenu: {
    name: 'Admin',
    items: [
      { label: 'Settings', href: '/admin/settings' },
      { label: 'Logout', href: '/logout' },
    ],
  },
};

export const clientHeaderConfig: HeaderConfig = {
  title: 'Barbershop',
  subtitle: 'Client Portal',
  logo: '💈',
  navItems: [
    { label: 'Book', href: '/client', icon: '📅', active: true },
    { label: 'History', href: '/client/history', icon: '📜' },
    { label: 'Rewards', href: '/client/rewards', icon: '🎁' },
  ],
  showThemeToggle: true,
  userMenu: {
    name: 'Alex',
    items: [
      { label: 'Profile', href: '/client/profile' },
      { label: 'Logout', href: '/logout' },
    ],
  },
};

export const barberHeaderConfig: HeaderConfig = {
  title: 'Barber Station',
  subtitle: 'Worker Portal',
  logo: '✂️',
  navItems: [
    { label: 'Queue', href: '/barber', icon: '📋', active: true },
    { label: 'Schedule', href: '/barber/schedule', icon: '📅' },
    { label: 'Earnings', href: '/barber/earnings', icon: '💵' },
  ],
  showThemeToggle: true,
  userMenu: {
    name: 'Marcus',
    items: [
      { label: 'Profile', href: '/barber/profile' },
      { label: 'Logout', href: '/logout' },
    ],
  },
};

// Pre-configured footer
export const defaultFooterConfig: FooterConfig = {
  copyright: '© 2026 FactoryWager',
  links: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Support', href: '/support' },
  ],
  version: '2.0.0',
  showSystemStatus: true,
};
