// ============================================
// Activity View - Call history
// ============================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, Phone } from 'lucide-react';
import { PanelHeader } from '@/components/layout';
import { Button } from '@/components/ui';
import { ConfirmModal } from '@/components/modals';
import { useCallHistoryStore, useAppStore, useSettingsStore } from '@/stores';
import { useSIP } from '@/hooks';
import { formatCallDuration, type CallRecord } from '@/types/callHistory';
import { isVerboseLoggingEnabled, translateSystemCode } from '@/utils';

type FilterType = 'all' | 'incoming' | 'outgoing' | 'missed';

export function ActivityView() {
  const { t } = useTranslation();
  const { isRegistered } = useSIP();
  const switchToDialWithNumber = useAppStore((state) => state.switchToDialWithNumber);
  
  // Store state
  const filter = useCallHistoryStore((state) => state.filter);
  const setFilter = useCallHistoryStore((state) => state.setFilter);
  const groupedRecords = useCallHistoryStore((state) => state.groupedRecords);
  const totalCalls = useCallHistoryStore((state) => state.totalCalls);
  const clearHistory = useCallHistoryStore((state) => state.clearHistory);
  const vmAccessCode = useSettingsStore((state) => state.settings.connection.vmAccess);
  
  // Local UI state
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: t('activity.filter_all', 'All'), icon: <History className="w-4 h-4" /> },
    { value: 'incoming', label: t('activity.filter_incoming', 'In'), icon: <PhoneIncoming className="w-4 h-4" /> },
    { value: 'outgoing', label: t('activity.filter_outgoing', 'Out'), icon: <PhoneOutgoing className="w-4 h-4" /> },
    { value: 'missed', label: t('activity.filter_missed', 'Missed'), icon: <PhoneMissed className="w-4 h-4" /> },
  ];
  
  const handleCallback = (record: CallRecord) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[ActivityView] 📞 Callback button clicked:', {
        number: record.number,
        name: record.name,
        isRegistered
      });
    }
    
    if (isRegistered) {
      // Switch to dial tab and populate the number
      switchToDialWithNumber(record.number);
      
      if (verboseLogging) {
        console.log('[ActivityView] ✅ Switched to dial tab with number:', record.number);
      }
    } else {
      if (verboseLogging) {
        console.warn('[ActivityView] ⚠️ Cannot callback - not registered');
      }
    }
  };
  
  const getCallIcon = (record: CallRecord) => {
    if (record.status === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-error" />;
    }
    if (record.direction === 'incoming') {
      return <PhoneIncoming className="w-4 h-4 text-success" />;
    }
    return <PhoneOutgoing className="w-4 h-4 text-primary" />;
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="activity-view">
      <PanelHeader 
        title={t('activity.title', 'Activity')}
        subtitle={totalCalls > 0 ? t('activity.count', '{{count}} calls', { count: totalCalls }) : undefined}
        actions={
          totalCalls > 0 ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-error"
              onClick={() => setIsClearConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              {t('activity.clear', 'Clear')}
            </Button>
          ) : null
        }
      />
      
      <div className="activity-filters">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.icon}
            {f.label}
          </Button>
        ))}
      </div>
      
      <div className="activity-list">
        {groupedRecords.length === 0 ? (
          <div className="empty-state">
            <History className="empty-state-icon" />
            <h3>{t('activity.empty_title', 'No call history')}</h3>
            <p>{t('activity.empty_description', 'Your recent calls will appear here')}</p>
          </div>
        ) : (
          <div className="activity-groups">
            {groupedRecords.map((group) => (
              <div key={group.date} className="activity-group">
                <div className="activity-group-header">
                  {group.label}
                </div>
                <div className="activity-group-items">
                  {group.records.map((record) => (
                    <div key={record.id} className={`activity-item ${record.status === 'missed' ? 'activity-item--missed' : ''}`}>
                      <div className="activity-icon">
                        {getCallIcon(record)}
                      </div>
                      
                      <div className="activity-info">
                        <div className="activity-number">
                          {record.name || (translateSystemCode(record.number, t, vmAccessCode) !== record.number ? translateSystemCode(record.number, t, vmAccessCode) : record.number)}
                        </div>
                        {(record.name || translateSystemCode(record.number, t, vmAccessCode) !== record.number) && (
                          <div className="activity-secondary">{record.number}</div>
                        )}
                        <div className="activity-meta">
                          <span className="activity-time">{formatTime(record.timestamp)}</span>
                          {record.duration > 0 && (
                            <span className="activity-duration">{formatCallDuration(record.duration)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="activity-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCallback(record)}
                          disabled={!isRegistered}
                          title={t('activity.callback', 'Call back')}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Clear All Confirm */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearHistory}
        title={t('activity.clear_title', 'Clear Call History')}
        message={t('activity.clear_message', 'Are you sure you want to clear all call history? This cannot be undone.')}
        confirmText={t('activity.clear', 'Clear')}
        variant="danger"
      />
    </div>
  );
}
