// ============================================
// Advanced Options View
// ============================================

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelHeader } from '@/components/layout';
import { Button, Input, Toggle } from '@/components/ui';
import { useAppStore, useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

export function AdvancedOptionsView() {
  const { t } = useTranslation();
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const settings = useSettingsStore((state) => state.settings);
  const setSipMessagesEnabled = useSettingsStore((state) => state.setSipMessagesEnabled);
  const setKeepAliveInterval = useSettingsStore((state) => state.setKeepAliveInterval);
  const setKeepAliveMaxSequentialFailures = useSettingsStore((state) => state.setKeepAliveMaxSequentialFailures);
  const setIceGatheringTimeout = useSettingsStore((state) => state.setIceGatheringTimeout);
  const setNoAnswerTimeout = useSettingsStore((state) => state.setNoAnswerTimeout);

  const [keepAliveIntervalInput, setKeepAliveIntervalInput] = useState(
    String(settings.advanced.keepAliveInterval ?? 90)
  );
  const [keepAliveFailureThresholdInput, setKeepAliveFailureThresholdInput] = useState(
    String(settings.advanced.keepAliveMaxSequentialFailures ?? 1)
  );
  const [iceCompletionTimerInput, setIceCompletionTimerInput] = useState(
    String(settings.advanced.iceGatheringTimeout ?? 5000)
  );
  const [noAnswerTimeoutInput, setNoAnswerTimeoutInput] = useState(
    String(settings.advanced.noAnswerTimeout ?? 120)
  );

  const handleReturnToSettings = useCallback(() => {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[AdvancedOptionsView] 🧭 Returning to Settings view');
    }

    window.history.pushState({}, '', '/');
    setCurrentView('settings');
  }, [setCurrentView]);

  const hasChanges = useMemo(() => {
    return (
      keepAliveIntervalInput !== String(settings.advanced.keepAliveInterval ?? 90) ||
      keepAliveFailureThresholdInput !== String(settings.advanced.keepAliveMaxSequentialFailures ?? 1) ||
      iceCompletionTimerInput !== String(settings.advanced.iceGatheringTimeout ?? 5000) ||
      noAnswerTimeoutInput !== String(settings.advanced.noAnswerTimeout ?? 120)
    );
  }, [
    iceCompletionTimerInput,
    keepAliveFailureThresholdInput,
    keepAliveIntervalInput,
    noAnswerTimeoutInput,
    settings.advanced.iceGatheringTimeout,
    settings.advanced.keepAliveInterval,
    settings.advanced.keepAliveMaxSequentialFailures,
    settings.advanced.noAnswerTimeout
  ]);

  const handleSave = () => {
    const verboseLogging = isVerboseLoggingEnabled();

    const nextKeepAliveInterval = Math.max(1, Math.floor(Number(keepAliveIntervalInput) || 90));
    const nextFailureThreshold = Math.max(1, Math.floor(Number(keepAliveFailureThresholdInput) || 1));
    const nextIceCompletionTimer = Math.max(100, Math.floor(Number(iceCompletionTimerInput) || 5000));
    const nextNoAnswerTimeout = Math.max(1, Math.floor(Number(noAnswerTimeoutInput) || 120));

    if (verboseLogging) {
      console.log('[AdvancedOptionsView] 💾 Saving SIP advanced options', {
        keepAliveIntervalInput,
        keepAliveFailureThresholdInput,
        iceCompletionTimerInput,
        noAnswerTimeoutInput,
        nextKeepAliveInterval,
        nextFailureThreshold,
        nextIceCompletionTimer,
        nextNoAnswerTimeout
      });
    }

    setKeepAliveInterval(nextKeepAliveInterval);
    setKeepAliveMaxSequentialFailures(nextFailureThreshold);
    setIceGatheringTimeout(nextIceCompletionTimer);
    setNoAnswerTimeout(nextNoAnswerTimeout);

    setKeepAliveIntervalInput(String(nextKeepAliveInterval));
    setKeepAliveFailureThresholdInput(String(nextFailureThreshold));
    setIceCompletionTimerInput(String(nextIceCompletionTimer));
    setNoAnswerTimeoutInput(String(nextNoAnswerTimeout));

    if (verboseLogging) {
      console.log('[AdvancedOptionsView] ✅ SIP advanced options saved');
    }
  };

  return (
    <div className="settings-view">
      <PanelHeader
        title={t('advanced_options.title', 'Advanced Options')}
        subtitle={t(
          'advanced_options.subtitle',
          'Manual configuration for non-day-to-day operational settings.'
        )}
        actions={
          <Button variant="ghost" size="sm" onClick={handleReturnToSettings}>
            {t('settings.title', 'Settings')}
          </Button>
        }
      />

      <div className="settings-content" style={{ padding: 'var(--spacing-md)' }}>
        <div className="settings-group">
          <h3>{t('advanced_options.sip_settings_title', 'SIP Settings')}</h3>

          <div className="setting-item">
            <Toggle
              label={t('settings.sip_messages_enabled', 'Enable SIP Message Console Logging')}
              description={t('settings.sip_messages_enabled_desc', 'Enable SIP.js protocol message logging in the console for debugging SIP communication')}
              checked={settings.advanced.sipMessagesEnabled}
              onChange={(checked) => setSipMessagesEnabled(checked)}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="advanced-keepalive-interval">
              {t('advanced_options.keep_alive_interval_label', 'Keep-alive OPTIONS timer (seconds)')}
            </label>
            <Input
              id="advanced-keepalive-interval"
              type="number"
              min={1}
              step={1}
              value={keepAliveIntervalInput}
              onChange={(event) => setKeepAliveIntervalInput(event.target.value)}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="advanced-keepalive-threshold">
              {t(
                'advanced_options.keep_alive_failure_threshold_label',
                'Sequential no-response failures treated as SIP connection failure'
              )}
            </label>
            <Input
              id="advanced-keepalive-threshold"
              type="number"
              min={1}
              step={1}
              value={keepAliveFailureThresholdInput}
              onChange={(event) => setKeepAliveFailureThresholdInput(event.target.value)}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="advanced-ice-completion-timer">
              {t('advanced_options.ice_completion_timer_label', 'ICE completion timer (milliseconds)')}
            </label>
            <Input
              id="advanced-ice-completion-timer"
              type="number"
              min={100}
              step={100}
              value={iceCompletionTimerInput}
              onChange={(event) => setIceCompletionTimerInput(event.target.value)}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="advanced-no-answer-timeout">
              {t('advanced_options.no_answer_timeout_label', 'No-answer timeout (seconds)')}
            </label>
            <Input
              id="advanced-no-answer-timeout"
              type="number"
              min={1}
              step={1}
              value={noAnswerTimeoutInput}
              onChange={(event) => setNoAnswerTimeoutInput(event.target.value)}
            />
          </div>

          <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
