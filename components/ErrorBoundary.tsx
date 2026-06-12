'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string; // Component identifier for logging
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] [${this.props.name || 'Component'}] Caught an error:`, error, errorInfo);
    
    // Asynchronous error reporting API (non-blocking)
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: this.props.name || 'unknown',
          error: error.message,
          stack: error.stack,
          info: errorInfo.componentStack,
        }),
      }).catch(() => {}); // Catch silent network failures
    } catch {
      // Catch synchronous failures
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < 3) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      console.warn(`[ErrorBoundary] [${this.props.name || 'Component'}] Max retries (3) reached. UI staying disabled.`);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-sm text-zinc-200">
              {this.props.name ? `${this.props.name} Widget Offline` : 'Widget Offline'}
            </div>
            <div className="text-xs text-zinc-500 mt-1 max-w-[250px] mx-auto overflow-hidden text-ellipsis whitespace-nowrap">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </div>
          </div>
          <button
            onClick={this.handleRetry}
            disabled={this.state.retryCount >= 3}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-350 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-full text-xs font-semibold border border-zinc-800 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${this.state.retryCount > 0 && this.state.retryCount < 3 ? 'animate-spin' : ''}`} />
            {this.state.retryCount >= 3 ? 'Retry Limit Reached' : 'Retry Widget'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
