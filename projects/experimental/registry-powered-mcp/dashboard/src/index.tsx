import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// For Bun's browser target, we need to handle the client-side rendering
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);