// ============================================
// Agent Keys - Call Center Agent Controls
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, LogOut, Users, Pause, Play } from 'lucide-react';
import { cn, isVerboseLoggingEnabled } from '@/utils';
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
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (pendingLogin && currentSession?.state === 'established') {
      if (verboseLogging) {
        console.log('[AgentKeys] 📞 Session established, preparing to send login DTMF', {
          agentNumber: pendingLogin.agentNumber,
          hasPasscode: !!pendingLogin.passcode,
          sessionId: currentSession.id,
          sessionState: currentSession.state
        });
      }
      
      const sendLoginDTMF = async () => {
        try {
          if (verboseLogging) {
            console.log('[AgentKeys] 📤 Sending agent number DTMF:', pendingLogin.agentNumber);
          }
          
          // Send agent number with # suffix
          await sendDTMFSequence(`${pendingLogin.agentNumber}#`, currentSession.id);
          
          if (verboseLogging) {
            console.log(`[AgentKeys] ✅ Agent number DTMF sent successfully: ${pendingLogin.agentNumber}#`);
          }
          
          // If passcode provided, send it after 500ms
          if (pendingLogin.passcode) {
            if (verboseLogging) {
              console.log('[AgentKeys] ⏱️ Waiting 500ms before sending passcode...');
            }
            
            setTimeout(async () => {
              try {
                if (verboseLogging) {
                  console.log('[AgentKeys] 📤 Sending passcode DTMF');
                }
                
                await sendDTMFSequence(`${pendingLogin.passcode}#`, currentSession.id);
                
                if (verboseLogging) {
                  console.log(`[AgentKeys] ✅ Passcode DTMF sent successfully`);
                }
              } catch (error) {
                console.error('[AgentKeys] ❌ Failed to send passcode DTMF:', error);
              }
            }, 500);
          }
          
          // Update agent state
          if (verboseLogging) {
            console.log('[AgentKeys] 🔄 Updating agent state to available', {
              agentNumber: pendingLogin.agentNumber,
              previousState: agentState
            });
          }
          
          useAppStore.setState({
            agentNumber: pendingLogin.agentNumber,
            agentState: 'available'
          });
          
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent login process completed successfully');
          }
          
          // Clear pending login
          setPendingLogin(null);
        } catch (error) {
          console.error('[AgentKeys] ❌ Failed to send DTMF during login:', error);
          if (verboseLogging) {
            console.error('[AgentKeys] Login context:', {
              agentNumber: pendingLogin.agentNumber,
              sessionId: currentSession.id,
              sessionState: currentSession.state
            });
          }
        }
      };
      
      sendLoginDTMF();
    }
  }, [pendingLogin, currentSession, sendDTMFSequence, agentState]);
  
  // Listen for session termination to complete logout
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (pendingLogout && currentSession?.state === 'terminated') {
      if (verboseLogging) {
        console.log('[AgentKeys] 🔚 Logout call terminated, updating agent state', {
          previousAgentState: agentState,
          previousQueueState: queueState,
          agentNumber: agentNumber
        });
      }
      
      // Logout call completed - update state
      useAppStore.setState({
        agentNumber: undefined,
        agentState: 'logged-out',
        queueState: 'none'
      });
      setPendingLogout(false);
      setIsLoading(false);
      
      if (verboseLogging) {
        console.log('[AgentKeys] ✅ Agent logged out successfully');
      }
    }
  }, [pendingLogout, currentSession, agentState, queueState, agentNumber]);
  
  // Agent login/logout
  const handleLogin = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 🔘 Login button clicked', {
        isLoggedIn,
        isRegistered,
        isLoading,
        agentState,
        agentNumber
      });
    }
    
    if (isLoggedIn) {
      // Logout - make call to *61
      if (verboseLogging) {
        console.log('[AgentKeys] 🚪 Initiating logout process', {
          agentNumber,
          logoutCode: AGENT_CODES.logout
        });
      }
      
      setIsLoading(true);
      try {
        setPendingLogout(true);
        await makeCall(AGENT_CODES.logout);
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Logout call initiated successfully');
        }
      } catch (error) {
        console.error('[AgentKeys] ❌ Agent logout error:', error);
        if (verboseLogging) {
          console.error('[AgentKeys] Logout context:', {
            agentNumber,
            logoutCode: AGENT_CODES.logout,
            error
          });
        }
        setPendingLogout(false);
        setIsLoading(false);
      }
    } else {
      // Show login modal
      if (verboseLogging) {
        console.log('[AgentKeys] 📋 Opening agent login modal');
      }
      setShowLoginModal(true);
    }
  }, [isLoggedIn, makeCall, isRegistered, isLoading, agentState, agentNumber]);
  
  // Handle agent login from modal
  const handleAgentLogin = useCallback(async (agentNumber: string, passcode?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 🔐 Agent login requested from modal', {
        agentNumber,
        hasPasscode: !!passcode,
        loginCode: AGENT_CODES.login
      });
    }
    
    setIsLoading(true);
    try {
      // Store login info to send DTMF when call is answered
      setPendingLogin({ agentNumber, passcode });
      
      if (verboseLogging) {
        console.log('[AgentKeys] 📞 Initiating login call to:', AGENT_CODES.login);
      }
      
      // Make call to *61
      await makeCall(AGENT_CODES.login);
      
      if (verboseLogging) {
        console.log('[AgentKeys] ✅ Login call initiated successfully', {
          agentNumber,
          loginCode: AGENT_CODES.login
        });
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Agent login error:', error);
      if (verboseLogging) {
        console.error('[AgentKeys] Login error context:', {
          agentNumber,
          loginCode: AGENT_CODES.login,
          hasPasscode: !!passcode,
          error
        });
      }
      setPendingLogin(null);
      throw error; // Re-throw to show in modal
    } finally {
      setIsLoading(false);
    }
  }, [makeCall]);
  
  // Toggle queue
  const handleQueue = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!isLoggedIn) {
      if (verboseLogging) {
        console.log('[AgentKeys] ⚠️ Queue toggle blocked - agent not logged in');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[AgentKeys] 📋 Queue toggle clicked', {
        currentQueueState: queueState,
        isInQueue,
        agentNumber
      });
    }
    
    setIsLoading(true);
    try {
      if (isInQueue) {
        if (verboseLogging) {
          console.log('[AgentKeys] 🚪 Leaving queue');
        }
        // Leave queue (typically *4)
        // await sendDTMF('*4');
        setQueueState('none');
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Left queue successfully');
        }
      } else {
        if (verboseLogging) {
          console.log('[AgentKeys] 🚶 Joining queue');
        }
        // Join queue (typically *3)
        // await sendDTMF('*3');
        setQueueState('in-queue');
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Joined queue successfully');
        }
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Queue toggle error:', error);
      if (verboseLogging) {
        console.error('[AgentKeys] Queue toggle context:', {
          currentQueueState: queueState,
          attemptedAction: isInQueue ? 'leave' : 'join',
          error
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isInQueue, setQueueState, queueState, agentNumber]);
  
  // Toggle pause
  const handlePause = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!isLoggedIn) {
      if (verboseLogging) {
        console.log('[AgentKeys] ⚠️ Pause toggle blocked - agent not logged in');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[AgentKeys] ⏸️ Pause toggle clicked', {
        currentAgentState: agentState,
        isPaused,
        agentNumber
      });
    }
    
    setIsLoading(true);
    try {
      if (isPaused) {
        if (verboseLogging) {
          console.log('[AgentKeys] ▶️ Unpausing agent');
        }
        // Unpause (typically *6)
        // await sendDTMF('*6');
        setAgentState('available');
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent unpaused successfully');
        }
      } else {
        if (verboseLogging) {
          console.log('[AgentKeys] ⏸️ Pausing agent');
        }
        // Pause (typically *5)
        // await sendDTMF('*5');
        setAgentState('paused');
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent paused successfully');
        }
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Pause toggle error:', error);
      if (verboseLogging) {
        console.error('[AgentKeys] Pause toggle context:', {
          currentAgentState: agentState,
          attemptedAction: isPaused ? 'unpause' : 'pause',
          error
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isPaused, setAgentState, agentState, agentNumber]);
  
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
