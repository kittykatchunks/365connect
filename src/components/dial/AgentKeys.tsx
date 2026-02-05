// ============================================
// Agent Keys - Call Center Agent Controls
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, LogOut, Users, Pause, Play } from 'lucide-react';
import { cn, isVerboseLoggingEnabled, queryAgentStatus, fetchPauseReasons, pauseAgentViaAPI, unpauseAgentViaAPI, parseAgentPauseStatus, loginAgentViaAPI, logoffAgentViaAPI, fetchQueueMembership } from '@/utils';
import { phantomApiService } from '@/services/PhantomApiService';
import { Button } from '@/components/ui';
import { AgentLoginModal, PauseReasonModal } from '@/components/modals';
import { QueueLoginModal } from './QueueLoginModal';
import { useAppStore, useSettingsStore, useCompanyNumbersStore, useUIStore } from '@/stores';
import { useSIP } from '@/hooks';
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
  const setLoggedInQueues = useAppStore((state) => state.setLoggedInQueues);
  
  // Toast notifications
  const addNotification = useUIStore((state) => state.addNotification);
  
  // Get SIP username for API calls
  const sipUsername = useSettingsStore((state) => state.settings.connection.username);
  
  const { isRegistered, makeCall, sendDTMFSequence, currentSession } = useSIP();
  
  // Track if we've checked status on this registration session
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQueueLoginModal, setShowQueueLoginModal] = useState(false);
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
      // Check if auto-reconnect is already handling this
      const autoReconnectHandling = sessionStorage.getItem('autoReconnectHandlingAgent') === 'true';
      
      if (autoReconnectHandling) {
        if (verboseLogging) {
          console.log('[AgentKeys] ⏭️ Skipping agent status check - auto-reconnect is handling it');
        }
        setHasCheckedStatus(true);
        return;
      }
      
      if (verboseLogging) {
        console.log('[AgentKeys] 🔌 SIP registered, checking agent status from API');
      }
      
      const checkStatus = async () => {
        const agentData = await queryAgentStatus(sipUsername);
        
        if (agentData && agentData.num) {
          // Agent is logged in on PBX
          const isPaused = parseAgentPauseStatus(agentData.pause);
          const currentQueueState = useAppStore.getState().queueState;
          
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent already logged in on PBX', {
              num: agentData.num,
              name: agentData.name,
              paused: isPaused,
              cid: agentData.cid,
              clip: agentData.clip,
              queueStateFromStorage: currentQueueState
            });
          }
          
          // Restore agent state
          useAppStore.setState({
            agentNumber: agentData.num,
            agentName: agentData.name,
            agentState: isPaused ? 'paused' : 'available'
            // queueState will be determined by queue membership check below
          });
          
          // Check for actual logged-in queues
          if (verboseLogging) {
            console.log('[AgentKeys] 🔍 Checking queue membership after registration...');
          }
          
          try {
            const queueResult = await fetchQueueMembership(agentData.num);
            
            if (queueResult.success) {
              if (queueResult.queues.length > 0) {
                if (verboseLogging) {
                  console.log('[AgentKeys] ✅ Agent is logged into', queueResult.queues.length, 'queue(s):', queueResult.queues);
                }
                setLoggedInQueues(queueResult.queues);
                setQueueState('in-queue');
                if (verboseLogging) {
                  console.log('[AgentKeys] 🔵 Queue state set to: in-queue (from registration check)');
                }
              } else {
                if (verboseLogging) {
                  console.log('[AgentKeys] ℹ️ Agent logged in but not in any queues');
                }
                setLoggedInQueues([]);
                setQueueState('none');
                if (verboseLogging) {
                  console.log('[AgentKeys] 🔴 Queue state set to: none (no queues found)');
                }
              }
            } else {
              if (verboseLogging) {
                console.warn('[AgentKeys] ⚠️ Failed to fetch queue membership');
              }
              setLoggedInQueues([]);
              setQueueState('none');
              if (verboseLogging) {
                console.log('[AgentKeys] 🔴 Queue state set to: none (fetch failed)');
              }
            }
          } catch (queueError) {
            console.error('[AgentKeys] ❌ Error checking queue membership:', queueError);
            setLoggedInQueues([]);
            setQueueState('none');
          }
          
          // Sync current CLI from agent data if Company Numbers tab is enabled
          const showCompanyNumbersTab = useSettingsStore.getState().settings.interface.showCompanyNumbersTab;
          
          if (showCompanyNumbersTab && agentData.cid) {
            if (verboseLogging) {
              console.log('[AgentKeys] 📞 Company Numbers tab active, syncing CLI from agent data');
              console.log('[AgentKeys] 📞 Current CID from API:', agentData.cid);
            }
            
            // Sync the CLI selector with the current CID from PBX
            const syncCurrentCliFromAgentData = useCompanyNumbersStore.getState().syncCurrentCliFromAgentData;
            syncCurrentCliFromAgentData(agentData);
            
            if (verboseLogging) {
              console.log('[AgentKeys] ✅ CLI sync completed');
            }
          } else {
            if (verboseLogging) {
              if (!showCompanyNumbersTab) {
                console.log('[AgentKeys] ℹ️ Company Numbers tab not enabled, skipping CLI sync');
              } else if (!agentData.cid) {
                console.log('[AgentKeys] ℹ️ No CID in agent data, skipping CLI sync');
              }
            }
          }
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
    
    // Listen to sessionAnswered event from window
    const handleSessionAnswered = async (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const session = customEvent.detail;
      
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
            previousState: agentState,
            previousQueueState: queueState
          });
        }
        
        const loginAgentNumber = pendingLogin.agentNumber;
        
        useAppStore.setState({
          agentNumber: loginAgentNumber,
          agentState: 'available'
          // queueState will be determined by queue membership check below
        });
        
        // Query API to get full agent info (name, cid, clip, etc.) AND fetch queue membership
        if (sipUsername) {
          setTimeout(async () => {
            const agentData = await queryAgentStatus(sipUsername);
            if (agentData && agentData.num) {
              if (verboseLogging) {
                console.log('[AgentKeys] 📥 Retrieved agent details from API after DTMF login', {
                  num: agentData.num,
                  name: agentData.name,
                  cid: agentData.cid,
                  clip: agentData.clip
                });
              }
              
              useAppStore.setState({
                agentName: agentData.name
              });
              
              // Sync current CLI from agent data if Company Numbers tab is enabled
              const showCompanyNumbersTab = useSettingsStore.getState().settings.interface.showCompanyNumbersTab;
              
              if (showCompanyNumbersTab && agentData.cid) {
                if (verboseLogging) {
                  console.log('[AgentKeys] 📞 Syncing CLI after DTMF login, CID:', agentData.cid);
                }
                
                const syncCurrentCliFromAgentData = useCompanyNumbersStore.getState().syncCurrentCliFromAgentData;
                syncCurrentCliFromAgentData(agentData);
              }
            }
            
            // Fetch queue membership after DTMF login
            if (verboseLogging) {
              console.log('[AgentKeys] 📋 Fetching queue membership after DTMF login...');
            }
            
            try {
              const queueResult = await fetchQueueMembership(loginAgentNumber);
              
              if (queueResult.success) {
                if (queueResult.queues.length > 0) {
                  if (verboseLogging) {
                    console.log('[AgentKeys] ✅ Queue membership fetched after DTMF login:', queueResult.queues);
                  }
                  
                  // Update store with logged-in queues
                  useAppStore.setState({
                    loggedInQueues: queueResult.queues,
                    queueState: 'in-queue'
                  });
                } else {
                  if (verboseLogging) {
                    console.log('[AgentKeys] ℹ️ Agent logged in but not in any queues');
                  }
                  
                  // Agent is logged in but not in any queues
                  useAppStore.setState({
                    loggedInQueues: [],
                    queueState: 'none'
                  });
                }
              } else {
                if (verboseLogging) {
                  console.warn('[AgentKeys] ⚠️ Failed to fetch queue membership after DTMF login');
                }
                
                // Failed to fetch - set to none to be safe
                useAppStore.setState({
                  loggedInQueues: [],
                  queueState: 'none'
                });
              }
            } catch (queueError) {
              console.error('[AgentKeys] ❌ Error fetching queue membership after DTMF login:', queueError);
              
              // Error during fetch - set to none to be safe
              useAppStore.setState({
                loggedInQueues: [],
                queueState: 'none'
              });
            }
          }, 1000); // Wait 1s for PBX to process login
        }
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent DTMF login process completed successfully');
        }
        
        // Clear pending login
        setPendingLogin(null);
      } catch (error) {
        console.error('[AgentKeys] ❌ Failed to send DTMF during login:', error);
        if (verboseLogging) {
          console.error('[AgentKeys] DTMF Login context:', {
            agentNumber: pendingLogin.agentNumber,
            sessionId: session.id,
            sessionState: session.state
          });
        }
      }
    };
    
    // Add window event listener
    window.addEventListener('sessionAnswered', handleSessionAnswered);
    
    // Cleanup event listener on unmount or when pendingLogin changes
    return () => {
      if (verboseLogging) {
        console.log('[AgentKeys] 🔇 Cleaning up sessionAnswered listener');
      }
      window.removeEventListener('sessionAnswered', handleSessionAnswered);
    };
  }, [pendingLogin, sendDTMFSequence, agentState, sipUsername, queueState]);
  
  // Listen for session termination to complete logout
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Detect logout completion either by terminated state or session becoming undefined
    if (pendingLogout && (currentSession?.state === 'terminated' || !currentSession)) {
      if (verboseLogging) {
        console.log('[AgentKeys] 🔚 Logout call ended, updating agent state', {
          sessionState: currentSession?.state || 'no session',
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
  
  // Helper function to fetch and update queue membership after login
  const updateQueueMembership = useCallback(async (agentNum: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 📋 Fetching queue membership after login...', { agentNumber: agentNum });
    }
    
    try {
      const result = await fetchQueueMembership(agentNum);
      
      if (result.success) {
        if (result.queues.length > 0) {
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Queue membership fetched successfully:', result.queues);
          }
          
          // Update store with logged-in queues
          setLoggedInQueues(result.queues);
          
          // Set queue state to 'in-queue' since agent is in at least one queue
          setQueueState('in-queue');
          
          if (verboseLogging) {
            console.log('[AgentKeys] 📊 Updated queue state to in-queue with', result.queues.length, 'queues');
          }
        } else {
          if (verboseLogging) {
            console.log('[AgentKeys] ℹ️ Agent logged in but not in any queues');
          }
          
          // Agent is logged in but not in any queues
          setLoggedInQueues([]);
          setQueueState('none');
        }
      } else {
        if (verboseLogging) {
          console.warn('[AgentKeys] ⚠️ Failed to fetch queue membership');
        }
        
        // Failed to fetch - set to none to be safe
        setLoggedInQueues([]);
        setQueueState('none');
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Error fetching queue membership:', error);
      
      // Error during fetch - set to none to be safe
      setLoggedInQueues([]);
      setQueueState('none');
    }
  }, [setLoggedInQueues, setQueueState]);
  
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
      // Logout - try API first (primary), then DTMF (secondary)
      if (verboseLogging) {
        console.log('[AgentKeys] 🚪 Initiating logout process (Primary: API, Secondary: DTMF)', {
          agentNumber,
          logoutCode: AGENT_CODES.logout
        });
      }
      
      setIsLoading(true);
      
      // Primary: Try API logout
      if (verboseLogging) {
        console.log('[AgentKeys] 📡 Attempting primary logout via API...');
      }
      
      const apiResult = await logoffAgentViaAPI(agentNumber);
      
      if (apiResult.success) {
        // API logout successful
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent logout API successful');
        }
        
        addNotification({
          type: 'success',
          title: t('agent.logout_api_success', 'Agent Logout API Successful'),
          duration: 3000
        });
        
        // Update state to logged out
        useAppStore.setState({
          agentNumber: '',
          agentState: 'logged-out',
          queueState: 'none',
          agentName: null,
          loggedInQueues: []
        });
        
        setIsLoading(false);
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent logged out successfully via API');
        }
      } else {
        // API logout failed - fallback to DTMF
        if (verboseLogging) {
          console.warn('[AgentKeys] ⚠️ Agent logout API failed, falling back to DTMF logout');
        }
        
        addNotification({
          type: 'warning',
          title: t('agent.logout_api_failed', 'Agent Logout API Failed - Trying DTMF logout'),
          duration: 4000
        });
        
        try {
          setPendingLogout(true);
          await makeCall(AGENT_CODES.logout);
          
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ DTMF Logout call initiated successfully');
          }
        } catch (error) {
          console.error('[AgentKeys] ❌ Agent DTMF logout error:', error);
          if (verboseLogging) {
            console.error('[AgentKeys] DTMF Logout context:', {
              agentNumber,
              logoutCode: AGENT_CODES.logout,
              error
            });
          }
          setPendingLogout(false);
          setIsLoading(false);
        }
      }
    } else {
      // Show login modal
      if (verboseLogging) {
        console.log('[AgentKeys] 📋 Opening agent login modal');
      }
      setShowLoginModal(true);
    }
  }, [isLoggedIn, makeCall, isRegistered, isLoading, agentState, agentNumber, addNotification, t]);
  
  // DTMF-based login (secondary method)
  const performDTMFLogin = useCallback(async (agentNum: string, passcode?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 📞 Performing DTMF login (secondary method)', {
        agentNumber: agentNum,
        hasPasscode: !!passcode,
        loginCode: AGENT_CODES.login
      });
    }
    
    // Store login info to send DTMF when call is answered
    setPendingLogin({ agentNumber: agentNum, passcode });
    
    if (verboseLogging) {
      console.log('[AgentKeys] 📞 Initiating login call to:', AGENT_CODES.login);
    }
    
    // Make call to *61
    await makeCall(AGENT_CODES.login);
    
    if (verboseLogging) {
      console.log('[AgentKeys] ✅ DTMF Login call initiated successfully', {
        agentNumber: agentNum,
        loginCode: AGENT_CODES.login
      });
    }
  }, [makeCall]);
  
  // Handle agent login from modal
  const handleAgentLogin = useCallback(async (agentNum: string, passcode?: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 🔐 Agent login requested from modal', {
        agentNumber: agentNum,
        hasPasscode: !!passcode,
        loginCode: AGENT_CODES.login
      });
    }
    
    setIsLoading(true);
    
    try {
      // If passcode is provided, skip API and go straight to DTMF login
      if (passcode && passcode.trim()) {
        if (verboseLogging) {
          console.log('[AgentKeys] 🔑 Passcode provided - using DTMF login directly (skipping API)');
        }
        
        await performDTMFLogin(agentNum, passcode);
        return;
      }
      
      // Primary: Try API login (no passcode)
      if (verboseLogging) {
        console.log('[AgentKeys] 📡 Attempting primary login via API (no passcode)...');
      }
      
      // Get queues parameter (placeholder for future function - empty for now)
      const queues = ''; // Will be populated by future function
      
      const apiResult = await loginAgentViaAPI(agentNum, sipUsername || '', queues);
      
      if (apiResult.success) {
        // API login successful
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent login API successful');
        }
        
        addNotification({
          type: 'success',
          title: t('agent.login_api_success', 'Agent Login API Successful'),
          duration: 3000
        });
        
        // Update agent state
        useAppStore.setState({
          agentNumber: agentNum,
          agentState: 'available'
          // queueState will be determined by queue membership check below
        });
        
        // Fetch queue membership after successful API login
        await updateQueueMembership(agentNum);
        
        // Query API to get full agent info (name, cid, clip, etc.)
        if (sipUsername) {
          const agentData = await queryAgentStatus(sipUsername);
          if (agentData && agentData.num) {
            if (verboseLogging) {
              console.log('[AgentKeys] 📥 Retrieved agent details from API after login', {
                num: agentData.num,
                name: agentData.name,
                cid: agentData.cid,
                clip: agentData.clip
              });
            }
            
            useAppStore.setState({
              agentName: agentData.name
            });
            
            // Sync current CLI from agent data if Company Numbers tab is enabled
            const showCompanyNumbersTab = useSettingsStore.getState().settings.interface.showCompanyNumbersTab;
            
            if (showCompanyNumbersTab && agentData.cid) {
              if (verboseLogging) {
                console.log('[AgentKeys] 📞 Syncing CLI after API login, CID:', agentData.cid);
              }
              
              const syncCurrentCliFromAgentData = useCompanyNumbersStore.getState().syncCurrentCliFromAgentData;
              syncCurrentCliFromAgentData(agentData);
            }
          }
        }
        
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Agent logged in successfully via API');
        }
      } else {
        // API login failed - fallback to DTMF
        if (verboseLogging) {
          console.warn('[AgentKeys] ⚠️ Agent login API failed, falling back to DTMF login');
        }
        
        addNotification({
          type: 'warning',
          title: t('agent.login_api_failed', 'Agent Login API Failed - Trying DTMF Login'),
          duration: 4000
        });
        
        // Perform DTMF login as fallback
        await performDTMFLogin(agentNum, passcode);
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Agent login error:', error);
      if (verboseLogging) {
        console.error('[AgentKeys] Login error context:', {
          agentNumber: agentNum,
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
  }, [makeCall, performDTMFLogin, sipUsername, addNotification, t, updateQueueMembership]);
  
  // Toggle queue - shows modal when not in queue
  const handleQueue = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!isLoggedIn) {
      if (verboseLogging) {
        console.log('[AgentKeys] ⚠️ Queue toggle blocked - agent not logged in');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[AgentKeys] 📋 Queue button clicked', {
        currentQueueState: queueState,
        isInQueue,
        agentNumber
      });
    }
    
    // If not in any queue, show the queue selection modal
    if (!isInQueue) {
      if (verboseLogging) {
        console.log('[AgentKeys] 📋 Opening queue selection modal');
      }
      setShowQueueLoginModal(true);
      return;
    }
    
    // If already in queue, also show the modal for queue management
    if (verboseLogging) {
      console.log('[AgentKeys] 📋 Opening queue selection modal (already in queue)');
    }
    setShowQueueLoginModal(true);
  }, [isLoggedIn, isInQueue, queueState, agentNumber]);
  
  // Handle queue login from modal - calls GhostLogon API with selected queues
  const handleQueueLogin = useCallback(async (selectedQueues: string[]) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 🔐 Queue login requested with queues:', selectedQueues);
    }
    
    if (!sipUsername || !agentNumber) {
      if (verboseLogging) {
        console.warn('[AgentKeys] ⚠️ Cannot login to queues - missing sipUsername or agentNumber');
      }
      return;
    }
    
    // Join queues as comma-separated string
    const queuesCSV = selectedQueues.join(',');
    
    try {
      // Step 1: Call GhostLogoff first to clear currently logged-in queues
      if (verboseLogging) {
        console.log('[AgentKeys] 📤 Calling GhostLogoff API first to clear current queues:', {
          agent: agentNumber
        });
      }
      
      const logoffResult = await phantomApiService.agentLogoff(agentNumber);
      
      if (!logoffResult.success) {
        if (verboseLogging) {
          console.warn('[AgentKeys] ⚠️ Queue logoff API failed, but continuing with login...');
        }
      } else {
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Queue logoff API successful');
        }
      }
      
      // Step 2: Wait 500ms before calling GhostLogon
      if (verboseLogging) {
        console.log('[AgentKeys] ⏱️ Waiting 500ms before calling GhostLogon...');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Call GhostLogon with new queues
      if (verboseLogging) {
        console.log('[AgentKeys] 📤 Calling GhostLogon API:', {
          agent: agentNumber,
          phone: sipUsername,
          queues: queuesCSV
        });
      }
      
      const result = await phantomApiService.agentLogon(agentNumber, sipUsername, queuesCSV);
      
      if (result.success) {
        if (verboseLogging) {
          console.log('[AgentKeys] ✅ Queue login API successful');
        }
        
        // Update state to in-queue
        setQueueState('in-queue');
        setLoggedInQueues(selectedQueues.map(q => ({ queue: q, queuelabel: q })));
        
        addNotification({
          type: 'success',
          title: t('queue_login.login_success', 'Queue Login Successful'),
          message: t('queue_login.logged_into_queues', 'Logged into {{count}} queues', { count: selectedQueues.length }),
          duration: 3000
        });
      } else {
        if (verboseLogging) {
          console.warn('[AgentKeys] ⚠️ Queue login API failed');
        }
        
        addNotification({
          type: 'error',
          title: t('queue_login.login_failed', 'Queue Login Failed'),
          message: t('queue_login.login_error', 'Failed to login to selected queues'),
          duration: 5000
        });
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Queue login error:', error);
      
      addNotification({
        type: 'error',
        title: t('queue_login.login_failed', 'Queue Login Failed'),
        message: error instanceof Error ? error.message : t('queue_login.login_error', 'Failed to login to selected queues'),
        duration: 5000
      });
    }
  }, [sipUsername, agentNumber, setQueueState, setLoggedInQueues, addNotification, t]);
  
  // Handle queue logout from modal - dials *62 for queue logout
  const handleQueueLogout = useCallback(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AgentKeys] 🚪 Queue logout requested - dialing *62');
    }
    
    // Dial *62 for queue logout (same as failover scenario)
    if (makeCall) {
      if (verboseLogging) {
        console.log('[AgentKeys] 📞 Initiating *62 call for queue logout');
      }
      
      makeCall(AGENT_CODES.queue);
      
      // Update state immediately (call will confirm)
      setQueueState('none');
      setLoggedInQueues([]);
      
      addNotification({
        type: 'info',
        title: t('queue_login.logging_out', 'Logging Out'),
        message: t('queue_login.logout_in_progress', 'Queue logout in progress...'),
        duration: 3000
      });
      
      if (verboseLogging) {
        console.log('[AgentKeys] ✅ Queue logout call initiated');
      }
    } else {
      if (verboseLogging) {
        console.warn('[AgentKeys] ⚠️ Cannot logout from queues - makeCall not available');
      }
      
      addNotification({
        type: 'error',
        title: t('queue_login.logout_failed', 'Queue Logout Failed'),
        message: t('queue_login.call_unavailable', 'Unable to initiate logout call'),
        duration: 5000
      });
    }
  }, [makeCall, setQueueState, setLoggedInQueues, addNotification, t]);
  
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
    
    // Agent is unpaused - fetch pause reasons first (same logic whether on call or idle)
    // The difference is: when on active call, DTMF will happen on a background line
    if (!sipUsername) {
      console.error('[AgentKeys] ❌ No SIP username available for pause reasons');
      return;
    }
    
    const hasActiveCall = currentSession && currentSession.state !== 'terminated';
    
    setIsLoading(true);
    try {
      if (verboseLogging) {
        console.log('[AgentKeys] 📡 Fetching pause reasons', {
          hasActiveCall,
          currentSessionId: currentSession?.id
        });
      }
      
      const result = await fetchPauseReasons(sipUsername);
      
      if (!result.apiCallSucceeded) {
        // WallBoardStats API failed
        if (hasActiveCall) {
          // On active call - do NOT attempt DTMF on background line
          if (verboseLogging) {
            console.log('[AgentKeys] ⚠️ WallBoardStats API failed while on active call - cannot pause');
          }
          throw new Error('Unable to fetch pause reasons while on active call');
        } else {
          // Idle - fallback to DTMF *63
          if (verboseLogging) {
            console.log('[AgentKeys] ⚠️ WallBoardStats API failed - falling back to DTMF *63');
          }
          
          await makeCall(AGENT_CODES.pause);
          
          // Update state to paused immediately (DTMF call will disconnect automatically after reason entry)
          setAgentState('paused');
          
          if (verboseLogging) {
            console.log('[AgentKeys] 📞 Dialed *63 for DTMF pause input - state set to paused');
          }
        }
      } else if (result.reasons.length === 0) {
        // WallBoardStats succeeded but no pause reasons - use AgentpausefromPhone API
        if (verboseLogging) {
          console.log('[AgentKeys] ℹ️ No pause reasons from WallBoardStats - using AgentpausefromPhone API');
        }
        
        const success = await pauseAgentViaAPI(sipUsername);
        
        if (success) {
          setAgentState('paused');
          if (verboseLogging) {
            console.log('[AgentKeys] ✅ Agent paused successfully via API');
            if (hasActiveCall) {
              console.log('[AgentKeys] ✅ Active call remains undisturbed (pause via API only)');
            }
          }
        } else {
          throw new Error('Pause API call failed');
        }
      } else {
        // Show pause reason modal (will allow selection and DTMF on background line if on call)
        if (verboseLogging) {
          console.log(`[AgentKeys] 📋 Showing pause reason modal with ${result.reasons.length} reasons`);
          if (hasActiveCall) {
            console.log('[AgentKeys] ℹ️ Agent on active call - DTMF selection will use background line');
          }
        }
        
        setPauseReasons(result.reasons);
        setShowPauseReasonModal(true);
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Pause error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isPaused, setAgentState, agentState, agentNumber, sipUsername, currentSession, makeCall]);
  
  // Handle pause reason selection
  const handlePauseReasonSelect = useCallback(async (code: number, label: string) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Check if there's an active call
    const hasActiveCall = currentSession && currentSession.state !== 'terminated';
    
    if (verboseLogging) {
      console.log(`[AgentKeys] 📋 Pause reason selected: ${code} - ${label}`, {
        hasActiveCall,
        currentSessionId: currentSession?.id,
        currentSessionState: currentSession?.state
      });
    }
    
    setShowPauseReasonModal(false);
    setIsLoading(true);
    
    try {
      // Dial *63*{code} to pause with reason
      const dialCode = `${AGENT_CODES.pause}*${code}`;
      
      if (verboseLogging) {
        if (hasActiveCall) {
          console.log(`[AgentKeys] 📞 Dialing pause code on background line: ${dialCode} (active call will not be disrupted)`);
        } else {
          console.log(`[AgentKeys] 📞 Dialing pause code: ${dialCode}`);
        }
      }
      
      // makeCall will automatically use an available line (different from active call if one exists)
      await makeCall(dialCode);
      
      // Update state immediately (DTMF call will disconnect automatically after sending the code)
      setAgentState('paused');
      
      if (verboseLogging) {
        console.log('[AgentKeys] ✅ Paused with reason:', label);
        if (hasActiveCall) {
          console.log('[AgentKeys] ✅ Active call remains undisturbed');
        }
      }
    } catch (error) {
      console.error('[AgentKeys] ❌ Failed to pause with reason:', error);
    } finally {
      setIsLoading(false);
    }
  }, [makeCall, setAgentState, currentSession]);
  
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
      
      {/* Queue Login Modal */}
      <QueueLoginModal
        isOpen={showQueueLoginModal}
        onClose={() => setShowQueueLoginModal(false)}
        onLogin={handleQueueLogin}
        onLogout={handleQueueLogout}
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
