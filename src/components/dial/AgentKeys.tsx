// ============================================
// Agent Keys - Call Center Agent Controls
// ============================================

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, LogOut, Users, Pause, Play } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui';
import { useAppStore } from '@/stores';
import { useSIP } from '@/hooks';

export type AgentState = 'logged-out' | 'available' | 'paused' | 'on-call';
export type QueueState = 'none' | 'in-queue' | 'paused';

interface AgentKeysProps {
  className?: string;
}

export function AgentKeys({ className }: AgentKeysProps) {
  const { t } = useTranslation();
  
  // Agent state from store
  const agentState = useAppStore((state) => state.agentState);
  const queueState = useAppStore((state) => state.queueState);
  const agentNumber = useAppStore((state) => state.agentNumber);
  const setAgentState = useAppStore((state) => state.setAgentState);
  const setQueueState = useAppStore((state) => state.setQueueState);
  
  const { isRegistered } = useSIP();
  
  const [isLoading, setIsLoading] = useState(false);
  
  const isLoggedIn = agentState !== 'logged-out';
  const isPaused = agentState === 'paused';
  const isInQueue = queueState === 'in-queue';
  
  // Agent login
  const handleLogin = useCallback(async () => {
    if (isLoggedIn) {
      // Logout
      setIsLoading(true);
      try {
        // Send agent logout code (typically *2)
        // This would be configurable
        // await sendDTMF('*2');
        setAgentState('logged-out');
        setQueueState('none');
      } catch (error) {
        console.error('Agent logout error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show login modal (TODO: implement login modal)
      console.log('Show agent login modal');
    }
  }, [isLoggedIn, setAgentState, setQueueState]);
  
  // Toggle queue
  const handleQueue = useCallback(async () => {
    if (!isLoggedIn) return;
    
    setIsLoading(true);
    try {
      if (isInQueue) {
        // Leave queue (typically *4)
        // await sendDTMF('*4');
        setQueueState('none');
      } else {
        // Join queue (typically *3)
        // await sendDTMF('*3');
        setQueueState('in-queue');
      }
    } catch (error) {
      console.error('Queue toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isInQueue, setQueueState]);
  
  // Toggle pause
  const handlePause = useCallback(async () => {
    if (!isLoggedIn) return;
    
    setIsLoading(true);
    try {
      if (isPaused) {
        // Unpause (typically *6)
        // await sendDTMF('*6');
        setAgentState('available');
      } else {
        // Pause (typically *5)
        // await sendDTMF('*5');
        setAgentState('paused');
      }
    } catch (error) {
      console.error('Pause toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isPaused, setAgentState]);
  
  // Get button states
  const getLoginButtonVariant = () => {
    if (isLoggedIn) return 'success';
    return 'secondary';
  };
  
  const getQueueButtonVariant = () => {
    if (!isLoggedIn) return 'ghost';
    if (isInQueue) return 'success';
    return 'secondary';
  };
  
  const getPauseButtonVariant = () => {
    if (!isLoggedIn) return 'ghost';
    if (isPaused) return 'warning';
    return 'secondary';
  };
  
  return (
    <div className={cn('agent-keys', className)}>
      {/* Login/Logout */}
      <Button
        variant={getLoginButtonVariant()}
        size="sm"
        onClick={handleLogin}
        disabled={!isRegistered || isLoading}
        className="agent-key-btn"
        title={isLoggedIn 
          ? t('agent.logout', 'Logout') 
          : t('agent.login', 'Login')
        }
      >
        {isLoggedIn ? (
          <>
            <LogOut className="w-4 h-4" />
            <span className="agent-key-label">{t('agent.logout', 'Logout')}</span>
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span className="agent-key-label">{t('agent.login', 'Login')}</span>
          </>
        )}
        {isLoggedIn && agentNumber && (
          <span className="agent-key-info">#{agentNumber}</span>
        )}
      </Button>
      
      {/* Queue */}
      <Button
        variant={getQueueButtonVariant()}
        size="sm"
        onClick={handleQueue}
        disabled={!isRegistered || !isLoggedIn || isLoading}
        className="agent-key-btn"
        title={isInQueue 
          ? t('agent.leave_queue', 'Leave Queue') 
          : t('agent.join_queue', 'Join Queue')
        }
      >
        <Users className="w-4 h-4" />
        <span className="agent-key-label">
          {isInQueue ? t('agent.in_queue', 'In Queue') : t('agent.queue', 'Queue')}
        </span>
      </Button>
      
      {/* Pause */}
      <Button
        variant={getPauseButtonVariant()}
        size="sm"
        onClick={handlePause}
        disabled={!isRegistered || !isLoggedIn || isLoading}
        className="agent-key-btn"
        title={isPaused 
          ? t('agent.unpause', 'Unpause') 
          : t('agent.pause', 'Pause')
        }
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        <span className="agent-key-label">
          {isPaused ? t('agent.paused', 'Paused') : t('agent.pause', 'Pause')}
        </span>
      </Button>
    </div>
  );
}

export default AgentKeys;
