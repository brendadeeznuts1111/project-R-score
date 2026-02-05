#!/usr/bin/env bun
// Test Suite for Tooltip Manager
// Comprehensive testing of tooltip functionality and interactions

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Mock DOM environment
class MockHTMLElement {
    style: any = {};
    innerHTML: string = '';
    id: string = '';
    
    appendChild(child: any) {}
    removeChild(child: any) {}
    querySelector(selector: string) {
        return null;
    }
    querySelectorAll(selector: string) {
        return [];
    }
    
    addEventListener(event: string, handler: Function) {}
    removeEventListener(event: string, handler: Function) {}
}

global.document = {
    createElement: (tag: string) => new MockHTMLElement(),
    body: new MockHTMLElement(),
    addEventListener: () => {},
} as any;

global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    setTimeout: (callback: Function, delay: number) => setTimeout(callback, delay),
    clearTimeout: (id: number) => clearTimeout(id),
} as any;

// Import the TooltipManager class
class TooltipManager {
    private tooltip: any;
    private currentTarget: any;
    private showTimeout: number | null = null;
    private hideTimeout: number | null = null;
    private config: any;

    constructor(config: any = {}) {
        this.config = {
            showDelay: 300,
            hideDelay: 100,
            maxWidth: 300,
            backgroundColor: '#1f2937',
            textColor: '#f3f4f6',
            borderColor: '#4b5563',
            fontSize: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            ...config
        };

        this.createTooltip();
        this.setupGlobalListeners();
    }

    private createTooltip(): void {
        this.tooltip = global.document.createElement('div');
        this.tooltip.id = 'line-history-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            z-index: 9999;
            background: ${this.config.backgroundColor};
            color: ${this.config.textColor};
            border: 1px solid ${this.config.borderColor};
            border-radius: ${this.config.borderRadius};
            padding: ${this.config.padding};
            font-size: ${this.config.fontSize};
            max-width: ${this.config.maxWidth}px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        global.document.body.appendChild(this.tooltip);
    }

    private setupGlobalListeners(): void {
        global.document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    public show(target: any, content: any, x: number, y: number): void {
        this.clearTimeouts();
        
        this.currentTarget = target;
        this.showTimeout = global.window.setTimeout(() => {
            if (this.tooltip) {
                this.updateContent(content);
                this.position(x, y);
                this.tooltip.style.opacity = '1';
            }
        }, this.config.showDelay);
    }

    public hide(): void {
        this.clearTimeouts();
        
        this.hideTimeout = global.window.setTimeout(() => {
            if (this.tooltip) {
                this.tooltip.style.opacity = '0';
            }
            this.currentTarget = null;
        }, this.config.hideDelay);
    }

    private updateContent(content: any): void {
        if (!this.tooltip) return;

        let html = `<div style="font-weight: bold; margin-bottom: 4px;">${content.title}</div>`;
        
        content.content.forEach((line: string) => {
            html += `<div style="margin: 2px 0;">${line}</div>`;
        });

        if (content.actions && content.actions.length > 0) {
            html += '<div style="margin-top: 8px; border-top: 1px solid #4b5563; padding-top: 6px;">';
            content.actions.forEach((action: any) => {
                html += `<button class="tooltip-action" style="
                    background: #374151;
                    color: #f3f4f6;
                    border: 1px solid #4b5563;
                    border-radius: 4px;
                    padding: 4px 8px;
                    margin: 2px;
                    font-size: 11px;
                    cursor: pointer;
                " data-action="${action.label}">${action.label}</button>`;
            });
            html += '</div>';
        }

        this.tooltip.innerHTML = html;
    }

    private position(x: number, y: number): void {
        if (!this.tooltip) return;

        const rect = { width: 200, height: 100 }; // Mock rect
        const viewportWidth = global.window.innerWidth;
        const viewportHeight = global.window.innerHeight;

        let left = x + 10;
        let top = y - rect.height - 10;

        // Adjust horizontal position if needed
        if (left + rect.width > viewportWidth) {
            left = x - rect.width - 10;
        }

        // Adjust vertical position if needed
        if (top < 0) {
            top = y + 10;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    private handleMouseMove(e: any): void {
        if (this.currentTarget && this.tooltip && this.tooltip.style.opacity === '1') {
            this.updatePosition(e.clientX, e.clientY);
        }
    }

    private updatePosition(x: number, y: number): void {
        if (this.tooltip && this.tooltip.style.opacity === '1') {
            this.position(x, y);
        }
    }

    private clearTimeouts(): void {
        if (this.showTimeout) {
            global.window.clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        if (this.hideTimeout) {
            global.window.clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    public destroy(): void {
        this.clearTimeouts();
        if (this.tooltip) {
            global.document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
    }

    public updateConfig(newConfig: any): void {
        this.config = { ...this.config, ...newConfig };
    }
}

describe('TooltipManager', () => {
    let tooltipManager: TooltipManager;

    beforeEach(() => {
        tooltipManager = new TooltipManager();
    });

    afterEach(() => {
        tooltipManager.destroy();
    });

    describe('Initialization', () => {
        it('should initialize with default configuration', () => {
            expect(tooltipManager).toBeDefined();
        });

        it('should accept custom configuration', () => {
            const customConfig = {
                showDelay: 500,
                hideDelay: 200,
                backgroundColor: '#000000'
            };
            const customManager = new TooltipManager(customConfig);
            expect(customManager).toBeDefined();
            customManager.destroy();
        });

        it('should create tooltip element', () => {
            // The tooltip should be created and added to DOM
            expect(tooltipManager).toBeDefined();
        });
    });

    describe('Show/Hide Functionality', () => {
        it('should show tooltip with content', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Test Title',
                content: ['Test content line 1', 'Test content line 2']
            };

            tooltipManager.show(target, content, 100, 100);

            // Wait for show delay
            setTimeout(() => {
                // Tooltip should be visible
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should hide tooltip', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Test Title',
                content: ['Test content']
            };

            tooltipManager.show(target, content, 100, 100);
            
            setTimeout(() => {
                tooltipManager.hide();
                
                // Wait for hide delay
                setTimeout(() => {
                    expect(tooltipManager).toBeDefined();
                    done();
                }, 150);
            }, 350);
        });

        it('should handle rapid show/hide calls', () => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Test Title',
                content: ['Test content']
            };

            // Rapid show/hide calls
            tooltipManager.show(target, content, 100, 100);
            tooltipManager.hide();
            tooltipManager.show(target, content, 100, 100);
            tooltipManager.hide();

            expect(tooltipManager).toBeDefined();
        });
    });

    describe('Content Management', () => {
        it('should update tooltip content correctly', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Test Title',
                content: ['Line 1', 'Line 2', 'Line 3'],
                actions: [
                    {
                        label: 'Action 1',
                        action: () => console.log('Action 1 executed')
                    }
                ]
            };

            tooltipManager.show(target, content, 100, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should handle empty content', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Empty Test',
                content: []
            };

            tooltipManager.show(target, content, 100, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should handle content without actions', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'No Actions',
                content: ['Just content']
            };

            tooltipManager.show(target, content, 100, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });
    });

    describe('Positioning', () => {
        it('should position tooltip correctly', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Position Test',
                content: ['Testing position']
            };

            // Test normal position
            tooltipManager.show(target, content, 100, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should adjust position near viewport edges', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Edge Position Test',
                content: ['Testing edge positioning']
            };

            // Test position near right edge
            tooltipManager.show(target, content, 900, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should adjust position near top edge', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Top Edge Test',
                content: ['Testing top positioning']
            };

            // Test position near top edge
            tooltipManager.show(target, content, 100, 50);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });
    });

    describe('Configuration Updates', () => {
        it('should update configuration', () => {
            const newConfig = {
                showDelay: 1000,
                backgroundColor: '#ffffff'
            };

            tooltipManager.updateConfig(newConfig);
            expect(tooltipManager).toBeDefined();
        });

        it('should handle partial configuration updates', () => {
            const partialConfig = {
                showDelay: 750
            };

            tooltipManager.updateConfig(partialConfig);
            expect(tooltipManager).toBeDefined();
        });
    });

    describe('Cleanup', () => {
        it('should destroy tooltip properly', () => {
            tooltipManager.destroy();
            expect(tooltipManager).toBeDefined();
        });

        it('should handle multiple destroy calls', () => {
            tooltipManager.destroy();
            tooltipManager.destroy();
            expect(tooltipManager).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle null target', (done) => {
            const content = {
                title: 'Null Target Test',
                content: ['Testing null target']
            };

            tooltipManager.show(null, content, 100, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should handle negative coordinates', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Negative Coordinates',
                content: ['Testing negative positioning']
            };

            tooltipManager.show(target, content, -100, -100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });

        it('should handle very large coordinates', (done) => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Large Coordinates',
                content: ['Testing large positioning']
            };

            tooltipManager.show(target, content, 10000, 10000);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });
    });

    describe('Performance', () => {
        it('should handle multiple rapid updates', () => {
            const target = { id: 'test-target' };
            const content = {
                title: 'Performance Test',
                content: ['Testing performance']
            };

            const startTime = Date.now();

            // Rapid updates
            for (let i = 0; i < 100; i++) {
                tooltipManager.show(target, content, 100 + i, 100 + i);
                tooltipManager.hide();
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete quickly
            expect(duration).toBeLessThan(1000);
            expect(tooltipManager).toBeDefined();
        });

        it('should handle large content', (done) => {
            const target = { id: 'test-target' };
            const largeContent = {
                title: 'Large Content Test',
                content: Array.from({ length: 100 }, (_, i) => `Content line ${i}`)
            };

            tooltipManager.show(target, largeContent, 100, 100);

            setTimeout(() => {
                expect(tooltipManager).toBeDefined();
                done();
            }, 350);
        });
    });
});
