import { useState, useEffect, useCallback } from 'react';
import mobileConfig from '../config/mobile-themes.toml' with { type: 'toml' };

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  width: number;
  height: number;
  pixelRatio: number;
  isTouch: boolean;
  isLandscape: boolean;
  hasNotch: boolean;
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
}

export interface MobileSettings {
  defaultColumns: number;
  maxColumns: number;
  rowHeight: number;
  reduceMotion: boolean;
  hapticIntensity: number;
  minTouchTarget: number;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    isTouch: false,
    isLandscape: false,
    hasNotch: false,
    os: 'unknown',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio;

      let type: DeviceType = 'desktop';
      if (width < 768) type = 'mobile';
      else if (width < 1024) type = 'tablet';

      const isTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints > 0;

      const isLandscape = width > height;

      const hasNotch = /iPhone|iPad|iPod/.test(navigator.userAgent) && (window.screen.height > 800 || window.screen.width > 800);

      let os: DeviceInfo['os'] = 'unknown';
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) os = 'ios';
      else if (/Android/.test(navigator.userAgent)) os = 'android';
      else if (/Win/.test(navigator.userAgent)) os = 'windows';
      else if (/Mac/.test(navigator.userAgent)) os = 'macos';
      else if (/Linux/.test(navigator.userAgent)) os = 'linux';

      setDeviceInfo({
        type,
        width,
        height,
        pixelRatio,
        isTouch,
        isLandscape,
        hasNotch,
        os,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

export function useMobileSettings(): MobileSettings {
  const [settings, setSettings] = useState<MobileSettings>({
    defaultColumns: 8,
    maxColumns: 20,
    rowHeight: 56,
    reduceMotion: false,
    hapticIntensity: 0.7,
    minTouchTarget: 44,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const config = mobileConfig.mobile_performance as Record<string, unknown> | undefined;
    const matrixConfig = mobileConfig.mobile_matrix as Record<string, unknown> | undefined;

    setSettings({
      defaultColumns: (matrixConfig?.default_columns as number) ?? 8,
      maxColumns: (matrixConfig?.max_columns as number) ?? 20,
      rowHeight: (matrixConfig?.row_height as number) ?? 56,
      reduceMotion: (config?.reduce_motion as boolean) ?? false,
      hapticIntensity: (config?.haptic_intensity as number) ?? 0.7,
      minTouchTarget: (config?.min_touch_target as number) ?? 44,
    });
  }, []);

  return settings;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useBreakpoint(): DeviceInfo['type'] {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

export function useReducedMotion(): boolean {
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const userOverride = useState(false);

  return prefersReduced || userOverride[0];
}

export function useHapticFeedback(): {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  selection: () => void;
} {
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    const patterns: Record<string, number[]> = {
      light: [10],
      medium: [20],
      heavy: [30],
    };

    navigator.vibrate(patterns[intensity]);
  }, []);

  const light = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const medium = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);
  const heavy = useCallback(() => triggerHaptic('heavy'), [triggerHaptic]);
  const selection = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    navigator.vibrate(5);
  }, []);

  return { light, medium, heavy, selection };
}

export function useSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const [insets, setInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computed = getComputedStyle(document.documentElement);
    const top = parseInt(computed.getPropertyValue('--safe-area-inset-top') || '0');
    const bottom = parseInt(computed.getPropertyValue('--safe-area-inset-bottom') || '0');
    const left = parseInt(computed.getPropertyValue('--safe-area-inset-left') || '0');
    const right = parseInt(computed.getPropertyValue('--safe-area-inset-right') || '0');

    setInsets({ top, bottom, left, right });
  }, []);

  return insets;
}

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement>,
  onRefresh: () => Promise<void>
): { isRefreshing: boolean; pullDistance: number } {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop) return;
    setStartY(e.touches[0].clientY);
  }, [isAtTop]);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        setPullDistance(Math.min(diff, 100));
      }
    },
    [isAtTop, isRefreshing, startY]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isAtTop || isRefreshing) return;

    if (pullDistance > 60) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }

    setPullDistance(0);
  }, [isAtTop, isRefreshing, pullDistance, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const checkAtTop = () => {
      if (containerRef.current) {
        setIsAtTop(containerRef.current.scrollTop === 0);
      }
    };

    containerRef.current?.addEventListener('scroll', checkAtTop);
    return () => containerRef.current?.removeEventListener('scroll', checkAtTop);
  }, [containerRef]);

  return { isRefreshing, pullDistance };
}

export function getMobileThemeOverrides(
  themeName: string,
  deviceType: DeviceType
): Record<string, unknown> | null {
  if (deviceType === 'desktop') return null;

  const mobileThemeKey = `${themeName}.mobile` as keyof typeof mobileConfig;
  return (mobileConfig[mobileThemeKey] as Record<string, unknown>) ?? null;
}
