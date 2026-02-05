/**
 * Reusable UI components for Fire22 Personal Subdomains
 */

import type { EmployeeData, ComponentProps } from '../types';
import { CONFIG } from '../config';
import { getAvatarPlaceholder, sanitizeHtml } from '../utils';

/**
 * Generate base HTML head with common styles and meta tags
 */
export function generateHtmlHead(
  title: string,
  description?: string,
  additionalStyles?: string
): string {
  const baseStyles = getBaseStyles();
  const styles = additionalStyles ? `${baseStyles}\n${additionalStyles}` : baseStyles;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${sanitizeHtml(title)} | ${CONFIG.BRAND_NAME}</title>
      ${description ? `<meta name="description" content="${sanitizeHtml(description)}">` : ''}
      <style>
        ${styles}
      </style>
    </head>
    <body>
  `;
}

/**
 * Generate navigation header
 */
export function generateHeader(employee?: EmployeeData, activePath?: string): string {
  const navLinks = generateNavLinks(employee, activePath);

  return `
    <header class="fire22-header">
      <nav>
        <div class="logo">
          <span class="logo-text">🔥 ${CONFIG.BRAND_NAME}</span>
        </div>
        ${navLinks}
      </nav>
    </header>
  `;
}

/**
 * Generate navigation links based on employee tier and features
 */
export function generateNavLinks(employee?: EmployeeData, activePath?: string): string {
  const links = [
    { path: '/profile', label: 'Profile', always: true },
    { path: '/schedule', label: 'Schedule', feature: 'scheduling' },
    { path: '/tools', label: 'Tools', always: true },
    { path: '/dashboard', label: 'Dashboard', always: true },
    { path: '/api', label: 'API', always: true },
    { path: '/contact', label: 'Contact', always: true },
  ];

  const navItems = links
    .filter(link => {
      if (link.always) return true;
      if (link.feature && employee) {
        return employee.features.includes(link.feature);
      }
      return false;
    })
    .map(link => {
      const isActive = activePath === link.path ? 'class="active"' : '';
      return `<a href="${link.path}" ${isActive}>${link.label}</a>`;
    })
    .join('');

  return `<div class="nav-links">${navItems}</div>`;
}

/**
 * Generate employee profile hero section
 */
export function generateProfileHero(employee: EmployeeData): string {
  const avatarHtml = employee.headshotUrl
    ? `<img src="${employee.headshotUrl}" alt="${sanitizeHtml(employee.name)}" loading="lazy">`
    : `<div class="avatar-placeholder">${getAvatarPlaceholder(employee.name)}</div>`;

  const vipBadge = employee.tier === 5 ? '<div class="vip-badge">👑 VIP Management</div>' : '';
  const departmentBadge = `<div class="department-badge">${sanitizeHtml(employee.department)}</div>`;

  return `
    <div class="profile-hero">
      <div class="profile-image">
        ${avatarHtml}
      </div>
      <div class="profile-info">
        <h1>${sanitizeHtml(employee.name)}</h1>
        <h2>${sanitizeHtml(employee.title)}</h2>
        ${departmentBadge}
        <p class="bio">${sanitizeHtml(employee.bio)}</p>
        ${vipBadge}
      </div>
    </div>
  `;
}

/**
 * Generate action buttons
 */
export function generateActionButtons(
  buttons: Array<{
    href: string;
    label: string;
    icon: string;
    className?: string;
    onclick?: string;
  }>
): string {
  return buttons
    .map(
      button => `
      <a href="${button.href}"
         class="action-btn ${button.className || 'primary'}"
         ${button.onclick ? `onclick="${button.onclick}"` : ''}>
        <span class="icon">${button.icon}</span>
        <span>${button.label}</span>
      </a>
    `
    )
    .join('');
}

/**
 * Generate tool cards
 */
export function generateToolCards(
  tools: Array<{
    icon: string;
    title: string;
    description: string;
    url: string;
    onclick?: string;
  }>
): string {
  return tools
    .map(
      tool => `
      <div class="tool-card">
        <div class="tool-icon">${tool.icon}</div>
        <div class="tool-title">${tool.title}</div>
        <div class="tool-description">${tool.description}</div>
        <a href="${tool.url}" class="action-btn primary" ${tool.onclick ? `onclick="${tool.onclick}"` : ''}>
          ${tool.title}
        </a>
      </div>
    `
    )
    .join('');
}

/**
 * Generate metric grid
 */
export function generateMetricGrid(
  metrics: Array<{
    icon: string;
    value: string;
    label: string;
  }>
): string {
  return `
    <div class="metric-grid">
      ${metrics
        .map(
          metric => `
          <div class="metric-item">
            <div class="metric-icon">${metric.icon}</div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-label">${metric.label}</div>
          </div>
        `
        )
        .join('')}
    </div>
  `;
}

/**
 * Generate footer
 */
export function generateFooter(): string {
  return `
    <footer class="fire22-footer">
      <p>&copy; ${new Date().getFullYear()} ${CONFIG.BRAND_NAME}. Professional employee presence powered by Cloudflare Workers.</p>
    </footer>
  `;
}

/**
 * Generate error page
 */
export function generateErrorPage(
  title: string,
  message: string,
  statusCode: number = 500
): string {
  return `
    ${generateHtmlHead(title, message)}
    ${generateHeader()}
    <main class="error-container">
      <div class="error-content">
        <h1>${statusCode}</h1>
        <h2>${title}</h2>
        <p>${message}</p>
        <a href="/profile" class="action-btn primary">← Back to Profile</a>
      </div>
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;
}

/**
 * Generate 404 page
 */
export function generate404Page(subdomain: string): string {
  return generateErrorPage(
    'Employee Not Found',
    `The employee profile for "${sanitizeHtml(subdomain)}" could not be found.`,
    404
  );
}

/**
 * Generate loading spinner
 */
export function generateLoadingSpinner(): string {
  return `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;
}

/**
 * Base styles for all pages
 */
function getBaseStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: #e0e6ed;
      background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
      min-height: 100vh;
    }

    .fire22-header {
      background: rgba(10, 14, 39, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid #2a2f4a;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .fire22-header nav {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo .logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ff6b35;
    }

    .nav-links {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .nav-links a {
      color: #a0a9b8;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
      padding: 0.5rem 1rem;
      border-radius: 6px;
    }

    .nav-links a:hover,
    .nav-links a.active {
      color: #ff6b35;
      background: rgba(255, 107, 53, 0.1);
    }

    .profile-hero {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 3rem;
      align-items: center;
      padding: 3rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .profile-image img,
    .avatar-placeholder {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #ff6b35;
    }

    .avatar-placeholder {
      background: #ff6b35;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 3rem;
      font-weight: 700;
    }

    .profile-info h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #e0e6ed;
    }

    .profile-info h2 {
      font-size: 1.5rem;
      color: #40e0d0;
      margin-bottom: 1rem;
    }

    .department-badge {
      display: inline-block;
      background: rgba(255, 107, 53, 0.2);
      color: #ff6b35;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .vip-badge {
      display: inline-block;
      background: linear-gradient(135deg, #ffd700, #ffb347);
      color: #000;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .bio {
      font-size: 1.1rem;
      color: #a0a9b8;
      max-width: 600px;
    }

    .quick-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 3rem;
      flex-wrap: wrap;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }

    .action-btn.primary {
      background: #ff6b35;
      color: white;
    }

    .action-btn.secondary {
      background: #40e0d0;
      color: #0a0e27;
    }

    .action-btn.accent {
      background: #f7931e;
      color: white;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tool-card {
      padding: 1.5rem;
      border: 1px solid #2a2f4a;
      border-radius: 12px;
      transition: all 0.2s;
    }

    .tool-card:hover {
      border-color: #ff6b35;
      transform: translateY(-2px);
    }

    .tool-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .tool-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .tool-description {
      color: #a0a9b8;
      margin-bottom: 1rem;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .metric-item {
      text-align: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .metric-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .metric-label {
      font-size: 0.9rem;
      color: #a0a9b8;
    }

    .fire22-footer {
      text-align: center;
      padding: 2rem;
      color: #a0a9b8;
      border-top: 1px solid #2a2f4a;
      margin-top: 4rem;
    }

    .error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 2rem;
    }

    .error-content {
      text-align: center;
      max-width: 500px;
    }

    .error-content h1 {
      font-size: 6rem;
      color: #ff6b35;
      margin-bottom: 1rem;
    }

    .error-content h2 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #e0e6ed;
    }

    .error-content p {
      color: #a0a9b8;
      margin-bottom: 2rem;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #2a2f4a;
      border-top: 4px solid #ff6b35;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .profile-hero {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 2rem;
      }

      .profile-image img,
      .avatar-placeholder {
        width: 120px;
        height: 120px;
        margin: 0 auto;
      }

      .nav-links {
        gap: 1rem;
      }

      .quick-actions {
        justify-content: center;
      }

      .profile-info h1 {
        font-size: 2rem;
      }

      .profile-info h2 {
        font-size: 1.3rem;
      }
    }
  `;
}
