// ============================================
// ViewErrorBoundary - Per-View Error Recovery
// ============================================

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui';
import { isVerboseLoggingEnabled } from '@/utils';

interface ViewErrorBoundaryProps {
  children: ReactNode;
  viewName: string;
  onRecover?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

/**
 * ViewErrorBoundary - Wraps individual views to prevent one tab crashing the entire app
 * Features:
 * - Auto-retry with exponential backoff
 * - Graceful error display
 * - Manual recovery options
 * - Verbose logging integration
 */
export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ViewErrorBoundaryState> {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.error(`[ViewErrorBoundary:${this.props.viewName}] ❌ Caught error:`, error);
      console.error(`[ViewErrorBoundary:${this.props.viewName}] 📊 Component stack:`, errorInfo.componentStack);
    }
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Attempt auto-recovery if under retry limit
    this.attemptAutoRecovery();
  }
  
  componentWillUnmount(): void {
    // Clean up any pending retry timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
  
  attemptAutoRecovery = (): void => {
    const { maxRetries = 3, retryDelayMs = 1000 } = this.props;
    const { retryCount } = this.state;
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (retryCount >= maxRetries) {
      if (verboseLogging) {
        console.warn(
          `[ViewErrorBoundary:${this.props.viewName}] ⚠️ Max retries (${maxRetries}) reached. Manual recovery required.`
        );
      }
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = retryDelayMs * Math.pow(2, retryCount);
    
    if (verboseLogging) {
      console.log(
        `[ViewErrorBoundary:${this.props.viewName}] 🔄 Attempting auto-recovery in ${delay}ms (retry ${retryCount + 1}/${maxRetries})...`
      );
    }
    
    this.setState({ isRecovering: true });
    
    this.retryTimeoutId = setTimeout(() => {
      if (verboseLogging) {
        console.log(`[ViewErrorBoundary:${this.props.viewName}] 🔄 Executing recovery attempt...`);
      }
      
      this.handleRetry();
    }, delay);
  };
  
  handleRetry = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[ViewErrorBoundary:${this.props.viewName}] 🔄 Retrying view...`);
    }
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false
    }));
    
    this.props.onRecover?.();
  };
  
  handleManualRetry = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[ViewErrorBoundary:${this.props.viewName}] 🔄 Manual retry triggered`);
    }
    
    // Reset retry count on manual retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    });
    
    this.props.onRecover?.();
  };
  
  handleReload = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[ViewErrorBoundary:${this.props.viewName}] 🔄 Full page reload triggered`);
    }
    
    window.location.reload();
  };
  
  handleGoHome = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[ViewErrorBoundary:${this.props.viewName}] 🏠 Navigate to home (dial) triggered`);
    }
    
    // Navigate to dial view by triggering a navigation event
    window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'dial' } }));
  };
  
  render(): ReactNode {
    if (this.state.hasError) {
      const { maxRetries = 3 } = this.props;
      const { retryCount, isRecovering } = this.state;
      const canAutoRetry = retryCount < maxRetries;
      
      return (
        <div className="view-error-boundary">
          <div className="view-error-content">
            <div className="view-error-icon">
              <AlertTriangle className="w-10 h-10" />
            </div>
            
            <h2 className="view-error-title">
              {this.props.viewName} Tab Error
            </h2>
            
            <p className="view-error-message">
              {isRecovering && canAutoRetry ? (
                <>
                  Attempting to recover automatically...
                  <br />
                  <small>(Attempt {retryCount + 1} of {maxRetries})</small>
                </>
              ) : canAutoRetry ? (
                <>
                  This view encountered an error and is attempting to recover automatically.
                  <br />
                  <small>(Attempt {retryCount + 1} of {maxRetries})</small>
                </>
              ) : (
                <>
                  This view has crashed after {maxRetries} recovery attempts.
                  <br />
                  Please try refreshing manually or contact support if the issue persists.
                </>
              )}
            </p>
            
            {this.state.error && (
              <details className="view-error-details">
                <summary>Technical Details</summary>
                <pre className="view-error-stack">
                  <strong>Error:</strong> {this.state.error.message}
                  {'\n\n'}
                  <strong>Component Stack:</strong>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="view-error-actions">
              {!isRecovering && (
                <>
                  <Button
                    variant="primary"
                    onClick={this.handleManualRetry}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry View
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={this.handleGoHome}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dial
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={this.handleReload}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload App
                  </Button>
                </>
              )}
              
              {isRecovering && (
                <div className="view-error-recovering">
                  <div className="spinner"></div>
                  <span>Recovering...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ViewErrorBoundary;
