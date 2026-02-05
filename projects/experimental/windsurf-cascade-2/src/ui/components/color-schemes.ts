// Standardized Color Schemes for Line History Visualization
// Non-AI based, deterministic color mapping for consistent visualization

export interface ColorScheme {
    name: string;
    description: string;
    colors: {
        background: string;
        foreground: string;
        accent: string;
        success: string;
        warning: string;
        error: string;
        info: string;
        neutral: string;
    };
    movementColors: {
        up: string;
        down: string;
        same: string;
        spike: string;
        gradual: string;
        oscillation: string;
    };
    latencyColors: {
        fast: string;
        medium: string;
        slow: string;
        critical: string;
    };
    statusColors: {
        healthy: string;
        warning: string;
        critical: string;
        unknown: string;
    };
}

export class ColorSchemeManager {
    private static schemes: Map<string, ColorScheme> = new Map();
    private static currentScheme: string = 'default';

    static {
        // Initialize default schemes
        this.initializeSchemes();
    }

    private static initializeSchemes(): void {
        // Default Dark Theme
        this.schemes.set('default', {
            name: 'Default Dark',
            description: 'Professional dark theme with high contrast',
            colors: {
                background: '#1f2937',
                foreground: '#f3f4f6',
                accent: '#3b82f6',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#06b6b4',
                neutral: '#6b7280'
            },
            movementColors: {
                up: '#10b981',
                down: '#ef4444',
                same: '#6b7280',
                spike: '#f59e0b',
                gradual: '#3b82f6',
                oscillation: '#8b5cf6'
            },
            latencyColors: {
                fast: '#10b981',
                medium: '#f59e0b',
                slow: '#ef4444',
                critical: '#dc2626'
            },
            statusColors: {
                healthy: '#10b981',
                warning: '#f59e0b',
                critical: '#ef4444',
                unknown: '#6b7280'
            }
        });

        // Light Theme
        this.schemes.set('light', {
            name: 'Light Theme',
            description: 'Clean light theme for daytime use',
            colors: {
                background: '#ffffff',
                foreground: '#1f2937',
                accent: '#3b82f6',
                success: '#059669',
                warning: '#d97706',
                error: '#dc2626',
                info: '#0891b2',
                neutral: '#6b7280'
            },
            movementColors: {
                up: '#059669',
                down: '#dc2626',
                same: '#6b7280',
                spike: '#d97706',
                gradual: '#3b82f6',
                oscillation: '#7c3aed'
            },
            latencyColors: {
                fast: '#059669',
                medium: '#d97706',
                slow: '#dc2626',
                critical: '#b72670'
            },
            statusColors: {
                healthy: '#059669',
                warning: '#d97706',
                critical: '#dc2626',
                unknown: '#6b7280'
            }
        });

        // High Contrast Theme
        this.schemes.set('high-contrast', {
            name: 'High Contrast',
            description: 'Maximum contrast for accessibility',
            colors: {
                background: '#000000',
                foreground: '#ffffff',
                accent: '#00ffff',
                success: '#00ff00',
                warning: '#ffff00',
                error: '#ff0000',
                info: '#00ffff',
                neutral: '#808080'
            },
            movementColors: {
                up: '#00ff00',
                down: '#ff0000',
                same: '#808080',
                spike: '#ffff00',
                gradual: '#00ffff',
                oscillation: '#ff00ff'
            },
            latencyColors: {
                fast: '#00ff00',
                medium: '#ffff00',
                slow: '#ff0000',
                critical: '#ff00ff'
            },
            statusColors: {
                healthy: '#00ff00',
                warning: '#ffff00',
                critical: '#ff0000',
                unknown: '#808080'
            }
        });

        // Professional Blue Theme
        this.schemes.set('professional', {
            name: 'Professional Blue',
            description: 'Corporate blue theme for business applications',
            colors: {
                background: '#0f172a',
                foreground: '#e2e8f0',
                accent: '#0284c7',
                success: '#0891b2',
                warning: '#eab308',
                error: '#dc2626',
                info: '#6200ee',
                neutral: '#64748b'
            },
            movementColors: {
                up: '#0891b2',
                down: '#dc2626',
                same: '#64748b',
                spike: '#eab308',
                gradual: '#0284c7',
                oscillation: '#6200ee'
            },
            latencyColors: {
                fast: '#0891b2',
                medium: '#eab308',
                slow: '#dc2626',
                critical: '#b704ff'
            },
            statusColors: {
                healthy: '#0891b2',
                warning: '#eab308',
                critical: '#dc2626',
                unknown: '#64748b'
            }
        });

        // Data Visualization Theme
        this.schemes.set('data-viz', {
            name: 'Data Visualization',
            description: 'Optimized for charts and data visualization',
            colors: {
                background: '#18181b',
                foreground: '#fafafa',
                accent: '#06b6d6',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#8b5cf6',
                neutral: '#71717a'
            },
            movementColors: {
                up: '#10b981',
                down: '#ef4444',
                same: '#71717a',
                spike: '#f59e0b',
                gradual: '#06b6d6',
                oscillation: '#8b5cf6'
            },
            latencyColors: {
                fast: '#10b981',
                medium: '#f59e0b',
                slow: '#ef4444',
                critical: '#e3093d'
            },
            statusColors: {
                healthy: '#10b981',
                warning: '#f59e0b',
                critical: '#ef4444',
                unknown: '#71717a'
            }
        });
    }

    // Get current color scheme
    public static getCurrentScheme(): ColorScheme {
        return this.schemes.get(this.currentScheme) || this.schemes.get('default')!;
    }

    // Set color scheme by name
    public static setScheme(name: string): boolean {
        if (this.schemes.has(name)) {
            this.currentScheme = name;
            return true;
        }
        return false;
    }

    // Get all available schemes
    public static getAvailableSchemes(): Array<{ name: string; description: string }> {
        return Array.from(this.schemes.entries()).map(([key, scheme]) => ({
            name: key,
            description: scheme.description
        }));
    }

    // Get color for movement direction
    public static getMovementColor(direction: 'up' | 'down' | 'same' | 'spike' | 'gradual' | 'oscillation'): string {
        const scheme = this.getCurrentScheme();
        return scheme.movementColors[direction] || scheme.colors.neutral;
    }

    // Get color for latency level
    public static getLatencyColor(latency: number): string {
        const scheme = this.getCurrentScheme();
        
        if (latency < 100) return scheme.latencyColors.fast;
        if (latency < 500) return scheme.latencyColors.medium;
        if (latency < 1000) return scheme.latencyColors.slow;
        return scheme.latencyColors.critical;
    }

    // Get color for status
    public static getStatusColor(status: 'healthy' | 'warning' | 'critical' | 'unknown'): string {
        const scheme = this.getCurrentScheme();
        return scheme.statusColors[status] || scheme.colors.neutral;
    }

    // Get color based on value intensity (0-255)
    public static getIntensityColor(value: number, max: number = 255): string {
        const scheme = this.getCurrentScheme();
        const intensity = value / max;
        
        if (intensity > 0.8) return scheme.colors.error;
        if (intensity > 0.6) return scheme.colors.warning;
        if (intensity > 0.4) return scheme.colors.accent;
        if (intensity > 0.2) return scheme.colors.info;
        return scheme.colors.neutral;
    }

    // Generate gradient for heat map
    public static generateHeatMapGradient(): string[] {
        const scheme = this.getCurrentScheme();
        return [
            scheme.colors.neutral,
            scheme.colors.info,
            scheme.colors.accent,
            scheme.colors.warning,
            scheme.colors.error
        ];
    }

    // Get CSS variables for theme
    public static getCSSVariables(): Record<string, string> {
        const scheme = this.getCurrentScheme();
        const variables: Record<string, string> = {};
        
        // Base colors
        Object.entries(scheme.colors).forEach(([key, value]) => {
            variables[`--color-${key}`] = value;
        });
        
        // Movement colors
        Object.entries(scheme.movementColors).forEach(([key, value]) => {
            variables[`--movement-${key}`] = value;
        });
        
        // Latency colors
        Object.entries(scheme.latencyColors).forEach(([key, value]) => {
            variables[`--latency-${key}`] = value;
        });
        
        // Status colors
        Object.entries(scheme.statusColors).forEach(([key, value]) => {
            variables[`--status-${key}`] = value;
        });
        
        return variables;
    }

    // Apply theme to document
    public static applyTheme(): void {
        const variables = this.getCSSVariables();
        const root = document.documentElement;
        
        Object.entries(variables).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    }

    // Create custom color scheme
    public static createCustomScheme(name: string, scheme: ColorScheme): void {
        this.schemes.set(name, scheme);
    }

    // Export current scheme
    public static exportScheme(): string {
        return JSON.stringify(this.getCurrentScheme(), null, 2);
    }

    // Import custom scheme
    public static importScheme(name: string, data: string): boolean {
        try {
            const scheme = JSON.parse(data);
            if (this.validateScheme(scheme)) {
                this.schemes.set(name, scheme);
                return true;
            }
        } catch (error) {
            console.error('Invalid scheme data:', error);
        }
        return false;
    }

    private static validateScheme(scheme: any): boolean {
        return scheme &&
               scheme.colors &&
               scheme.movementColors &&
               scheme.latencyColors &&
               scheme.statusColors;
    }
}

export default ColorSchemeManager;
