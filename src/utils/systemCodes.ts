// ============================================
// System Feature Codes Translator
// ============================================
// Translates system feature codes (*XX) to friendly names

import { isVerboseLoggingEnabled } from './index';

/**
 * Translates system feature codes (starting with *) to friendly names
 * @param dialedNumber - The dialed number/code to translate
 * @param t - Translation function from i18next
 * @returns Friendly name if it's a system code, otherwise returns the original number
 */
export function translateSystemCode(dialedNumber: string, t?: (key: string, fallback: string) => string): string {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Only process codes starting with *
  if (!dialedNumber || !dialedNumber.startsWith('*')) {
    return dialedNumber;
  }
  
  // Translation function fallback
  const translate = t || ((_key: string, fallback: string) => fallback);
  
  let translatedName: string | null = null;
  
  // Match specific patterns
  // *63*X - Pause with reason X (where X is any digit)
  if (/^\*63\*\d+$/.test(dialedNumber)) {
    const reason = dialedNumber.substring(4); // Extract the reason digit(s)
    translatedName = translate('systemCodes.pause_with_reason', `Pause (Reason ${reason})`).replace('${reason}', reason);
  }
  // *62*6XX - Toggle Queue In/Out 6XX (where XX is any two digits)
  else if (/^\*62\*6\d{2}$/.test(dialedNumber)) {
    const queue = dialedNumber.substring(4); // Extract the queue number (6XX)
    translatedName = translate('systemCodes.toggle_queue_specific', `Toggle Queue ${queue}`).replace('${queue}', queue);
  }
  // *82*XX - Change CLIP to XX (where XX is any two digits)
  else if (/^\*82\*\d{2}$/.test(dialedNumber)) {
    const clip = dialedNumber.substring(4); // Extract the CLIP value
    translatedName = translate('systemCodes.change_clip', `Change CLIP to ${clip}`).replace('${clip}', clip);
  }
  // Fixed codes
  else {
    switch (dialedNumber) {
      case '*11':
        translatedName = translate('systemCodes.toggle_auto_answer', 'Toggle Auto Answer');
        break;
      case '*61':
        translatedName = translate('systemCodes.agent_login_out', 'Agent Login/Out');
        break;
      case '*62':
        translatedName = translate('systemCodes.toggle_queue', 'Toggle Queue In/Out');
        break;
      case '*63':
        translatedName = translate('systemCodes.toggle_pause', 'Toggle Pause');
        break;
      default:
        // Unknown system code - return as is
        translatedName = null;
    }
  }
  
  if (verboseLogging && translatedName) {
    console.log('[SystemCodes] 🔄 Translated code:', {
      original: dialedNumber,
      translated: translatedName
    });
  }
  
  return translatedName || dialedNumber;
}

/**
 * Checks if a number is a system feature code
 * @param number - The number to check
 * @returns true if the number is a system code (starts with *)
 */
export function isSystemCode(number: string): boolean {
  return Boolean(number && number.startsWith('*'));
}
