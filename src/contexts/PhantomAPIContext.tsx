// ============================================
// Phantom API Context - Dynamic Key Management
// ============================================

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { isVerboseLoggingEnabled } from '@/utils';

interface PhantomAPIContextType {
  apiKey: string | null;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  refreshAPIKey: () => Promise<void>;
}

const PhantomAPIContext = createContext<PhantomAPIContextType | null>(null);

interface PhantomAPIProviderProps {
  children: React.ReactNode;
  pollInterval?: number; // Minutes between polling
}

export function PhantomAPIProvider({ 
  children, 
  pollInterval = 5 
}: PhantomAPIProviderProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [lastModified, setLastModified] = useState<number>(0);
  const verboseLogging = isVerboseLoggingEnabled();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAPIKey = useCallback(async () => {
    // Prevent concurrent refresh calls
    if (isRefreshing) {
      if (verboseLogging) {
        console.log('[PhantomAPI] ⏳ Refresh already in progress, skipping...');
      }
      return;
    }

    setIsRefreshing(true);
    try {
      if (verboseLogging) {
        console.log('[PhantomAPI] 🔄 Fetching current API key from server...');
      }

      const response = await fetch('/api/phantom/current-key');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (verboseLogging) {
        console.log('[PhantomAPI] 📥 Received API key response:', {
          hasKey: !!data.apiKey,
          lastModified: data.lastModified,
          timestamp: data.timestamp
        });
      }

      // Only update if key changed (based on server timestamp)
      if (data.lastModified > lastModified) {
        setApiKey(data.apiKey);
        setLastModified(data.lastModified);
        setLastRefresh(new Date());
        
        if (verboseLogging) {
          console.log('[PhantomAPI] ✅ API key updated');
        }
      } else if (verboseLogging) {
        console.log('[PhantomAPI] ℹ️ API key unchanged');
      }
    } catch (error) {
      if (verboseLogging) {
        console.error('[PhantomAPI] ❌ Failed to fetch API key:', error);
      }
      // Don't throw - we'll retry on next poll
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, lastModified, verboseLogging]);

  // Initial fetch on mount
  useEffect(() => {
    if (verboseLogging) {
      console.log('[PhantomAPI] 🚀 Initializing API key provider...');
    }
    refreshAPIKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up polling interval
  useEffect(() => {
    if (pollInterval > 0) {
      const intervalMs = pollInterval * 60 * 1000;
      
      if (verboseLogging) {
        console.log(`[PhantomAPI] ⏰ Setting up polling every ${pollInterval} minutes`);
      }

      pollIntervalRef.current = setInterval(() => {
        if (verboseLogging) {
          console.log('[PhantomAPI] 🔔 Polling interval triggered');
        }
        refreshAPIKey();
      }, intervalMs);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          
          if (verboseLogging) {
            console.log('[PhantomAPI] 🛑 Polling interval cleared');
          }
        }
      };
    }
  }, [pollInterval, refreshAPIKey, verboseLogging]);

  return (
    <PhantomAPIContext.Provider 
      value={{ 
        apiKey, 
        isRefreshing, 
        lastRefresh, 
        refreshAPIKey 
      }}
    >
      {children}
    </PhantomAPIContext.Provider>
  );
}

// Separate file export to maintain Fast Refresh compatibility
export function usePhantomAPI() {
  const context = useContext(PhantomAPIContext);
  if (!context) {
    throw new Error('usePhantomAPI must be used within PhantomAPIProvider');
  }
  return context;
}
