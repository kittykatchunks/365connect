// ============================================
// Queue Login Modal Component
// Select queues to join/leave for the agent
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui';
import type { QueueGroup, AvailableQueue } from '@/types/queue-monitor';
import { loadQueueGroups } from '@/utils/queueGroupStorage';
import { isVerboseLoggingEnabled } from '@/utils';
import { phantomApiService, type WallBoardAgent } from '@/services/PhantomApiService';
import { useAppStore } from '@/stores/appStore';
import './QueueLoginModal.css';

interface QueueLoginModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Login callback with selected queues */
  onLogin: (selectedQueues: string[]) => void;
  /** Logout callback (no queues selected) */
  onLogout: () => void;
}

export function QueueLoginModal({
  isOpen,
  onClose,
  onLogin,
  onLogout
}: QueueLoginModalProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Get agent number from store
  const agentNumber = useAppStore((state) => state.agentNumber);
  
  // State
  const [availableQueues, setAvailableQueues] = useState<AvailableQueue[]>([]);
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [queueGroups, setQueueGroups] = useState<QueueGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch queue data when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      if (verboseLogging) {
        console.log('[QueueLoginModal] 📡 Fetching queue data...', { agentNumber });
      }
      
      try {
        // Load queue groups from localStorage
        const groups = loadQueueGroups();
        setQueueGroups(groups);
        
        if (verboseLogging) {
          console.log('[QueueLoginModal] 📁 Loaded queue groups:', groups.length);
        }
        
        // Fetch all available queues from QueueList API
        const queueListResponse = await phantomApiService.fetchQueueList();
        
        if (verboseLogging) {
          console.log('[QueueLoginModal] 📥 QueueList response:', queueListResponse);
        }
        
        if (queueListResponse.success && queueListResponse.data?.aaData) {
          const queues: AvailableQueue[] = queueListResponse.data.aaData.map(item => ({
            queueNumber: item.name,
            queueName: item.label,
            rawData: item
          }));
          setAvailableQueues(queues);
          
          if (verboseLogging) {
            console.log('[QueueLoginModal] ✅ Loaded available queues:', queues.length);
          }
        } else {
          throw new Error('Failed to fetch queue list');
        }
        
        // Fetch WallBoardStats to get agent's current queue membership
        const wallBoardResponse = await phantomApiService.fetchWallBoardStats();
        
        if (verboseLogging) {
          console.log('[QueueLoginModal] 📥 WallBoardStats response:', wallBoardResponse);
        }
        
        if (wallBoardResponse.success && wallBoardResponse.data?.agents) {
          const agents = wallBoardResponse.data.agents as Record<string, WallBoardAgent>;
          
          // Find the logged-in agent's data
          const agentData = agents[agentNumber];
          
          if (agentData && agentData.queues) {
            // Parse CSV queues and pre-select them
            const agentQueues = agentData.queues.split(',').map(q => q.trim()).filter(q => q);
            setSelectedQueues(agentQueues);
            
            if (verboseLogging) {
              console.log('[QueueLoginModal] 🎯 Agent current queues:', {
                agentNumber,
                agentName: agentData.name,
                queues: agentQueues
              });
            }
          } else {
            setSelectedQueues([]);
            
            if (verboseLogging) {
              console.log('[QueueLoginModal] ℹ️ No queue data found for agent:', agentNumber);
            }
          }
        }
        
      } catch (err) {
        console.error('[QueueLoginModal] ❌ Error fetching queue data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load queue data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, agentNumber, verboseLogging]);
  
  // Check if a queue group should be toggled on (all its queues are selected)
  const isGroupFullySelected = useCallback((group: QueueGroup): boolean => {
    if (group.queueNumbers.length === 0) return false;
    return group.queueNumbers.every(qNum => selectedQueues.includes(qNum));
  }, [selectedQueues]);
  
  // Check if a queue group is partially selected
  const isGroupPartiallySelected = useCallback((group: QueueGroup): boolean => {
    if (group.queueNumbers.length === 0) return false;
    const selectedCount = group.queueNumbers.filter(qNum => selectedQueues.includes(qNum)).length;
    return selectedCount > 0 && selectedCount < group.queueNumbers.length;
  }, [selectedQueues]);
  
  // Toggle a queue group
  const toggleGroup = useCallback((group: QueueGroup) => {
    const isFullySelected = isGroupFullySelected(group);
    
    if (verboseLogging) {
      console.log('[QueueLoginModal] 🔄 Toggling group:', {
        groupId: group.id,
        groupName: group.name,
        isFullySelected,
        action: isFullySelected ? 'deselect' : 'select'
      });
    }
    
    if (isFullySelected) {
      // Deselect all queues in this group
      setSelectedQueues(prev => prev.filter(q => !group.queueNumbers.includes(q)));
    } else {
      // Select all queues in this group
      setSelectedQueues(prev => {
        const newSelection = [...prev];
        group.queueNumbers.forEach(qNum => {
          if (!newSelection.includes(qNum)) {
            newSelection.push(qNum);
          }
        });
        return newSelection;
      });
    }
  }, [isGroupFullySelected, verboseLogging]);
  
  // Toggle individual queue
  const toggleQueue = useCallback((queueNumber: string) => {
    if (verboseLogging) {
      console.log('[QueueLoginModal] 🔄 Toggling queue:', queueNumber);
    }
    
    setSelectedQueues(prev => {
      if (prev.includes(queueNumber)) {
        return prev.filter(q => q !== queueNumber);
      } else {
        return [...prev, queueNumber];
      }
    });
  }, [verboseLogging]);
  
  // Select all queues
  const selectAll = useCallback(() => {
    if (verboseLogging) {
      console.log('[QueueLoginModal] ✅ Selecting all queues');
    }
    setSelectedQueues(availableQueues.map(q => q.queueNumber));
  }, [availableQueues, verboseLogging]);
  
  // Deselect all queues
  const deselectAll = useCallback(() => {
    if (verboseLogging) {
      console.log('[QueueLoginModal] ❌ Deselecting all queues');
    }
    setSelectedQueues([]);
  }, [verboseLogging]);
  
  // Check if all queues are selected
  const allSelected = useMemo(() => {
    return availableQueues.length > 0 && 
           availableQueues.every(q => selectedQueues.includes(q.queueNumber));
  }, [availableQueues, selectedQueues]);
  
  // Handle cancel
  const handleCancel = () => {
    if (verboseLogging) {
      console.log('[QueueLoginModal] ❌ Modal cancelled');
    }
    onClose();
  };
  
  // Handle login/logout action
  const handleAction = () => {
    if (selectedQueues.length > 0) {
      if (verboseLogging) {
        console.log('[QueueLoginModal] 🔐 Login with queues:', selectedQueues);
      }
      onLogin(selectedQueues);
    } else {
      if (verboseLogging) {
        console.log('[QueueLoginModal] 🚪 Logout (no queues selected)');
      }
      onLogout();
    }
    onClose();
  };
  
  // Determine if button should show Login or Logout
  const isLoginAction = selectedQueues.length > 0;
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container queue-login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Users className="w-5 h-5" />
            {t('queue_login.title', 'Queue Selection')}
          </h2>
          <button
            className="modal-close-btn"
            onClick={handleCancel}
            aria-label={t('aria_label_close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="modal-body queue-login-body">
          {isLoading ? (
            <div className="queue-login-loading">
              <div className="loading-spinner" />
              <span>{t('queue_login.loading', 'Loading queues...')}</span>
            </div>
          ) : error ? (
            <div className="queue-login-error">
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => setError(null)}>
                {t('common.try_again', 'Try Again')}
              </Button>
            </div>
          ) : (
            <>
              {/* Queue Groups Section */}
              {queueGroups.length > 0 && (
                <div className="queue-groups-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      {t('queue_login.queue_groups', 'Queue Groups')}
                    </h3>
                  </div>
                  <div className="queue-groups-list">
                    {queueGroups.map(group => {
                      const isFullySelected = isGroupFullySelected(group);
                      const isPartiallySelected = isGroupPartiallySelected(group);
                      
                      return (
                        <label 
                          key={group.id} 
                          className={`queue-toggle-row group-row ${isPartiallySelected ? 'partial' : ''}`}
                        >
                          <div className="queue-toggle-info">
                            <span className="queue-group-id">{group.id}</span>
                            <span className="queue-toggle-label">{group.name}</span>
                            <span className="queue-count">
                              ({group.queueNumbers.length} {t('queue_login.queues', 'queues')})
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`toggle-switch ${isFullySelected ? 'active' : ''} ${isPartiallySelected ? 'partial' : ''}`}
                            onClick={() => toggleGroup(group)}
                            aria-label={`${isFullySelected ? t('queue_login.deselect', 'Deselect') : t('queue_login.select', 'Select')} ${group.name}`}
                          >
                            <span className="toggle-slider" />
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* All System Queues Section */}
              <div className="queue-all-section">
                <div className="section-header">
                  <h3 className="section-title">
                    {t('queue_login.all_queues', 'All Queues')}
                  </h3>
                  <span className="queue-selection-count">
                    {selectedQueues.length} / {availableQueues.length} {t('queue_login.selected', 'selected')}
                  </span>
                </div>
                
                {availableQueues.length === 0 ? (
                  <div className="no-queues-message">
                    {t('queue_login.no_queues', 'No queues available on the system')}
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
                    <div className="queue-all-list">
                      {availableQueues.map(queue => {
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
            </>
          )}
        </div>
        
        <div className="modal-footer">
          <Button variant="secondary" onClick={handleCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant={isLoginAction ? 'primary' : 'danger'}
            onClick={handleAction}
            disabled={isLoading}
          >
            {isLoginAction 
              ? t('queue_login.login', 'Login')
              : t('queue_login.logout', 'Logout')
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
