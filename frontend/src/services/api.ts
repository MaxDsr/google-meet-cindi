import { RecordingMode } from '../types/recording';

export interface Recording {
  recordingId: string;
  userId: string;
  meetingId: string;
  username: string;
  title: string;
  filename: string;
  duration: number;
  createdAt: number;
  recordingType?: RecordingMode;
}

/**
 * Upload a recording to the backend
 */
export async function uploadRecording(
  userId: string,
  meetingId: string,
  username: string,
  title: string,
  duration: number,
  file: Blob,
  recordingType: RecordingMode = 'both'
): Promise<{ recordingId: string; message: string }> {
  try {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('meetingId', meetingId);
    formData.append('username', username);
    formData.append('title', title);
    formData.append('duration', duration.toString());
    formData.append('recordingType', recordingType);
    formData.append('file', file, 'recording.webm');

    const response = await fetch(`/api/recordings`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload recording');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading recording:', error);
    throw error;
  }
}

/**
 * Get all recordings for a user
 */
export async function getRecordings(userId: string): Promise<Recording[]> {
  try {
    const response = await fetch(`/api/recordings?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch recordings');
    }

    const data = await response.json();
    return data.recordings;
  } catch (error) {
    console.error('Error fetching recordings:', error);
    throw error;
  }
}

/**
 * Get a specific recording
 */
export async function getRecording(recordingId: string): Promise<Recording> {
  try {
    const response = await fetch(`/api/recordings/${recordingId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch recording');
    }

    const data = await response.json();
    return data.recording;
  } catch (error) {
    console.error('Error fetching recording:', error);
    throw error;
  }
}

/**
 * Get video URL for a recording
 */
export function getVideoUrl(recordingId: string): string {
  return `/api/recordings/${recordingId}/video`;
}

/**
 * Update recording title
 */
export async function updateRecordingTitle(
  recordingId: string,
  title: string,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch(`/api/recordings/${recordingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update recording');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error updating recording:', error);
    throw error;
  }
}

/**
 * Delete a recording
 */
export async function deleteRecording(recordingId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/recordings/${recordingId}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete recording');
    }

    return true;
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
}

