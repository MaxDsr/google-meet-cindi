import crypto from 'crypto';

/**
 * Generate a time-sensitive meeting ID
 * Format: {randomHash}-{timestamp}
 */
export function generateMeetingId(): string {
  const randomHash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  return `${randomHash}-${timestamp}`;
}

/**
 * Check if a meeting link has expired (> 24 hours old)
 */
export function isMeetingExpired(meetingId: string): boolean {
  try {
    const parts = meetingId.split('-');
    const timestamp = parseInt(parts[parts.length - 1]);
    
    if (isNaN(timestamp)) {
      return true; // Invalid format, consider expired
    }
    
    const age = Date.now() - timestamp;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return age > twentyFourHours;
  } catch (error) {
    console.error('Error checking meeting expiry:', error);
    return true; // On error, consider expired for safety
  }
}

/**
 * Get meeting age in hours
 */
export function getMeetingAge(meetingId: string): number {
  try {
    const parts = meetingId.split('-');
    const timestamp = parseInt(parts[parts.length - 1]);
    const age = Date.now() - timestamp;
    return age / (60 * 60 * 1000); // Convert to hours
  } catch (error) {
    return 999; // Return large number on error
  }
}

