import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleDashboard from './SimpleDashboard.tsx';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <SimpleDashboard />
  </React.StrictMode>
);
