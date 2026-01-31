// ============================================
// Add/Edit Queue Group Modal Component
// Configure queue groups for grouped monitoring
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ListChecks } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { QueueGroup, AvailableQueue } from '@/types/queue-monitor';
import { isVerboseLoggingEnabled } from '@/utils';
import './QueueGroupModal.css';

interface QueueGroupModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Save queue group callback */
  onSave: (group: QueueGroup) => void;
  /** Existing group if editing, null if adding new */
  existingGroup?: QueueGroup | null;
  /** List of available queues from API */
  availableQueues: AvailableQueue[];
  /** Auto-generated group ID (for new groups) */
  groupId: string;
  /** Whether queues are being loaded from API */
  loadingQueues?: boolean;
  /** Queue numbers already assigned to other groups (to prevent duplicates) */
  configuredQueueNumbers?: string[];
}

export function QueueGroupModal({
  isOpen,
  onClose,
  onSave,
  existingGroup,
  availableQueues,
  groupId,
  loadingQueues = false,
  configuredQueueNumbers = []
}: QueueGroupModalProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  const isEditing = !!existingGroup;
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  
  // Initialize form with existing group when editing, or reset when opening for new entry
  useEffect(() => {
    if (!isOpen) return;
    
    if (existingGroup) {
      setGroupName(existingGroup.name);
      setSelectedQueues(existingGroup.queueNumbers);
      
      if (verboseLogging) {
        console.log('[QueueGroupModal] 📝 Initialized form with existing group:', existingGroup);
      }
    } else {
      // Reset form for new entry
      setGroupName('');
      setSelectedQueues([]);
      
      if (verboseLogging) {
        console.log('[QueueGroupModal] 🆕 Reset form for new queue group');
      }
    }
  }, [isOpen, existingGroup, verboseLogging]);
  
  const handleSave = () => {
    if (!groupName.trim()) {
      if (verboseLogging) {
        console.warn('[QueueGroupModal] ⚠️ Group name is required');
      }
      return;
    }
    
    if (selectedQueues.length === 0) {
      if (verboseLogging) {
        console.warn('[QueueGroupModal] ⚠️ No queues selected');
      }
      return;
    }
    
    const group: QueueGroup = {
      id: isEditing ? existingGroup.id : groupId,
      name: groupName.trim(),
      queueNumbers: selectedQueues
    };
    
    if (verboseLogging) {
      console.log('[QueueGroupModal] 💾 Saving queue group:', group);
    }
    
    onSave(group);
    onClose();
  };
  
  const handleCancel = () => {
    if (verboseLogging) {
      console.log('[QueueGroupModal] ❌ Modal cancelled');
    }
    onClose();
  };
  
  // Filter out already configured queues (except when editing current group's queues)
  const availableQueueOptions = availableQueues.filter(q => 
    !configuredQueueNumbers.includes(q.queueNumber) || 
    (isEditing && existingGroup?.queueNumbers.includes(q.queueNumber))
  );
  
  if (verboseLogging && isOpen) {
    console.log('[QueueGroupModal] 📋 Queue filtering:', {
      totalAvailable: availableQueues.length,
      configuredInOtherGroups: configuredQueueNumbers.length,
      availableAfterFiltering: availableQueueOptions.length,
      isEditing
    });
  }
  
  // Toggle queue selection
  const toggleQueue = (queueNumber: string) => {
    setSelectedQueues(prev => {
      if (prev.includes(queueNumber)) {
        return prev.filter(q => q !== queueNumber);
      } else {
        return [...prev, queueNumber];
      }
    });
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
      <div className="modal-container queue-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing 
              ? t('settings.edit_queue_group', 'Edit Queue Group') 
              : t('settings.add_queue_group', 'Add Queue Group')
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
        
        <div className="modal-body queue-group-body">
          {/* Group ID Display */}
          <div className="form-group">
            <label className="form-label">
              {t('settings.queue_group_id', 'Group ID')}
            </label>
            <div className="group-id-display">
              {isEditing ? existingGroup.id : groupId}
            </div>
          </div>
          
          {/* Group Name Input */}
          <div className="form-group">
            <label className="form-label">
              {t('settings.queue_group_name', 'Group Name')}
            </label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('settings.queue_group_name_placeholder', 'Enter group name')}
              autoFocus
            />
          </div>
          
          {/* Queue Selection */}
          <div className="form-group queue-selection-group">
            <div className="section-header">
              <label className="form-label">
                {t('settings.select_queues', 'Select Queues')}
              </label>
              <span className="queue-selection-count">
                {selectedQueues.length} / {availableQueueOptions.length} {t('queue_login.selected', 'selected')}
              </span>
            </div>
            
            {loadingQueues ? (
              <div className="queue-loading">
                <div className="loading-spinner" />
                <span>{t('settings.loading_queues', 'Loading queues...')}</span>
              </div>
            ) : availableQueueOptions.length === 0 ? (
              <div className="no-queues-message">
                {t('settings.no_queues_available', 'No queues available')}
              </div>
            ) : (
              <>
                {/* De/Select All Toggle */}
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
        </div>
        
        <div className="modal-footer">
          <Button variant="secondary" onClick={handleCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!groupName.trim() || selectedQueues.length === 0}
          >
            {isEditing ? t('common.save', 'Save') : t('common.add', 'Add')}
          </Button>
        </div>
      </div>
    </div>
  );
}
