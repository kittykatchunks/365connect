// ============================================
// Agent Status Info - Shows agent and connection status
// ============================================

import { useTranslation } from 'react-i18next';
import { useAppStore, useSIPStore } from '@/stores';

export function AgentStatusInfo() {
  const { t } = useTranslation();
  const registrationState = useSIPStore((state) => state.registrationState);
  const transportState = useSIPStore((state) => state.transportState);
  const agentState = useAppStore((state) => state.agentState);
  const agentNumber = useAppStore((state) => state.agentNumber);
  const agentName = useAppStore((state) => state.agentName);
  
  const isRegistered = transportState === 'connected' && registrationState === 'registered';
  
  // If not registered, show connection status
  if (!isRegistered) {
    return (
      <div className="agent-status-info">
        <span className="agent-status-text status-disconnected">
          {t('dial.not_connected', 'Not connected to server')}
        </span>
      </div>
    );
  }
  
  // If registered but agent not logged in
  if (agentState === 'logged-out') {
    return (
      <div className="agent-status-info">
        <span className="agent-prefix">AGENT: </span>
        <span className="agent-status-text status-not-logged-in">
          {t('agent.not_logged_in', 'Not Logged In')}
        </span>
      </div>
    );
  }
  
  // Agent is logged in - show number and name
  const agentDisplay = agentName ? `${agentNumber} - ${agentName}` : agentNumber;
  
  if (agentState === 'paused') {
    return (
      <div className="agent-status-info">
        <span className="agent-prefix">AGENT: </span>
        <span className="agent-status-text status-paused">
          [PAUSED] {agentDisplay}
        </span>
      </div>
    );
  }
  
  return (
    <div className="agent-status-info">
      <span className="agent-prefix">AGENT: </span>
      <span className="agent-status-text status-connected">
        {agentDisplay}
      </span>
    </div>
  );
}
