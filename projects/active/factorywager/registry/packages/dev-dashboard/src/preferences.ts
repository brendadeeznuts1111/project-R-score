/**
 * Cookie-managed dashboard preferences (theme, layout, etc.)
 *
 * Uses Bun's CookieMap for reading/writing preferences. Integrated with
 * HTML fragment loading: preferences are injected into the dashboard
 * template when serving the page and can be updated via API.
 *
 * Reference: https://bun.com/docs/api/cookies
 */

const COOKIE_OPTIONS = {
  path: '/' as const,
  sameSite: 'lax' as const,
};

const PREFIX = 'dw_';
const THEME_COOKIE = PREFIX + 'theme';
const LAYOUT_COOKIE = PREFIX + 'layout';
const SIDEBAR_COOKIE = PREFIX + 'sidebar';
const FONTSIZE_COOKIE = PREFIX + 'fontsize';
const LAST_VISIT_COOKIE = PREFIX + 'lastVisit';
const VISITS_COOKIE = PREFIX + 'visits';

export type DashboardTheme = 'dark' | 'light' | 'blue';

export interface DashboardPreferences {
  theme: DashboardTheme;
  layout: string;
  sidebarCollapsed: boolean;
  fontSize: string;
  lastVisit: string | null;
  visits: number;
}

const DEFAULT_PREFS: DashboardPreferences = {
  theme: 'dark',
  layout: 'standard',
  sidebarCollapsed: false,
  fontSize: 'medium',
  lastVisit: null,
  visits: 0,
};

const THEME_CLASSES: Record<DashboardTheme, string> = {
  dark: 'dashboard-theme-dark',
  light: 'dashboard-theme-light',
  blue: 'dashboard-theme-blue',
};

/**
 * Read dashboard preferences from request cookies (Bun.CookieMap).
 */
export function getDashboardPreferences(cookieHeader: string | null): DashboardPreferences {
  const cookies = new Bun.CookieMap(cookieHeader || '');
  const theme = (cookies.get(THEME_COOKIE) as DashboardTheme) || DEFAULT_PREFS.theme;
  const layout = cookies.get(LAYOUT_COOKIE) || DEFAULT_PREFS.layout;
  const sidebarCollapsed = cookies.get(SIDEBAR_COOKIE) === 'collapsed';
  const fontSize = cookies.get(FONTSIZE_COOKIE) || DEFAULT_PREFS.fontSize;
  const lastVisit = cookies.get(LAST_VISIT_COOKIE) || null;
  const visits = Math.max(0, parseInt(cookies.get(VISITS_COOKIE) || '0', 10));

  return {
    theme: THEME_CLASSES[theme] ? theme : DEFAULT_PREFS.theme,
    layout,
    sidebarCollapsed,
    fontSize,
    lastVisit,
    visits,
  };
}

/**
 * Get the theme class name for the <body> element (for injection into HTML).
 */
export function getThemeClass(prefs: DashboardPreferences): string {
  return THEME_CLASSES[prefs.theme] ?? THEME_CLASSES.dark;
}

/**
 * Inject dashboard preferences into the HTML template.
 * Replaces {{THEME_CLASS}} and optionally {{DASHBOARD_PREFS_JSON}}.
 */
export function injectPreferencesIntoHtml(html: string, prefs: DashboardPreferences): string {
  const themeClass = getThemeClass(prefs);
  return html
    .replace(/\{\{THEME_CLASS\}\}/g, themeClass)
    .replace(/\{\{DASHBOARD_PREFS_JSON\}\}/g, () =>
      JSON.stringify({
        theme: prefs.theme,
        layout: prefs.layout,
        sidebarCollapsed: prefs.sidebarCollapsed,
        fontSize: prefs.fontSize,
        lastVisit: prefs.lastVisit,
        visits: prefs.visits,
      })
    );
}

/**
 * Update visit tracking cookies and return Set-Cookie headers.
 * Call when serving the dashboard page.
 */
export function setVisitCookies(cookieHeader: string | null): { cookies: Bun.CookieMap; headers: string[] } {
  const cookies = new Bun.CookieMap(cookieHeader || '');
  const now = new Date().toISOString();

  cookies.set(LAST_VISIT_COOKIE, now, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  const visits = Math.max(0, parseInt(cookies.get(VISITS_COOKIE) || '0', 10)) + 1;
  cookies.set(VISITS_COOKIE, String(visits), {
    ...COOKIE_OPTIONS,
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });

  const headers = cookies.toSetCookieHeaders();
  return { cookies, headers };
}

/**
 * Apply preference updates from API request body and return Set-Cookie headers.
 */
export function updatePreferencesFromBody(
  cookieHeader: string | null,
  body: { theme?: string; layout?: string; sidebarCollapsed?: boolean; fontSize?: string }
): { preferences: DashboardPreferences; headers: string[] } {
  const cookies = new Bun.CookieMap(cookieHeader || '');
  const prefs = getDashboardPreferences(cookieHeader || '');
  const theme = body.theme as DashboardTheme | undefined;

  if (theme !== undefined && THEME_CLASSES[theme]) {
    cookies.set(THEME_COOKIE, theme, {
      ...COOKIE_OPTIONS,
      maxAge: 365 * 24 * 60 * 60,
    });
    prefs.theme = theme;
  }

  if (body.layout !== undefined) {
    cookies.set(LAYOUT_COOKIE, String(body.layout), {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60,
    });
    prefs.layout = String(body.layout);
  }

  if (body.sidebarCollapsed !== undefined) {
    cookies.set(SIDEBAR_COOKIE, body.sidebarCollapsed ? 'collapsed' : 'expanded', COOKIE_OPTIONS);
    prefs.sidebarCollapsed = Boolean(body.sidebarCollapsed);
  }

  if (body.fontSize !== undefined) {
    cookies.set(FONTSIZE_COOKIE, String(body.fontSize), {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60,
    });
    prefs.fontSize = String(body.fontSize);
  }

  const headers = cookies.toSetCookieHeaders();
  return { preferences: prefs, headers };
}
