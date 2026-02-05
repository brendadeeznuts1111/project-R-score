/**
 * View Transition Utilities for Bun v1.3 CSS Features
 * Demonstrates the enhanced view-transition pseudo-elements with class selectors
 */

export type TransitionType =
    | 'slide-out'
    | 'fade-in'
    | 'card'
    | 'hero'
    | 'nav-item';

export interface ViewTransitionOptions {
    type?: TransitionType;
    duration?: number;
    easing?: string;
}

/**
 * Perform a view transition with Bun v1.3 enhanced CSS support
 */
export async function performViewTransition(
    callback: () => void | Promise<void>,
    options: ViewTransitionOptions = {}
): Promise<void> {
    const { type = 'fade-in', duration = 300, easing = 'ease-in-out' } = options;

    // Check if View Transition API is supported
    if (!('startViewTransition' in document)) {
        // Fallback for browsers without View Transition API
        await callback();
        return;
    }

    try {
        // Add transition class to document for CSS targeting
        document.documentElement.style.setProperty('--view-transition-type', type);
        document.documentElement.style.setProperty('--view-transition-duration', `${duration}ms`);
        document.documentElement.style.setProperty('--view-transition-easing', easing);

        // Perform the view transition
        await document.startViewTransition(async () => {
            await callback();
        }).finished;

        // Clean up CSS custom properties
        document.documentElement.style.removeProperty('--view-transition-type');
        document.documentElement.style.removeProperty('--view-transition-duration');
        document.documentElement.style.removeProperty('--view-transition-easing');

    } catch (error) {
        console.warn('View transition failed, falling back to direct update:', error);
        await callback();
    }
}

/**
 * Navigation transition utilities
 */
export class NavigationTransition {
    private static currentTransition: string | null = null;

    /**
     * Navigate with a specific transition type
     */
    static async navigateWithTransition(
        path: string,
        type: TransitionType = 'fade-in'
    ): Promise<void> {
        this.currentTransition = type;

        await performViewTransition(() => {
            // Update URL or perform navigation logic
            window.history.pushState({}, '', path);

            // Trigger route change event
            window.dispatchEvent(new CustomEvent('routechange', {
                detail: { path, type }
            }));
        }, { type });

        this.currentTransition = null;
    }

    /**
     * Get current transition type
     */
    static getCurrentTransition(): string | null {
        return this.currentTransition;
    }
}

/**
 * Component transition utilities
 */
export class ComponentTransition {
    /**
     * Add transition classes to elements
     */
    static addTransitionClasses(
        element: HTMLElement,
        ...types: TransitionType[]
    ): void {
        types.forEach(type => {
            element.classList.add(`transition-${type.replace('-', '')}`);
        });
    }

    /**
     * Remove transition classes from elements
     */
    static removeTransitionClasses(
        element: HTMLElement,
        ...types: TransitionType[]
    ): void {
        types.forEach(type => {
            element.classList.remove(`transition-${type.replace('-', '')}`);
        });
    }

    /**
     * Toggle transition with animation
     */
    static async toggleWithTransition(
        element: HTMLElement,
        type: TransitionType = 'fade-in'
    ): Promise<void> {
        element.classList.add('transitioning');

        await performViewTransition(() => {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }, { type });

        element.classList.remove('transitioning');
    }
}

/**
 * Theme transition utilities for color scheme changes
 */
export class ThemeTransition {
    private static currentTheme: 'light' | 'dark' = 'light';

    /**
     * Toggle theme with view transition
     */
    static async toggleTheme(): Promise<void> {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';

        await performViewTransition(() => {
            document.documentElement.setAttribute('data-theme', newTheme);
            document.documentElement.style.colorScheme = newTheme;

            // Update CSS custom properties for theme
            if (newTheme === 'dark') {
                document.documentElement.style.setProperty('--transition-bg', '#0f172a');
                document.documentElement.style.setProperty('--transition-text', '#f1f5f9');
            } else {
                document.documentElement.style.setProperty('--transition-bg', '#ffffff');
                document.documentElement.style.setProperty('--transition-text', '#1e293b');
            }
        }, { type: 'fade-in', duration: 200 });

        this.currentTheme = newTheme;
    }

    /**
     * Get current theme
     */
    static getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }
}

/**
 * Performance monitoring for view transitions
 */
export class TransitionPerformance {
    private static metrics: Array<{
        type: TransitionType;
        duration: number;
        timestamp: number;
    }> = [];

    /**
     * Monitor transition performance
     */
    static async monitorTransition(
        callback: () => void | Promise<void>,
        options: ViewTransitionOptions = {}
    ): Promise<{ duration: number; type: TransitionType }> {
        const startTime = performance.now();
        const { type = 'fade-in' } = options;

        await performViewTransition(callback, options);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Store metrics
        this.metrics.push({
            type,
            duration,
            timestamp: Date.now()
        });

        // Keep only last 50 metrics
        if (this.metrics.length > 50) {
            this.metrics = this.metrics.slice(-50);
        }

        return { duration, type };
    }

    /**
     * Get performance metrics
     */
    static getMetrics(): typeof TransitionPerformance.metrics {
        return [...this.metrics];
    }

    /**
     * Get average duration by transition type
     */
    static getAverageDuration(type?: TransitionType): number {
        const filtered = type
            ? this.metrics.filter(m => m.type === type)
            : this.metrics;

        if (filtered.length === 0) return 0;

        const total = filtered.reduce((sum, m) => sum + m.duration, 0);
        return total / filtered.length;
    }
}
