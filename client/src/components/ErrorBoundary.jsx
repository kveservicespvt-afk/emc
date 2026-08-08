import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="section flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold text-ink">Something went wrong</h2>
          <p className="mt-2 text-gray-600">
            This part of the page hit an unexpected error. Try refreshing — the rest of the site is unaffected.
          </p>
          <button className="btn-primary mt-6" onClick={() => window.location.reload()}>
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
