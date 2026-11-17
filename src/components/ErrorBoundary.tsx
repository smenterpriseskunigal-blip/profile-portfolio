import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  operationContext: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
    operationContext: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected application error occurred.';
    let operationContext: string | null = null;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string | null;
      };
      if (parsed && typeof parsed === 'object' && parsed.error) {
        message = parsed.error;
        if (parsed.operationType || parsed.path) {
          operationContext = `${parsed.operationType || 'operation'} · ${parsed.path || 'unknown'}`;
        }
      }
    } catch {
      // Plain non-JSON error message
    }

    return {
      hasError: true,
      message,
      operationContext,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '', operationContext: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh blueprint-grid-canvas flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-[var(--bp-line-strong)] bg-[var(--bp-surface-solid)] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-[var(--bp-accent)]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="font-mono text-xs tracking-wider">RUNTIME FAULT DETECTED</p>
            </div>
            <h1 className="font-display text-xl font-bold text-[var(--bp-ink)]">
              Unable to complete request
            </h1>
            <p className="text-sm text-[var(--bp-ink-muted)] leading-relaxed">
              {this.state.message}
            </p>
            {this.state.operationContext && (
              <p className="border border-[var(--bp-line)] px-3 py-2 font-mono text-xs text-[var(--bp-ink-muted)]">
                Context: {this.state.operationContext}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-4 py-2.5 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] min-h-[44px]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="border border-[var(--bp-line)] px-4 py-2.5 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[44px]"
              >
                Return to Portfolio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
