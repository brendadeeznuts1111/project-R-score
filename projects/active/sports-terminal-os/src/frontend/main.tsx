/**
 * React 19 Entry Point
 *
 * Bootstraps the React application using the new React 19 createRoot API.
 * Includes strict mode for development and error boundary setup.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./styles/global.css";
import { App } from "./App";

// ---------------------------------------------------------------------------
// Root element check
// ---------------------------------------------------------------------------

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element not found. Ensure the HTML file has a <div id=\"root\"></div>."
  );
}

// ---------------------------------------------------------------------------
// Create React 19 root and render
// ---------------------------------------------------------------------------

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ---------------------------------------------------------------------------
// Hot Module Replacement (HMR) for Vite
// ---------------------------------------------------------------------------

if (import.meta.hot) {
  import.meta.hot.accept();
}
