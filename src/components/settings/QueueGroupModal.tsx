// ============================================
// Add/Edit Queue Group Modal Component
// Configure queue groups for grouped monitoring
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
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
  /** List of available queues from storage */
  availableQueues: AvailableQueue[];
  /** Auto-generated group ID (for new groups) */
  groupId: string;
}

export function QueueGroupModal({
  isOpen,
  onClose,
  onSave,
  existingGroup,
  availableQueues,
  groupId
}: QueueGroupModalProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isEditing = !!existingGroup;
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
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
    setSelectedQueues(availableQueues.map(q => q.queueNumber));
  };
  
  // Clear all selections
  const clearAllQueues = () => {
    setSelectedQueues([]);
  };
  
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
        
        <div className="modal-body">
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
          <div className="form-group">
            <label className="form-label">
              {t('settings.select_queues', 'Select Queues')}
            </label>
            <p className="form-help-text">
              {t('settings.select_queues_desc', 'Select one or more queues for this group')}
            </p>
            
            {/* Multi-select dropdown */}
            <div className="queue-multiselect-container" ref={dropdownRef}>
              <button
                type="button"
                className="queue-multiselect-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="trigger-text">
                  {selectedQueues.length === 0
                    ? t('settings.select_queues_placeholder', 'Click to select queues')
                    : t('settings.queues_selected', '{{count}} queue(s) selected', { count: selectedQueues.length })
                  }
                </span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </button>
              
              {/* Dropdown list */}
              {isDropdownOpen && (
                <div className="queue-multiselect-dropdown">
                  {/* Select All / Clear All buttons */}
                  {availableQueues.length > 0 && (
                    <div className="dropdown-actions">
                      <button
                        type="button"
                        className="action-btn"
                        onClick={selectAllQueues}
                      >
                        {t('settings.select_all', 'Select All')}
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={clearAllQueues}
                      >
                        {t('settings.clear_all', 'Clear All')}
                      </button>
                    </div>
                  )}
                  
                  {/* Queue list */}
                  {availableQueues.length > 0 ? (
                    <div className="queue-option-list">
                      {availableQueues.map(queue => (
                        <label
                          key={queue.queueNumber}
                          className="queue-option"
                        >
                          <input
                            type="checkbox"
                            checked={selectedQueues.includes(queue.queueNumber)}
                            onChange={() => toggleQueueSelection(queue.queueNumber)}
                          />
                          <span className="queue-option-label">
                            {queue.queueNumber}
                            {queue.queueName && (
                              <span className="queue-option-name"> - {queue.queueName}</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="no-queues-message">
                      {t('settings.no_queues_available', 'No queues available')}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Selected queues badges */}
            {selectedQueues.length > 0 && (
              <div className="selected-queues-badges">
                {selectedQueues.map(queueNumber => {
                  const queue = availableQueues.find(q => q.queueNumber === queueNumber);
                  return (
                    <div key={queueNumber} className="queue-badge">
                      <span className="badge-text">
                        {queue?.queueName || queueNumber}
                      </span>
                      <button
                        type="button"
                        className="badge-remove"
                        onClick={() => removeQueueFromSelection(queueNumber)}
                        aria-label={t('aria_label_remove', 'Remove')}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
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
