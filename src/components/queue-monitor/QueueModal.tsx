// ============================================
// Add/Edit Queue Modal Component
// Configure queue monitoring and SLA thresholds
// ============================================

import { useState, useEffect, useRef } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isEditing = !!existingConfig;
  
  // Form state - now supports multiple queue selection
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [abandonedWarn, setAbandonedWarn] = useState(50);
  const [abandonedBreach, setAbandonedBreach] = useState(75);
  const [awtWarn, setAwtWarn] = useState(30);
  const [awtBreach, setAwtBreach] = useState(60);
  const [resetTime, setResetTime] = useState('00:00');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Initialize form with existing config when editing
  useEffect(() => {
    if (existingConfig) {
      setSelectedQueues([existingConfig.queueNumber]);
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
      setSelectedQueues([]);
      setAbandonedWarn(50);
      setAbandonedBreach(75);
      setAwtWarn(30);
      setAwtBreach(60);
      setResetTime('00:00');
    }
  }, [existingConfig, verboseLogging]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);
  
  const handleSave = () => {
    if (selectedQueues.length === 0) {
      if (verboseLogging) {
        console.warn('[QueueModal] ⚠️ No queues selected');
      }
      return;
    }
    
    // Create a config for each selected queue with the same SLA settings
    selectedQueues.forEach(queueNumber => {
      // Find queue name if available
      const queueName = availableQueues.find(q => q.queueNumber === queueNumber)?.queueName;
      
      const config: QueueConfig = {
        queueNumber,
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
    });
    
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
  
  if (verboseLogging && isOpen) {
    console.log('[QueueModal] 📊 Queue selection method:', {
      totalQueues: availableQueueOptions.length,
      method: 'Dropdown (Multi-select)'
    });
  }
  
  // Toggle queue selection
  const toggleQueueSelection = (queueNumber: string) => {
    setSelectedQueues(prev => {
      if (prev.includes(queueNumber)) {
        return prev.filter(q => q !== queueNumber);
      } else {
        return [...prev, queueNumber];
      }
    });
  };
  
  // Remove queue from selection (used by badge chips)
  const removeQueueFromSelection = (queueNumber: string) => {
    setSelectedQueues(prev => prev.filter(q => q !== queueNumber));
  };
  
  // Select all available queues
  const selectAllQueues = () => {
    setSelectedQueues(availableQueueOptions.map(q => q.queueNumber));
  };
  
  // Clear all selections
  const clearAllQueues = () => {
    setSelectedQueues([]);
  };
  
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
          {/* Queue Selection - Dynamic based on queue count */}
          <div className="form-group">
            <label className="form-label">
              {t('queue_monitor.select_queues', 'Select Queue(s)')}
            </label>
            <p className="form-help-text">
              {isEditing 
                ? t('queue_monitor.edit_single_queue_desc', 'Editing settings for this queue')
                : t('queue_monitor.select_multiple_queues_desc', 'Select one or more queues to apply the same SLA settings')
              }
            </p>
            
            {/* Multi-select dropdown */}
            {!isEditing && (
              <>
                <div className="queue-multiselect-container" ref={dropdownRef}>
                  <button
                    type="button"
                    className="queue-multiselect-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isEditing || loadingQueues}
                  >
                    <span className="trigger-text">
                      {loadingQueues 
                        ? t('queue_monitor.loading_queues', 'Loading queues...') 
                        : selectedQueues.length === 0
                          ? t('queue_monitor.select_queues_placeholder', 'Click to select queues')
                          : t('queue_monitor.queues_selected', '{{count}} queue(s) selected', { count: selectedQueues.length })
                      }
                    </span>
                    <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  
                  {/* Dropdown list */}
                  {isDropdownOpen && !isEditing && (
                    <div className="queue-multiselect-dropdown">
                      {/* Select All / Clear All buttons */}
                      {availableQueueOptions.length > 0 && (
                        <div className="dropdown-actions">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={selectAllQueues}
                          >
                            {t('queue_monitor.select_all', 'Select All')}
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={clearAllQueues}
                          >
                            {t('queue_monitor.clear_all', 'Clear All')}
                          </button>
                        </div>
                      )}
                      
                      {/* Queue list with checkboxes */}
                      <div className="dropdown-list">
                        {availableQueueOptions.length === 0 ? (
                          <div className="dropdown-empty">
                            {t('queue_monitor.no_queues_available', 'No queues available or all queues are already configured')}
                          </div>
                        ) : (
                          availableQueueOptions.map((queue) => (
                            <label
                              key={queue.queueNumber}
                              className="dropdown-item"
                            >
                              <input
                                type="checkbox"
                                checked={selectedQueues.includes(queue.queueNumber)}
                                onChange={() => toggleQueueSelection(queue.queueNumber)}
                                className="queue-checkbox"
                              />
                              <span className="queue-label">
                                {queue.queueName 
                                  ? `${queue.queueNumber} - ${queue.queueName}` 
                                  : queue.queueNumber
                                }
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected queue badges (Method 1 only) */}
                {selectedQueues.length > 0 && (
                  <div className="selected-queues-badges">
                    {selectedQueues.map(queueNumber => {
                      const queue = availableQueues.find(q => q.queueNumber === queueNumber);
                      return (
                        <div key={queueNumber} className="queue-badge">
                          <span className="badge-text">
                            {queue?.queueName 
                              ? `${queue.queueNumber} - ${queue.queueName}` 
                              : queueNumber
                            }
                          </span>
                          {!isEditing && (
                            <button
                              type="button"
                              className="badge-remove"
                              onClick={() => removeQueueFromSelection(queueNumber)}
                              aria-label={t('aria_label_remove', 'Remove')}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            
            {/* Edit mode - show single selected queue as badge */}
            {isEditing && selectedQueues.length > 0 && (
              <div className="selected-queues-badges">
                {selectedQueues.map(queueNumber => {
                  const queue = availableQueues.find(q => q.queueNumber === queueNumber);
                  return (
                    <div key={queueNumber} className="queue-badge">
                      <span className="badge-text">
                        {queue?.queueName 
                          ? `${queue.queueNumber} - ${queue.queueName}` 
                          : queueNumber
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
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
            disabled={selectedQueues.length === 0 || loadingQueues}
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
