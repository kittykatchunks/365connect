// ============================================
// Add/Edit Queue Modal Component
// Configure queue monitoring and SLA thresholds
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { DualRangeSlider } from './DualRangeSlider';
import type { QueueConfig, AvailableQueue } from '@/types/queue-monitor';
import { isVerboseLoggingEnabled } from '@/utils';
import './QueueModal.css';

interface QueueModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Save queue configuration callback */
  onSave: (config: QueueConfig) => void;
  /** Existing config if editing, null if adding new */
  existingConfig?: QueueConfig | null;
  /** List of available queues from API */
  availableQueues: AvailableQueue[];
  /** Whether queues are being loaded from API */
  loadingQueues: boolean;
  /** Already configured queue numbers (to prevent duplicates) */
  configuredQueueNumbers: string[];
}

export function QueueModal({
  isOpen,
  onClose,
  onSave,
  existingConfig,
  availableQueues,
  loadingQueues,
  configuredQueueNumbers
}: QueueModalProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  const isEditing = !!existingConfig;
  
  // Form state
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [abandonedWarn, setAbandonedWarn] = useState(50);
  const [abandonedBreach, setAbandonedBreach] = useState(75);
  const [awtWarn, setAwtWarn] = useState(30);
  const [awtBreach, setAwtBreach] = useState(60);
  const [resetTime, setResetTime] = useState('00:00');
  
  // Initialize form with existing config when editing
  useEffect(() => {
    if (existingConfig) {
      setSelectedQueue(existingConfig.queueNumber);
      setAbandonedWarn(existingConfig.abandonedThreshold.warn);
      setAbandonedBreach(existingConfig.abandonedThreshold.breach);
      setAwtWarn(existingConfig.avgWaitTimeThreshold.warn);
      setAwtBreach(existingConfig.avgWaitTimeThreshold.breach);
      setResetTime(existingConfig.statsResetTime);
      
      if (verboseLogging) {
        console.log('[QueueModal] 📝 Initialized form with existing config:', existingConfig);
      }
    } else {
      // Reset form for new entry
      setSelectedQueue('');
      setAbandonedWarn(50);
      setAbandonedBreach(75);
      setAwtWarn(30);
      setAwtBreach(60);
      setResetTime('00:00');
    }
  }, [existingConfig, verboseLogging]);
  
  const handleSave = () => {
    if (!selectedQueue) {
      if (verboseLogging) {
        console.warn('[QueueModal] ⚠️ No queue selected');
      }
      return;
    }
    
    // Find queue name if available
    const queueName = availableQueues.find(q => q.queueNumber === selectedQueue)?.queueName;
    
    const config: QueueConfig = {
      queueNumber: selectedQueue,
      queueName,
      abandonedThreshold: {
        warn: abandonedWarn,
        breach: abandonedBreach
      },
      avgWaitTimeThreshold: {
        warn: awtWarn,
        breach: awtBreach
      },
      statsResetTime: resetTime,
      lastResetTimestamp: Date.now()
    };
    
    if (verboseLogging) {
      console.log('[QueueModal] 💾 Saving queue config:', config);
    }
    
    onSave(config);
    onClose();
  };
  
  const handleCancel = () => {
    if (verboseLogging) {
      console.log('[QueueModal] ❌ Modal cancelled');
    }
    onClose();
  };
  
  // Generate hourly time options (00:00 to 23:00)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });
  
  // Filter out already configured queues (except when editing current queue)
  const availableQueueOptions = availableQueues.filter(q => 
    !configuredQueueNumbers.includes(q.queueNumber) || 
    (isEditing && q.queueNumber === existingConfig.queueNumber)
  );
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container queue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing 
              ? t('queue_monitor.edit_queue', 'Edit Queue Monitor') 
              : t('queue_monitor.add_queue', 'Add Queue Monitor')
            }
          </h2>
          <button
            className="modal-close-btn"
            onClick={handleCancel}
            aria-label={t('aria_label_close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Queue Selection */}
          <div className="form-group">
            <label htmlFor="queue-select" className="form-label">
              {t('queue_monitor.select_queue', 'Select Queue')}
            </label>
            <select
              id="queue-select"
              className="form-select"
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              disabled={isEditing || loadingQueues}
            >
              <option value="">
                {loadingQueues 
                  ? t('queue_monitor.loading_queues', 'Loading queues...') 
                  : t('queue_monitor.select_queue_placeholder', 'Select a queue')
                }
              </option>
              {availableQueueOptions.map((queue) => (
                <option key={queue.queueNumber} value={queue.queueNumber}>
                  {queue.queueName 
                    ? `${queue.queueNumber} - ${queue.queueName}` 
                    : queue.queueNumber
                  }
                </option>
              ))}
            </select>
            {availableQueueOptions.length === 0 && !loadingQueues && (
              <p className="form-help-text">
                {t('queue_monitor.no_queues_available', 'No queues available or all queues are already configured')}
              </p>
            )}
          </div>
          
          {/* Abandoned Calls Threshold */}
          <div className="form-group">
            <label className="form-label">
              {t('queue_monitor.abandoned_threshold', 'Abandoned Calls Threshold')}
            </label>
            <p className="form-help-text">
              {t('queue_monitor.abandoned_threshold_desc', 'Set warning and breach thresholds for abandoned call percentage')}
            </p>
            <DualRangeSlider
              min={0}
              max={100}
              warnValue={abandonedWarn}
              breachValue={abandonedBreach}
              onChange={(warn, breach) => {
                setAbandonedWarn(warn);
                setAbandonedBreach(breach);
              }}
              unit="%"
              aria-label={t('queue_monitor.abandoned_threshold', 'Abandoned Calls Threshold')}
            />
          </div>
          
          {/* Average Wait Time Threshold */}
          <div className="form-group">
            <label className="form-label">
              {t('queue_monitor.awt_threshold', 'Average Wait Time Threshold')}
            </label>
            <p className="form-help-text">
              {t('queue_monitor.awt_threshold_desc', 'Set warning and breach thresholds for average wait time in seconds')}
            </p>
            <DualRangeSlider
              min={0}
              max={100}
              warnValue={awtWarn}
              breachValue={awtBreach}
              onChange={(warn, breach) => {
                setAwtWarn(warn);
                setAwtBreach(breach);
              }}
              unit="s"
              aria-label={t('queue_monitor.awt_threshold', 'Average Wait Time Threshold')}
            />
          </div>
          
          {/* Stats Reset Time */}
          <div className="form-group">
            <label htmlFor="reset-time" className="form-label">
              {t('queue_monitor.stats_reset_time', 'Daily Stats Reset Time')}
            </label>
            <p className="form-help-text">
              {t('queue_monitor.stats_reset_desc', 'Time each day when statistics will be reset (24-hour format)')}
            </p>
            <select
              id="reset-time"
              className="form-select"
              value={resetTime}
              onChange={(e) => setResetTime(e.target.value)}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="modal-footer">
          <Button
            variant="secondary"
            onClick={handleCancel}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedQueue || loadingQueues}
          >
            {isEditing 
              ? t('queue_monitor.update', 'Update') 
              : t('common.save', 'Save')
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
