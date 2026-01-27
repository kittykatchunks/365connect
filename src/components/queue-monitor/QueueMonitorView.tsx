// ============================================
// Queue Monitor View - SLA breach monitoring
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { PanelHeader } from '@/components/layout';
import { Button } from '@/components/ui';
import { ConfirmModal } from '@/components/modals';
import { QueueMonitorGrid } from './QueueMonitorGrid';
import { QueueModal } from './QueueModal';
import { useTabNotification } from '@/hooks';
import type { QueueConfig, QueueStats, QueueAlertState, AvailableQueue } from '@/types/queue-monitor';
import { 
  loadQueueConfigs, 
  saveQueueConfig, 
  deleteQueueConfig,
  deleteAllQueueConfigs,
  updateQueueAlertStatus
} from '@/utils/queueStorage';
import { isVerboseLoggingEnabled } from '@/utils';
import './QueueMonitorView.css';

export function QueueMonitorView() {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  const { setTabAlert } = useTabNotification();
  
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
  
  // Mock function to fetch available queues from API
  // TODO: Replace with actual Phantom API call
  const fetchAvailableQueues = useCallback(async () => {
    setLoadingQueues(true);
    
    if (verboseLogging) {
      console.log('[QueueMonitorView] 📡 Fetching available queues from API...');
    }
    
    try {
      // Simulated API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      const mockQueues: AvailableQueue[] = [
        { queueNumber: '600', queueName: 'Main Support' },
        { queueNumber: '601', queueName: 'Sales' },
        { queueNumber: '602', queueName: 'Technical Support' },
        { queueNumber: '603', queueName: 'Billing Department' },
        { queueNumber: '604', queueName: 'Customer Service' },
        { queueNumber: '605', queueName: 'VIP Support' },
        { queueNumber: '606', queueName: 'Hardware Support' },
        { queueNumber: '607', queueName: 'Software Support' },
        { queueNumber: '608', queueName: 'Network Operations' },
        { queueNumber: '609', queueName: 'Security Team' },
        { queueNumber: '610', queueName: 'Account Management' },
        { queueNumber: '611', queueName: 'New Customers' },
        { queueNumber: '612', queueName: 'Premium Support' },
        { queueNumber: '613', queueName: 'Product Support' },
        { queueNumber: '614', queueName: 'Training Team' },
        { queueNumber: '615', queueName: 'Escalation Team' },
        { queueNumber: '616', queueName: 'International' },
        { queueNumber: '617', queueName: 'Complaints' },
        { queueNumber: '618', queueName: 'Renewals' },
        { queueNumber: '619', queueName: 'Upgrades' },
        { queueNumber: '620', queueName: 'Emergency Support' },
        { queueNumber: '650', queueName: 'After Hours' }
      ];
      
      setAvailableQueues(mockQueues);
      
      if (verboseLogging) {
        console.log('[QueueMonitorView] ✅ Fetched queues:', mockQueues);
      }
    } catch (error) {
      console.error('[QueueMonitorView] ❌ Error fetching queues:', error);
      setAvailableQueues([]);
    } finally {
      setLoadingQueues(false);
    }
  }, [verboseLogging]);
  
  // Mock function to fetch queue stats
  // TODO: Replace with actual Phantom API polling
  const fetchQueueStats = useCallback(() => {
    if (verboseLogging) {
      console.log('[QueueMonitorView] 📊 Fetching queue stats...');
    }
    
    // Generate mock stats for configured queues
    const stats: QueueStats[] = queueConfigs.map(config => {
      // Simulate random stats
      const abandonedPercent = Math.floor(Math.random() * 30);
      const avgWaitTime = Math.floor(Math.random() * 100);
      
      // Determine alert states
      let abandonedAlert: QueueAlertState = 'normal';
      if (abandonedPercent >= config.abandonedThreshold.breach) {
        abandonedAlert = 'breach';
      } else if (abandonedPercent >= config.abandonedThreshold.warn) {
        abandonedAlert = 'warn';
      }
      
      let awtAlert: QueueAlertState = 'normal';
      if (avgWaitTime >= config.avgWaitTimeThreshold.breach) {
        awtAlert = 'breach';
      } else if (avgWaitTime >= config.avgWaitTimeThreshold.warn) {
        awtAlert = 'warn';
      }
      
      // Overall alert is the highest of the two
      const overallAlert: QueueAlertState = 
        abandonedAlert === 'breach' || awtAlert === 'breach' ? 'breach' :
        abandonedAlert === 'warn' || awtAlert === 'warn' ? 'warn' :
        'normal';
      
      // Update alert status in localStorage
      updateQueueAlertStatus({
        queueNumber: config.queueNumber,
        abandonedAlert,
        avgWaitTimeAlert: awtAlert,
        overallAlert
      });
      
      return {
        queueNumber: config.queueNumber,
        queueName: config.queueName,
        agentsTotal: Math.floor(Math.random() * 20) + 1,
        agentsFree: Math.floor(Math.random() * 10),
        agentsBusy: Math.floor(Math.random() * 8),
        agentsPaused: Math.floor(Math.random() * 5),
        answeredPercent: 100 - abandonedPercent,
        abandonedPercent,
        avgWaitTime,
        totalCalls: Math.floor(Math.random() * 500) + 100,
        alertState: overallAlert
      };
    });
    
    setQueueStats(stats);
  }, [queueConfigs, verboseLogging]);
  
  // Poll queue stats every 5 seconds
  useEffect(() => {
    if (queueConfigs.length > 0) {
      fetchQueueStats();
      const interval = setInterval(fetchQueueStats, 5000);
      return () => clearInterval(interval);
    }
  }, [queueConfigs, fetchQueueStats]);
  
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
  
  return (
    <div className="queue-monitor-view">
      <div className="queue-monitor-header">
        <PanelHeader 
          title={t('queue_monitor.title', 'Queue Monitor')}
          subtitle={t('queue_monitor.subtitle', 'Monitor SLA breaches')}
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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
