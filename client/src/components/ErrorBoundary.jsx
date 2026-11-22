// client/src/components/ErrorBoundary.jsx
// Global React Error Boundary to catch render-time exceptions and present a clean recovery UI

import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
              An unexpected interface error occurred. You can reload this page or return to the main dashboard.
            </p>

            {this.state.error?.message && (
              <div className="error-boundary-details">
                <code>{this.state.error.message}</code>
              </div>
            )}

            <div className="error-boundary-actions">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="btn btn-outline"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
