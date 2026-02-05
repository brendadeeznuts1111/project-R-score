#!/usr/bin/env bun
/**
 * HMR Test Component - Demonstrates state preservation across hot reloads
 * Edit this file while the dev server is running to see HMR in action!
 */

import { logger } from '../scripts/enhanced-logging-system';

// !==!==!===== COMPONENT STATE !==!==!=====
interface ComponentState {
  counter: number;
  lastUpdate: number;
  messages: string[];
  theme: 'dark' | 'light';
  version: string;
}

// **HMR STATE PERSISTENCE** - This state survives hot reloads!
const componentState: ComponentState = import.meta.hot?.data?.state ?? {
  counter: 0,
  lastUpdate: Date.now(),
  messages: ['Component initialized'],
  theme: 'dark',
  version: '1.0.0',
};

// !==!==!===== HMR EVENT HANDLERS !==!==!=====
if (import.meta.hot) {
  logger.info('HMR_TEST', '1.0.0', '🔥 HMR Test Component loaded');

  // Save state before updates
  import.meta.hot.on('bun:beforeUpdate', () => {
    componentState.lastUpdate = Date.now();
    componentState.messages.push(`Update #${componentState.counter + 1} preparing...`);

    // Persist state
    import.meta.hot.data.state = componentState;

    logger.info('HMR_TEST', '1.0.0', `State saved: counter=${componentState.counter}`);
  });

  // Restore and apply after updates
  import.meta.hot.on('bun:afterUpdate', () => {
    componentState.counter++;
    componentState.messages.push(`🎉 Hot reload #${componentState.counter} applied!`);

    logger.success('HMR_TEST', '1.0.0', `Hot reload #${componentState.counter} complete!`);

    // Notify UI if in browser
    if (typeof window !== 'undefined') {
      updateComponentUI();
      showUpdateNotification();
    }
  });

  // Handle HMR errors
  import.meta.hot.on('bun:error', error => {
    componentState.messages.push(`❌ HMR Error: ${error.message}`);
    logger.error('HMR_TEST', '1.0.0', `HMR error: ${error.message}`, 'E1001');
  });

  // Connection status
  import.meta.hot.on('bun:ws:connect', () => {
    componentState.messages.push('🟢 HMR connected');
    logger.success('HMR_TEST', '1.0.0', 'HMR WebSocket connected');
  });

  import.meta.hot.on('bun:ws:disconnect', () => {
    componentState.messages.push('🔴 HMR disconnected');
    logger.warning('HMR_TEST', '1.0.0', 'HMR WebSocket disconnected');
  });

  // Clean up on dispose
  import.meta.hot.dispose(() => {
    logger.info('HMR_TEST', '1.0.0', 'Cleaning up test component');

    // Cleanup any intervals or resources
    if (typeof window !== 'undefined') {
      const intervals = import.meta.hot.data.intervals || [];
      intervals.forEach((id: number) => clearInterval(id));
    }
  });

  // Accept hot updates
  import.meta.hot.accept();
}

// !==!==!===== COMPONENT CLASS !==!==!=====
export class HMRTestComponent {
  private updateInterval: number | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    logger.info('HMR_TEST', componentState.version, 'Initializing test component');

    if (typeof window !== 'undefined') {
      this.createUI();
      this.startUpdates();
    }

    // Log current state
    this.logCurrentState();
  }

  private createUI(): void {
    const container = document.getElementById('hmr-test-container');
    if (!container) {
      // Create container if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = 'hmr-test-container';
      newContainer.innerHTML = this.getComponentHTML();
      document.body.appendChild(newContainer);
    } else {
      // Update existing container
      container.innerHTML = this.getComponentHTML();
    }

    // Add event listeners
    this.attachEventListeners();

    // Update UI with current state
    this.updateComponentUI();
  }

  private getComponentHTML(): string {
    return `
      <div class="hmr-test-component">
        <h3>🔥 HMR Test Component</h3>
        <div class="hmr-stats">
          <div>Hot Reloads: <span id="hmr-counter">${componentState.counter}</span></div>
          <div>Last Update: <span id="hmr-timestamp">${new Date(componentState.lastUpdate).toLocaleTimeString()}</span></div>
          <div>Version: <span id="hmr-version">${componentState.version}</span></div>
          <div>Theme: <span id="hmr-theme">${componentState.theme}</span></div>
        </div>
        
        <div class="hmr-controls">
          <button onclick="window.testComponent?.incrementCounter()">Increment</button>
          <button onclick="window.testComponent?.toggleTheme()">Toggle Theme</button>
          <button onclick="window.testComponent?.clearMessages()">Clear Messages</button>
        </div>
        
        <div class="hmr-messages">
          <h4>HMR Event Log:</h4>
          <div id="hmr-message-list">
            ${componentState.messages.map(msg => `<div class="hmr-message">${msg}</div>`).join('')}
          </div>
        </div>
      </div>
      
      <style>
        .hmr-test-component {
          background: rgba(139, 92, 246, 0.1);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          font-family: monospace;
        }
        
        .hmr-test-component.light {
          background: rgba(255, 255, 255, 0.9);
          color: #1a1a1a;
          border-color: rgba(139, 92, 246, 0.5);
        }
        
        .hmr-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin: 15px 0;
        }
        
        .hmr-stats div {
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }
        
        .hmr-controls {
          margin: 15px 0;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .hmr-controls button {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          transition: transform 0.2s ease;
        }
        
        .hmr-controls button:hover {
          transform: translateY(-2px);
        }
        
        .hmr-messages {
          margin-top: 15px;
        }
        
        .hmr-message {
          padding: 5px 10px;
          margin: 3px 0;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border-left: 3px solid #8b5cf6;
          font-size: 11px;
        }
        
        .hmr-update-notification {
          position: fixed;
          top: 120px;
          right: 20px;
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 12px;
          z-index: 1001;
          animation: bounceIn 0.5s ease;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }
        
        @keyframes bounceIn {
          0% { transform: scale(0.3) translateY(-20px); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      </style>
    `;
  }

  private attachEventListeners(): void {
    // Make component methods available globally
    (window as any).testComponent = this;
  }

  private startUpdates(): void {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Start periodic updates
    this.updateInterval = setInterval(() => {
      componentState.lastUpdate = Date.now();
      this.updateComponentUI();

      // Randomly add messages
      if (Math.random() < 0.3) {
        const messages = [
          '📊 Component state updated',
          '🔄 Periodic refresh completed',
          '💫 Auto-update cycle',
          '⚡ Live data refresh',
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.addMessage(randomMessage);
      }
    }, 3000);

    // Store interval for HMR cleanup
    if (import.meta.hot) {
      import.meta.hot.data.intervals = import.meta.hot.data.intervals || [];
      import.meta.hot.data.intervals.push(this.updateInterval);
    }
  }

  // !==!==!===== PUBLIC METHODS !==!==!=====
  public incrementCounter(): void {
    componentState.counter++;
    this.addMessage(`🔢 Counter incremented to ${componentState.counter}`);
    this.updateComponentUI();

    logger.info('HMR_TEST', componentState.version, `Counter: ${componentState.counter}`);
  }

  public toggleTheme(): void {
    componentState.theme = componentState.theme === 'dark' ? 'light' : 'dark';
    this.addMessage(`🎨 Theme switched to ${componentState.theme}`);
    this.updateComponentUI();

    logger.info('HMR_TEST', componentState.version, `Theme: ${componentState.theme}`);
  }

  public clearMessages(): void {
    componentState.messages = ['Messages cleared'];
    this.updateComponentUI();

    logger.info('HMR_TEST', componentState.version, 'Messages cleared');
  }

  public addMessage(message: string): void {
    componentState.messages.push(`${new Date().toLocaleTimeString()}: ${message}`);

    // Keep only last 10 messages
    if (componentState.messages.length > 10) {
      componentState.messages = componentState.messages.slice(-10);
    }

    this.updateComponentUI();
  }

  // !==!==!===== PRIVATE METHODS !==!==!=====
  private updateComponentUI(): void {
    if (typeof window === 'undefined') return;

    // Update counter
    const counterEl = document.getElementById('hmr-counter');
    if (counterEl) counterEl.textContent = componentState.counter.toString();

    // Update timestamp
    const timestampEl = document.getElementById('hmr-timestamp');
    if (timestampEl)
      timestampEl.textContent = new Date(componentState.lastUpdate).toLocaleTimeString();

    // Update version
    const versionEl = document.getElementById('hmr-version');
    if (versionEl) versionEl.textContent = componentState.version;

    // Update theme
    const themeEl = document.getElementById('hmr-theme');
    if (themeEl) themeEl.textContent = componentState.theme;

    // Update theme styling
    const component = document.querySelector('.hmr-test-component');
    if (component) {
      if (componentState.theme === 'light') {
        component.classList.add('light');
      } else {
        component.classList.remove('light');
      }
    }

    // Update messages
    const messageList = document.getElementById('hmr-message-list');
    if (messageList) {
      messageList.innerHTML = componentState.messages
        .map(msg => `<div class="hmr-message">${msg}</div>`)
        .join('');
    }
  }

  private logCurrentState(): void {
    logger.info(
      'HMR_TEST',
      componentState.version,
      `State: counter=${componentState.counter}, theme=${componentState.theme}, messages=${componentState.messages.length}`
    );
  }

  // !==!==!===== GETTERS !==!==!=====
  public getState(): ComponentState {
    return { ...componentState };
  }

  public getHMRInfo(): any {
    return {
      isHMREnabled: !!import.meta.hot,
      reloadCount: componentState.counter,
      lastUpdate: componentState.lastUpdate,
      version: componentState.version,
    };
  }
}

// !==!==!===== UTILITY FUNCTIONS !==!==!=====
function showUpdateNotification(): void {
  if (typeof window === 'undefined') return;

  const notification = document.createElement('div');
  notification.className = 'hmr-update-notification';
  notification.textContent = `🔥 Hot Reload #${componentState.counter} - State Preserved!`;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function updateComponentUI(): void {
  // This function is called from HMR events
  const component = (window as any).testComponent;
  if (component) {
    component.updateComponentUI();
  }
}

// !==!==!===== INITIALIZATION !==!==!=====
let testComponent: HMRTestComponent;

if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      testComponent = new HMRTestComponent();
    });
  } else {
    testComponent = new HMRTestComponent();
  }
} else {
  // Server-side initialization
  testComponent = new HMRTestComponent();
}

// !==!==!===== EXPORTS !==!==!=====
export { testComponent, componentState, updateComponentUI, showUpdateNotification };

// Make available globally for browser testing
if (typeof window !== 'undefined') {
  (window as any).HMRTestComponent = HMRTestComponent;
  (window as any).testComponent = testComponent;
}

// This comment shows the current version - edit this to trigger HMR!
// Version: 1.1.0 - HMR integration test successful! 🎉
