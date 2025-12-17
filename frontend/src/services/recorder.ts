import { RecordingMode, RECORDING_MODE_CONFIG } from '../types/recording';

/**
 * MediaRecorder wrapper for recording video calls
 * Supports audio-only, video-only, and combined recording modes
 */
export class CallRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private currentMode: RecordingMode = 'both';

  /**
   * Start recording with specified mode
   */
  start(stream: MediaStream, mode: RecordingMode = 'both'): void {
    try {
      this.recordedChunks = [];
      this.currentMode = mode;

      const config = RECORDING_MODE_CONFIG[mode];
      const mimeType = config.mimeType;

      // Create MediaRecorder with appropriate MIME type
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`[Recorder] ${mimeType} not supported, using default codec`);
        this.mediaRecorder = new MediaRecorder(stream);
      } else {
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.startTime = Date.now();

      console.log(`[Recorder] Started recording (mode: ${mode}, mimeType: ${mimeType})`);
    } catch (error) {
      console.error('[Recorder] Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return the recorded blob
   */
  async stop(): Promise<{ blob: Blob; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Use the appropriate MIME type for the blob based on recording mode
        const blobType = this.currentMode === 'audio' ? 'audio/webm' : 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: blobType });
        const duration = Math.floor((Date.now() - this.startTime) / 1000);

        console.log(`[Recorder] Stopped recording. Mode: ${this.currentMode}, Duration: ${duration}s, Size: ${blob.size} bytes`);

        resolve({ blob, duration });
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('[Recorder] Recording error:', event.error);
        reject(event.error);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Get recording duration in seconds
   */
  getDuration(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get current recording mode
   */
  getMode(): RecordingMode {
    return this.currentMode;
  }
}
