/**
 * React Hook for Bun v1.3 View Transition API
 * Provides easy integration with enhanced CSS view-transition pseudo-elements
 */

import { useCallback, useRef, useState } from 'react';
import { performViewTransition, NavigationTransition, ThemeTransition, TransitionPerformance, type TransitionType } from '../utils/view-transitions';

export interface UseViewTransitionOptions {
    type?: TransitionType;
    duration?: number;
    easing?: string;
    enablePerformanceMonitoring?: boolean;
}

export interface TransitionMetrics {
    duration: number;
    type: TransitionType;
    timestamp: number;
}

export function useViewTransition(options: UseViewTransitionOptions = {}) {
    const {
        type = 'fade-in',
        duration = 300,
        easing = 'ease-in-out',
        enablePerformanceMonitoring = false
    } = options;

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [lastMetrics, setLastMetrics] = useState<TransitionMetrics | null>(null);
    const transitionCount = useRef(0);

    /**
     * Perform a view transition with the configured options
     */
    const transition = useCallback(async (
        callback: () => void | Promise<void>,
        overrideOptions?: Partial<UseViewTransitionOptions>
    ) => {
        if (isTransitioning) return; // Prevent concurrent transitions

        setIsTransitioning(true);
        transitionCount.current++;

        const finalOptions = { ...options, ...overrideOptions };

        try {
            let result;

            if (enablePerformanceMonitoring) {
                result = await TransitionPerformance.monitorTransition(callback, finalOptions);
                setLastMetrics({
                    duration: result.duration,
                    type: result.type,
                    timestamp: Date.now()
                });
            } else {
                await performViewTransition(callback, finalOptions);
            }

        } catch (error) {
            console.error('View transition failed:', error);
            // Fallback: execute callback directly
            await callback();
        } finally {
            setIsTransitioning(false);
        }
    }, [isTransitioning, options, enablePerformanceMonitoring]);

    /**
     * Navigate to a new path with transition
     */
    const navigate = useCallback(async (path: string, transitionType?: TransitionType) => {
        await NavigationTransition.navigateWithTransition(path, transitionType || type);
    }, [type]);

    /**
     * Toggle theme with transition
     */
    const toggleTheme = useCallback(async () => {
        await ThemeTransition.toggleTheme();
    }, []);

    /**
     * Add transition classes to an element
     */
    const addTransitionClasses = useCallback((
        element: HTMLElement | null,
        ...types: TransitionType[]
    ) => {
        if (!element) return;

        // Import dynamically to avoid circular dependencies
        import('../utils/view-transitions').then(({ ComponentTransition }) => {
            ComponentTransition.addTransitionClasses(element, ...types);
        });
    }, []);

    /**
     * Remove transition classes from an element
     */
    const removeTransitionClasses = useCallback((
        element: HTMLElement | null,
        ...types: TransitionType[]
    ) => {
        if (!element) return;

        import('../utils/view-transitions').then(({ ComponentTransition }) => {
            ComponentTransition.removeTransitionClasses(element, ...types);
        });
    }, []);

    /**
     * Toggle element visibility with transition
     */
    const toggleElement = useCallback(async (
        element: HTMLElement | null,
        transitionType?: TransitionType
    ) => {
        if (!element) return;

        const { ComponentTransition } = await import('../utils/view-transitions');
        await ComponentTransition.toggleWithTransition(element, transitionType || type);
    }, [type]);

    return {
        // State
        isTransitioning,
        lastMetrics,
        transitionCount: transitionCount.current,

        // Methods
        transition,
        navigate,
        toggleTheme,
        addTransitionClasses,
        removeTransitionClasses,
        toggleElement,

        // Utilities
        getCurrentTheme: ThemeTransition.getCurrentTheme,
        getCurrentTransition: NavigationTransition.getCurrentTransition,
        getPerformanceMetrics: enablePerformanceMonitoring
            ? TransitionPerformance.getMetrics
            : undefined,
        getAverageDuration: enablePerformanceMonitoring
            ? TransitionPerformance.getAverageDuration
            : undefined
    };
}

/**
 * Hook for page-level transitions
 */
export function usePageTransition(transitionType: TransitionType = 'fade-in') {
    const { transition, isTransitioning } = useViewTransition({
        type: transitionType,
        enablePerformanceMonitoring: true
    });

    const changePage = useCallback(async (
        newContent: React.ReactNode,
        containerRef: React.RefObject<HTMLElement>
    ) => {
        if (!containerRef.current) return;

        await transition(async () => {
            // Clear current content
            containerRef.current!.innerHTML = '';

            // Simulate content change (in real app, this would be React rendering)
            await new Promise(resolve => setTimeout(resolve, 50));
        });
    }, [transition]);

    return {
        changePage,
        isTransitioning
    };
}

/**
 * Hook for theme transitions
 */
export function useThemeTransition() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const { transition, isTransitioning } = useViewTransition({
        type: 'fade-in',
        duration: 200,
        enablePerformanceMonitoring: true
    });

    const toggle = useCallback(async () => {
        await transition(async () => {
            const newTheme = theme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
            document.documentElement.style.colorScheme = newTheme;
        });
    }, [theme, transition]);

    return {
        theme,
        toggle,
        isTransitioning
    };
}

/**
 * Hook for component-level transitions
 */
export function useComponentTransition(
    initialType: TransitionType = 'fade-in'
) {
    const [transitionType, setTransitionType] = useState<TransitionType>(initialType);
    const { transition, isTransitioning, addTransitionClasses, removeTransitionClasses } =
        useViewTransition({ type: transitionType });

    const updateComponent = useCallback(async (
        element: HTMLElement | null,
        updateCallback: () => void | Promise<void>,
        newType?: TransitionType
    ) => {
        if (!element) return;

        if (newType) {
            setTransitionType(newType);
        }

        // Add transition classes
        addTransitionClasses(element, newType || transitionType);

        try {
            await transition(updateCallback, { type: newType || transitionType });
        } finally {
            // Clean up classes after transition
            setTimeout(() => {
                removeTransitionClasses(element, newType || transitionType);
            }, (newType ? duration : 300) + 50);
        }
    }, [transition, transitionType, addTransitionClasses, removeTransitionClasses]);

    return {
        updateComponent,
        isTransitioning,
        setTransitionType,
        transitionType
    };
}
