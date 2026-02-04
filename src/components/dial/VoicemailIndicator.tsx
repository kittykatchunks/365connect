// ============================================
// Voicemail Indicator - Shows new voicemail count and provides quick access to voicemail
// ============================================

import { useTranslation } from 'react-i18next';
import { Voicemail } from 'lucide-react';
import { useSIPStore, useSettingsStore, useUIStore } from '@/stores';
import { useSIP } from '@/hooks';
import { isVerboseLoggingEnabled } from '@/utils';
import { cn } from '@/utils';

export function VoicemailIndicator() {
  const { t } = useTranslation();
  const { makeCall } = useSIP();
  const { voicemailCount, hasNewVoicemail, registrationState } = useSIPStore();
  const { settings } = useSettingsStore();
  const addNotification = useUIStore((state) => state.addNotification);
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Don't show voicemail indicator when not registered
  if (registrationState !== 'registered') {
    return null;
  }
  
  const handleVoicemailClick = async () => {
    if (verboseLogging) {
      console.log('[VoicemailIndicator] 📧 Voicemail icon clicked');
    }
    
    try {
      const vmAccessCode = settings.connection.vmAccess?.trim();
      
      if (!vmAccessCode) {
        if (verboseLogging) {
          console.warn('[VoicemailIndicator] ⚠️ VM Access code not configured');
        }
        
        addNotification({
          type: 'warning',
          title: t('voicemail.title', 'Voicemail'),
          message: t('voicemail.not_configured', 'VM Access code not configured. Please set it in Connection Settings.')
        });
        return;
      }
      
      if (verboseLogging) {
        console.log('[VoicemailIndicator] 📞 Dialing VM Access code:', vmAccessCode);
      }
      
      await makeCall(vmAccessCode);
      
      addNotification({
        type: 'success',
        title: t('voicemail.title', 'Voicemail'),
        message: t('voicemail.calling', { code: vmAccessCode })
      });
    } catch (error) {
      console.error('[VoicemailIndicator] ❌ Error dialing voicemail:', error);
      
      addNotification({
        type: 'error',
        title: t('voicemail.error', 'Voicemail Error'),
        message: t('voicemail.dial_failed', 'Failed to dial voicemail access code')
      });
    }
  };
  
  const messageText = voicemailCount === 1 
    ? t('voicemail.new_message', 'New Message')
    : t('voicemail.new_messages', 'New Messages');

  return (
    <div 
      className="voicemail-item"
      onClick={handleVoicemailClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleVoicemailClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={hasNewVoicemail 
        ? t('voicemail.check_messages', `Check ${voicemailCount} new voicemail message${voicemailCount > 1 ? 's' : ''}`)
        : t('voicemail.title', 'Voicemail')
      }
    >
      {hasNewVoicemail && voicemailCount > 0 && (
        <>
          <span className="voicemail-count">{voicemailCount}</span>
          <span className="voicemail-text">{messageText}</span>
        </>
      )}
      <Voicemail
        className={cn(
          'voicemail-icon',
          hasNewVoicemail && 'message-waiting'
        )}
        size={18}
      />
    </div>
  );
}
