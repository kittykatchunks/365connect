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

/**
 * Save generated server settings to localStorage
 * This maintains backward compatibility with the PWA implementation
 * and ensures debugging tools can see the generated values
 */
export function saveServerSettingsToLocalStorage(phantomId: string, username?: string): void {
  if (!isValidPhantomId(phantomId)) {
    console.warn('[ServerConfig] Invalid PhantomID, not saving server settings');
    return;
  }

  try {
    const settings = generateServerSettings(phantomId);
    
    // Store PhantomID and generated server settings
    localStorage.setItem('PhantomID', phantomId);
    localStorage.setItem('wssServer', settings.wssServerUrl);
    localStorage.setItem('SipDomain', settings.sipDomain);
    localStorage.setItem('SipServer', settings.sipServer);
    localStorage.setItem('wssPort', settings.wssPort.toString());
    localStorage.setItem('wssPath', settings.wssPath);
    
    // Generate and store display name if username provided
    if (username) {
      const displayName = generateDisplayName(username);
      localStorage.setItem('profileName', displayName);
    }
    
    console.log('✅ Server settings generated and saved to localStorage:', {
      phantomID: phantomId,
      wssServer: settings.wssServerUrl,
      domain: settings.sipDomain
    });
  } catch (error) {
    console.error('[ServerConfig] Failed to save server settings:', error);
  }
}
