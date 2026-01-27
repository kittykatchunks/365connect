// ============================================
// Queue Monitor View - SLA breach monitoring
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Wifi, WifiOff } from 'lucide-react';
import { PanelHeader } from '@/components/layout';
import { Button } from '@/components/ui';
import { ConfirmModal } from '@/components/modals';
import { QueueMonitorGrid } from './QueueMonitorGrid';
import { QueueModal } from './QueueModal';
import { useTabNotification } from '@/hooks';
import { useQueueMonitorSocket } from '@/contexts';
import type { QueueConfig, QueueStats, QueueAlertState, AvailableQueue } from '@/types/queue-monitor';
import { 
  loadQueueConfigs, 
  saveQueueConfig, 
  deleteQueueConfig,
  deleteAllQueueConfigs,
  updateQueueAlertStatus
} from '@/utils/queueStorage';
import { isVerboseLoggingEnabled } from '@/utils';
import { phantomApiService } from '@/services';
import './QueueMonitorView.css';

export function QueueMonitorView() {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  const { setTabAlert } = useTabNotification();
  
  // Get Socket.IO data
  const socketData = useQueueMonitorSocket();
  const { connectionState, queues: socketQueues, counters: socketCounters } = socketData;
  
  // State
  const [queueConfigs, setQueueConfigs] = useState<QueueConfig[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats[]>([]);
  const [availableQueues, setAvailableQueues] = useState<AvailableQueue[]>([]);
  const [loadingQueues, setLoadingQueues] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<QueueConfig | null>(null);
  const [deleteConfirmQueue, setDeleteConfirmQueue] = useState<string | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  
  // Load configs on mount
  useEffect(() => {
    const configs = loadQueueConfigs();
    setQueueConfigs(configs);
    
    if (verboseLogging) {
      console.log('[QueueMonitorView] 📋 Loaded configs:', configs);
    }
  }, [verboseLogging]);
  
  // Calculate alert states and update tab alerts
  const updateTabAlerts = useCallback(() => {
    const alerts = queueStats.map(stat => stat.alertState);
    
    // Determine highest alert level
    const hasBreach = alerts.includes('breach');
    const hasWarn = alerts.includes('warn');
    
    if (hasBreach) {
      setTabAlert('queueMonitor', 'error'); // Fast red flash
    } else if (hasWarn) {
      setTabAlert('queueMonitor', 'warning'); // Slow yellow flash
    } else {
      setTabAlert('queueMonitor', 'default'); // Clear alert
    }
    
    if (verboseLogging) {
      console.log('[QueueMonitorView] 🚨 Tab alert updated:', { hasBreach, hasWarn });
    }
  }, [queueStats, setTabAlert, verboseLogging]);
  
  // Update tab alerts when stats change
  useEffect(() => {
    if (queueStats.length > 0) {
      updateTabAlerts();
    }
  }, [queueStats, updateTabAlerts]);
  
  // Fetch available queues from Phantom API
  const fetchAvailableQueues = useCallback(async () => {
    setLoadingQueues(true);
    
    if (verboseLogging) {
      console.log('[QueueMonitorView] 📡 Fetching available queues from Phantom API...');
    }
    
    try {
      // Call Phantom API to get queue list
      const response = await phantomApiService.fetchQueueList();
      
      if (verboseLogging) {
        console.log('[QueueMonitorView] 📥 API Response:', response);
      }
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch queue list from API');
      }
      
      // Map API response to AvailableQueue format
      const queues: AvailableQueue[] = response.data.aaData.map(item => ({
        queueNumber: item.name,
        queueName: item.label,
        rawData: item
      }));
      
      setAvailableQueues(queues);
      
      if (verboseLogging) {
        console.log('[QueueMonitorView] ✅ Successfully fetched queues:', {
          count: queues.length,
          queues: queues.map(q => `${q.queueNumber} - ${q.queueName}`)
        });
      }
    } catch (error) {
      console.error('[QueueMonitorView] ❌ Error fetching queues from API:', error);
      
      // Set empty array on error
      setAvailableQueues([]);
      
      // TODO: Show user-facing error notification/toast
    } finally {
      setLoadingQueues(false);
    }
  }, [verboseLogging]);
  
  // Process Socket.IO data when it arrives (real-time updates)
  useEffect(() => {
    if (!socketQueues || !socketCounters || queueConfigs.length === 0) {
      return;
    }

    if (connectionState !== 'connected') {
      if (verboseLogging) {
        console.log('[QueueMonitorView] ⚠️ Socket not connected, skipping stats update');
      }
      return;
    }

    if (verboseLogging) {
      console.log('[QueueMonitorView] 📊 Processing Socket.IO data...');
    }

    // Helper to get counter value safely
    const getCounterValue = (key: string): number => {
      const counter = socketCounters[key];
      return typeof counter === 'number' ? counter : 0;
    };

    // Helper to get agent counts for a queue
    const getAgentCounts = (queueNum: string) => {
      const queueData = socketQueues[queueNum];
      if (!queueData) {
        return { total: 0, free: 0, busy: 0, paused: 0 };
      }

      const total = queueData.agents || 0;
      const paused = queueData.paused || 0;
      const oncall = queueData.oncall || 0;
      const free = Math.max(0, total - paused - oncall);

      return { total, free, busy: oncall, paused };
    };

    // Parse stats for each configured queue
    const stats: QueueStats[] = queueConfigs.map(config => {
      const queueNum = config.queueNumber;
      
      // Extract metrics from counters
      const operatorCalls = getCounterValue(`operator-${queueNum}`);
      const missedCalls = getCounterValue(`missed-${queueNum}`);
      const waitingCalls = getCounterValue(`waiting-${queueNum}`);
      const avgWaitTime = getCounterValue(`avgrng-${queueNum}`);
      
      // Get agent counts from queue status
      const agentCounts = getAgentCounts(queueNum);
      
      // Calculate totals
      const totalCalls = operatorCalls + missedCalls;
      
      // Calculate percentages (avoid division by zero)
      const missedPercent = totalCalls > 0 
        ? Math.round((missedCalls / totalCalls) * 100) 
        : 0;
      const answeredPercent = totalCalls > 0
        ? Math.round((operatorCalls / totalCalls) * 100)
        : 0;
      
      // Determine alert states based on configured thresholds
      let missedAlert: QueueAlertState = 'normal';
      if (missedPercent >= config.abandonedThreshold.breach) {
        missedAlert = 'breach';
      } else if (missedPercent >= config.abandonedThreshold.warn) {
        missedAlert = 'warn';
      }
      
      let awtAlert: QueueAlertState = 'normal';
      if (avgWaitTime >= config.avgWaitTimeThreshold.breach) {
        awtAlert = 'breach';
      } else if (avgWaitTime >= config.avgWaitTimeThreshold.warn) {
        awtAlert = 'warn';
      }
      
      // Overall alert is the highest of the two
      const overallAlert: QueueAlertState = 
        missedAlert === 'breach' || awtAlert === 'breach' ? 'breach' :
        missedAlert === 'warn' || awtAlert === 'warn' ? 'warn' :
        'normal';
      
      // Update alert status in localStorage
      updateQueueAlertStatus({
        queueNumber: config.queueNumber,
        abandonedAlert: missedAlert,
        avgWaitTimeAlert: awtAlert,
        overallAlert
      });
      
      if (verboseLogging) {
        console.log(`[QueueMonitorView] 📈 Queue ${queueNum} stats (Socket.IO):`, {
          operatorCalls,
          missedCalls,
          totalCalls,
          missedPercent,
          avgWaitTime,
          waitingCalls,
          agentCounts,
          alertState: overallAlert
        });
      }
      
      return {
        queueNumber: config.queueNumber,
        queueName: config.queueName,
        agentsTotal: agentCounts.total,
        agentsFree: agentCounts.free,
        agentsBusy: agentCounts.busy,
        agentsPaused: agentCounts.paused,
        waitingCalls,
        answeredPercent,
        abandonedPercent: missedPercent,
        avgWaitTime,
        totalCalls,
        alertState: overallAlert
      };
    });
    
    setQueueStats(stats);
    
    if (verboseLogging) {
      console.log('[QueueMonitorView] ✅ Updated queue stats from Socket.IO:', stats.length, 'queues');
    }
  }, [socketQueues, socketCounters, queueConfigs, connectionState, verboseLogging]);
  
  // Fetch real-time queue stats from Phantom API (FALLBACK - only used if Socket.IO not connected)
  const fetchQueueStats = useCallback(async () => {
    if (queueConfigs.length === 0) {
      setQueueStats([]);
      return;
    }

    if (verboseLogging) {
      console.log('[QueueMonitorView] 📊 Fetching queue stats from Phantom API...');
    }
    
    try {
      // Call Phantom API to get wallboard stats
      const response = await phantomApiService.fetchWallBoardStats();
      
      if (!response.success || !response.data || !response.data.counters) {
        throw new Error('Failed to fetch wallboard stats from API');
      }

      const counters = response.data.counters;

      if (verboseLogging) {
        console.log('[QueueMonitorView] 📥 Wallboard stats counters:', counters);
      }
      
      // Helper to get counter value safely
      const getCounterValue = (key: string): number => {
        const counter = counters[key];
        if (typeof counter === 'object' && counter !== null && 'val' in counter) {
          return Number(counter.val) || 0;
        }
        if (typeof counter === 'number') {
          return counter;
        }
        return 0;
      };
      
      // Parse stats for each configured queue
      const stats: QueueStats[] = queueConfigs.map(config => {
        const queueNum = config.queueNumber;
        
        // Extract metrics from counters
        const operatorCalls = getCounterValue(`operator-${queueNum}`);
        const missedCalls = getCounterValue(`missed-${queueNum}`);
        const waitingCalls = getCounterValue(`waiting-${queueNum}`);
        const avgWaitTime = getCounterValue(`avgrng-${queueNum}`);
        
        // Calculate totals
        const totalCalls = operatorCalls + missedCalls;
        
        // Calculate percentages (avoid division by zero)
        const missedPercent = totalCalls > 0 
          ? Math.round((missedCalls / totalCalls) * 100) 
          : 0;
        const answeredPercent = totalCalls > 0
          ? Math.round((operatorCalls / totalCalls) * 100)
          : 0;
        
        // Determine alert states based on configured thresholds
        let missedAlert: QueueAlertState = 'normal';
        if (missedPercent >= config.abandonedThreshold.breach) {
          missedAlert = 'breach';
        } else if (missedPercent >= config.abandonedThreshold.warn) {
          missedAlert = 'warn';
        }
        
        let awtAlert: QueueAlertState = 'normal';
        if (avgWaitTime >= config.avgWaitTimeThreshold.breach) {
          awtAlert = 'breach';
        } else if (avgWaitTime >= config.avgWaitTimeThreshold.warn) {
          awtAlert = 'warn';
        }
        
        // Overall alert is the highest of the two
        const overallAlert: QueueAlertState = 
          missedAlert === 'breach' || awtAlert === 'breach' ? 'breach' :
          missedAlert === 'warn' || awtAlert === 'warn' ? 'warn' :
          'normal';
        
        // Update alert status in localStorage
        updateQueueAlertStatus({
          queueNumber: config.queueNumber,
          abandonedAlert: missedAlert,
          avgWaitTimeAlert: awtAlert,
          overallAlert
        });
        
        if (verboseLogging) {
          console.log(`[QueueMonitorView] 📈 Queue ${queueNum} stats:`, {
            operatorCalls,
            missedCalls,
            totalCalls,
            missedPercent,
            avgWaitTime,
            waitingCalls,
            alertState: overallAlert
          });
        }
        
        return {
          queueNumber: config.queueNumber,
          queueName: config.queueName,
          // Agent stats not implemented yet - use placeholder zeros
          agentsTotal: 0,
          agentsFree: 0,
          agentsBusy: 0,
          agentsPaused: 0,
          // Calculated metrics
          waitingCalls,
          answeredPercent,
          abandonedPercent: missedPercent,
          avgWaitTime,
          totalCalls,
          alertState: overallAlert
        };
      });
      
      setQueueStats(stats);
      
      if (verboseLogging) {
        console.log('[QueueMonitorView] ✅ Updated queue stats:', stats.length, 'queues');
      }
      
    } catch (error) {
      console.error('[QueueMonitorView] ❌ Error fetching queue stats:', error);
      // Keep existing stats on error, don't clear them
    }
  }, [queueConfigs, verboseLogging]);
  
  // Poll queue stats every 60 seconds (FALLBACK - only when Socket.IO not connected)
  useEffect(() => {
    // Skip API polling if Socket.IO is connected
    if (connectionState === 'connected') {
      if (verboseLogging) {
        console.log('[QueueMonitorView] ⚡ Socket.IO connected - skipping API polling');
      }
      return;
    }

    if (queueConfigs.length > 0) {
      if (verboseLogging) {
        console.log('[QueueMonitorView] ⚠️ Socket.IO not connected - using API fallback');
      }

      // Fetch immediately on mount/config change
      fetchQueueStats();
      
      // Then poll every 60 seconds
      const interval = setInterval(fetchQueueStats, 60000);
      
      if (verboseLogging) {
        console.log('[QueueMonitorView] ⏱️ Started 60-second API polling for', queueConfigs.length, 'queues');
      }
      
      return () => {
        clearInterval(interval);
        if (verboseLogging) {
          console.log('[QueueMonitorView] ⏱️ Stopped polling');
        }
      };
    } else {
      setQueueStats([]);
    }
  }, [queueConfigs, connectionState, fetchQueueStats, verboseLogging]);
  
  // Handlers
  const handleAddQueue = () => {
    fetchAvailableQueues();
    setEditingConfig(null);
    setIsModalOpen(true);
  };
  
  const handleEditQueue = (queueNumber: string) => {
    const config = queueConfigs.find(c => c.queueNumber === queueNumber);
    if (config) {
      fetchAvailableQueues();
      setEditingConfig(config);
      setIsModalOpen(true);
    }
  };
  
  const handleDeleteQueue = (queueNumber: string) => {
    setDeleteConfirmQueue(queueNumber);
  };
  
  const confirmDelete = () => {
    if (deleteConfirmQueue) {
      const updatedConfigs = deleteQueueConfig(deleteConfirmQueue);
      setQueueConfigs(updatedConfigs);
      setDeleteConfirmQueue(null);
      
      // Remove from stats
      setQueueStats(prev => prev.filter(s => s.queueNumber !== deleteConfirmQueue));
    }
  };
  
  const handleSaveConfig = (config: QueueConfig) => {
    const updatedConfigs = saveQueueConfig(config);
    setQueueConfigs(updatedConfigs);
  };
  
  const configuredQueueNumbers = queueConfigs.map(c => c.queueNumber);
  
  // Connection status indicator
  const renderConnectionStatus = () => {
    const isConnected = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting';
    
    return (
      <div 
        className={`connection-status ${connectionState}`}
        title={
          isConnected ? t('queue_monitor.realtime_connected', 'Real-time data connected') :
          isConnecting ? t('queue_monitor.realtime_connecting', 'Connecting to real-time data...') :
          t('queue_monitor.realtime_disconnected', 'Real-time data disconnected (using API fallback)')
        }
      >
        {isConnected ? (
          <Wifi className="w-4 h-4 text-success" />
        ) : (
          <WifiOff className="w-4 h-4 text-muted" />
        )}
      </div>
    );
  };
  
  return (
    <div className="queue-monitor-view">
      <div className="queue-monitor-header">
        <PanelHeader 
          title={t('queue_monitor.title', 'Queue Monitor')}
          subtitle={t('queue_monitor.subtitle', 'Monitor SLA breaches')}
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          {renderConnectionStatus()}
          {queueConfigs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-error"
              onClick={() => setIsDeleteAllConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddQueue}
            className="queue-monitor-add-btn"
          >
            <Plus className="w-4 h-4" />
            {t('queue_monitor.add_queue', 'Add Queue')}
          </Button>
        </div>
      </div>
      
      <div className="queue-monitor-content">
        <QueueMonitorGrid
          queueStats={queueStats}
          queueConfigs={queueConfigs}
          onEdit={handleEditQueue}
          onDelete={handleDeleteQueue}
        />
      </div>
      
      {/* Add/Edit Queue Modal */}
      <QueueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveConfig}
        existingConfig={editingConfig}
        availableQueues={availableQueues}
        loadingQueues={loadingQueues}
        configuredQueueNumbers={configuredQueueNumbers}
      />
      
      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirmQueue}
        onClose={() => setDeleteConfirmQueue(null)}
        onConfirm={confirmDelete}
        title={t('queue_monitor.delete_title', 'Delete Queue Monitor')}
        message={t('queue_monitor.delete_message', 'Are you sure you want to stop monitoring this queue?')}
        confirmText={t('common.delete', 'Delete')}
      />
      
      {/* Delete All Queues Confirm */}
      <ConfirmModal
        isOpen={isDeleteAllConfirmOpen}
        onClose={() => setIsDeleteAllConfirmOpen(false)}
        onConfirm={() => {
          const cleared = deleteAllQueueConfigs();
          setQueueConfigs(cleared);
          setQueueStats([]);
          setIsDeleteAllConfirmOpen(false);
          
          if (verboseLogging) {
            console.log('[QueueMonitorView] 🗑️ All queue monitors deleted');
          }
        }}
        title={t('queue_monitor.delete_all_title', 'Delete All Queue Monitors')}
        message={t('queue_monitor.delete_all_message', 'Are you sure you want to delete all {{count}} queue monitors? This cannot be undone.', {
          count: queueConfigs.length
        })}
        confirmText={t('queue_monitor.delete_all', 'Delete All')}
        variant="danger"
      />
    </div>
  );
}
