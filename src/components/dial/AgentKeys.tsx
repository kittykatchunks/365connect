// ============================================
// Agent Keys - Call Center Agent Controls
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, LogOut, Users, Pause, Play } from 'lucide-react';
import { cn, isVerboseLoggingEnabled, queryAgentStatus, fetchPauseReasons, pauseAgentViaAPI, unpauseAgentViaAPI, parseAgentPauseStatus } from '@/utils';
import { Button } from '@/components/ui';
import { AgentLoginModal, PauseReasonModal } from '@/components/modals';
import { useAppStore, useSettingsStore } from '@/stores';
import { useSIP } from '@/hooks';
import { useSIPContext } from '@/contexts';
import type { PauseReason } from '@/types/agent';

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
  
  // Get SIP username for API calls
  const sipUsername = useSettingsStore((state) => state.settings.connection.username);
  
  const { isRegistered, makeCall, sendDTMFSequence, currentSession } = useSIP();
  const { sipService } = useSIPContext();
  
  // Track if we've checked status on this registration session
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPauseReasonModal, setShowPauseReasonModal] = useState(false);
  const [pauseReasons, setPauseReasons] = useState<PauseReason[]>([]);
  const [pendingLogin, setPendingLogin] = useState<{ agentNumber: string; passcode?: string } | null>(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  
  const isLoggedIn = agentState !== 'logged-out';
  const isPaused = agentState === 'paused';
  const isInQueue = queueState === 'in-queue';
  
  // Agent codes configuration
  // NOTE: Must match PWA implementation and PBX configuration
  const AGENT_CODES = {
    login: '*61',
    logout: '*61',
    queue: '*62',   // Queue operations
    pause: '*63',   // Pause with reason
    unpause: '*63'  // Unpause (same code, toggles)
  };
  
  // Check agent status when SIP registers (similar to PWA checkAgentStatusAfterRegistration)
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (isRegistered && !hasCheckedStatus && sipUsername) {
      if (verboseLogging) {
        console.log('[AgentKeys] 🔌 SIP registered, checking agent status from API');
      }
      
      const checkStatus = async () => {
        const agentData = await queryAgentStatus(sipUsername);
        
        if (agentData && agentData.num) {
          // Agent is logged in on PBX
          const isPaused = parseAgentPauseStatus(agentData.pause);
          
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent already logged in on PBX', {
              num: agentData.num,
              name: agentData.name,
              paused: isPaused
            });
          }
          
          // Restore agent state
          useAppStore.setState({
            agentNumber: agentData.num,
            agentName: agentData.name,
            agentState: isPaused ? 'paused' : 'available'
          });
        } else {
          if (verboseLogging) {
            console.log('[AgentKeys] ℹ️ Agent not logged in on PBX');
          }
        }
        
        setHasCheckedStatus(true);
      };
      
      checkStatus();
    } else if (!isRegistered && hasCheckedStatus) {
      // Reset check flag when unregistered
      setHasCheckedStatus(false);
    }
  }, [isRegistered, hasCheckedStatus, sipUsername]);
  
  // Listen for session answered event to send DTMF (listen directly to SIP service events)
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!pendingLogin) {
      return; // No pending login, nothing to do
    }
    
    if (verboseLogging) {
      console.log('[AgentKeys] 🎧 Setting up sessionAnswered listener for login DTMF', {
        agentNumber: pendingLogin.agentNumber,
        hasPasscode: !!pendingLogin.passcode
      });
    }
    
    // Listen to sessionAnswered event from SIP service
    const unsubscribe = sipService.on('sessionAnswered', async (session) => {
      if (!pendingLogin) {
        return; // Login already processed
      }
      
      if (verboseLogging) {
        console.log('[AgentKeys] 📞 Session answered event received, sending login DTMF', {
          agentNumber: pendingLogin.agentNumber,
          hasPasscode: !!pendingLogin.passcode,
          sessionId: session.id,
          sessionState: session.state
        });
      }
      
      try {
        if (verboseLogging) {
          console.log('[AgentKeys] 📤 Sending agent number DTMF:', pendingLogin.agentNumber);
        }
        
        // Send agent number with # suffix
        await sendDTMFSequence(`${pendingLogin.agentNumber}#`, session.id);
        
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
              
              await sendDTMFSequence(`${pendingLogin.passcode}#`, session.id);
              
              if (verboseLogging) {
                console.log(`[AgentKeys] ✅ Passcode DTMF sent successfully`);
              }
            } catch (error) {
              console.error('[AgentKeys] ❌ Failed to send passcode DTMF:', error);
            }
          }, 500);
        }
        
        // Update agent state locally first
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
        
        // Query API to get full agent info (name, clip, etc.)
        if (sipUsername) {
          setTimeout(async () => {
            const agentData = await queryAgentStatus(sipUsername);
            if (agentData && agentData.num) {
              if (verboseLogging) {
                console.log('[AgentKeys] 📥 Retrieved agent details from API after login', {
                  num: agentData.num,
                  name: agentData.name
                });
              }
              
              useAppStore.setState({
                agentName: agentData.name
              });
            }
          }, 1000); // Wait 1s for PBX to process login
        }
        
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
            sessionId: session.id,
            sessionState: session.state
          });
        }
      }
    });
    
    // Cleanup subscription on unmount or when pendingLogin changes
    return () => {
      if (verboseLogging) {
        console.log('[AgentKeys] 🔇 Cleaning up sessionAnswered listener');
      }
      unsubscribe();
    };
  }, [pendingLogin, sendDTMFSequence, agentState, sipUsername, sipService]);
  
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
      // Make call to *62 queue code
      await makeCall(AGENT_CODES.queue);
      
      // Toggle queue state
      if (isInQueue) {
        if (verboseLogging) {
          console.log('[AgentKeys] 🚪 Queue operation: leave');
        }
        setQueueState('none');
      } else {
        if (verboseLogging) {
          console.log('[AgentKeys] 🚶 Queue operation: join');
        }
        setQueueState('in-queue');
      }
      
      if (verboseLogging) {
        console.log('[AgentKeys] ✅ Queue operation completed');
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
  }, [isLoggedIn, isInQueue, setQueueState, queueState, agentNumber, makeCall]);
  
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
        agentNumber,
        sipUsername
      });
    }
    
    // If already paused, unpause via API
    if (isPaused) {
      if (!sipUsername) {
        console.error('[AgentKeys] ❌ No SIP username available for unpause');
        return;
      }
      
      setIsLoading(true);
      try {
        if (verboseLogging) {
          console.log('[AgentKeys] 📡 Unpausing via API');
        }
        
        const success = await unpauseAgentViaAPI(sipUsername);
        
        if (success) {
          setAgentState('available');
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent unpaused successfully');
          }
        } else {
          throw new Error('Unpause API call failed');
        }
      } catch (error) {
        console.error('[AgentKeys] ❌ Unpause error:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Agent is unpaused - check if on active call
    const hasActiveCall = currentSession && currentSession.state !== 'terminated';
    if (hasActiveCall) {
      // On active call - pause directly via API without showing reasons
      if (!sipUsername) {
        console.error('[AgentKeys] ❌ No SIP username available for pause');
        return;
      }
      
      if (verboseLogging) {
        console.log('[AgentKeys] 📞 Agent on active call - pausing directly via API');
      }
      
      setIsLoading(true);
      try {
        const success = await pauseAgentViaAPI(sipUsername);
        
        if (success) {
          setAgentState('paused');
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent paused successfully');
          }
        } else {
          throw new Error('Pause API call failed');
        }
      } catch (error) {
        console.error('[AgentKeys] ❌ Pause error:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Phone is idle - fetch pause reasons
    if (!sipUsername) {
      console.error('[AgentKeys] ❌ No SIP username available for pause reasons');
      return;
    }
    
    setIsLoading(true);
    try {
      if (verboseLogging) {
        console.log('[AgentKeys] 📡 Fetching pause reasons');
      }
      
      const reasons = await fetchPauseReasons(sipUsername);
      
      if (reasons.length === 0) {
        // No pause reasons configured - pause directly via API
        if (verboseLogging) {
          console.log('[AgentKeys] ℹ️ No pause reasons - pausing directly via API');
        }
        
        const success = await pauseAgentViaAPI(sipUsername);
        
        if (success) {
          setAgentState('paused');
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent paused successfully');
          }
        } else {
          throw new Error('Pause API call failed');
        }
      } else {
        // Show pause reason modal
        if (verboseLogging) {
          console.log(`[AgentKeys] 📋 Showing pause reason modal with ${reasons.length} reasons`);
        }
        
        setPauseReasons(reasons);
        setShowPauseReasonModal(true);
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Pause error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isPaused, setAgentState, agentState, agentNumber, sipUsername, currentSession]);
  
  // Handle pause reason selection
  const handlePauseReasonSelect = useCallback(async (code: number, label: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[AgentKeys] 📋 Pause reason selected: ${code} - ${label}`);
    }
    
    setShowPauseReasonModal(false);
    setIsLoading(true);
    
    try {
      // Dial *63*{code} to pause with reason
      const dialCode = `${AGENT_CODES.pause}*${code}`;
      
      if (verboseLogging) {
        console.log(`[AgentKeys] 📞 Dialing pause code: ${dialCode}`);
      }
      
      await makeCall(dialCode);
      
      // Update state immediately (call will disconnect automatically)
      setAgentState('paused');
      
      if (verboseLogging) {
        console.log('[AgentKeys] ✅ Paused with reason:', label);
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Failed to pause with reason:', error);
    } finally {
      setIsLoading(false);
    }
  }, [makeCall, setAgentState]);
  
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
      
      {/* Pause Reason Modal */}
      <PauseReasonModal
        isOpen={showPauseReasonModal}
        onClose={() => setShowPauseReasonModal(false)}
        onSelect={handlePauseReasonSelect}
        reasons={pauseReasons}
        isLoading={isLoading}
      />
    </div>
  );
}

export default AgentKeys;
