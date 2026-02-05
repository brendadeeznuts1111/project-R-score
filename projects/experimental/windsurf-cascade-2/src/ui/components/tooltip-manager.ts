// Tooltip Manager for Line History Visualization
// Provides interactive tooltips for movement ticks and patterns

export interface TooltipConfig {
  showDelay: number;
  hideDelay: number;
  maxWidth: number;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: string;
  padding: string;
  borderRadius: string;
}

export interface TooltipContent {
  title: string;
  content: string[];
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

class TooltipManager {
  private tooltip: HTMLElement | null = null;
  private currentTarget: HTMLElement | null = null;
  private showTimeout: number | null = null;
  private hideTimeout: number | null = null;
  private config: TooltipConfig;

  constructor(config: Partial<TooltipConfig> = {}) {
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
    this.tooltip = document.createElement('div');
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
    document.body.appendChild(this.tooltip);
  }

  private setupGlobalListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
  }

  public show(target: HTMLElement, content: TooltipContent, x: number, y: number): void {
    this.clearTimeouts();
    
    this.currentTarget = target;
    this.showTimeout = window.setTimeout(() => {
      if (this.tooltip) {
        this.updateContent(content);
        this.position(x, y);
        this.tooltip.style.opacity = '1';
      }
    }, this.config.showDelay);
  }

  public hide(): void {
    this.clearTimeouts();
    
    this.hideTimeout = window.setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.style.opacity = '0';
      }
      this.currentTarget = null;
    }, this.config.hideDelay);
  }

  public updatePosition(x: number, y: number): void {
    if (this.tooltip && this.tooltip.style.opacity === '1') {
      this.position(x, y);
    }
  }

  private updateContent(content: TooltipContent): void {
    if (!this.tooltip) return;

    let html = `<div style="font-weight: bold; margin-bottom: 4px;">${content.title}</div>`;
    
    content.content.forEach(line => {
      html += `<div style="margin: 2px 0;">${line}</div>`;
    });

    if (content.actions && content.actions.length > 0) {
      html += '<div style="margin-top: 8px; border-top: 1px solid #4b5563; padding-top: 6px;">';
      content.actions.forEach(action => {
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

    // Add action listeners
    this.tooltip.querySelectorAll('.tooltip-action').forEach(button => {
      button.addEventListener('click', (e) => {
        const actionLabel = (e.target as HTMLElement).getAttribute('data-action');
        const action = content.actions?.find(a => a.label === actionLabel);
        if (action) {
          action.action();
        }
      });
    });
  }

  private position(x: number, y: number): void {
    if (!this.tooltip) return;

    const rect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

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

  private handleMouseMove(e: MouseEvent): void {
    if (this.currentTarget && this.tooltip && this.tooltip.style.opacity === '1') {
      this.updatePosition(e.clientX, e.clientY);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updatePosition(touch.clientX, touch.clientY);
    }
  }

  private clearTimeouts(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  public destroy(): void {
    this.clearTimeouts();
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }
  }

  public updateConfig(newConfig: Partial<TooltipConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.tooltip) {
      // Update styles
      this.tooltip.style.background = this.config.backgroundColor;
      this.tooltip.style.color = this.config.textColor;
      this.tooltip.style.borderColor = this.config.borderColor;
      this.tooltip.style.fontSize = this.config.fontSize;
      this.tooltip.style.padding = this.config.padding;
      this.tooltip.style.borderRadius = this.config.borderRadius;
      this.tooltip.style.maxWidth = `${this.config.maxWidth}px`;
    }
  }
}

export default TooltipManager;
