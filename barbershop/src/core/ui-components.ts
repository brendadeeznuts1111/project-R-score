/**
 * FactoryWager UI Components
 * Shared header, footer, and layout components for all dashboards
 * Theme-aware and accessible
 */

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

// Generate CSS variables for themes - matches TOML theme structure
export function generateThemeCSS(): string {
  return `
    :root {
      /* Primary - Blue */
      --color-primary-50: hsl(217 90% 97%);
      --color-primary-100: hsl(217 90% 94%);
      --color-primary-200: hsl(217 90% 86%);
      --color-primary-300: hsl(217 90% 76%);
      --color-primary-400: hsl(217 90% 60%);
      --color-primary-500: hsl(217 90% 50%);
      --color-primary-600: hsl(217 90% 42%);
      --color-primary-700: hsl(217 90% 36%);
      --color-primary-800: hsl(217 90% 30%);
      --color-primary-900: hsl(217 90% 24%);
      --color-primary-950: hsl(217 90% 16%);

      /* Secondary - Teal (NOT purple) */
      --color-secondary-50: hsl(190 80% 97%);
      --color-secondary-100: hsl(190 80% 94%);
      --color-secondary-200: hsl(190 80% 86%);
      --color-secondary-300: hsl(190 80% 76%);
      --color-secondary-400: hsl(190 80% 60%);
      --color-secondary-500: hsl(190 80% 50%);
      --color-secondary-600: hsl(190 80% 42%);
      --color-secondary-700: hsl(190 80% 36%);
      --color-secondary-800: hsl(190 80% 30%);
      --color-secondary-900: hsl(190 80% 24%);
      --color-secondary-950: hsl(190 80% 16%);

      /* Semantic Colors */
      --color-success-50: hsl(160 84% 97%);
      --color-success-100: hsl(160 84% 94%);
      --color-success-500: hsl(160 84% 39%);
      --color-success-700: hsl(160 84% 30%);

      --color-warning-50: hsl(38 92% 97%);
      --color-warning-100: hsl(38 92% 94%);
      --color-warning-500: hsl(38 92% 50%);
      --color-warning-700: hsl(38 92% 35%);

      --color-error-50: hsl(0 84% 97%);
      --color-error-100: hsl(0 84% 94%);
      --color-error-500: hsl(0 84% 60%);
      --color-error-700: hsl(0 84% 45%);

      /* Background */
      --color-background-primary: hsl(0 0% 100%);
      --color-background-secondary: hsl(220 14% 96%);
      --color-background-tertiary: hsl(220 14% 92%);
      --color-background-elevated: hsl(0 0% 100%);

      /* Text */
      --color-text-primary: hsl(220 43% 11%);
      --color-text-secondary: hsl(220 14% 35%);
      --color-text-tertiary: hsl(220 9% 46%);
      --color-text-muted: hsl(220 9% 60%);
      --color-text-inverse: hsl(0 0% 100%);

      /* Border */
      --color-border-light: hsl(220 14% 90%);
      --color-border-default: hsl(220 14% 84%);
      --color-border-strong: hsl(220 14% 70%);

      /* Status */
      --color-status-online: hsl(160 84% 39%);
      --color-status-away: hsl(38 92% 50%);
      --color-status-busy: hsl(0 84% 60%);
      --color-status-offline: hsl(220 14% 60%);

      /* Shadows */
      --shadow-sm: 0 1px 2px 0 hsl(220 43% 11% / 0.05);
      --shadow-md: 0 4px 6px -1px hsl(220 43% 11% / 0.1);
      --shadow-lg: 0 10px 15px -3px hsl(220 43% 11% / 0.1);
      --shadow-xl: 0 20px 25px -5px hsl(220 43% 11% / 0.1);

      /* Radius */
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      --radius-full: 9999px;

      /* Typography */
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'Fira Code', 'Monaco', 'Menlo', 'Consolas', monospace;

      /* Transitions */
      --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Dark theme */
    [data-theme="dark"] {
      --color-background-primary: hsl(220 43% 7%);
      --color-background-secondary: hsl(220 43% 11%);
      --color-background-tertiary: hsl(220 30% 15%);
      --color-background-elevated: hsl(220 25% 20%);

      --color-text-primary: hsl(0 0% 95%);
      --color-text-secondary: hsl(0 0% 80%);
      --color-text-tertiary: hsl(0 0% 65%);
      --color-text-muted: hsl(0 0% 50%);
      --color-text-inverse: hsl(220 43% 11%);

      --color-border-light: hsl(220 20% 20%);
      --color-border-default: hsl(220 20% 28%);
      --color-border-strong: hsl(220 20% 40%);

      --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.3);
      --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.4);
      --shadow-lg: 0 10px 15px -3px hsl(0 0% 0% / 0.4);
      --shadow-xl: 0 20px 25px -5px hsl(0 0% 0% / 0.4);
    }

    /* Professional theme */
    [data-theme="professional"] {
      --color-primary-500: hsl(210 70% 50%);
      --color-secondary-500: hsl(200 60% 50%);

      --color-background-primary: hsl(210 20% 98%);
      --color-background-secondary: hsl(210 18% 94%);

      --color-text-primary: hsl(210 40% 15%);
      --color-text-secondary: hsl(210 25% 30%);
    }

    /* High contrast theme */
    [data-theme="high-contrast"] {
      --color-background-primary: hsl(0 0% 100%);
      --color-background-secondary: hsl(0 0% 98%);

      --color-text-primary: hsl(0 0% 0%);
      --color-text-secondary: hsl(0 0% 15%);
      --color-text-muted: hsl(0 0% 40%);

      --color-border-default: hsl(0 0% 50%);
    }
  `;
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

// Render header component
export function renderHeader(config: HeaderConfig): string {
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
  ${renderHeader(params.header)}

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
