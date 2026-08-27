import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    localStorage.removeItem('taktudy_theme');
    window.location.reload();
  };

  private handleClearAllAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h1 className="font-heading font-extrabold text-xl text-stone-900">
              Jejda, něco se nepovedlo
            </h1>

            <p className="text-xs text-stone-600">
              {this.state.error?.message || 'Nastala neočekávaná chyba při vykreslování stránky.'}
            </p>

            {this.state.errorInfo && (
              <pre className="text-[10px] text-left bg-stone-100 p-3 rounded-lg overflow-x-auto text-stone-700 max-h-40">
                {this.state.errorInfo.componentStack}
              </pre>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-[#006D77] hover:bg-[#004E57] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Zkusit znovu načíst</span>
              </button>

              <button
                onClick={this.handleClearAllAndReload}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-xs rounded-xl transition-all"
              >
                Obnovit výchozí stav
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
