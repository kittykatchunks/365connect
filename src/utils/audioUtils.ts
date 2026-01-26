// ============================================
// Audio Utilities - File validation and conversion
// ============================================

import { isVerboseLoggingEnabled } from './index';

/**
 * Validate audio file and convert to base64 with duration limit
 * @param file - Audio file to validate (MP3 or WAV)
 * @param maxDurationSeconds - Maximum duration in seconds (default: 60)
 * @returns Promise with base64 encoded audio data
 */
export async function validateAndConvertAudioFile(
  file: File,
  maxDurationSeconds: number = 60
): Promise<string> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[audioUtils] 📁 Validating audio file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
  }
  
  // Check file type
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an MP3 or WAV file.');
  }
  
  // Check file size (max 5MB to prevent localStorage overflow)
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeBytes) {
    throw new Error('File too large. Please upload a file smaller than 5MB.');
  }
  
  if (verboseLogging) {
    console.log('[audioUtils] ✅ File type and size validation passed');
  }
  
  // Create audio element to check duration
  const audioUrl = URL.createObjectURL(file);
  const audio = new Audio(audioUrl);
  
  return new Promise<string>((resolve, reject) => {
    audio.addEventListener('loadedmetadata', async () => {
      const duration = audio.duration;
      
      if (verboseLogging) {
        console.log('[audioUtils] ⏱️ Audio duration:', duration, 'seconds');
      }
      
      // Check duration
      if (duration > maxDurationSeconds) {
        URL.revokeObjectURL(audioUrl);
        reject(new Error(`Audio file is too long. Maximum duration is ${maxDurationSeconds} seconds (file is ${Math.round(duration)} seconds).`));
        return;
      }
      
      if (verboseLogging) {
        console.log('[audioUtils] ✅ Duration validation passed');
      }
      
      // Convert to base64
      try {
        const reader = new FileReader();
        
        reader.onload = () => {
          URL.revokeObjectURL(audioUrl);
          const base64Data = reader.result as string;
          
          if (verboseLogging) {
            console.log('[audioUtils] ✅ File converted to base64, size:', base64Data.length, 'characters');
          }
          
          resolve(base64Data);
        };
        
        reader.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Failed to read audio file.'));
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      }
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Failed to load audio file. The file may be corrupted.'));
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio file validation timed out.'));
    }, 10000);
  });
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get human-readable duration
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${secs}s`;
  }
}
