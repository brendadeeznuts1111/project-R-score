import uiThemes from '../config/ui-themes.toml' with { type: 'toml' };

type ThemeCSSVariables = Record<string, string>;

type ThemeCollection = {
  light: ThemeCSSVariables;
  dark: ThemeCSSVariables;
  'high-contrast': ThemeCSSVariables;
  midnight: ThemeCSSVariables;
};

function extractColors(theme: Record<string, unknown>): ThemeCSSVariables {
  const vars: ThemeCSSVariables = {};

  const colorKeys = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
  const surfaceKeys = ['background', 'surface', 'surface-elevated', 'surface-sunken'];
  const textKeys = ['text-primary', 'text-secondary', 'text-muted', 'text-inverted'];
  const borderKeys = ['border', 'border-hover', 'border-focus'];

  for (const key of colorKeys) {
    const value = theme[key];
    if (typeof value === 'string') {
      vars[`--color-${key}`] = value;
      vars[`--color-${key}-hover`] = (theme[`${key}-hover`] as string) ?? value;
    }
  }

  for (const key of surfaceKeys) {
    const value = theme[key];
    if (typeof value === 'string') {
      vars[`--color-${key}`] = value;
    }
  }

  for (const key of textKeys) {
    const value = theme[key];
    if (typeof value === 'string') {
      vars[`--color-${key}`] = value;
    }
  }

  for (const key of borderKeys) {
    const value = theme[key];
    if (typeof value === 'string') {
      vars[`--color-${key}`] = value;
    }
  }

  const shadow = theme.shadow;
  if (typeof shadow === 'string') {
    vars['--shadow-sm'] = shadow;
    vars['--shadow-md'] = (theme['shadow-md'] as string) ?? shadow;
    vars['--shadow-lg'] = (theme['shadow-lg'] as string) ?? shadow;
  }

  for (let i = 1; i <= 6; i++) {
    const chartKey = `chart-${i}`;
    const chartValue = theme[chartKey];
    if (typeof chartValue === 'string') {
      vars[`--color-chart-${i}`] = chartValue;
    }
  }

  return vars;
}

export function generateThemeVariables(): ThemeCollection {
  const themes: ThemeCollection = {
    light: {},
    dark: {},
    'high-contrast': {},
    midnight: {},
  };

  for (const themeName of Object.keys(themes)) {
    const themeConfig = uiThemes[themeName as keyof typeof uiThemes] as Record<string, unknown> | undefined;
    if (themeConfig) {
      themes[themeName as keyof ThemeCollection] = extractColors(themeConfig);
    }
  }

  return themes;
}

export function getThemeVariables(themeName: string): ThemeCSSVariables {
  const themes = generateThemeVariables();
  return themes[themeName as keyof ThemeCollection] ?? themes.dark;
}

export function generateCSSVariablesBlock(
  themeName: string,
  variables: ThemeCSSVariables
): string {
  const lines = [`/* Theme: ${themeName} */`];

  for (const [key, value] of Object.entries(variables)) {
    lines.push(`  ${key}: ${value};`);
  }

  return `:root${themeName !== 'dark' ? `.theme-${themeName}` : ''} {\n${lines.join('\n')}\n}`;
}

export function generateAllThemesCSS(): string {
  const themes = generateThemeVariables();
  const blocks: string[] = [];

  for (const [themeName, variables] of Object.entries(themes)) {
    blocks.push(generateCSSVariablesBlock(themeName, variables));
  }

  blocks.push(`
/* Theme transitions */
.theme-transition * {
  transition: background-color 150ms ease,
              color 150ms ease,
              border-color 150ms ease,
              box-shadow 150ms ease;
}

/* Default dark theme */
:root {
  ${Object.entries(themes.dark).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
}
`);

  return blocks.join('\n\n');
}

export function injectThemeVariables(themeName: string): void {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById('theme-variables');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-variables';
    document.head.appendChild(styleEl);
  }

  const variables = getThemeVariables(themeName);
  const css = generateCSSVariablesBlock(themeName, variables);
  styleEl.textContent = css;
}

export function setupThemeObserver(): void {
  if (typeof window === 'undefined') return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const html = document.documentElement;
        const themeName = (html.dataset.theme) ?? 'dark';
        injectThemeVariables(themeName);
      }
    }
  });

  observer.observe(document.documentElement, { attributes: true });
}

export function getPolishConfig(): Record<string, unknown> {
  const polish = uiThemes['performance-polish'] as Record<string, unknown> | undefined;

  return {
    deferredDelay: (polish?.['deferred-delay-base'] as number) ?? 200,
    deferredAnalytics: (polish?.['deferred-delay-analytics'] as number) ?? 300,
    deferredMetrics: (polish?.['deferred-delay-metrics'] as number) ?? 50,
    themeTransitionDuration: (polish?.['theme-transition-duration-ms'] as number) ?? 150,
    virtualizationRowHeight: (polish?.['virtualization-row-height'] as number) ?? 48,
    virtualizationOverscan: (polish?.['virtualization-overscan'] as number) ?? 5,
    virtualizationDefaultColumns: (polish?.['virtualization-default-columns'] as number) ?? 20,
    virtualizationMaxColumns: (polish?.['virtualization-max-columns'] as number) ?? 247,
    probeTimeout: (polish?.['probe-default-timeout-ms'] as number) ?? 5000,
    integrityCacheTTL: (polish?.['integrity-cache-ttl-ms'] as number) ?? 5000,
    integrityVisualCue: (polish?.['integrity-visual-cue'] as string) ?? 'green-check',
  };
}
