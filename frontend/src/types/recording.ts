/**
 * Recording mode types for the video call recorder
 */
export type RecordingMode = 'audio' | 'video' | 'both';

/**
 * Recording mode configuration
 */
export const RECORDING_MODE_CONFIG: Record<RecordingMode, { label: string; icon: string; mimeType: string }> = {
  audio: {
    label: 'Audio Only',
    icon: '🎵',
    mimeType: 'audio/webm;codecs=opus',
  },
  video: {
    label: 'Video Only',
    icon: '🎬',
    mimeType: 'video/webm;codecs=vp8',
  },
  both: {
    label: 'Audio + Video',
    icon: '📹',
    mimeType: 'video/webm;codecs=vp8,opus',
  },
};

