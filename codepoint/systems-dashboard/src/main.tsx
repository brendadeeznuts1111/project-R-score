import React from 'react';
import ReactDOM from 'react-dom/client';
import SystemsDashboard from '../SystemsDashboard.tsx';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize error tracking for global errors
window.errorTracker = {
  trackError: (error: Error, level: string, context?: any) => {
    console.error(`[${level.toUpperCase()}] Global Error:`, error.message, { context });
    // Here you could also send to an external error service
  }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <SystemsDashboard />
    </ErrorBoundary>
  </React.StrictMode>
);
