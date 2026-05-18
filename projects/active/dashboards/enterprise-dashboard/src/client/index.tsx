import { createRoot } from "react-dom/client";
import EnterpriseDashboard from "./Dashboard";
import { ConfigErrorBoundary } from "./components/ConfigErrorBoundary";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

const root = createRoot(container);
root.render(
  <ConfigErrorBoundary>
    <EnterpriseDashboard />
  </ConfigErrorBoundary>,
);
