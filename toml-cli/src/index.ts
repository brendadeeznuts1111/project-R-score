import { QuantumNavigatorApp } from '@/app/quantum-navigator-app';
import { GlobalStateManager } from '@/state/global-state-manager';
import { PerformanceMonitor } from '@/performance/performance-monitor';
import { WebGLErrorHandler } from '@/error/webgl-error-handler';

// Initialize global systems
const stateManager = GlobalStateManager.getInstance();
const performanceMonitor = PerformanceMonitor.getInstance();
const errorHandler = WebGLErrorHandler.getInstance();

// Initialize application
const app = new QuantumNavigatorApp();

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    app.init();
    console.log('Quantum Navigator initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Quantum Navigator:', error);
    errorHandler.handleInitializationError(error);
  }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    app.pause();
  } else {
    app.resume();
  }
});

// Export for global access
window.QuantumNavigator = {
  app,
  stateManager,
  performanceMonitor,
  errorHandler
};

export default app;