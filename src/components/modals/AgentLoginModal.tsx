// ============================================
// Agent Login Modal - Login to Call Queue
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCheck, Lock, X, Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';

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
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('agent.login_title', 'Agent Login')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="agent-login-content">
        <p className="agent-login-description text-muted">
          {t('agent.login_description', 'Enter your agent credentials to log into the call queue.')}
        </p>
        
        {/* Agent Number */}
        <div className="form-group">
          <label htmlFor="agent-number" className="form-label">
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
          <label htmlFor="agent-passcode" className="form-label">
            {t('agent.passcode_label', 'Passcode')}
            <span className="form-label-optional"> ({t('common.optional', 'Optional')})</span>
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
          <p className="form-hint">
            {t('agent.passcode_hint', 'Leave blank if no passcode required')}
          </p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}
        
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
    </Modal>
  );
}

export default AgentLoginModal;
