import { useTransition, useState, useCallback, useMemo } from 'react';
import uiThemes from '../config/ui-themes.toml' with { type: 'toml' };

export type ThemeName = 'light' | 'dark' | 'high-contrast' | 'midnight';

export interface ThemeColors {
  primary: string;
  'primary-hover': string;
  secondary: string;
  background: string;
  surface: string;
  'text-primary': string;
  'text-secondary': string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface TransitionThemeResult {
  switchTheme: (newTheme: ThemeName) => void;
  currentTheme: ThemeName;
  isPending: boolean;
  availableThemes: ThemeName[];
  getThemeColors: (theme: ThemeName) => ThemeColors;
}

export function useTransitionThemeSwitch(): TransitionThemeResult {
  const [isPending, startTransition] = useTransition();
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('dark');

  const availableThemes: ThemeName[] = ['light', 'dark', 'high-contrast', 'midnight'];

  const getThemeColors = useCallback((theme: ThemeName): ThemeColors => {
    const themeConfig = uiThemes[theme] as Record<string, string> | undefined;
    
    if (!themeConfig) {
      return uiThemes.dark as ThemeColors;
    }

    return {
      primary: themeConfig.primary ?? '#3b82f6',
      'primary-hover': themeConfig['primary-hover'] ?? '#2563eb',
      secondary: themeConfig.secondary ?? '#64748b',
      background: themeConfig.background ?? '#0f172a',
      surface: themeConfig.surface ?? '#1e293b',
      'text-primary': themeConfig['text-primary'] ?? '#f1f5f9',
      'text-secondary': themeConfig['text-secondary'] ?? '#94a3b8',
      border: themeConfig.border ?? '#334155',
      success: themeConfig.success ?? '#22c55e',
      warning: themeConfig.warning ?? '#f59e0b',
      danger: themeConfig.danger ?? '#ef4444',
      info: themeConfig.info ?? '#0ea5e9',
    };
  }, []);

  const switchTheme = useCallback(
    (newTheme: ThemeName) => {
      startTransition(() => {
        document.documentElement.classList.add('theme-transition');
        setCurrentTheme(newTheme);

        const colors = getThemeColors(newTheme);
        Object.entries(colors).forEach(([key, value]) => {
          document.documentElement.style.setProperty(`--theme-${key}`, value);
        });

        void document.body.offsetHeight;

        setTimeout(() => {
          document.documentElement.classList.remove('theme-transition');
        }, 150);
      });
    },
    [getThemeColors]
  );

  return {
    switchTheme,
    currentTheme,
    isPending,
    availableThemes,
    getThemeColors,
  };
}

export function useThemeCSSVariables(theme: ThemeName): React.CSSProperties {
  const colors = useMemo(() => {
    const themeConfig = uiThemes[theme] as Record<string, string> | undefined;
    if (!themeConfig) return {};
    return themeConfig;
  }, [theme]);

  return {
    '--theme-primary': colors.primary ?? '#3b82f6',
    '--theme-primary-hover': colors['primary-hover'] ?? '#2563eb',
    '--theme-secondary': colors.secondary ?? '#64748b',
    '--theme-background': colors.background ?? '#0f172a',
    '--theme-surface': colors.surface ?? '#1e293b',
    '--theme-text-primary': colors['text-primary'] ?? '#f1f5f9',
    '--theme-text-secondary': colors['text-secondary'] ?? '#94a3b8',
    '--theme-border': colors.border ?? '#334155',
    '--theme-success': colors.success ?? '#22c55e',
    '--theme-warning': colors.warning ?? '#f59e0b',
    '--theme-danger': colors.danger ?? '#ef4444',
    '--theme-info': colors.info ?? '#0ea5e9',
  } as React.CSSProperties;
}
