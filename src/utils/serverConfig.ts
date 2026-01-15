// ============================================
// Server Configuration Utilities
// ============================================

export interface ServerSettings {
  wssServerUrl: string;
  sipDomain: string;
  sipServer: string;
  wssPort: number;
  wssPath: string;
}

/**
 * Generate server settings from PhantomID
 * PhantomID is a 3-4 digit identifier that maps to a Phantom PBX server
 */
export function generateServerSettings(phantomId: string): ServerSettings {
  // Validate PhantomID
  if (!phantomId || !/^\d{3,4}$/.test(phantomId)) {
    throw new Error('PhantomID must be a 3 or 4 digit number');
  }

  const domain = `server1-${phantomId}.phantomapi.net`;
  
  return {
    wssServerUrl: `wss://${domain}:8089/ws`,
    sipDomain: domain,
    sipServer: domain,
    wssPort: 8089,
    wssPath: '/ws'
  };
}

/**
 * Generate display name for SIP registration
 */
export function generateDisplayName(username: string): string {
  return `${username}-365Connect`;
}

/**
 * Validate PhantomID format
 */
export function isValidPhantomId(phantomId: string): boolean {
  return /^\d{3,4}$/.test(phantomId);
}

/**
 * Get the full WebSocket URL for SIP connection
 */
export function getWssUrl(phantomId: string): string {
  const settings = generateServerSettings(phantomId);
  return settings.wssServerUrl;
}
