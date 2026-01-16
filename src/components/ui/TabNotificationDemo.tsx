// ============================================
// Tab Notification Demo Component
// Test component to demonstrate tab notification functionality
// ============================================

import { useTabNotification } from '@/hooks';
import type { ViewType } from '@/types';

export function TabNotificationDemo() {
  const { setTabAlert, clearTabAlert, clearAllAlerts, getTabState } = useTabNotification();
  
  const tabs: ViewType[] = ['dial', 'contacts', 'activity', 'companyNumbers', 'queueMonitor', 'settings'];
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Tab Notification System Demo</h2>
      <p>Use the buttons below to test tab notification alerts.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Set Tab Alerts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
          {tabs.map((tab) => (
            <div key={tab} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <strong style={{ textTransform: 'capitalize' }}>{tab}</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button 
                  onClick={() => setTabAlert(tab, 'warning')}
                  style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b' }}
                >
                  ⚠️ Warning
                </button>
                <button 
                  onClick={() => setTabAlert(tab, 'error')}
                  style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#fee2e2', border: '1px solid #ef4444' }}
                >
                  ❌ Error
                </button>
                <button 
                  onClick={() => clearTabAlert(tab)}
                  style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}
                >
                  ✅ Clear
                </button>
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>
                  State: {getTabState(tab)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3>Bulk Actions</h3>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={() => {
              setTabAlert('contacts', 'warning');
              setTabAlert('activity', 'error');
              setTabAlert('queueMonitor', 'warning');
            }}
            style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Test Multiple Alerts
          </button>
          <button 
            onClick={() => clearAllAlerts()}
            style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Clear All Alerts
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Instructions</h3>
        <ul style={{ marginBottom: 0 }}>
          <li><strong>Warning State:</strong> Slow yellow flash (2 seconds)</li>
          <li><strong>Error State:</strong> Fast red flash (0.5 seconds)</li>
          <li><strong>Persistence:</strong> Alerts survive page refresh</li>
          <li><strong>Priority:</strong> Error state overrides warning if set on same tab</li>
          <li><strong>Navigation:</strong> Switch between tabs to see the effect continues</li>
          <li><strong>Verbose Logging:</strong> Enable in Settings {'->'} Advanced Settings to see logs</li>
        </ul>
      </div>
    </div>
  );
}
