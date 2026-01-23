// ============================================
// Queue Transfer List Component (Method 2)
// Two-column transfer list for selecting queues
// Used when >20 queues available
// ============================================

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Search } from 'lucide-react';
import type { AvailableQueue } from '@/types/queue-monitor';
import { isVerboseLoggingEnabled } from '@/utils';
import './QueueTransferList.css';

interface QueueTransferListProps {
  /** List of available queues from API */
  availableQueues: AvailableQueue[];
  /** Currently selected queue numbers */
  selectedQueues: string[];
  /** Callback when selection changes */
  onSelectionChange: (selectedQueues: string[]) => void;
  /** Whether the list is disabled (e.g., during edit mode) */
  disabled?: boolean;
}

export function QueueTransferList({
  availableQueues,
  selectedQueues,
  onSelectionChange,
  disabled = false
}: QueueTransferListProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchSelected, setSearchSelected] = useState('');
  const [highlightedAvailable, setHighlightedAvailable] = useState<string[]>([]);
  const [highlightedSelected, setHighlightedSelected] = useState<string[]>([]);
  
  // Filter available queues (not yet selected)
  const availableList = useMemo(() => {
    const unselected = availableQueues.filter(q => !selectedQueues.includes(q.queueNumber));
    
    if (!searchAvailable) return unselected;
    
    const searchLower = searchAvailable.toLowerCase();
    return unselected.filter(q => 
      q.queueNumber.toLowerCase().includes(searchLower) ||
      q.queueName?.toLowerCase().includes(searchLower)
    );
  }, [availableQueues, selectedQueues, searchAvailable]);
  
  // Filter selected queues
  const selectedList = useMemo(() => {
    const selected = availableQueues.filter(q => selectedQueues.includes(q.queueNumber));
    
    if (!searchSelected) return selected;
    
    const searchLower = searchSelected.toLowerCase();
    return selected.filter(q => 
      q.queueNumber.toLowerCase().includes(searchLower) ||
      q.queueName?.toLowerCase().includes(searchLower)
    );
  }, [availableQueues, selectedQueues, searchSelected]);
  
  // Toggle highlight on queue item
  const toggleHighlight = (queueNumber: string, list: 'available' | 'selected') => {
    if (disabled) return;
    
    if (list === 'available') {
      setHighlightedAvailable(prev => 
        prev.includes(queueNumber) 
          ? prev.filter(q => q !== queueNumber)
          : [...prev, queueNumber]
      );
    } else {
      setHighlightedSelected(prev => 
        prev.includes(queueNumber) 
          ? prev.filter(q => q !== queueNumber)
          : [...prev, queueNumber]
      );
    }
  };
  
  // Move highlighted items from available to selected
  const moveToSelected = () => {
    if (disabled || highlightedAvailable.length === 0) return;
    
    const newSelected = [...selectedQueues, ...highlightedAvailable];
    onSelectionChange(newSelected);
    setHighlightedAvailable([]);
    
    if (verboseLogging) {
      console.log('[QueueTransferList] 📤 Moved to selected:', highlightedAvailable);
    }
  };
  
  // Move highlighted items from selected to available
  const moveToAvailable = () => {
    if (disabled || highlightedSelected.length === 0) return;
    
    const newSelected = selectedQueues.filter(q => !highlightedSelected.includes(q));
    onSelectionChange(newSelected);
    setHighlightedSelected([]);
    
    if (verboseLogging) {
      console.log('[QueueTransferList] 📥 Moved to available:', highlightedSelected);
    }
  };
  
  // Move all available to selected
  const moveAllToSelected = () => {
    if (disabled || availableList.length === 0) return;
    
    const allAvailable = availableList.map(q => q.queueNumber);
    const newSelected = [...selectedQueues, ...allAvailable];
    onSelectionChange(newSelected);
    setHighlightedAvailable([]);
    
    if (verboseLogging) {
      console.log('[QueueTransferList] 📤📤 Moved all to selected:', allAvailable.length);
    }
  };
  
  // Move all selected to available
  const moveAllToAvailable = () => {
    if (disabled || selectedList.length === 0) return;
    
    onSelectionChange([]);
    setHighlightedSelected([]);
    
    if (verboseLogging) {
      console.log('[QueueTransferList] 📥📥 Moved all to available');
    }
  };
  
  // Handle double-click to move single item
  const handleDoubleClick = (queueNumber: string, list: 'available' | 'selected') => {
    if (disabled) return;
    
    if (list === 'available') {
      onSelectionChange([...selectedQueues, queueNumber]);
    } else {
      onSelectionChange(selectedQueues.filter(q => q !== queueNumber));
    }
    
    if (verboseLogging) {
      console.log('[QueueTransferList] ⚡ Double-click move:', queueNumber, list);
    }
  };
  
  return (
    <div className="queue-transfer-list">
      <div className="transfer-list-container">
        {/* Available Queues Column */}
        <div className="transfer-column">
          <div className="column-header">
            <h3 className="column-title">
              {t('queue_monitor.available_queues', 'Available Queues')}
            </h3>
            <span className="column-count">
              ({availableList.length})
            </span>
          </div>
          
          {/* Search box */}
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder={t('queue_monitor.search_queues', 'Search queues...')}
              value={searchAvailable}
              onChange={(e) => setSearchAvailable(e.target.value)}
              className="search-input"
              disabled={disabled}
            />
          </div>
          
          {/* Queue list */}
          <div className="queue-list">
            {availableList.length === 0 ? (
              <div className="list-empty">
                {searchAvailable 
                  ? t('queue_monitor.no_matches', 'No matching queues')
                  : t('queue_monitor.all_queues_selected', 'All queues selected')
                }
              </div>
            ) : (
              availableList.map((queue) => (
                <div
                  key={queue.queueNumber}
                  className={`queue-item ${highlightedAvailable.includes(queue.queueNumber) ? 'highlighted' : ''}`}
                  onClick={() => toggleHighlight(queue.queueNumber, 'available')}
                  onDoubleClick={() => handleDoubleClick(queue.queueNumber, 'available')}
                >
                  <span className="queue-number">{queue.queueNumber}</span>
                  {queue.queueName && (
                    <span className="queue-name">{queue.queueName}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Transfer Buttons Column */}
        <div className="transfer-buttons">
          <button
            type="button"
            className="transfer-btn"
            onClick={moveAllToSelected}
            disabled={disabled || availableList.length === 0}
            title={t('queue_monitor.move_all_right', 'Move all to selected')}
          >
            <ChevronsRight size={20} />
          </button>
          <button
            type="button"
            className="transfer-btn"
            onClick={moveToSelected}
            disabled={disabled || highlightedAvailable.length === 0}
            title={t('queue_monitor.move_right', 'Move selected to right')}
          >
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            className="transfer-btn"
            onClick={moveToAvailable}
            disabled={disabled || highlightedSelected.length === 0}
            title={t('queue_monitor.move_left', 'Move selected to left')}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="transfer-btn"
            onClick={moveAllToAvailable}
            disabled={disabled || selectedList.length === 0}
            title={t('queue_monitor.move_all_left', 'Move all to available')}
          >
            <ChevronsLeft size={20} />
          </button>
        </div>
        
        {/* Selected Queues Column */}
        <div className="transfer-column">
          <div className="column-header">
            <h3 className="column-title">
              {t('queue_monitor.selected_queues_title', 'Selected Queues')}
            </h3>
            <span className="column-count">
              ({selectedList.length})
            </span>
          </div>
          
          {/* Search box */}
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder={t('queue_monitor.search_queues', 'Search queues...')}
              value={searchSelected}
              onChange={(e) => setSearchSelected(e.target.value)}
              className="search-input"
              disabled={disabled}
            />
          </div>
          
          {/* Queue list */}
          <div className="queue-list">
            {selectedList.length === 0 ? (
              <div className="list-empty">
                {searchSelected 
                  ? t('queue_monitor.no_matches', 'No matching queues')
                  : t('queue_monitor.no_queues_selected', 'No queues selected')
                }
              </div>
            ) : (
              selectedList.map((queue) => (
                <div
                  key={queue.queueNumber}
                  className={`queue-item ${highlightedSelected.includes(queue.queueNumber) ? 'highlighted' : ''}`}
                  onClick={() => toggleHighlight(queue.queueNumber, 'selected')}
                  onDoubleClick={() => handleDoubleClick(queue.queueNumber, 'selected')}
                >
                  <span className="queue-number">{queue.queueNumber}</span>
                  {queue.queueName && (
                    <span className="queue-name">{queue.queueName}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Hint text */}
      <p className="transfer-hint">
        {t('queue_monitor.transfer_hint', 'Click to highlight, double-click to move, or use buttons to transfer queues')}
      </p>
    </div>
  );
}
