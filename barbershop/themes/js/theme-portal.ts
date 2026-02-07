/**
 * Theme Portal JavaScript
 *
 * Handles theme loading, switching, and preview updates
 * Uses Bun's native TOML import support
 */

import { themes, themeList, applyTheme, type ThemeName, type ThemeConfig } from '../config/index';

// State
let currentTheme: ThemeName = 'light';

// DOM Elements
const themeGrid = document.getElementById('themeGrid');
const previewFrame = document.getElementById('previewFrame');

/**
 * Initialize the theme portal
 */
function init(): void {
  renderThemeGrid();
  applyTheme(themes.light, 'light');

  // Listen for theme changes
  window.addEventListener('themechange', ((e: CustomEvent) => {
    console.log('Theme changed to:', e.detail.name);
  }) as EventListener);
}

/**
 * Render theme cards
 */
function renderThemeGrid(): void {
  if (!themeGrid) return;

  themeGrid.innerHTML = themeList
    .map(theme => {
      const themeData = themes[theme.id];
      const primaryColor = themeData.colors.primary[500];
      const secondaryColor = themeData.colors.secondary[500];

      return `
      <article 
        class="theme-card ${theme.id === currentTheme ? 'active' : ''}"
        data-theme="${theme.id}"
        role="button"
        tabindex="0"
      >
        <div class="theme-icon">${theme.icon}</div>
        <h3 class="theme-name">${theme.name}</h3>
        <p class="theme-description">${theme.description}</p>
        <div class="theme-colors">
          <div class="color-dot" style="background: ${primaryColor}"></div>
          <div class="color-dot" style="background: ${secondaryColor}"></div>
        </div>
      </article>
    `;
    })
    .join('');

  // Add click handlers
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.getAttribute('data-theme') as ThemeName;
      selectTheme(themeId);
    });
  });
}

/**
 * Select and apply a theme
 */
function selectTheme(themeId: ThemeName): void {
  if (!themes[themeId]) {
    console.error(`Theme "${themeId}" not found`);
    return;
  }

  currentTheme = themeId;

  // Apply theme
  applyTheme(themes[themeId], themeId);

  // Update active card
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-theme') === themeId);
  });

  // Store preference
  localStorage.setItem('fw-theme', themeId);

  console.log(`✅ Applied theme: ${themeId}`);
}

/**
 * Load persisted theme
 */
function loadPersistedTheme(): void {
  const saved = localStorage.getItem('fw-theme') as ThemeName | null;
  if (saved && themes[saved]) {
    selectTheme(saved);
  }
}

/**
 * Export theme as CSS file
 */
function exportThemeCSS(theme: ThemeConfig, name: string): string {
  const css = `
/* FactoryWager Theme: ${name} */
/* Generated from TOML config */

:root {
  /* Primary Colors */
  ${Object.entries(theme.colors.primary)
    .map(([k, v]) => `  --color-primary-${k}: ${v};`)
    .join('\n  ')}
  
  /* Secondary Colors */
  ${Object.entries(theme.colors.secondary)
    .map(([k, v]) => `  --color-secondary-${k}: ${v};`)
    .join('\n  ')}
  
  /* Semantic Colors */
  ${Object.entries(theme.colors.background)
    .map(([k, v]) => `  --color-background-${k}: ${v};`)
    .join('\n  ')}
  
  ${Object.entries(theme.colors.text)
    .map(([k, v]) => `  --color-text-${k}: ${v};`)
    .join('\n  ')}
  
  ${Object.entries(theme.colors.border)
    .map(([k, v]) => `  --color-border-${k}: ${v};`)
    .join('\n  ')}
  
  /* Typography */
  --font-sans: ${theme.typography.fontSans};
  --font-mono: ${theme.typography.fontMono};
  
  /* Shadows */
  ${Object.entries(theme.shadows)
    .map(([k, v]) => `  --shadow-${k}: ${v};`)
    .join('\n  ')}
  
  /* Border Radius */
  ${Object.entries(theme.radii)
    .map(([k, v]) => `  --radius-${k}: ${v};`)
    .join('\n  ')}
  
  /* Transitions */
  ${Object.entries(theme.transitions)
    .map(([k, v]) => `  --transition-${k}: ${v};`)
    .join('\n  ')}
}
`;
  return css.trim();
}

/**
 * Export theme as JSON
 */
function exportThemeJSON(theme: ThemeConfig): string {
  return JSON.stringify(theme, null, 2);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init();
  loadPersistedTheme();
});

// Expose to window for debugging
(window as any).themePortal = {
  themes,
  themeList,
  selectTheme,
  exportThemeCSS,
  exportThemeJSON,
  currentTheme: () => currentTheme,
};

console.log('🏰 FactoryWager Theme Portal loaded');
console.log('Available themes:', Object.keys(themes).join(', '));
console.log('Debug: window.themePortal');
