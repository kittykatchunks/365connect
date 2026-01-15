// ============================================
// Agent Keys - Call Center Agent Controls
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, LogOut, Users, Pause, Play } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui';
import { AgentLoginModal } from '@/components/modals';
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
  
  const { isRegistered, makeCall, sendDTMFSequence, currentSession } = useSIP();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{ agentNumber: string; passcode?: string } | null>(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  
  const isLoggedIn = agentState !== 'logged-out';
  const isPaused = agentState === 'paused';
  const isInQueue = queueState === 'in-queue';
  
  // Agent codes configuration
  const AGENT_CODES = {
    login: '*61',
    logout: '*61',
    queue: '*63',
    pause: '*65',
    unpause: '*66'
  };
  
  // Listen for session answered event to send DTMF
  useEffect(() => {
    if (pendingLogin && currentSession?.state === 'established') {
      const sendLoginDTMF = async () => {
        try {
          console.log('[AgentKeys] Session established, sending agent number DTMF:', pendingLogin.agentNumber);
          
          // Send agent number with # suffix
          await sendDTMFSequence(`${pendingLogin.agentNumber}#`, currentSession.id);
          console.log(`[AgentKeys] ✅ Sent DTMF sequence: ${pendingLogin.agentNumber}#`);
          
          // If passcode provided, send it after 500ms
          if (pendingLogin.passcode) {
            console.log('[AgentKeys] Waiting 500ms before sending passcode...');
            setTimeout(async () => {
              try {
                await sendDTMFSequence(`${pendingLogin.passcode}#`, currentSession.id);
                console.log(`[AgentKeys] ✅ Sent passcode DTMF: ${pendingLogin.passcode}#`);
              } catch (error) {
                console.error('[AgentKeys] Failed to send passcode DTMF:', error);
              }
            }, 500);
          }
          
          // Update agent state
          useAppStore.setState({
            agentNumber: pendingLogin.agentNumber,
            agentState: 'available'
          });
          
          // Clear pending login
          setPendingLogin(null);
        } catch (error) {
          console.error('[AgentKeys] Failed to send DTMF:', error);
        }
      };
      
      sendLoginDTMF();
    }
  }, [pendingLogin, currentSession, sendDTMFSequence]);
  
  // Listen for session termination to complete logout
  useEffect(() => {
    if (pendingLogout && currentSession?.state === 'terminated') {
      // Logout call completed - update state
      useAppStore.setState({
        agentNumber: undefined,
        agentState: 'logged-out',
        queueState: 'none'
      });
      setPendingLogout(false);
      setIsLoading(false);
      console.log('Agent logged out successfully');
    }
  }, [pendingLogout, currentSession]);
  
  // Agent login/logout
  const handleLogin = useCallback(async () => {
    if (isLoggedIn) {
      // Logout - make call to *61
      setIsLoading(true);
      try {
        setPendingLogout(true);
        await makeCall(AGENT_CODES.logout);
        console.log('Agent logout call initiated');
      } catch (error) {
        console.error('Agent logout error:', error);
        setPendingLogout(false);
        setIsLoading(false);
      }
    } else {
      // Show login modal
      setShowLoginModal(true);
    }
  }, [isLoggedIn, makeCall]);
  
  // Handle agent login from modal
  const handleAgentLogin = useCallback(async (agentNumber: string, passcode?: string) => {
    setIsLoading(true);
    try {
      // Store login info to send DTMF when call is answered
      setPendingLogin({ agentNumber, passcode });
      
      // Make call to *61
      await makeCall(AGENT_CODES.login);
      
      console.log('Agent login call initiated:', agentNumber);
    } catch (error) {
      console.error('Agent login error:', error);
      setPendingLogin(null);
      throw error; // Re-throw to show in modal
    } finally {
      setIsLoading(false);
    }
  }, [makeCall]);
  
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
      
      {/* Agent Login Modal */}
      <AgentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleAgentLogin}
        isLoading={isLoading}
      />
    </div>
  );
}

export default AgentKeys;
