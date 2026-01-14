// ============================================
// App Loading Screen - Application Initialization
// ============================================

import { useTranslation } from 'react-i18next';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export type LoadingStep = {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  error?: string;
};

interface AppLoadingScreenProps {
  isVisible: boolean;
  steps?: LoadingStep[];
  progress?: number;
  message?: string;
  error?: string | null;
}

export function AppLoadingScreen({ 
  isVisible, 
  steps = [],
  progress,
  message,
  error 
}: AppLoadingScreenProps) {
  const { t } = useTranslation();
  
  if (!isVisible) return null;
  
  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Logo */}
        <div className="loading-logo">
          <Phone className="w-16 h-16" />
        </div>
        
        {/* App Name */}
        <h1 className="loading-title">
          {t('app.name', 'Autocab365 Connect')}
        </h1>
        
        {/* Loading Steps */}
        {steps.length > 0 && (
          <div className="loading-steps">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`loading-step loading-step--${step.status}`}
              >
                <div className="loading-step-icon">
                  {step.status === 'pending' && (
                    <div className="loading-step-dot" />
                  )}
                  {step.status === 'loading' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {step.status === 'complete' && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="w-4 h-4" />
                  )}
                </div>
                <div className="loading-step-content">
                  <span className="loading-step-label">{step.label}</span>
                  {step.error && (
                    <span className="loading-step-error">{step.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="loading-progress">
            <div 
              className="loading-progress-bar" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
        
        {/* Message */}
        {message && !error && (
          <p className="loading-message">
            {message}
          </p>
        )}
        
        {/* Spinner (when no steps) */}
        {steps.length === 0 && !error && (
          <div className="loading-spinner">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="loading-error">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        )}
        
        {/* Version */}
        <div className="loading-version">
          <span className="text-muted text-xs">
            v2.0.0
          </span>
        </div>
      </div>
    </div>
  );
}

export default AppLoadingScreen;
