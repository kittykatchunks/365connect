// ============================================
// Advanced Options View
// ============================================

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelHeader } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

export function AdvancedOptionsView() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const setKeepAliveInterval = useSettingsStore((state) => state.setKeepAliveInterval);
  const setKeepAliveMaxSequentialFailures = useSettingsStore((state) => state.setKeepAliveMaxSequentialFailures);

  const [keepAliveIntervalInput, setKeepAliveIntervalInput] = useState(
    String(settings.advanced.keepAliveInterval ?? 90)
  );
  const [keepAliveFailureThresholdInput, setKeepAliveFailureThresholdInput] = useState(
    String(settings.advanced.keepAliveMaxSequentialFailures ?? 1)
  );

  const hasChanges = useMemo(() => {
    return (
      keepAliveIntervalInput !== String(settings.advanced.keepAliveInterval ?? 90) ||
      keepAliveFailureThresholdInput !== String(settings.advanced.keepAliveMaxSequentialFailures ?? 1)
    );
  }, [
    keepAliveFailureThresholdInput,
    keepAliveIntervalInput,
    settings.advanced.keepAliveInterval,
    settings.advanced.keepAliveMaxSequentialFailures
  ]);

  const handleSave = () => {
    const verboseLogging = isVerboseLoggingEnabled();

    const nextKeepAliveInterval = Math.max(1, Math.floor(Number(keepAliveIntervalInput) || 90));
    const nextFailureThreshold = Math.max(1, Math.floor(Number(keepAliveFailureThresholdInput) || 1));

    if (verboseLogging) {
      console.log('[AdvancedOptionsView] 💾 Saving SIP advanced options', {
        keepAliveIntervalInput,
        keepAliveFailureThresholdInput,
        nextKeepAliveInterval,
        nextFailureThreshold
      });
    }

    setKeepAliveInterval(nextKeepAliveInterval);
    setKeepAliveMaxSequentialFailures(nextFailureThreshold);

    setKeepAliveIntervalInput(String(nextKeepAliveInterval));
    setKeepAliveFailureThresholdInput(String(nextFailureThreshold));

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
      />

      <div className="settings-content" style={{ padding: 'var(--spacing-md)' }}>
        <div className="settings-group">
          <h3>{t('advanced_options.sip_settings_title', 'SIP Settings')}</h3>

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

          <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
