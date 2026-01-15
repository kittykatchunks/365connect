// ============================================
// Agent Login Modal - Login to Call Queue
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCheck, Lock, X, Loader2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface AgentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (agentNumber: string, passcode?: string) => Promise<void>;
  isLoading?: boolean;
}

export function AgentLoginModal({ 
  isOpen, 
  onClose, 
  onLogin,
  isLoading = false 
}: AgentLoginModalProps) {
  const { t } = useTranslation();
  const [agentNumber, setAgentNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const agentInputRef = useRef<HTMLInputElement>(null);
  const passcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAgentNumber('');
      setPasscode('');
      setError(null);
      // Focus agent number input after modal opens
      setTimeout(() => agentInputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!agentNumber.trim()) {
      setError(t('agent.error_number_required', 'Agent number is required'));
      agentInputRef.current?.focus();
      return;
    }
    
    setError(null);
    
    try {
      await onLogin(agentNumber.trim(), passcode.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agent.error_login_failed', 'Login failed'));
    }
  }, [agentNumber, passcode, onLogin, onClose, t]);
  
  const handleAgentNumberKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to passcode field
      passcodeInputRef.current?.focus();
    }
  }, []);
  
  const handlePasscodeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  // Only allow numeric input for passcode
  const handlePasscodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPasscode(value);
  }, []);
  
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('agent.login_title', 'Agent Login')}</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="modal-close" disabled={isLoading}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
        
        {/* Agent Number */}
        <div className="form-group">
          <label htmlFor="agent-number">
            {t('agent.number_label', 'Agent Number')} *
          </label>
          <Input
            ref={agentInputRef}
            id="agent-number"
            type="text"
            value={agentNumber}
            onChange={(e) => setAgentNumber(e.target.value)}
            onKeyDown={handleAgentNumberKeyDown}
            placeholder={t('agent.number_placeholder', 'Enter agent number')}
            maxLength={10}
            disabled={isLoading}
            icon={<UserCheck className="w-4 h-4" />}
            autoComplete="off"
          />
        </div>
        
        {/* Passcode */}
        <div className="form-group">
          <label htmlFor="agent-passcode">
            {t('agent.passcode_label', 'Passcode')}
            <span className="text-muted"> ({t('common.optional', 'Optional')})</span>
          </label>
          <Input
            ref={passcodeInputRef}
            id="agent-passcode"
            type="password"
            value={passcode}
            onChange={handlePasscodeChange}
            onKeyDown={handlePasscodeKeyDown}
            placeholder={t('agent.passcode_placeholder', 'Numeric passcode')}
            maxLength={20}
            disabled={isLoading}
            icon={<Lock className="w-4 h-4" />}
            autoComplete="off"
          />
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
            {t('agent.passcode_hint', 'Leave blank if no passcode required')}
          </p>
        </div>
        
        {/* Actions */}
        <div className="modal-footer">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={!agentNumber.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('agent.logging_in', 'Logging in...')}
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                {t('agent.login', 'Login')}
              </>
            )}
          </Button>
        </div>
        </form>
      </div>
    </div>
  );
}

export default AgentLoginModal;
