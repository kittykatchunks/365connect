// ============================================
// Queue Monitor Grid Component
// Displays monitored queues with real-time stats and SLA indicators
// ============================================

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, TrendingUp } from 'lucide-react';
import type { QueueStats, QueueConfig } from '@/types/queue-monitor';
import { cn } from '@/utils';
import './QueueMonitorGrid.css';

interface QueueMonitorGridProps {
  /** Array of queue statistics */
  queueStats: QueueStats[];
  /** Array of queue configurations for threshold checking */
  queueConfigs: QueueConfig[];
  /** Callback when edit button clicked */
  onEdit: (queueNumber: string) => void;
  /** Callback when delete button clicked */
  onDelete: (queueNumber: string) => void;
}

export function QueueMonitorGrid({
  queueStats,
  queueConfigs,
  onEdit,
  onDelete
}: QueueMonitorGridProps) {
  const { t } = useTranslation();
  
  // Sort queues: BREACH first, then WARN, then normal (by queue number)
  const sortedQueues = useMemo(() => {
    return [...queueStats].sort((a, b) => {
      // Sort by alert state priority
      const alertPriority = { breach: 3, warn: 2, normal: 1 };
      const aPriority = alertPriority[a.alertState];
      const bPriority = alertPriority[b.alertState];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Same alert state - sort by queue number
      return Number(a.queueNumber) - Number(b.queueNumber);
    });
  }, [queueStats]);
  
  // Get cell class based on value and thresholds
  const getCellClass = (
    value: number,
    warnThreshold: number,
    breachThreshold: number
  ): string => {
    if (value >= breachThreshold) {
      return 'cell-breach';
    }
    if (value >= warnThreshold) {
      return 'cell-warn';
    }
    return '';
  };
  
  // Get config for a queue
  const getConfig = (queueNumber: string): QueueConfig | undefined => {
    return queueConfigs.find(c => c.queueNumber === queueNumber);
  };
  
  if (queueStats.length === 0) {
    return (
      <div className="queue-monitor-empty">
        <TrendingUp className="empty-icon" />
        <h3>{t('queue_monitor.no_queues', 'No Monitored Queues')}</h3>
        <p>{t('queue_monitor.no_queues_desc', 'Add queues to start monitoring SLA performance')}</p>
      </div>
    );
  }
  
  return (
    <div className="queue-monitor-grid-container">
      <div className="queue-monitor-grid">
        {/* Header Row */}
        <div className="grid-header">
          <div className="grid-cell header-cell">{t('queue_monitor.que', 'QUE')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.agts', 'AGTS')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.free', 'FREE')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.busy', 'BUSY')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.pause', 'PAUSE')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.ans', 'ANS')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.abd', 'ABD')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.awt', 'AWT')}</div>
          <div className="grid-cell header-cell">{t('queue_monitor.tot', 'TOT')}</div>
          <div className="grid-cell header-cell actions-cell">{t('common.actions', 'Actions')}</div>
        </div>
        
        {/* Data Rows */}
        {sortedQueues.map((queue) => {
          const config = getConfig(queue.queueNumber);
          const abandonedClass = config 
            ? getCellClass(
                queue.abandonedPercent, 
                config.abandonedThreshold.warn, 
                config.abandonedThreshold.breach
              )
            : '';
          const awtClass = config 
            ? getCellClass(
                queue.avgWaitTime, 
                config.avgWaitTimeThreshold.warn, 
                config.avgWaitTimeThreshold.breach
              )
            : '';
            
          return (
            <div 
              key={queue.queueNumber} 
              className={cn('grid-row', {
                'row-breach': queue.alertState === 'breach',
                'row-warn': queue.alertState === 'warn'
              })}
            >
              <div className="grid-cell queue-cell">
                <div className="queue-info">
                  <span className="queue-number">{queue.queueNumber}</span>
                  {queue.queueName && (
                    <span className="queue-name">{queue.queueName}</span>
                  )}
                </div>
              </div>
              <div className="grid-cell">{queue.agentsTotal}</div>
              <div className="grid-cell">{queue.agentsFree}</div>
              <div className="grid-cell">{queue.agentsBusy}</div>
              <div className="grid-cell">{queue.agentsPaused}</div>
              <div className="grid-cell">{queue.answeredPercent}%</div>
              <div className={cn('grid-cell', abandonedClass)}>
                {queue.abandonedPercent}%
                {abandonedClass && (
                  <span className="trend-icon">
                    {abandonedClass === 'cell-breach' ? '🔴' : '⚠️'}
                  </span>
                )}
              </div>
              <div className={cn('grid-cell', awtClass)}>
                {queue.avgWaitTime}s
                {awtClass && (
                  <span className="trend-icon">
                    {awtClass === 'cell-breach' ? '🔴' : '⚠️'}
                  </span>
                )}
              </div>
              <div className="grid-cell">{queue.totalCalls}</div>
              <div className="grid-cell actions-cell">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(queue.queueNumber)}
                  title={t('common.edit', 'Edit')}
                  aria-label={t('queue_monitor.edit_queue_aria', 'Edit queue {{queue}}', { queue: queue.queueNumber })}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => onDelete(queue.queueNumber)}
                  title={t('common.delete', 'Delete')}
                  aria-label={t('queue_monitor.delete_queue_aria', 'Delete queue {{queue}}', { queue: queue.queueNumber })}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="queue-monitor-legend">
        <h4 className="legend-title">{t('queue_monitor.legend', 'Legend')}</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-abbr">QUE</span>
            <span className="legend-desc">{t('queue_monitor.legend_que', 'Queue Number or Name')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">AGTS</span>
            <span className="legend-desc">{t('queue_monitor.legend_agts', 'Agents logged into queue')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">FREE</span>
            <span className="legend-desc">{t('queue_monitor.legend_free', 'Agents currently available')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">BUSY</span>
            <span className="legend-desc">{t('queue_monitor.legend_busy', 'Agents currently on a call')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">PAUSE</span>
            <span className="legend-desc">{t('queue_monitor.legend_pause', 'Agents currently paused in the queue')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">ANS</span>
            <span className="legend-desc">{t('queue_monitor.legend_ans', '% of total incoming calls answered')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">ABD</span>
            <span className="legend-desc">{t('queue_monitor.legend_abd', '% of total incoming calls missed/abandoned')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">AWT</span>
            <span className="legend-desc">{t('queue_monitor.legend_awt', 'Average Waiting Time in queue to be answered in seconds')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-abbr">TOT</span>
            <span className="legend-desc">{t('queue_monitor.legend_tot', 'Total calls delivered to queue since last stats reset')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
