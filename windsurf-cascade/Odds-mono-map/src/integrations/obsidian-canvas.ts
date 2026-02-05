// =============================================================================
// OBSIDIAN CANVAS INTEGRATION - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 2.0.0
// LAST_UPDATED: 2025-11-18T19:50:00Z
// DESCRIPTION: Obsidian Canvas API Integration with HEX color support
// =============================================================================

import {
    CanvasNode,
    CanvasColor,
    CanvasFile,
    toHexColor,
    isHexColor,
    isLegacyColor,
    LEGACY_COLOR_MAP
} from '../types/canvas-types.js';

/**
 * Obsidian Canvas API Integration Layer
 * Handles both legacy enum colors and modern HEX colors
 */
export class ObsidianCanvasIntegration {

    /**
     * Render node with color support in Obsidian
     */
    renderNode(node: CanvasNode): HTMLElement {
        const element = document.createElement('div');
        element.className = 'canvas-node';
        element.setAttribute('data-node-id', node.id);

        // Apply color
        if (node.color) {
            const backgroundColor = toHexColor(node.color);
            const textColor = this.getContrastColor(backgroundColor);

            element.style.backgroundColor = backgroundColor;
            element.style.color = textColor;
            element.style.border = `2px solid ${this.darkenColor(backgroundColor, 20)}`;
            element.style.boxShadow = `0 4px 6px ${this.addAlpha(backgroundColor, 0.1)}`;

            // Add color type indicator
            const colorType = isLegacyColor(node.color) ? 'legacy' : 'hex';
            element.setAttribute('data-color-type', colorType);

            // Add semantic color info
            if (node.metadata?.status) {
                element.setAttribute('data-status', node.metadata.status as string);
            }
        }

        // Set dimensions
        element.style.width = `${node.width}px`;
        element.style.height = `${node.height}px`;
        element.style.position = 'absolute';
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;

        // Add health score indicator
        if (node.healthScore !== undefined) {
            const healthIndicator = this.createHealthIndicator(node.healthScore);
            element.appendChild(healthIndicator);
        }

        // Render content
        const content = this.renderMarkdown(node.text || '');
        element.innerHTML += content;

        // Add interaction handlers
        this.addInteractionHandlers(element, node);

        return element;
    }

    /**
     * Creates health score indicator
     */
    private createHealthIndicator(score: number): HTMLElement {
        const indicator = document.createElement('div');
        indicator.className = 'health-indicator';
        indicator.style.position = 'absolute';
        indicator.style.top = '8px';
        indicator.style.right = '8px';
        indicator.style.width = '12px';
        indicator.style.height = '12px';
        indicator.style.borderRadius = '50%';
        indicator.style.border = '2px solid rgba(255,255,255,0.3)';

        // Color based on score
        if (score >= 90) {
            indicator.style.backgroundColor = '#10B981'; // Green
        } else if (score >= 70) {
            indicator.style.backgroundColor = '#F59E0B'; // Yellow
        } else {
            indicator.style.backgroundColor = '#EF4444'; // Red
        }

        // Add tooltip
        indicator.title = `Health Score: ${score}%`;

        return indicator;
    }

    /**
     * Gets contrasting text color for readability
     */
    private getContrastColor(hexBg: string): string {
        const rgb = this.hexToRgb(hexBg);
        if (!rgb) return '#000000';

        // Calculate relative luminance
        const luminance = this.getLuminance(hexBg);

        // Return black or white based on contrast
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    /**
     * Darkens color for border effect
     */
    private darkenColor(hex: string, percent: number): string {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const factor = 1 - (percent / 100);
        const r = Math.round(rgb.r * factor);
        const g = Math.round(rgb.g * factor);
        const b = Math.round(rgb.b * factor);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Adds alpha transparency to color
     */
    private addAlpha(hex: string, alpha: number): string {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Renders markdown with color-aware syntax highlighting
     */
    private renderMarkdown(text: string): string {
        if (!text) return '';

        return text
            // Headers with color
            .replace(/^# (.+)$/gm, '<h1 class="canvas-h1">$1</h1>')
            .replace(/^## (.+)$/gm, '<h2 class="canvas-h2">$1</h2>')
            .replace(/^### (.+)$/gm, '<h3 class="canvas-h3">$1</h3>')

            // Bold and italic
            .replace(/\*\*(.+?)\*\*/g, '<strong class="canvas-bold">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em class="canvas-italic">$1</em>')

            // Links
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="canvas-link">$1</a>')

            // Lists
            .replace(/^- (.+)$/gm, '<li class="canvas-list-item">$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li class="canvas-numbered-item">$1</li>')

            // Code blocks
            .replace(/```(.+?)```/gs, '<pre class="canvas-code-block"><code>$1</code></pre>')
            .replace(/`(.+?)`/g, '<code class="canvas-inline-code">$1</code>')

            // Line breaks
            .replace(/\n\n/g, '</p><p class="canvas-paragraph">')
            .replace(/\n/g, '<br>');
    }

    /**
     * Adds interaction handlers to canvas nodes
     */
    private addInteractionHandlers(element: HTMLElement, node: CanvasNode): void {
        // Click handler
        element.addEventListener('click', (e) => {
            this.handleNodeClick(e, node);
        });

        // Hover handler
        element.addEventListener('mouseenter', (e) => {
            this.handleNodeHover(e, node);
        });

        element.addEventListener('mouseleave', (e) => {
            this.handleNodeLeave(e, node);
        });

        // Context menu
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleContextMenu(e, node);
        });
    }

    /**
     * Handles node click events
     */
    private handleNodeClick(event: MouseEvent, node: CanvasNode): void {
        console.log(`Node clicked: ${node.id}`);

        // Emit custom event for Obsidian integration
        const customEvent = new CustomEvent('canvas-node-click', {
            detail: { node, event }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Handles node hover events
     */
    private handleNodeHover(event: MouseEvent, node: CanvasNode): void {
        const element = event.target as HTMLElement;
        element.style.transform = 'scale(1.02)';
        element.style.transition = 'transform 0.2s ease';
        element.style.zIndex = '1000';

        // Show tooltip with node info
        this.showNodeTooltip(node, event);
    }

    /**
     * Handles node leave events
     */
    private handleNodeLeave(event: MouseEvent, node: CanvasNode): void {
        const element = event.target as HTMLElement;
        element.style.transform = 'scale(1)';
        element.style.zIndex = '';

        this.hideNodeTooltip();
    }

    /**
     * Shows node tooltip
     */
    private showNodeTooltip(node: CanvasNode, event: MouseEvent): void {
        // Remove existing tooltip
        this.hideNodeTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'canvas-node-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.background = 'rgba(0,0,0,0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '10000';
        tooltip.style.pointerEvents = 'none';

        // Build tooltip content
        let content = `<strong>${node.id}</strong>`;
        if (node.color) {
            const colorType = isLegacyColor(node.color) ? 'Legacy' : 'HEX';
            content += `<br>Color: ${node.color} (${colorType})`;
        }
        if (node.healthScore !== undefined) {
            content += `<br>Health: ${node.healthScore}%`;
        }
        if (node.metadata?.status) {
            content += `<br>Status: ${node.metadata.status}`;
        }

        tooltip.innerHTML = content;

        // Position tooltip
        document.body.appendChild(tooltip);
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
    }

    /**
     * Hides node tooltip
     */
    private hideNodeTooltip(): void {
        const existing = document.querySelector('.canvas-node-tooltip');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Handles context menu
     */
    private handleContextMenu(event: MouseEvent, node: CanvasNode): void {
        const menu = document.createElement('div');
        menu.className = 'canvas-context-menu';
        menu.style.position = 'absolute';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '6px';
        menu.style.padding = '4px 0';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        menu.style.zIndex = '10000';

        // Add menu items
        const items = [
            { label: 'Edit Node', action: 'edit' },
            { label: 'Change Color', action: 'color' },
            { label: 'View Details', action: 'details' },
            { label: 'Duplicate', action: 'duplicate' },
            { label: 'Delete', action: 'delete' }
        ];

        items.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.style.padding = '8px 16px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.fontSize = '13px';

            menuItem.textContent = item.label;
            menuItem.addEventListener('click', () => {
                this.handleContextAction(item.action, node);
                menu.remove();
            });

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#f0f0f0';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'white';
            });

            menu.appendChild(menuItem);
        });

        // Position menu
        document.body.appendChild(menu);
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        // Close menu when clicking outside
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    /**
     * Handles context menu actions
     */
    private handleContextAction(action: string, node: CanvasNode): void {
        console.log(`Context action: ${action} on node: ${node.id}`);

        // Emit custom event
        const customEvent = new CustomEvent('canvas-node-action', {
            detail: { node, action }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Renders entire canvas
     */
    renderCanvas(canvas: CanvasFile): HTMLElement {
        const container = document.createElement('div');
        container.className = 'obsidian-canvas-container';
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'auto';
        container.style.background = '#f8f9fa';

        // Render all nodes
        canvas.nodes.forEach(node => {
            const nodeElement = this.renderNode(node);
            container.appendChild(nodeElement);
        });

        // Render edges (relationships)
        canvas.edges.forEach(edge => {
            const edgeElement = this.renderEdge(edge);
            container.appendChild(edgeElement);
        });

        return container;
    }

    /**
     * Renders canvas edge (relationship)
     */
    private renderEdge(edge: any): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', edge.color ? toHexColor(edge.color) : '#ccc');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', edge.label ? '5,5' : 'none');

        // This would need actual node positions to calculate line coordinates
        // For now, using placeholder values
        line.setAttribute('x1', '0');
        line.setAttribute('y1', '0');
        line.setAttribute('x2', '100');
        line.setAttribute('y2', '100');

        svg.appendChild(line);

        if (edge.label) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('fill', '#666');
            text.setAttribute('font-size', '12');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = edge.label;
            svg.appendChild(text);
        }

        return svg;
    }

    /**
     * Converts HEX to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            }
            : null;
    }

    /**
     * Converts HEX to luminance
     */
    private getLuminance(hex: string): number {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;

        const rSRGB = rgb.r / 255;
        const gSRGB = rgb.g / 255;
        const bSRGB = rgb.b / 255;

        const r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow((rSRGB + 0.055) / 1.055, 2.4);
        const g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow((gSRGB + 0.055) / 1.055, 2.4);
        const b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow((bSRGB + 0.055) / 1.055, 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Applies color theme to canvas
     */
    applyColorTheme(container: HTMLElement, theme: 'light' | 'dark' | 'auto'): void {
        const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            container.style.background = '#1a1a1a';
            container.style.color = '#e0e0e0';
        } else {
            container.style.background = '#f8f9fa';
            container.style.color = '#333';
        }

        // Update all node text colors for better contrast
        const nodes = container.querySelectorAll('.canvas-node');
        nodes.forEach(node => {
            const element = node as HTMLElement;
            const bgColor = element.style.backgroundColor;
            if (bgColor) {
                const textColor = this.getContrastColor(bgColor);
                element.style.color = textColor;
            }
        });
    }

    /**
     * Exports canvas with colors
     */
    exportCanvas(canvas: CanvasFile, format: 'json' | 'svg' | 'png'): string {
        switch (format) {
            case 'json':
                return JSON.stringify(canvas, null, 2);

            case 'svg':
                return this.exportToSvg(canvas);

            case 'png':
                return this.exportToPng(canvas);

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Exports canvas to SVG
     */
    private exportToSvg(canvas: CanvasFile): string {
        // Simplified SVG export - would need full implementation
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <!-- Canvas nodes would be rendered here -->
    <rect x="100" y="100" width="200" height="150" fill="#3B82F6" rx="8"/>
    <text x="200" y="175" text-anchor="middle" fill="white">Sample Node</text>
</svg>`;

        return svg;
    }

    /**
     * Exports canvas to PNG (base64)
     */
    private exportToPng(canvas: CanvasFile): string {
        // Would need canvas rendering implementation
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
}
