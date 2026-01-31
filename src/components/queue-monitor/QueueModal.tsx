// ============================================
// Add/Edit Queue Modal Component
// Configure queue monitoring and SLA thresholds
// Uses toggle-switch UI matching Settings modals
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ListChecks, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { DualRangeSlider } from './DualRangeSlider';
import type { QueueConfig, AvailableQueue, QueueGroup } from '@/types/queue-monitor';
import { isVerboseLoggingEnabled } from '@/utils';
import { loadQueueGroups } from '@/utils/queueGroupStorage';
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
  
  // Form state - now supports multiple queue selection
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [abandonedWarn, setAbandonedWarn] = useState(15);
  const [abandonedBreach, setAbandonedBreach] = useState(20);
  const [awtWarn, setAwtWarn] = useState(30);
  const [awtBreach, setAwtBreach] = useState(60);
  
  // Queue groups state
  const [queueGroups, setQueueGroups] = useState<QueueGroup[]>([]);
  
  // Load queue groups when modal opens
  useEffect(() => {
    if (isOpen && !isEditing) {
      const groups = loadQueueGroups();
      setQueueGroups(groups);
      
      if (verboseLogging) {
        console.log('[QueueModal] 📁 Loaded queue groups:', groups.length);
      }
    }
  }, [isOpen, isEditing, verboseLogging]);
  
  // Initialize form with existing config when editing, or reset when opening for new entry
  useEffect(() => {
    if (!isOpen) return; // Only run when modal is open
    
    if (existingConfig) {
      setSelectedQueues([existingConfig.queueNumber]);
      setAbandonedWarn(existingConfig.abandonedThreshold.warn);
      setAbandonedBreach(existingConfig.abandonedThreshold.breach);
      setAwtWarn(existingConfig.avgWaitTimeThreshold.warn);
      setAwtBreach(existingConfig.avgWaitTimeThreshold.breach);
      
      if (verboseLogging) {
        console.log('[QueueModal] 📝 Initialized form with existing config:', existingConfig);
      }
    } else {
      // Reset form for new entry
      setSelectedQueues([]);
      setAbandonedWarn(15);
      setAbandonedBreach(20);
      setAwtWarn(30);
      setAwtBreach(60);
      
      if (verboseLogging) {
        console.log('[QueueModal] 🆕 Reset form for new queue entry');
      }
    }
  }, [isOpen, existingConfig, verboseLogging]);
  
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
        }
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
  
  // Filter out already configured queues (except when editing current queue)
  const availableQueueOptions = availableQueues.filter(q => 
    !configuredQueueNumbers.includes(q.queueNumber) || 
    (isEditing && q.queueNumber === existingConfig.queueNumber)
  );
  
  // Filter queue groups to only show groups that have at least one available queue
  const availableQueueGroups = queueGroups.filter(group => {
    const availableQueuesInGroup = group.queueNumbers.filter(qn => 
      availableQueueOptions.some(q => q.queueNumber === qn)
    );
    return availableQueuesInGroup.length > 0;
  });
  
  if (verboseLogging && isOpen) {
    console.log('[QueueModal] 📊 Available queues:', {
      totalQueues: availableQueueOptions.length,
      totalGroups: availableQueueGroups.length
    });
  }
  
  // Toggle queue selection
  const toggleQueue = (queueNumber: string) => {
    if (isEditing) return; // Don't allow changes in edit mode
    
    setSelectedQueues(prev => {
      if (prev.includes(queueNumber)) {
        return prev.filter(q => q !== queueNumber);
      } else {
        return [...prev, queueNumber];
      }
    });
  };
  
  // Toggle queue group selection - selects/deselects all available queues in the group
  const toggleGroupSelection = (group: QueueGroup) => {
    if (isEditing) return;
    
    const availableQueuesInGroup = group.queueNumbers.filter(qn => 
      availableQueueOptions.some(q => q.queueNumber === qn)
    );
    
    // Check if all available queues in this group are already selected
    const allSelected = availableQueuesInGroup.every(qn => selectedQueues.includes(qn));
    
    if (allSelected) {
      // Deselect all queues from this group
      setSelectedQueues(prev => prev.filter(q => !availableQueuesInGroup.includes(q)));
      
      if (verboseLogging) {
        console.log('[QueueModal] 📤 Deselected group:', group.name, availableQueuesInGroup);
      }
    } else {
      // Select all available queues from this group
      setSelectedQueues(prev => {
        const newSelection = [...prev];
        availableQueuesInGroup.forEach(qn => {
          if (!newSelection.includes(qn)) {
            newSelection.push(qn);
          }
        });
        return newSelection;
      });
      
      if (verboseLogging) {
        console.log('[QueueModal] 📥 Selected group:', group.name, availableQueuesInGroup);
      }
    }
  };
  
  // Check if a group is fully selected (all its available queues are selected)
  const isGroupFullySelected = (group: QueueGroup): boolean => {
    const availableQueuesInGroup = group.queueNumbers.filter(qn => 
      availableQueueOptions.some(q => q.queueNumber === qn)
    );
    return availableQueuesInGroup.length > 0 && 
           availableQueuesInGroup.every(qn => selectedQueues.includes(qn));
  };
  
  // Check if a group is partially selected
  const isGroupPartiallySelected = (group: QueueGroup): boolean => {
    const availableQueuesInGroup = group.queueNumbers.filter(qn => 
      availableQueueOptions.some(q => q.queueNumber === qn)
    );
    const selectedCount = availableQueuesInGroup.filter(qn => selectedQueues.includes(qn)).length;
    return selectedCount > 0 && selectedCount < availableQueuesInGroup.length;
  };
  
  // Select all available queues
  const selectAll = () => {
    setSelectedQueues(availableQueueOptions.map(q => q.queueNumber));
  };
  
  // Clear all selections
  const deselectAll = () => {
    setSelectedQueues([]);
  };
  
  // Check if all queues are selected
  const allSelected = useMemo(() => {
    return availableQueueOptions.length > 0 && 
           availableQueueOptions.every(q => selectedQueues.includes(q.queueNumber));
  }, [availableQueueOptions, selectedQueues]);
  
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
        
        <div className="modal-body queue-modal-body">
          {/* Queue Selection Section */}
          <div className="form-group queue-selection-group">
            <div className="section-header">
              <label className="form-label">
                {t('queue_monitor.select_queues', 'Select Queue(s)')}
              </label>
              {!isEditing && (
                <span className="queue-selection-count">
                  {selectedQueues.length} / {availableQueueOptions.length} {t('queue_login.selected', 'selected')}
                </span>
              )}
            </div>
            
            {isEditing ? (
              // Edit mode - show single queue info
              <div className="edit-queue-display">
                <span className="queue-number">{existingConfig.queueNumber}</span>
                {existingConfig.queueName && (
                  <span className="queue-name">{existingConfig.queueName}</span>
                )}
              </div>
            ) : loadingQueues ? (
              <div className="queue-loading">
                <div className="loading-spinner" />
                <span>{t('settings.loading_queues', 'Loading queues...')}</span>
              </div>
            ) : availableQueueOptions.length === 0 ? (
              <div className="no-queues-message">
                {t('queue_monitor.no_queues_available', 'No queues available or all queues are already configured')}
              </div>
            ) : (
              <>
                {/* Select All Toggle */}
                <label className="queue-toggle-row select-all-row">
                  <div className="queue-toggle-info">
                    <ListChecks className="w-4 h-4" />
                    <span className="queue-toggle-label">
                      {t('queue_login.select_all', 'Select / Deselect All')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch ${allSelected ? 'active' : ''}`}
                    onClick={() => allSelected ? deselectAll() : selectAll()}
                    aria-label={allSelected ? t('queue_login.deselect_all', 'Deselect all') : t('queue_login.select_all_aria', 'Select all')}
                  >
                    <span className="toggle-slider" />
                  </button>
                </label>
                
                {/* Queue List */}
                <div className="queue-list">
                  {/* Queue Groups Section */}
                  {availableQueueGroups.length > 0 && (
                    <>
                      <div className="queue-section-header">
                        <Users className="w-4 h-4" />
                        <span>{t('queue_monitor.queue_groups', 'Queue Groups')}</span>
                      </div>
                      {availableQueueGroups.map((group) => {
                        const availableCount = group.queueNumbers.filter(qn => 
                          availableQueueOptions.some(q => q.queueNumber === qn)
                        ).length;
                        const isFullySelected = isGroupFullySelected(group);
                        const isPartiallySelected = isGroupPartiallySelected(group);
                        
                        return (
                          <label
                            key={group.id}
                            className={`queue-toggle-row group-row ${isPartiallySelected ? 'partial' : ''}`}
                          >
                            <div className="queue-toggle-info">
                              <span className="group-name">{group.name}</span>
                              <span className="group-meta">
                                {group.id} • {availableCount} {t('queue_monitor.queues', 'queues')}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`toggle-switch ${isFullySelected ? 'active' : ''} ${isPartiallySelected ? 'partial' : ''}`}
                              onClick={() => toggleGroupSelection(group)}
                              aria-label={`${isFullySelected ? t('queue_login.deselect', 'Deselect') : t('queue_login.select', 'Select')} ${group.name}`}
                            >
                              <span className="toggle-slider" />
                            </button>
                          </label>
                        );
                      })}
                      
                      <div className="queue-section-header">
                        <span>{t('queue_monitor.individual_queues', 'Individual Queues')}</span>
                      </div>
                    </>
                  )}
                  
                  {/* Individual Queues */}
                  {availableQueueOptions.map(queue => {
                    const isSelected = selectedQueues.includes(queue.queueNumber);
                    
                    return (
                      <label 
                        key={queue.queueNumber} 
                        className="queue-toggle-row queue-row"
                      >
                        <div className="queue-toggle-info">
                          <span className="queue-number">{queue.queueNumber}</span>
                          {queue.queueName && (
                            <span className="queue-name">{queue.queueName}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`toggle-switch ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleQueue(queue.queueNumber)}
                          aria-label={`${isSelected ? t('queue_login.deselect', 'Deselect') : t('queue_login.select', 'Select')} ${queue.queueName || queue.queueNumber}`}
                        >
                          <span className="toggle-slider" />
                        </button>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          
          {/* SLA Thresholds Section */}
          <div className="sla-section">
            <div className="section-header">
              <label className="form-label section-title">
                {t('queue_monitor.sla_thresholds', 'SLA Thresholds')}
              </label>
            </div>
            
            {/* Abandoned Calls Threshold */}
            <div className="form-group threshold-group">
              <label className="form-label">
                {t('queue_monitor.abandoned_threshold', 'Abandoned Calls Threshold')}
              </label>
              <p className="form-help-text">
                {t('queue_monitor.abandoned_threshold_desc', 'Set warning and breach thresholds for abandoned call percentage')}
              </p>
              <DualRangeSlider
                min={0}
                max={30}
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
            <div className="form-group threshold-group">
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
              ? t('common.save', 'Save') 
              : t('common.add', 'Add')
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
