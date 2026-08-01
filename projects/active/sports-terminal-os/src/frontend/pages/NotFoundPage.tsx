/**
 * 404 Not Found Page
 *
 * Displayed when the user navigates to a non-existent route.
 * Provides a link back to the home dashboard.
 */

import React from "react";
import { Link } from "react-router";

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="error-code">404</div>
        <h1 className="error-title">Page Not Found</h1>
        <p className="error-description">
          The page you are looking for does not exist or has been moved.
          Check the URL or navigate back to the dashboard.
        </p>
        <div className="error-actions">
          <Link to="/" className="btn btn-primary">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="error-debug">
          <p>
            <strong>Requested path:</strong>{" "}
            <code>{window.location.pathname}</code>
          </p>
          <p>
            <strong>Available routes:</strong> /, /customers, /agents, /live,
            /risk, /command, /playground, /logs, /settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
