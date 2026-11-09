import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by NEXORA ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08080D] text-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#11101B] border border-violet-500/25 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              An unexpected render anomaly occurred in the NEXORA interface. We apologize for the disruption.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-[#171426] border border-violet-500/20 rounded-lg text-left text-[11px] font-mono text-violet-300 max-h-28 overflow-y-auto selectable-content">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-[#171426] border border-violet-500/20 rounded-lg hover:text-white"
              >
                <Home className="w-3.5 h-3.5" />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
