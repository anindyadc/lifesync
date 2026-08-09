import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render/lifecycle errors thrown by a single mini-app so one crashing
 * module white-screens itself, not the whole shell. Give it `key={activeApp}`
 * at the call site so switching apps resets a tripped boundary.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center text-center bg-white p-12 rounded-2xl shadow-sm border border-slate-100 mt-6">
          <AlertTriangle size={32} className="text-red-400 mb-4" />
          <h2 className="text-lg font-bold text-slate-800">This app hit an error</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Something went wrong loading this section. Try switching to another app and back.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
