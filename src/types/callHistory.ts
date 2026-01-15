// ============================================
// Call History Types
// ============================================

export type CallStatus = 'completed' | 'missed' | 'cancelled';
export type CallDirection = 'incoming' | 'outgoing';

export interface CallRecord {
  id: string;
  number: string;
  name: string | null;
  direction: CallDirection;
  timestamp: number; // Unix timestamp in milliseconds
  duration: number; // Duration in seconds
  status: CallStatus;
}

export interface CallHistoryGroup {
  date: string;
  label: string;
  records: CallRecord[];
}

export function createCallRecordId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatCallDuration(seconds: number): string {
  if (seconds < 60) {
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function groupCallHistory(records: CallRecord[]): CallHistoryGroup[] {
  const groups: Map<string, CallRecord[]> = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTime = yesterday.getTime();
  
  // Sort records by timestamp descending
  const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);
  
  for (const record of sortedRecords) {
    const recordDate = new Date(record.timestamp);
    recordDate.setHours(0, 0, 0, 0);
    const recordTime = recordDate.getTime();
    
    let dateKey: string;
    if (recordTime >= todayTime) {
      dateKey = 'today';
    } else if (recordTime >= yesterdayTime) {
      dateKey = 'yesterday';
    } else {
      dateKey = recordDate.toISOString().split('T')[0];
    }
    
    const existing = groups.get(dateKey) || [];
    existing.push(record);
    groups.set(dateKey, existing);
  }
  
  const result: CallHistoryGroup[] = [];
  
  for (const [date, groupRecords] of groups) {
    let label: string;
    if (date === 'today') {
      label = 'Today';
    } else if (date === 'yesterday') {
      label = 'Yesterday';
    } else {
      const dateObj = new Date(date);
      label = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    result.push({ date, label, records: groupRecords });
  }
  
  return result;
}
